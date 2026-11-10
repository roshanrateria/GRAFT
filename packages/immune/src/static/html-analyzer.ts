/**
 * HTML Static Analyzer
 *
 * Uses parse5 for HTML banned construct detection.
 * Implements IMM-01: Banned Construct Rejection.
 */

import * as parse5 from 'parse5';
import type {
  BannedConstruct,
  BannedConstructType,
  StaticAnalysisResult,
  SourceLocation,
} from '../types.js';

// ============================================================================
// HTML Analyzer
// ============================================================================

/**
 * Analyze HTML for banned constructs.
 * Detects iframe, script src, external URLs, etc.
 */
export function analyzeHTML(
  html: string,
  filename: string = 'index.html'
): StaticAnalysisResult {
  const constructs: BannedConstruct[] = [];

  try {
    // Parse the HTML
    const document = parse5.parse(html, {
      sourceCodeLocationInfo: true,
    });

    // Walk the DOM and detect banned constructs
    walkDocument(document, filename, constructs);

    return {
      passed: constructs.length === 0,
      constructs,
    };
  } catch (error) {
    return {
      passed: false,
      constructs: [],
      error: {
        code: 'IMM_HTML_PARSE_ERROR',
        message: `Failed to parse HTML: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

// ============================================================================
// DOM Walker
// ============================================================================

function walkDocument(
  node: any,
  filename: string,
  constructs: BannedConstruct[]
): void {
  if (!node) return;

  // Check element nodes
  if (node.tagName) {
    checkElement(node, filename, constructs);
  }

  // Recursively walk children
  if (node.childNodes) {
    for (const child of node.childNodes) {
      walkDocument(child, filename, constructs);
    }
  }
}

function checkElement(
  node: any,
  filename: string,
  constructs: BannedConstruct[]
): void {
  const tagName = node.tagName.toLowerCase();
  const attrs = node.attrs || [];

  // Check for <iframe>
  if (tagName === 'iframe') {
    constructs.push({
      type: 'iframe',
      reason: '<iframe> elements are not allowed',
      location: createLocation(filename, node.sourceCodeLocation),
    });
  }

  // Check for <script src="...">
  if (tagName === 'script') {
    const srcAttr = attrs.find((a: any) => a.name === 'src');
    if (srcAttr) {
      constructs.push({
        type: 'script-src',
        reason: '<script src="..."> is not allowed. Use inline scripts only',
        location: createLocation(filename, node.sourceCodeLocation),
      });
    }
  }

  // Check for external URLs in <link>, <img>, etc.
  if (tagName === 'link' || tagName === 'img') {
    const urlAttr = attrs.find((a: any) => a.name === 'href' || a.name === 'src');
    if (urlAttr && isExternalURL(urlAttr.value)) {
      constructs.push({
        type: 'external-url',
        reason: `External URL in <${tagName}> is not allowed`,
        location: createLocation(filename, node.sourceCodeLocation),
      });
    }
  }

  // Check for <form action="...">
  if (tagName === 'form') {
    const actionAttr = attrs.find((a: any) => a.name === 'action');
    if (actionAttr && isExternalURL(actionAttr.value)) {
      constructs.push({
        type: 'form-action',
        reason: '<form action="..."> with external URL is not allowed',
        location: createLocation(filename, node.sourceCodeLocation),
      });
    }
  }

  // Check for event handlers (onclick, onload, etc.)
  for (const attr of attrs) {
    if (attr.name.startsWith('on') && attr.name.length > 2) {
      // Event handlers are OK, but check if they contain banned patterns
      // This is handled by the JS analyzer
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function isExternalURL(url: string): boolean {
  // Allow data: URLs
  if (url.startsWith('data:')) return false;

  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return false;
  }

  // Check for absolute URLs
  try {
    const parsed = new URL(url, 'http://localhost');
    // If we can parse it as absolute, it's external
    return parsed.protocol.startsWith('http') || parsed.protocol.startsWith('//');
  } catch {
    // If it can't be parsed, assume it's not external
    return false;
  }
}

function createLocation(filename: string, loc: any): SourceLocation {
  if (!loc) {
    return { file: filename, line: 0 };
  }
  // parse5 uses 1-based line numbers
  return {
    file: filename,
    line: loc.startLine || 0,
    column: loc.startCol || 0,
  };
}
