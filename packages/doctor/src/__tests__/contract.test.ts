import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyContract, normalizePorts, normalizePermissions } from '../contract.js';
import type { OrganBundle } from '../types.js';

function bundle(manifest: Record<string, unknown>): OrganBundle {
  return { manifest: manifest as unknown as OrganBundle['manifest'], indexHtml: '<p/>' };
}

describe('port contract', () => {
  it('normalizePorts drops malformed entries and de-duplicates', () => {
    const ports = normalizePorts([
      { name: 'a', direction: 'out', schema: { type: 'integer' } },
      { name: 'a', direction: 'out', schema: {} },
      { name: '', direction: 'in', schema: {} },
      { name: 'b', direction: 'sideways', schema: {} },
      { name: 'c', direction: 'in' },
      'nope',
      null,
    ]);
    expect(ports).toEqual([
      { name: 'a', direction: 'out', schema: { type: 'integer' } },
      { name: 'c', direction: 'in', schema: {} },
    ]);
  });

  it('normalizePorts / normalizePermissions never throw on non-arrays', () => {
    expect(normalizePorts(undefined)).toEqual([]);
    expect(normalizePorts({})).toEqual([]);
    expect(normalizePermissions('x')).toEqual([]);
  });

  it('contract ports override whatever the model wrote', () => {
    const out = applyContract(
      bundle({
        name: 'counter',
        permissions: ['read:tasks.items', 'emit:openCount'],
        ports: [{ name: 'openCount', direction: 'out', schema: { type: 'object' } }],
      }),
      {
        ports: [{ name: 'open-count', direction: 'out', schema: { type: 'integer' } }],
        permissions: ['read:tasks.items', 'subscribe:tasks.items'],
      }
    );
    expect(out.manifest.ports).toEqual([
      { name: 'open-count', direction: 'out', schema: { type: 'integer' } },
    ]);
    expect(out.manifest.permissions).toContain('emit:open-count');
    expect(out.manifest.permissions).toContain('subscribe:tasks.items');
    // stale emit permission for an undeclared port is dropped
    expect(out.manifest.permissions).not.toContain('emit:openCount');
  });

  it('keeps the model ports when the contract is empty, and never leaves ports undefined', () => {
    const kept = applyContract(
      bundle({ permissions: [], ports: [{ name: 'x', direction: 'out', schema: {} }] }),
      {}
    );
    expect(kept.manifest.ports.map(p => p.name)).toEqual(['x']);
    expect(kept.manifest.permissions).toEqual(['emit:x']);

    const missing = applyContract(bundle({ permissions: [] }), {});
    expect(missing.manifest.ports).toEqual([]);
  });

  it('property: output ports equal the contract ports and every out port has emit permission', () => {
    const portArb = fc.record({
      name: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
      direction: fc.constantFrom('in' as const, 'out' as const),
      schema: fc.constantFrom({ type: 'integer' }, { type: 'number' }, { type: 'string' }, {}),
    });
    fc.assert(
      fc.property(
        fc.array(portArb, { maxLength: 5 }),
        fc.array(portArb, { minLength: 1, maxLength: 5 }),
        fc.array(fc.string(), { maxLength: 5 }),
        (modelPorts, contractPorts, perms) => {
          const out = applyContract(bundle({ permissions: perms, ports: modelPorts }), {
            ports: contractPorts,
          });
          const expected = normalizePorts(contractPorts);
          expect(out.manifest.ports).toEqual(expected);
          for (const p of expected.filter(p => p.direction === 'out')) {
            expect(out.manifest.permissions).toContain(`emit:${p.name}`);
          }
          const outNames = new Set(expected.filter(p => p.direction === 'out').map(p => p.name));
          for (const perm of out.manifest.permissions) {
            if (perm.startsWith('emit:')) expect(outNames.has(perm.slice(5))).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
