/**
 * Static Analysis - Combined Module
 *
 * Combines JS and HTML analyzers for complete static scan.
 */
import type { StaticAnalysisResult } from '../types.js';
export { analyzeJavaScript } from './js-analyzer.js';
export { analyzeHTML } from './html-analyzer.js';
export { extractInlineScripts } from './static-helpers.js';
/**
 * Perform complete static analysis on an organ bundle.
 * Checks both HTML and embedded JavaScript.
 */
export declare function performStaticAnalysis(indexHtml: string, manifestJson: string): StaticAnalysisResult;
//# sourceMappingURL=index.d.ts.map