/**
 * Static Analysis - Combined Module
 *
 * Combines JS and HTML analyzers for complete static scan.
 */

import { analyzeJavaScript } from './js-analyzer.js';
import { analyzeHTML } from './html-analyzer.js';
import { extractInlineScripts } from './static-helpers.js';
import type { BannedConstruct, StaticAnalysisResult } from '../types.js';

export { analyzeJavaScript } from './js-analyzer.js';
export { analyzeHTML } from './html-analyzer.js';
export { extractInlineScripts } from './static-helpers.js';

/**
 * Perform complete static analysis on an organ bundle.
 * Checks both HTML and embedded JavaScript.
 */
export function performStaticAnalysis(
  indexHtml: string,
  manifestJson: string
): StaticAnalysisResult {
  const allConstructs: BannedConstruct[] = [];
  const errors: string[] = [];

  // Analyze HTML
  const htmlResult = analyzeHTML(indexHtml, 'index.html');
  if (htmlResult.constructs) {
    allConstructs.push(...htmlResult.constructs);
  }
  if (htmlResult.error) {
    errors.push(htmlResult.error.message);
  }

  // Extract and analyze inline JavaScript
  const inlineScripts = extractInlineScripts(indexHtml);
  for (let i = 0; i < inlineScripts.length; i++) {
    const script = inlineScripts[i];
    const jsResult = analyzeJavaScript(script.code, `inline-script-${i + 1}.js`);

    if (jsResult.constructs) {
      allConstructs.push(...jsResult.constructs);
    }
    if (jsResult.error) {
      errors.push(jsResult.error.message);
    }
  }

  // Analyze manifest JSON (for future use if needed)
  // Currently manifest is validated in Stage 2

  return {
    passed: allConstructs.length === 0 && errors.length === 0,
    constructs: allConstructs,
    error: errors.length > 0
      ? {
          code: 'IMM_STATIC_ERROR',
          message: errors.join('; '),
        }
      : undefined,
  };
}
