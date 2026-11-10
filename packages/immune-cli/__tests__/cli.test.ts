/**
 * CLI Tests
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { runImmuneOnOrgan } from '../src/runner.js';

const FIXTURES_DIR = resolve(__dirname, '../../../organs');

describe('immune-cli', () => {
  describe('runImmuneOnOrgan', () => {
    it('should reject benign organ that uses window.parent (expected - must use Nerve API)', async () => {
      // Per README: "All 20 benign organs in the corpus were rejected by static analysis
      // for using `window.parent`. This is expected: `window.parent` is blocked as a
      // sandbox escape vector, so organs cannot communicate with the parent frame except
      // through the Nerve API."
      const organDir = resolve(FIXTURES_DIR, 'handwritten/mood-weather');
      const result = await runImmuneOnOrgan(organDir);

      // Mood-weather uses window.parent.postMessage, so it's correctly rejected
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('mood-weather');
      expect(result.output).toContain('REJECTED');
      expect(result.report).toBeDefined();
    });

    it('should reject hostile organ that fails static check', async () => {
      const organDir = resolve(FIXTURES_DIR, 'hostile/01-direct-fetch');
      const result = await runImmuneOnOrgan(organDir);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('REJECTED');
      expect(result.report).toBeDefined();
      expect(result.report?.passed).toBe(false);
    });

    it('should return error code for non-existent directory', async () => {
      const organDir = resolve(FIXTURES_DIR, 'non-existent-organ');
      const result = await runImmuneOnOrgan(organDir);

      expect(result.exitCode).toBe(2);
      expect(result.output).toContain('Error:');
      expect(result.output).toContain('not found');
    });

    it('should output JSON when json option is true', async () => {
      const organDir = resolve(FIXTURES_DIR, 'hostile/01-direct-fetch');
      const result = await runImmuneOnOrgan(organDir, { json: true });

      expect(result.exitCode).toBe(1);

      // Should be valid JSON
      const parsed = JSON.parse(result.output);
      expect(parsed.organ).toBe('direct-fetch');
      expect(parsed.verdict).toBe('REJECTED');
      expect(parsed.stages).toBeInstanceOf(Array);
    });

    it('should include verbose details when verbose option is true', async () => {
      const organDir = resolve(FIXTURES_DIR, 'hostile/01-direct-fetch');
      const result = await runImmuneOnOrgan(organDir, { verbose: true });

      expect(result.exitCode).toBe(1);
      // Verbose mode should include error details
      expect(result.output).toContain('REJECTED');
    });

    it('should run only specific stage when stage option is set', async () => {
      const organDir = resolve(FIXTURES_DIR, 'hostile/01-direct-fetch');
      const result = await runImmuneOnOrgan(organDir, { stage: 'static' });

      // Static stage should fail for this hostile organ
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain('static');
    });

    it('should report rejection details in JSON format', async () => {
      const organDir = resolve(FIXTURES_DIR, 'hostile/01-direct-fetch');
      const result = await runImmuneOnOrgan(organDir, { json: true });

      expect(result.exitCode).toBe(1);

      const parsed = JSON.parse(result.output);
      expect(parsed.verdict).toBe('REJECTED');
      expect(parsed.rejection).toBeDefined();
      expect(parsed.rejection?.stage).toBeDefined();
      expect(parsed.rejection?.reasonCode).toBeDefined();
    });
  });
});
