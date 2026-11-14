/**
 * SandboxHost Component
 *
 * Manages the secure iframe sandbox for rendering organs.
 * Implements the security boundary defined in LAWS_OF_ANATOMY.md:
 * - L1: Organs never access network, storage, cookies, parent/top windows, or DOM outside iframe
 * - L2: Nerve API is the only channel between organs and Creature
 *
 * The iframe runs with `sandbox="allow-scripts"` (opaque origin, per the Nerve
 * protocol's SANDBOX_ATTRIBUTE) and a strict CSP. All organ messages flow
 * through a NerveHost, which enforces schema, permissions, rate limits and
 * payload size before anything is served back to the organ.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  NERVE_API_VERSION,
  HANDSHAKE_TIMEOUT_MS,
  TICK_INTERVAL_MS,
  SANDBOX_ATTRIBUTE,
  CSP_META_TAG,
  type HostToOrganMessage,
  type Permission,
  type Theme,
} from '@graft/nerve';
import { NerveHost, type NerveHostConfig } from '../NerveHost';
import './SandboxHost.css';

export interface SandboxHostProps {
  /** Organ ID for tracking */
  organId: string;
  /** HTML document content of the organ */
  content: string;
  /** Permissions granted to this organ (NerveHost enforces them) */
  granted: Permission[];
  /** Current theme (passed in the init handshake) */
  theme?: Theme;
  /** Reduced motion preference (passed in the init handshake) */
  reducedMotion?: boolean;
  /** Data provider for read/subscribe requests: path -> value */
  dataProvider: (path: string) => unknown;
  /** Chimera routing: organ emitted to a permitted output port */
  onEmit?: (port: string, payload: unknown) => void;
  /** Organ status updates (active / quarantined / decayed) */
  onStatusChange?: (organId: string, status: 'active' | 'quarantined' | 'decayed') => void;
  /** Registry of live NerveHosts used for chimera routing between organs */
  hostRegistry?: Map<string, NerveHost>;
  /** Called when organ throws an error */
  onError?: (error: Error) => void;
  /** Called when the organ completes its handshake and is active */
  onReady?: () => void;
  /** Optional CSS to inject into the sandbox */
  customStyles?: string;
  /** Whether the sandbox is active (visible) */
  isActive?: boolean;
  /** Interval between host tick messages (protocol default 100ms) */
  tickIntervalMs?: number;
}

/** Height bounds applied to resize requests (defensive clamping) */
const MIN_ORGAN_HEIGHT = 40;
const MAX_ORGAN_HEIGHT = 4000;

/**
 * Nerve API shim injected into the sandbox iframe.
 *
 * Provides the only channel between organ and Creature (L2) and speaks the
 * real Nerve protocol (packages/nerve): read requests carry ids, data comes
 * back as `data` messages, emits carry a port, resize carries a height.
 * `sub:`-prefixed read ids register subscriptions with the host.
 */
const NERVE_SHIM = `<script>
(function() {
  var organId = '__ORGAN_ID__';
  var pendingReads = {};
  var readCounter = 0;
  var subscriptions = {};
  var inHandlers = {};
  var inGlobalListeners = [];

  function post(msg) {
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* ignore */ }
  }

  var nerve = {
    // Injected time (L6)
    now: function() {
      if (window.__NERVE_TIME__ !== undefined) return window.__NERVE_TIME__;
      return Date.now();
    },

    // Injected randomness (L6)
    random: function() {
      if (typeof window.__NERVE_RANDOM__ === 'function') return window.__NERVE_RANDOM__();
      return Math.random();
    },

    // Read from a declared path. Resolves with the value from the host.
    read: function(path) {
      return new Promise(function(resolve, reject) {
        var id = 'read-' + (++readCounter);
        pendingReads[id] = { resolve: resolve, reject: reject, path: path };
        post({ type: 'read', id: id, path: path });
        setTimeout(function() {
          if (pendingReads[id]) {
            delete pendingReads[id];
            reject(new Error('Read timeout for ' + path));
          }
        }, 30000);
      });
    },

    // Emit to an output port (for chimera linking)
    emit: function(port, payload) {
      post({ type: 'emit', port: port, payload: payload });
    },

    // Subscribe to path changes (host pushes data with a "sub:<path>" id)
    subscribe: function(path, callback) {
      subscriptions[path] = callback;
      post({ type: 'read', id: 'sub:' + path, path: path });
      return function() {
        delete subscriptions[path];
        post({ type: 'read', id: 'unsub:' + path, path: path });
      };
    },

    // Listen to data on an input port (from chimera links)
    onIn: function(port, callback) {
      inHandlers[port] = callback;
      return function() {
        delete inHandlers[port];
      };
    },

    // Generic event listener helper
    on: function(event, callback) {
      if (event === 'in') {
        inGlobalListeners.push(callback);
        return function() {
          inGlobalListeners = inGlobalListeners.filter(function(cb) { return cb !== callback; });
        };
      }
    }
  };

  // Expose nerve API globally
  window.nerve = nerve;

  // Handle messages from the Creature
  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'data': {
        var pending = pendingReads[msg.id];
        if (pending) {
          delete pendingReads[msg.id];
          pending.resolve(msg.value);
        }
        if (msg.id && String(msg.id).indexOf('sub:') === 0) {
          var path = String(msg.id).slice(4);
          var cb = subscriptions[path];
          if (cb) cb(msg.value);
        }
        break;
      }
      case 'in': {
        if (inHandlers[msg.port]) {
          try { inHandlers[msg.port](msg.payload); } catch (e) { console.error(e); }
        }
        for (var i = 0; i < inGlobalListeners.length; i++) {
          try { inGlobalListeners[i](msg.port, msg.payload); } catch (e) { console.error(e); }
        }
        break;
      }
      // init / tick are consumed by the organ's own listeners;
      // the shim handles data and in channels.
    }
  });

  // Complete the handshake once the document is up so the host can send init.
  window.addEventListener('load', function() {
    post({ type: 'hello', apiVersion: '__API_VERSION__' });
  });
})();
</script>`;

/**
 * Generates the HTML document for the sandbox iframe.
 *
 * Two input shapes are supported (Doctor bundles emit complete documents,
 * handwritten snippet organs provide script fragments):
 * - Complete HTML document: the Nerve shim and the protocol CSP meta tag are
 *   injected into it (after <head>, or prepended when there is no head).
 * - Fragment: wrapped in a scaffold document that includes CSP and shim.
 */
export function generateSandboxHtml(
  organId: string,
  content: string,
  customStyles?: string
): string {
  const shim = NERVE_SHIM.replace('__ORGAN_ID__', JSON.stringify(organId).slice(1, -1))
    // The placeholder already sits inside single quotes in the shim, so insert
    // the raw version (JSON.stringify would add literal quotes and the host
    // would see a version mismatch and decay the organ).
    .replace('__API_VERSION__', NERVE_API_VERSION);

  // Complete organ document - inject CSP + shim, do not wrap.
  if (/<html[\s>]/i.test(content) || /<!DOCTYPE\s+html/i.test(content)) {
    const injection = `${CSP_META_TAG}${shim}`;
    if (/<head[^>]*>/i.test(content)) {
      return content.replace(/<head[^>]*>/i, (head) => `${head}${injection}`);
    }
    return `${injection}\n${content}`;
  }

  const styles = [
    customStyles ? `<style>${customStyles}</style>` : '',
    `<style>
    /* Base sandbox styles */
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
  </style>`,
  ]
    .filter(Boolean)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${CSP_META_TAG}
  ${styles}
  ${shim}
</head>
<body>
  <div id="organ-root"></div>
  <script>
    // Organ content
    ${content}
  </script>
</body>
</html>`;
}

/**
 * SandboxHost - Secure iframe manager for organ execution.
 *
 * This component creates an isolated environment for organ code,
 * enforcing the security boundaries defined in LAWS_OF_ANATOMY.md.
 * All Nerve traffic is validated by a NerveHost instance.
 */
export function SandboxHost({
  organId,
  content,
  granted,
  theme = 'dark',
  reducedMotion = false,
  dataProvider,
  onEmit,
  onStatusChange,
  hostRegistry,
  onError,
  onReady,
  customStyles,
  isActive = true,
  tickIntervalMs = TICK_INTERVAL_MS,
}: SandboxHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const readyRef = useRef(false);

  // The NerveHost for this organ. The message sender posts into the iframe;
  // the ref is read lazily so construction order does not matter.
  const nerveHost = useMemo<NerveHost>(() => {
    const config: NerveHostConfig = {
      organId,
      granted,
      theme,
      reducedMotion,
      dataProvider,
      statusUpdater: (id, status) => {
        onStatusChange?.(id, status);
        if (status === 'active' && !readyRef.current) {
          readyRef.current = true;
          setIsLoading(false);
          onReady?.();
        }
      },
      messageSender: (message: HostToOrganMessage) => {
        iframeRef.current?.contentWindow?.postMessage(message, '*');
      },
      onEmit: (port, payload) => onEmit?.(port, payload),
      onResize: (requested) => {
        const clamped = Math.min(MAX_ORGAN_HEIGHT, Math.max(MIN_ORGAN_HEIGHT, Math.round(requested)));
        setHeight(clamped);
      },
    };
    return new NerveHost(config);
    // NerveHost is created once per organ; changing permissions at runtime
    // would require a new handshake, which is out of scope here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organId]);

  // ---------------------------------------------------------------------------
  // Message handling: organ -> NerveHost -> (data responses / emit / resize)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isActive) return undefined;

    const handleMessage = (event: MessageEvent) => {
      // Only accept messages originating from this organ's iframe window.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const result = nerveHost.handleMessage(event.data);
      if (!result.success) {
        const reason = result.reason;
        if (reason === 'payload_too_large') {
          onError?.(new Error(`Nerve message exceeded payload limit (16 KB)`));
        } else if (reason === 'invalid_schema') {
          onError?.(new Error(`Nerve message failed schema validation and was dropped`));
        }
        // 'rate_limited' and permission failures already transitioned the
        // organ's state inside NerveHost (quarantined) and were surfaced via
        // onStatusChange.
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [nerveHost, isActive, onError]);

  // ---------------------------------------------------------------------------
  // Handshake on iframe load + handshake timeout + tick loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isActive) return undefined;

    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    let disposed = false;

    const handleLoad = () => {
      if (disposed) return;
      setIsLoading(false);
      // Send the init handshake; the organ replies with hello (-> active).
      nerveHost.startHandshake();

      // NRV: an organ that never completes the handshake decays.
      window.setTimeout(() => {
        if (disposed) return;
        if (nerveHost.getState() !== 'active') {
          onError?.(new Error(`Handshake timeout after ${HANDSHAKE_TIMEOUT_MS}ms`));
        }
      }, HANDSHAKE_TIMEOUT_MS);
    };

    // If the iframe already loaded before the effect ran, fire the handshake
    // now (React 18 strict mode / fast loads). The contentDocument probe can
    // throw on opaque-origin frames in some browsers, so it is guarded.
    let handshakeTimer: number | undefined;
    let alreadyLoaded = false;
    try {
      alreadyLoaded =
        !!iframe.contentWindow &&
        iframe.contentDocument !== null &&
        iframe.contentDocument.readyState === 'complete';
    } catch {
      // Opaque origin - fall back to the load event below.
      alreadyLoaded = false;
    }
    if (alreadyLoaded) {
      handshakeTimer = window.setTimeout(handleLoad, 0);
    }

    iframe.addEventListener('load', handleLoad);

    // Tick loop: protocol-injected time while the organ is active.
    const tickTimer = tickIntervalMs > 0
      ? window.setInterval(() => nerveHost.sendTick(), tickIntervalMs)
      : undefined;

    return () => {
      disposed = true;
      iframe.removeEventListener('load', handleLoad);
      if (handshakeTimer !== undefined) window.clearTimeout(handshakeTimer);
      if (tickTimer !== undefined) window.clearInterval(tickTimer);
    };
  }, [nerveHost, isActive, tickIntervalMs, onError, content]);

  // ---------------------------------------------------------------------------
  // Host registry (chimera routing needs the live NerveHost of each organ)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hostRegistry) return undefined;
    hostRegistry.set(organId, nerveHost);
    return () => {
      hostRegistry.delete(organId);
    };
  }, [hostRegistry, organId, nerveHost]);

  // ---------------------------------------------------------------------------
  // Sandbox document
  // ---------------------------------------------------------------------------
  const html = useMemo(
    () => generateSandboxHtml(organId, content, customStyles),
    [organId, content, customStyles]
  );

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.(new Error('Failed to load organ sandbox'));
  }, [onError]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="sandbox-host" data-organ-id={organId}>
      {isLoading && (
        <div className="sandbox-host__loading" aria-live="polite">
          Loading organ...
        </div>
      )}

      {hasError && (
        <div className="sandbox-host__error" role="alert">
          Organ failed to load
        </div>
      )}

      <iframe
        ref={iframeRef}
        className="sandbox-host__iframe"
        srcDoc={html}
        sandbox={SANDBOX_ATTRIBUTE}
        onError={handleError}
        title={`Organ: ${organId}`}
        aria-label={`Organ ${organId} sandbox`}
        style={height !== null ? { height: `${height}px` } : undefined}
        // Security attributes
        allow=""
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
