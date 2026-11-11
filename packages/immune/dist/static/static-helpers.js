/**
 * Static Analysis Helpers
 *
 * Shared utilities for static analysis.
 */
/**
 * Extract inline scripts from HTML.
 */
export function extractInlineScripts(html) {
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        const code = match[1].trim();
        if (code) {
            scripts.push({ code });
        }
    }
    return scripts;
}
//# sourceMappingURL=static-helpers.js.map