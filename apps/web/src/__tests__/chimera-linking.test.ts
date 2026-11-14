/**
 * Chimera Linking Tests
 *
 * Covers:
 * - CHI-01: schema compatibility rules
 * - CHI-02: cycle prevention (direct, multi-hop, self-link)
 * - validateLink rejection reasons
 * - getCompatibleTargets enumeration
 * - createChimeraLink ledger-first semantics (fail closed)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  schemasCompatible,
  hasPath,
  wouldCreateCycle,
  validateLink,
  getCompatibleTargets,
  createChimeraLink,
} from '../ChimeraLinking';
import type { ChimeraLink, OrganInstance } from '../stores/creatureStore';
import type { Entry, LedgerService } from '@graft/ledger';

// ============================================================================
// Fixtures
// ============================================================================

function makeOrgan(
  id: string,
  inPorts: Array<{ name: string; schema: object }>,
  outPorts: Array<{ name: string; schema: object }>
): OrganInstance {
  return {
    id,
    name: id,
    manifest: {
      name: id,
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: [],
      ports: [
        ...inPorts.map(p => ({ name: p.name, direction: 'in' as const, schema: p.schema })),
        ...outPorts.map(p => ({ name: p.name, direction: 'out' as const, schema: p.schema })),
      ],
      slotSize: 'medium',
    },
    status: 'active',
    installedAt: new Date().toISOString(),
  };
}

const organA = makeOrgan(
  'organ-a',
  [{ name: 'in', schema: { type: 'object', properties: { count: { type: 'number' } }, required: ['count'] } }],
  [{ name: 'out', schema: { type: 'object', properties: { count: { type: 'number' } } } }]
);

const organB = makeOrgan(
  'organ-b',
  [{ name: 'in', schema: { type: 'object', properties: { count: { type: 'number' } }, required: ['count'] } }],
  [{ name: 'out', schema: { type: 'object', properties: { count: { type: 'number' } } } }]
);

const organs = new Map<string, OrganInstance>([
  ['organ-a', organA],
  ['organ-b', organB],
]);

const noLinks: ChimeraLink[] = [];

/** Minimal in-memory ledger mock: chain-head aware, records appends. */
function makeLedger(initial: Entry[] = []) {
  const history = [...initial];
  const appended: Entry[] = [];
  const service: LedgerService = {
    getHistory: async () => history,
    append: vi.fn(async (entry: Omit<Entry, 'hash'>) => {
      const full: Entry = { ...entry, hash: `hash-${history.length}` } as Entry;
      history.push(full);
      appended.push(full);
      return full;
    }),
    verify: async () => ({ valid: true, length: history.length }),
  } as unknown as LedgerService;
  return { service, appended, history };
}

// ============================================================================
// CHI-01: Schema Compatibility
// ============================================================================

describe('schemasCompatible (CHI-01)', () => {
  it('accepts when output covers every required input field with matching types', () => {
    const out = { type: 'object', properties: { count: { type: 'number' }, note: { type: 'string' } } };
    const input = { type: 'object', properties: { count: { type: 'number' } }, required: ['count'] };
    expect(schemasCompatible(out, input)).toBe(true);
  });

  it('rejects when a required input field is missing from the output', () => {
    const out = { type: 'object', properties: { note: { type: 'string' } } };
    const input = { type: 'object', properties: { count: { type: 'number' } }, required: ['count'] };
    expect(schemasCompatible(out, input)).toBe(false);
  });

  it('rejects when a common field has mismatched types', () => {
    const out = { type: 'object', properties: { count: { type: 'string' } } };
    const input = { type: 'object', properties: { count: { type: 'number' } } };
    expect(schemasCompatible(out, input)).toBe(false);
  });

  it('treats undeclared schemas as permissive', () => {
    expect(schemasCompatible(undefined, undefined)).toBe(true);
    expect(schemasCompatible(undefined, { type: 'object', required: ['x'] })).toBe(true);
    expect(schemasCompatible({}, {})).toBe(true);
  });

  it('permits extra output fields (output may be a superset)', () => {
    const out = { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' }, c: { type: 'number' } } };
    const input = { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] };
    expect(schemasCompatible(out, input)).toBe(true);
  });

  it('primitive roots: integer feeds integer and number, but not string or the reverse', () => {
    expect(schemasCompatible({ type: 'integer' }, { type: 'integer' })).toBe(true);
    expect(schemasCompatible({ type: 'integer' }, { type: 'number' })).toBe(true);
    expect(schemasCompatible({ type: 'number' }, { type: 'integer' })).toBe(false);
    expect(schemasCompatible({ type: 'integer' }, { type: 'string' })).toBe(false);
  });

  it('a multi-field object cannot feed a primitive input', () => {
    const out = { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } } };
    expect(schemasCompatible(out, { type: 'string' })).toBe(false);
  });

  it('a schema is always compatible with itself', () => {
    const schemas = [
      { type: 'integer' },
      { type: 'number' },
      { type: 'string' },
      { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
      {},
    ];
    for (const s of schemas) expect(schemasCompatible(s, s)).toBe(true);
  });

  it('links the open-count integer ports of two organs', () => {
    const counter = makeOrgan('counter', [], [{ name: 'open-count', schema: { type: 'integer' } }]);
    const badge = makeOrgan('badge', [{ name: 'open-count', schema: { type: 'integer' } }], []);
    const map = new Map<string, OrganInstance>([
      ['counter', counter],
      ['badge', badge],
    ]);
    expect(validateLink([], map, 'counter', 'open-count', 'badge', 'open-count').valid).toBe(true);
    expect(getCompatibleTargets([], map, 'counter', 'open-count')).toEqual([
      { organId: 'badge', port: 'open-count' },
    ]);
  });

  it('tolerates an organ whose manifest has no ports array', () => {
    const noPorts = makeOrgan('x', [], []);
    (noPorts.manifest as { ports?: unknown }).ports = undefined;
    const map = new Map<string, OrganInstance>([
      ['x', noPorts],
      ['organ-a', organA],
    ]);
    expect(validateLink([], map, 'organ-a', 'out', 'x', 'in').valid).toBe(false);
    expect(getCompatibleTargets([], map, 'organ-a', 'out')).toEqual([]);
  });
});

// ============================================================================
// CHI-02: Cycle Prevention
// ============================================================================

describe('wouldCreateCycle (CHI-02)', () => {
  const links: ChimeraLink[] = [
    { id: 'l1', sourceOrganId: 'a', sourcePort: 'out', targetOrganId: 'b', targetPort: 'in' },
    { id: 'l2', sourceOrganId: 'b', sourcePort: 'out', targetOrganId: 'c', targetPort: 'in' },
  ];

  it('detects a direct back-link that would close a two-node cycle', () => {
    // b -> a would close a -> b -> a
    expect(wouldCreateCycle(links, 'b', 'a')).toBe(true);
  });

  it('detects a multi-hop cycle (target can reach the source through the chain)', () => {
    // c -> a closes a -> b -> c -> a
    expect(wouldCreateCycle(links, 'c', 'a')).toBe(true);
  });

  it('allows a forward link along the chain direction', () => {
    expect(wouldCreateCycle(links, 'a', 'c')).toBe(false);
  });

  it('treats a self-link as a cycle', () => {
    expect(wouldCreateCycle(links, 'a', 'a')).toBe(true);
  });

  it('detects the closed loop in a diamond (d -> a makes a -> b -> d -> a)', () => {
    const diamond: ChimeraLink[] = [
      { id: 'd1', sourceOrganId: 'a', sourcePort: 'out', targetOrganId: 'b', targetPort: 'in' },
      { id: 'd2', sourceOrganId: 'a', sourcePort: 'out', targetOrganId: 'c', targetPort: 'in' },
      { id: 'd3', sourceOrganId: 'b', sourcePort: 'out', targetOrganId: 'd', targetPort: 'in' },
      { id: 'd4', sourceOrganId: 'c', sourcePort: 'out', targetOrganId: 'd', targetPort: 'in' },
    ];
    expect(hasPath(diamond, 'd', 'a')).toBe(false);
    expect(wouldCreateCycle(diamond, 'd', 'a')).toBe(true); // closes a->b->d->a
  });

  it('allows edges inside a DAG that do not close a loop', () => {
    const diamond: ChimeraLink[] = [
      { id: 'd1', sourceOrganId: 'a', sourcePort: 'out', targetOrganId: 'b', targetPort: 'in' },
      { id: 'd2', sourceOrganId: 'a', sourcePort: 'out', targetOrganId: 'c', targetPort: 'in' },
      { id: 'd3', sourceOrganId: 'b', sourcePort: 'out', targetOrganId: 'd', targetPort: 'in' },
      { id: 'd4', sourceOrganId: 'c', sourcePort: 'out', targetOrganId: 'd', targetPort: 'in' },
    ];
    // b -> c adds no cycle: c cannot reach b through the existing edges.
    expect(hasPath(diamond, 'c', 'b')).toBe(false);
    expect(wouldCreateCycle(diamond, 'b', 'c')).toBe(false);
  });
});

// ============================================================================
// validateLink
// ============================================================================

describe('validateLink', () => {
  it('accepts a legal out -> in link between different organs', () => {
    const { valid, reason } = validateLink(noLinks, organs, 'organ-a', 'out', 'organ-b', 'in');
    expect(valid).toBe(true);
    expect(reason).toBeUndefined();
  });

  it('rejects a self-link', () => {
    const { valid, reason } = validateLink(noLinks, organs, 'organ-a', 'out', 'organ-a', 'in');
    expect(valid).toBe(false);
    expect(reason).toBe('self_link');
  });

  it('rejects when an organ is not installed', () => {
    const { valid, reason } = validateLink(noLinks, organs, 'ghost', 'out', 'organ-b', 'in');
    expect(valid).toBe(false);
    expect(reason).toBe('unknown_organ');
  });

  it('rejects when the ports do not exist in the given direction', () => {
    const inAsOut = validateLink(noLinks, organs, 'organ-a', 'in', 'organ-b', 'in');
    expect(inAsOut.valid).toBe(false);
    expect(inAsOut.reason).toBe('unknown_port');

    const outAsIn = validateLink(noLinks, organs, 'organ-a', 'out', 'organ-b', 'out');
    expect(outAsIn.valid).toBe(false);
    expect(outAsIn.reason).toBe('unknown_port');
  });

  it('rejects schema-incompatible ports (CHI-01)', () => {
    const strictTarget = makeOrgan(
      'strict',
      [{ name: 'in', schema: { type: 'object', properties: { total: { type: 'number' } }, required: ['total'] } }],
      []
    );
    const targetOrgans = new Map<string, OrganInstance>([
      ['organ-a', organA],
      ['strict', strictTarget],
    ]);

    const { valid, reason } = validateLink(noLinks, targetOrgans, 'organ-a', 'out', 'strict', 'in');
    expect(valid).toBe(false);
    expect(reason).toBe('schema_incompatible');
  });

  it('rejects a link that would create a cycle (CHI-02)', () => {
    const cycleLinks: ChimeraLink[] = [
      { id: 'l1', sourceOrganId: 'organ-b', sourcePort: 'out', targetOrganId: 'organ-a', targetPort: 'in' },
    ];
    const { valid, reason } = validateLink(cycleLinks, organs, 'organ-a', 'out', 'organ-b', 'in');
    expect(valid).toBe(false);
    expect(reason).toBe('cycle');
  });

  it('rejects an exact duplicate of an existing link', () => {
    const existing: ChimeraLink[] = [
      { id: 'l1', sourceOrganId: 'organ-a', sourcePort: 'out', targetOrganId: 'organ-b', targetPort: 'in' },
    ];
    const { valid, reason } = validateLink(existing, organs, 'organ-a', 'out', 'organ-b', 'in');
    expect(valid).toBe(false);
    expect(reason).toBe('duplicate');
  });
});

// ============================================================================
// getCompatibleTargets (UI-04 highlighting)
// ============================================================================

describe('getCompatibleTargets', () => {
  it('lists compatible in ports of other organs only', () => {
    const targets = getCompatibleTargets(noLinks, organs, 'organ-a', 'out');
    expect(targets).toEqual([{ organId: 'organ-b', port: 'in' }]);
  });

  it('excludes targets that would create a cycle', () => {
    const links: ChimeraLink[] = [
      { id: 'l1', sourceOrganId: 'organ-b', sourcePort: 'out', targetOrganId: 'organ-a', targetPort: 'in' },
    ];
    const targets = getCompatibleTargets(links, organs, 'organ-a', 'out');
    expect(targets).toEqual([]);
  });
});

// ============================================================================
// createChimeraLink (ledger-first)
// ============================================================================

describe('createChimeraLink', () => {
  const deps = (ledger: LedgerService, links: ChimeraLink[] = noLinks) => ({
    ledgerService: ledger,
    getState: () => ({ chimeraLinks: links, organs }),
    setState: (state: Partial<{ chimeraLinks: ChimeraLink[] }>) => {
      links = state.chimeraLinks ?? links;
    },
  });

  it('appends the CHIMERA_LINKED entry before mutating state and succeeds', async () => {
    const { service, appended } = makeLedger();
    let links: ChimeraLink[] = [];
    const stateCalls: Array<{ chimeraLinks: ChimeraLink[] }> = [];

    const result = await createChimeraLink(
      {
        ledgerService: service,
        getState: () => ({ chimeraLinks: links, organs }),
        setState: state => {
          stateCalls.push(state as { chimeraLinks: ChimeraLink[] });
          links = (state.chimeraLinks as ChimeraLink[]) ?? links;
        },
      },
      'organ-a',
      'out',
      'organ-b',
      'in'
    );

    expect(result.success).toBe(true);
    expect(result.linkId).toBeTruthy();
    // Ledger first: exactly one entry written, before any state mutation.
    expect(appended).toHaveLength(1);
    expect(stateCalls).toHaveLength(1);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      sourceOrganId: 'organ-a',
      sourcePort: 'out',
      targetOrganId: 'organ-b',
      targetPort: 'in',
    });
  });

  it('fails closed without touching the ledger or state on invalid links', async () => {
    const { service, appended } = makeLedger();
    const links: ChimeraLink[] = [];
    const setState = vi.fn();

    const result = await createChimeraLink(
      {
        ledgerService: service,
        getState: () => ({ chimeraLinks: links, organs }),
        setState,
      },
      'organ-a',
      'out',
      'organ-a',
      'in'
    );

    expect(result.success).toBe(false);
    expect(setState).not.toHaveBeenCalled();
    expect(appended).toHaveLength(0);
  });

  it('does not create the link when the ledger append throws', async () => {
    const failing = {
      getHistory: async () => [] as Entry[],
      append: async () => {
        throw new Error('disk full');
      },
      verify: async () => ({ valid: false, length: 0 }),
    } as unknown as LedgerService;

    const links: ChimeraLink[] = [];
    const setState = vi.fn();

    const result = await createChimeraLink(
      {
        ledgerService: failing,
        getState: () => ({ chimeraLinks: links, organs }),
        setState,
      },
      'organ-a',
      'out',
      'organ-b',
      'in'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('ledger');
    expect(setState).not.toHaveBeenCalled();
    expect(links).toHaveLength(0);
  });
});
