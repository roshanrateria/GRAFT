/**
 * SandboxHost Tests (node-safe)
 *
 * Tests the pure `generateSandboxHtml` builder used to construct the
 * sandboxed iframe document for organ rendering:
 * - fragment scaffolding (CSP, shim, organ-root, organ code)
 * - complete-document injection (after <head>, or prepended)
 * - organ id / API version substitution
 * - custom style injection
 */

import { describe, it, expect } from 'vitest';
import { generateSandboxHtml } from '../components/SandboxHost';
import { NERVE_API_VERSION, CSP_META_TAG } from '@graft/nerve';

describe('generateSandboxHtml', () => {
  describe('fragment wrapping', () => {
    it('wraps a script fragment in a scaffold document with organ-root and CSP', () => {
      const html = generateSandboxHtml('my-organ', 'nerve.emit("ready");');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('<div id="organ-root"></div>');
      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain('nerve.emit("ready");');
    });

    it('injects the organ id and Nerve API version into the shim', () => {
      const html = generateSandboxHtml('my-organ', '');

      // Organ id appears (JSON-quoted in the shim, no raw placeholders left)
      expect(html).toContain('my-organ');
      expect(html).not.toContain('__ORGAN_ID__');
      expect(html).not.toContain('__API_VERSION__');
      // The hello message must carry the exact version string. Extra quotes
      // would make the host see a mismatch and decay the organ.
      expect(html).toContain(`apiVersion: '${NERVE_API_VERSION}'`);
    });

    it('includes custom styles when provided', () => {
      const html = generateSandboxHtml('my-organ', '', 'body { color: red; }');
      expect(html).toContain('<style>body { color: red; }</style>');
    });

    it('embeds the fragment as organ code inside a script tag', () => {
      const code = 'const x = nerve.random();';
      const html = generateSandboxHtml('my-organ', code);
      expect(html).toContain(`// Organ content\n    ${code}`);
    });
  });

  describe('complete organ documents', () => {
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>My Organ</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>`;

    it('injects CSP + shim right after the opening <head> tag without wrapping', () => {
      const html = generateSandboxHtml('my-organ', doc);

      // Still the same document - not wrapped in a scaffold
      expect(html).toContain('<title>My Organ</title>');
      expect(html).not.toContain('id="organ-root"');

      // Injection appears immediately after <head>
      const headIndex = html.indexOf('<head>');
      const injectionIndex = html.indexOf(CSP_META_TAG);
      expect(injectionIndex).toBeGreaterThan(headIndex);
      expect(html.slice(headIndex, injectionIndex)).toBe('<head>');

      // The Nerve shim was injected (hello handshake present)
      expect(html).toContain("type: 'hello'");
    });

    it('prepends the injection when the document has no <head>', () => {
      const headless = '<html><body><h1>No head</h1></body></html>';
      const html = generateSandboxHtml('my-organ', headless);

      // Injection is prepended before the document
      expect(html.startsWith(CSP_META_TAG)).toBe(true);
      expect(html).toContain('<h1>No head</h1>');
      expect(html).toContain("type: 'hello'");
    });

    it('detects complete documents by DOCTYPE even without an <html> tag', () => {
      const doctypeOnly = '<!DOCTYPE html><body><p>x</p></body>';
      const html = generateSandboxHtml('my-organ', doctypeOnly);

      // Injected (not scaffold-wrapped: no organ-root div)
      expect(html).not.toContain('id="organ-root"');
      expect(html).toContain('<p>x</p>');
    });

    it('leaves placeholder tokens in organ content untouched', () => {
      // An organ may legitimately contain text like __ORGAN_ID__ in its own
      // content; the shim replacement must not corrupt it beyond the shim.
      const html = generateSandboxHtml('shim-test', '// keep __ORGAN_ID__ as-is');
      // The fragment copy still contains it (organ code is embedded verbatim)
      expect(html).toContain('// keep __ORGAN_ID__ as-is');
    });
  });

  describe('security posture', () => {
    it('always includes the CSP meta tag', () => {
      const fragment = generateSandboxHtml('o', 'x');
      const document = generateSandboxHtml('o', '<html><head></head><body></body></html>');
      const headless = generateSandboxHtml('o', '<html><body></body></html>');

      expect(fragment).toContain(CSP_META_TAG);
      expect(document).toContain(CSP_META_TAG);
      expect(headless).toContain(CSP_META_TAG);
    });

    it('always includes the hello-handshake shim', () => {
      const fragment = generateSandboxHtml('o', 'x');
      const document = generateSandboxHtml('o', '<html><head></head><body></body></html>');

      expect(fragment).toContain("type: 'hello'");
      expect(document).toContain("type: 'hello'");
    });
  });
});
