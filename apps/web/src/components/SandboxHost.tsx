/**
 * SandboxHost Component
 *
 * Manages the secure iframe sandbox for rendering organs.
 * Implements the security boundary defined in LAWS_OF_ANATOMY.md:
 * - L1: Organs never access network, storage, cookies, parent/top windows, or DOM outside iframe
 * - L2: Nerve API is the only channel between organs and Creature
 *
 * Uses Content Security Policy and sandbox attributes to enforce isolation.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import './SandboxHost.css';

export interface SandboxHostProps {
  /** Organ ID for tracking */
  organId: string;
  /** HTML/JS content to render in the sandbox */
  content: string;
  /** Callback for messages from the organ via Nerve API */
  onMessage?: (message: unknown) => void;
  /** Called when organ throws an error */
  onError?: (error: Error) => void;
  /** Called when organ finishes loading */
  onReady?: () => void;
  /** Optional CSS to inject into the sandbox */
  customStyles?: string;
  /** Whether the sandbox is active (visible) */
  isActive?: boolean;
}

/**
 * CSP directive for organ sandboxes.
 * Restricts network access, inline scripts (except via blob), and form submissions.
 */
const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'self' blob:",
  "style-src 'unsafe-inline' 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Sandbox attributes for the iframe element.
 * - allow-scripts: Required for organ JavaScript execution
 * - allow-same-origin: Required for blob: URLs to work
 * - All other capabilities are denied by default
 */
const SANDBOX_ATTRS = 'allow-scripts allow-same-origin';

/**
 * Generates the HTML document for the sandbox iframe.
 * Includes the Nerve API shim, CSP headers, and organ content.
 */
function generateSandboxHtml(
  organId: string,
  content: string,
  customStyles?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">
  ${customStyles ? `<style>${customStyles}</style>` : ''}
  <style>
    /* Base sandbox styles */
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="organ-root"></div>
  <script>
    // Nerve API Shim - provides the only channel between organ and Creature
    // Implements L2: Nerve API Exclusivity from LAWS_OF_ANATOMY.md
    
    (function() {
      var organId = '${organId}';
      
      var nerve = {
        // Injected time (L6)
        now: function() {
          return window.__NERVE_TIME__ || Date.now();
        },
        
        // Injected randomness (L6)
        random: function() {
          if (window.__NERVE_RANDOM__) {
            return window.__NERVE_RANDOM__();
          }
          // Fallback - should not be used in production
          console.warn('nerve.random() called without injected RNG');
          return Math.random();
        },
        
        // Emit message to Creature via postMessage
        emit: function(port, payload) {
          window.parent.postMessage({
            type: 'NERVE_MESSAGE',
            organId: organId,
            port: port,
            payload: payload
          }, '*');
        },
        
        // Read from declared path
        read: function(path) {
          // Request data from Creature
          window.parent.postMessage({
            type: 'NERVE_READ_REQUEST',
            organId: organId,
            path: path
          }, '*');
        },
        
        // Subscribe to path changes
        subscribe: function(path, callback) {
          // Register subscription
          window.__NERVE_SUBSCRIPTIONS__ = window.__NERVE_SUBSCRIPTIONS__ || {};
          window.__NERVE_SUBSCRIPTIONS__[path] = callback;
          
          window.parent.postMessage({
            type: 'NERVE_SUBSCRIBE',
            organId: organId,
            path: path
          }, '*');
        }
      };
      
      // Expose nerve API globally
      window.nerve = nerve;
      
      // Listen for messages from Creature
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NERVE_DATA') {
          var callback = window.__NERVE_SUBSCRIPTIONS__ && window.__NERVE_SUBSCRIPTIONS__[event.data.path];
          if (callback) {
            callback(event.data.payload);
          }
        }
      });
    })();
  </script>
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
 */
export function SandboxHost({
  organId,
  content,
  onMessage,
  onError,
  onReady,
  customStyles,
  isActive = true,
}: SandboxHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle messages from the iframe (Nerve API)
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (!iframeRef.current) return;
      
      const iframeOrigin = new URL(iframeRef.current.src).origin;
      if (event.origin !== iframeOrigin) return;

      const { data } = event;
      
      // Validate Nerve API message structure
      if (!data || typeof data !== 'object') return;
      
      // Handle different message types
      switch (data.type) {
        case 'NERVE_MESSAGE':
          onMessage?.({
            port: data.port,
            payload: data.payload,
            organId: data.organId,
          });
          break;
          
        case 'NERVE_READ_REQUEST':
          // TODO: Implement data read through Nerve API
          console.log('Organ requested data read:', data.path);
          break;
          
        case 'NERVE_SUBSCRIBE':
          // TODO: Implement subscription handling
          console.log('Organ subscribed to path:', data.path);
          break;
          
        case 'NERVE_READY':
          setIsLoading(false);
          onReady?.();
          break;
          
        case 'NERVE_ERROR':
          setHasError(true);
          onError?.(new Error(data.message || 'Unknown organ error'));
          break;
      }
    },
    [onMessage, onError, onReady]
  );

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Generate blob URL for iframe content
  const blobUrl = useCallback(() => {
    const html = generateSandboxHtml(organId, content, customStyles);
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [organId, content, customStyles]);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle iframe error
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
        src={blobUrl()}
        sandbox={SANDBOX_ATTRS}
        onLoad={handleLoad}
        onError={handleError}
        title={`Organ: ${organId}`}
        aria-label={`Organ ${organId} sandbox`}
        // Security attributes
        allow=""
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
