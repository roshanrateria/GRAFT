/**
 * HTML Static Analyzer
 *
 * Uses parse5 for HTML banned construct detection.
 * Implements IMM-01: Banned Construct Rejection.
 */
import type { StaticAnalysisResult } from '../types.js';
/**
 * Analyze HTML for banned constructs.
 * Detects iframe, script src, external URLs, etc.
 */
export declare function analyzeHTML(html: string, filename?: string): StaticAnalysisResult;
//# sourceMappingURL=html-analyzer.d.ts.map