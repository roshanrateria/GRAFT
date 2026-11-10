/**
 * Manifest Validation Tests
 *
 * Tests for IMM-02: Permission Violation Rejection
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateManifest, crossReferencePermissions } from '../manifest/index.js';
import type { OrganManifest } from '../types.js';

// ============================================================================
// IMM-02: Permission Violation Detection (PBT)
// ============================================================================

describe('Manifest Validation - IMM-02', () => {
  describe('Schema Validation', () => {
    it('should accept valid manifest', () => {
      const manifest = JSON.stringify({
        name: 'test-organ',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read:mood.entries'],
        ports: [],
        slotSize: 'small',
      });

      const result = validateManifest(manifest);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject manifest with invalid permission format', () => {
      const manifest = JSON.stringify({
        name: 'test-organ',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['invalid-permission'],  // Missing colon separator
        ports: [],
        slotSize: 'small',
      });

      const result = validateManifest(manifest);

      expect(result.passed).toBe(false);
      // Invalid permission format should fail schema validation
      expect(result.error || result.violations.length > 0).toBeTruthy();
    });

    it('should reject manifest with invalid read target', () => {
      const manifest = JSON.stringify({
        name: 'test-organ',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read:invalid.domain'],
        ports: [],
        slotSize: 'small',
      });

      const result = validateManifest(manifest);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.message.includes('Invalid read target'))).toBe(true);
    });

    it('should reject manifest missing required fields', () => {
      const manifest = JSON.stringify({
        name: 'test-organ',
        // missing version, apiVersion, permissions
      });

      const result = validateManifest(manifest);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid JSON', () => {
      const manifest = 'not valid json';

      const result = validateManifest(manifest);

      expect(result.passed).toBe(false);
      expect(result.error?.code).toBe('IMM_MANIFEST_PARSE_ERROR');
    });

    // Property-based test
    it('PBT: should validate permission strings', () => {
      const validTargets = ['mood.entries', 'tasks.items', 'habits.checkins', 'calendar.events'];
      
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constantFrom('read', 'emit', 'subscribe'),
            // Use ASCII alphanumeric strings to avoid escaping issues
            target: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789.'.split('')), { minLength: 1, maxLength: 20 }),
          }),
          ({ action, target }) => {
            const permission = `${action}:${target}`;
            const manifest = JSON.stringify({
              name: 'test',
              version: '1.0.0',
              apiVersion: '1.0.0',
              permissions: [permission],
              slotSize: 'small',
            });

            const result = validateManifest(manifest);

            // For read actions, only specific targets are valid
            if (action === 'read' && !validTargets.includes(target)) {
              expect(result.passed).toBe(false);
            } else if (action === 'emit' || action === 'subscribe') {
              // emit and subscribe can have any non-empty target
              expect(result.passed).toBe(true);
            }
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });
  });

  describe('Permission Cross-Reference', () => {
    it('should detect undeclared read', () => {
      const manifest: OrganManifest = {
        name: 'test',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: [],
        ports: [],
        slotSize: 'small',
      };

      const code = `
        nerve.read('mood.entries');
      `;

      const result = crossReferencePermissions(manifest, code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'undeclared-read')).toBe(true);
    });

    it('should detect undeclared emit', () => {
      const manifest: OrganManifest = {
        name: 'test',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read:mood.entries'],
        ports: [],
        slotSize: 'small',
      };

      const code = `
        nerve.emit('output', { data: 'test' });
      `;

      const result = crossReferencePermissions(manifest, code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'undeclared-emit')).toBe(true);
    });

    it('should pass when permissions match', () => {
      const manifest: OrganManifest = {
        name: 'test',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['read:mood.entries', 'emit:output'],
        ports: [{ name: 'output', direction: 'out', schema: { type: 'object' } }],
        slotSize: 'small',
      };

      const code = `
        const data = nerve.read('mood.entries');
        nerve.emit('output', data);
      `;

      const result = crossReferencePermissions(manifest, code);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
