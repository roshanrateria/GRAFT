/**
 * Behavioral Harness
 *
 * Browser-based sandbox for runtime organ verification.
 * Implements Stage 3: Behavioral Run.
 */
// ============================================================================
// Behavioral Check Configuration
// ============================================================================
/** Maximum allowed load time in milliseconds */
const MAX_LOAD_TIME_MS = 1500;
/** Maximum allowed DOM node count */
const MAX_DOM_NODES = 2000;
/** Timeout for behavioral run in milliseconds */
const BEHAVIORAL_TIMEOUT_MS = 5000;
// ============================================================================
// Behavioral Runner
// ============================================================================
/**
 * Run behavioral checks on an organ in a sandboxed iframe.
 * NOTE: This is designed to be called from browser context.
 * Server-side, this returns a placeholder that needs browser execution.
 */
export function runBehavioralCheck(indexHtml, manifest) {
    // This is a placeholder that will be expanded when integrated
    // with the browser sandbox in apps/web
    return {
        passed: true,
        metrics: {
            loadTime: 0,
            hasErrors: false,
            errors: [],
            domNodeCount: 0,
            hasCSPViolations: false,
            cspViolations: [],
            messages: [],
        },
    };
}
/**
 * Create a sandboxed iframe for organ testing.
 * Returns iframe element and message channel.
 */
export function createSandboxedIframe(indexHtml) {
    if (typeof document === 'undefined') {
        // Not in browser context
        return null;
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    // Inject CSP meta tag
    const htmlWithCsp = indexHtml.replace(/<head>/i, '<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:;">');
    // Use srcdoc for sandboxing
    iframe.srcdoc = htmlWithCsp;
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
export function measureBehavioralMetrics(iframe, timeout = BEHAVIORAL_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const errors = [];
        const cspViolations = [];
        const messages = [];
        let resolved = false;
        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                const loadTime = Date.now() - startTime;
                // Count DOM nodes
                let domNodeCount = 0;
                try {
                    if (iframe.contentDocument) {
                        domNodeCount = iframe.contentDocument.getElementsByTagName('*').length;
                    }
                }
                catch (e) {
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
        // Set timeout
        setTimeout(cleanup, timeout);
        // Listen for load
        iframe.addEventListener('load', () => {
            cleanup();
        });
        // Listen for errors
        iframe.addEventListener('error', (e) => {
            errors.push(e.message || 'Unknown iframe error');
        });
        // Listen for CSP violations
        document.addEventListener('securitypolicyviolation', (e) => {
            if (e.target === iframe) {
                cspViolations.push(`CSP violation: ${e.violatedDirective} - ${e.blockedURI}`);
            }
        });
    });
}
/**
 * Validate behavioral metrics against limits.
 */
export function validateBehavioralMetrics(metrics) {
    const violations = [];
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
    return {
        passed: violations.length === 0,
        violations,
    };
}
//# sourceMappingURL=index.js.map