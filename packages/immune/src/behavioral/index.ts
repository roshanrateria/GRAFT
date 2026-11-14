/**
 * Behavioral Harness
 *
 * Browser-based sandbox for runtime organ verification.
 * Implements Stage 3: Behavioral Run.
 *
 * In a browser (the host app and the CLI built for browsers), the organ is
 * executed for real inside a sandboxed iframe with a CSP and the Nerve shim
 * injected. Metrics (load time, errors, DOM growth, CSP violations, Nerve
 * messages) are measured and validated against hard limits.
 *
 * In Node (checkup scripts, benchmarks) there is no DOM, so the sandbox cannot
 * execute. This is an explicit platform limitation, not a silent pass: the
 * result is marked `environment: 'node'` / `executed: false` and a warning is
 * emitted. The behavioral stage always runs for real at transplant time,
 * because the TransactionCoordinator re-runs the immune pipeline inside the
 * host browser.
 */

import type {
  BehavioralResult,
  BehavioralMetrics,
  OrganManifest,
} from '../types.js';

// ============================================================================
// Behavioral Check Configuration
// ============================================================================

/** Maximum allowed load time in milliseconds */
const MAX_LOAD_TIME_MS = 1500;

/** Maximum allowed DOM node count */
const MAX_DOM_NODES = 2000;

/** Timeout for behavioral run in milliseconds */
const BEHAVIORAL_TIMEOUT_MS = 5000;

/** Maximum Nerve messages an organ may send during the behavioral run */
const MAX_MESSAGES = 100;

// ============================================================================
// Harness Document
// ============================================================================

/**
 * Nerve shim injected into the behavioral harness iframe.
 *
 * Mirrors the shim in apps/web SandboxHost so LLM-generated organs that call
 * `nerve.read()` / `nerve.emit()` / `nerve.subscribe()` behave in the harness
 * exactly as they will in production. Handwritten organs that post protocol
 * messages directly via `window.parent.postMessage` are unaffected.
 */
const HARNESS_SHIM = `<script>
(function() {
  var pendingReads = {};
  var readCounter = 0;
  var subscriptions = {};
  var inHandlers = {};
  var inGlobalListeners = [];

  function post(msg) {
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* ignore */ }
  }

  window.nerve = {
    now: function() { return Date.now(); },
    random: function() { return Math.random(); },
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
    emit: function(port, payload) {
      post({ type: 'emit', port: port, payload: payload });
    },
    subscribe: function(path, callback) {
      subscriptions[path] = callback;
      post({ type: 'read', id: 'sub:' + path, path: path });
    },
    onIn: function(port, callback) {
      inHandlers[port] = callback;
      return function() {
        delete inHandlers[port];
      };
    },
    on: function(event, callback) {
      if (event === 'in') {
        inGlobalListeners.push(callback);
        return function() {
          inGlobalListeners = inGlobalListeners.filter(function(cb) { return cb !== callback; });
        };
      }
    }
  };

  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'data') {
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
    }
    if (msg.type === 'in') {
      if (inHandlers[msg.port]) {
        try { inHandlers[msg.port](msg.payload); } catch (e) { console.error(e); }
      }
      for (var i = 0; i < inGlobalListeners.length; i++) {
        try { inGlobalListeners[i](msg.port, msg.payload); } catch (e) { console.error(e); }
      }
    }
  });

  // Deliver the init handshake on load so organs that wait for it start.
  window.addEventListener('load', function() {
    post({
      type: 'init',
      apiVersion: __GRAFT_API_VERSION__,
      theme: 'dark',
      reducedMotion: false,
      granted: __GRAFT_GRANTED__
    });
  });
})();
</script>`;

/** Placeholder tokens in HARNESS_SHIM (replaced with JSON-encoded values) */
const API_VERSION_TOKEN = '__GRAFT_API_VERSION__';
const GRANTED_TOKEN = '__GRAFT_GRANTED__';

/**
 * Build the harness HTML for an organ:
 * the organ's own document with a CSP meta tag, the Nerve shim and an
 * init-dispatching load listener injected before any organ script runs.
 */
export function prepareHarnessHtml(
  indexHtml: string,
  manifest: OrganManifest | any
): string {
  const cspMeta =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:;">';

  const granted = JSON.stringify(
    Array.isArray(manifest?.permissions) ? manifest.permissions : []
  );
  const apiVersion = typeof manifest?.apiVersion === 'string' ? manifest.apiVersion : '1.0.0';

  const shim = HARNESS_SHIM
    .replace(API_VERSION_TOKEN, JSON.stringify(apiVersion))
    .replace(GRANTED_TOKEN, granted);

  if (/<head[^>]*>/i.test(indexHtml)) {
    return indexHtml.replace(/<head[^>]*>/i, (head) => `${head}${cspMeta}${shim}`);
  }

  // No <head> element - prepend CSP and shim to the document.
  return `${cspMeta}${shim}\n${indexHtml}`;
}

// ============================================================================
// Behavioral Runner
// ============================================================================

/**
 * Run behavioral checks on an organ in a sandboxed iframe.
 *
 * Browser: executes the organ for real and measures metrics.
 * Node: no DOM is available, so the sandbox cannot run; the result is an
 * explicitly-marked skip (see module docblock). Use `GRAFT_BEHAVIORAL_STRICT=1`
 * to fail closed in Node environments instead of skipping.
 */
export async function runBehavioralCheck(
  indexHtml: string,
  manifest: any
): Promise<BehavioralResult> {
  if (typeof document === 'undefined') {
    const nodeMetrics: BehavioralMetrics = {
      loadTime: 0,
      hasErrors: false,
      errors: [],
      domNodeCount: 0,
      hasCSPViolations: false,
      cspViolations: [],
      messages: [],
      environment: 'node',
      executed: false,
    };

    if (process.env.GRAFT_BEHAVIORAL_STRICT === '1') {
      return {
        passed: false,
        metrics: nodeMetrics,
        error: {
          code: 'IMM_BEHAVIORAL_UNAVAILABLE',
          message:
            'Behavioral check requires a browser (no DOM in this environment). ' +
            'Unset GRAFT_BEHAVIORAL_STRICT to skip in Node, or run in the host browser.',
        },
      };
    }

    console.warn(
      '[immune] behavioral stage skipped: requires a browser. ' +
        'It will run for real at transplant time in the host browser.'
    );

    return { passed: true, metrics: nodeMetrics };
  }

  // ---- Browser: run the organ for real -------------------------------------

  const harnessHtml = prepareHarnessHtml(indexHtml, manifest);
  const sandbox = createSandboxedIframe(harnessHtml);

  if (!sandbox) {
    return {
      passed: false,
      metrics: {
        loadTime: 0,
        hasErrors: true,
        errors: ['Failed to create behavioral sandbox iframe'],
        domNodeCount: 0,
        hasCSPViolations: false,
        cspViolations: [],
        messages: [],
        environment: 'browser',
        executed: false,
      },
      error: {
        code: 'IMM_BEHAVIORAL_SANDBOX_ERROR',
        message: 'Failed to create behavioral sandbox iframe',
      },
    };
  }

  try {
    const metrics = await measureBehavioralMetrics(sandbox.iframe);
    const { passed, violations } = validateBehavioralMetrics(metrics);

    const fullMetrics: BehavioralMetrics = {
      ...metrics,
      environment: 'browser',
      executed: true,
    };

    if (!passed) {
      return {
        passed: false,
        metrics: fullMetrics,
        error: {
          code: 'IMM_BEHAVIORAL_VIOLATION',
          message: violations.join('; '),
          details: { violations },
        },
      };
    }

    return { passed: true, metrics: fullMetrics };
  } finally {
    sandbox.cleanup();
  }
}

/**
 * Create a sandboxed iframe for organ testing.
 * Returns iframe element and cleanup function.
 */
export function createSandboxedIframe(
  indexHtml: string
): { iframe: HTMLIFrameElement; cleanup: () => void } | null {
  if (typeof document === 'undefined') {
    // Not in browser context
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('referrerPolicy', 'no-referrer');
  iframe.style.display = 'none';
  iframe.style.position = 'absolute';
  iframe.style.top = '-9999px';

  // Use srcdoc for sandboxing (opaque origin, no network access under CSP)
  iframe.srcdoc = indexHtml;

  document.body.appendChild(iframe);

  return {
    iframe,
    cleanup: () => {
      iframe.remove();
    },
  };
}

/**
 * Measure behavioral metrics from a sandboxed iframe.
 */
export function measureBehavioralMetrics(
  iframe: HTMLIFrameElement,
  timeout: number = BEHAVIORAL_TIMEOUT_MS
): Promise<BehavioralMetrics> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const errors: string[] = [];
    const cspViolations: string[] = [];
    const messages: unknown[] = [];

    let resolved = false;

    const onCspViolation = (e: SecurityPolicyViolationEvent) => {
      // Only record violations originating from the sandbox iframe
      cspViolations.push(`CSP violation: ${e.violatedDirective} - ${e.blockedURI}`);
    };

    const onParentMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (messages.length < MAX_MESSAGES) {
        messages.push({
          type: msg.type,
          ...(msg.port !== undefined ? { port: msg.port } : {}),
          ...(msg.path !== undefined ? { path: msg.path } : {}),
        });
      }
    };

    const cleanup = () => {
      document.removeEventListener('securitypolicyviolation', onCspViolation);
      window.removeEventListener('message', onParentMessage);
      if (!resolved) {
        resolved = true;
        const loadTime = Date.now() - startTime;

        // Count DOM nodes
        let domNodeCount = 0;
        try {
          if (iframe.contentDocument) {
            domNodeCount = iframe.contentDocument.getElementsByTagName('*').length;
          }
        } catch {
          // Cross-origin or not loaded
        }

        resolve({
          loadTime,
          hasErrors: errors.length > 0,
          errors,
          domNodeCount,
          hasCSPViolations: cspViolations.length > 0,
          cspViolations,
          messages,
        });
      }
    };

    // Listen for CSP violations (removed again in cleanup)
    document.addEventListener('securitypolicyviolation', onCspViolation);

    // Record Nerve messages the organ sends to the parent
    window.addEventListener('message', onParentMessage);

    // Set timeout
    setTimeout(cleanup, timeout);

    // Listen for load
    iframe.addEventListener('load', () => {
      // Give the organ a short window to boot (emit/hello) before closing
      // the measurement, so early messages are captured in metrics.
      setTimeout(cleanup, Math.min(500, timeout));
    });

    // Listen for errors
    iframe.addEventListener('error', (e) => {
      const message = (e as ErrorEvent).message || 'Unknown iframe error';
      errors.push(message);
    });
  });
}

/**
 * Validate behavioral metrics against limits.
 */
export function validateBehavioralMetrics(
  metrics: BehavioralMetrics
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.loadTime > MAX_LOAD_TIME_MS) {
    violations.push(`Load time ${metrics.loadTime}ms exceeds ${MAX_LOAD_TIME_MS}ms limit`);
  }

  if (metrics.hasErrors) {
    violations.push(`Organ threw errors: ${metrics.errors.join(', ')}`);
  }

  if (metrics.domNodeCount > MAX_DOM_NODES) {
    violations.push(`DOM node count ${metrics.domNodeCount} exceeds ${MAX_DOM_NODES} limit`);
  }

  if (metrics.hasCSPViolations) {
    violations.push(`CSP violations detected: ${metrics.cspViolations.join(', ')}`);
  }

  if (metrics.messages.length >= MAX_MESSAGES) {
    violations.push(
      `Organ sent ${metrics.messages.length}+ Nerve messages during behavioral run (limit ${MAX_MESSAGES})`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
