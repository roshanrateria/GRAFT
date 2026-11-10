/**
 * JavaScript Static Analyzer
 *
 * Uses acorn + acorn-walk for AST-based banned construct detection.
 * Implements IMM-01: Banned Construct Rejection.
 */
import type { StaticAnalysisResult } from '../types.js';
/**
 * Analyze JavaScript code for banned constructs.
 * Uses AST analysis, not regex, to catch obfuscated cases.
 */
export declare function analyzeJavaScript(code: string, filename?: string): StaticAnalysisResult;
//# sourceMappingURL=js-analyzer.d.ts.map