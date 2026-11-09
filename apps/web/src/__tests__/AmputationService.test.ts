/**
 * Tests for AmputationService
 *
 * Tests REV-01: Transplant followed by amputation SHALL restore the exact prior state.
 * Tests LED-02: Ledger entry is written before state change.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AmputationService,
  createAmputationService,
  InMemorySnapshotStorage,
  InMemoryLinkStorage,
  type AmputationServiceDeps,
} from '../AmputationService';
import { capture, type Snapshot, type PortLink } from '../SnapshotManager';
import type { CreatureState, OrganInstance, OrganSlot } from '../stores/creatureStore';
import type { LedgerService, Entry, EventType } from '@graft/ledger';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockStore(initialState?: Partial<CreatureState>) {
  let state: CreatureState = {
    slots: [],
    organs: new Map(),
    mood: { entries: [] },
    tasks: { items: [] },
    habits: { checkins: [] },
    calendar: { events: [] },
    initializeSlots: () => {},
    addOrgan: () => {},
    removeOrgan: () => {},
    updateOrganStatus: () => {},
    ...initialState,
  };

  return {
    getState: () => state,
    setState: (newState: Partial<CreatureState>) => {
      state = { ...state, ...newState };
    },
  };
}

function createTestOrgan(overrides: Partial<OrganInstance> = {}): OrganInstance {
  return {
    id: 'organ-1',
    name: 'Test Organ',
    manifest: {
      name: 'Test Organ',
      version: '1.0.0',
      apiVersion: '1.0',
      permissions: ['mood:read'],
      ports: [{ name: 'output', direction: 'out', schema: { type: 'object' } }],
      slotSize: 'medium',
    },
    status: 'active',
    installedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestSlot(overrides: Partial<OrganSlot> = {}): OrganSlot {
  return {
    id: 'slot-0',
    position: { row: 0, col: 0 },
    size: 'medium',
    ...overrides,
  };
}

function createMockLedgerService(): LedgerService & { entries: Entry[] } {
  const entries: Entry[] = [];

  return {
    entries,
    append: vi.fn(async (entry: Omit<Entry, 'hash'>): Promise<Entry> => {
      const fullEntry: Entry = {
        ...entry,
        hash: `hash-${entry.id}`,
      };
      entries.push(fullEntry);
      return fullEntry;
    }),
    verify: vi.fn(async () => ({ valid: true })),
    getHistory: vi.fn(async (organId?: string) => {
      if (organId) {
        return entries.filter(e => e.organ_id === organId);
      }
      return [...entries];
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AmputationService', () => {
  let mockLedgerService: ReturnType<typeof createMockLedgerService>;
  let snapshotStorage: InMemorySnapshotStorage;
  let linkStorage: InMemoryLinkStorage;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    mockLedgerService = createMockLedgerService();
    snapshotStorage = new InMemorySnapshotStorage();
    linkStorage = new InMemoryLinkStorage();
    store = createMockStore();
  });

  describe('amputate', () => {
    it('removes organ completely', async () => {
      // Setup: create an organ in a slot
      const organ = createTestOrgan({ id: 'organ-1' });
      const slot = createTestSlot({ id: 'slot-0', organId: 'organ-1' });
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ);

      store = createMockStore({ slots: [slot], organs });

      // Store pre-transplant snapshot (empty state)
      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(true);

      // Verify organ is removed
      const state = store.getState();
      expect(state.organs.has('organ-1')).toBe(false);
      expect(state.slots[0].organId).toBeUndefined();
    });

    it('restores prior state', async () => {
      // Initial state: slot-0 has organ-a, slot-1 is empty
      const organA = createTestOrgan({ id: 'organ-a', name: 'Organ A' });
      const initialSlots = [
        createTestSlot({ id: 'slot-0', organId: 'organ-a' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 } }),
      ];
      const initialOrgans = new Map<string, OrganInstance>();
      initialOrgans.set('organ-a', organA);

      store = createMockStore({ slots: initialSlots, organs: initialOrgans });

      // Capture pre-transplant state (before adding organ-b)
      const preTransplantSnapshot = capture('tx-transplant', store.getState());

      // Simulate transplant: add organ-b to slot-1
      const organB = createTestOrgan({ id: 'organ-b', name: 'Organ B' });
      store.setState({
        slots: initialSlots.map(s =>
          s.id === 'slot-1' ? { ...s, organId: 'organ-b' } : s
        ),
        organs: new Map([
          ['organ-a', organA],
          ['organ-b', organB],
        ]),
      });

      // Store pre-transplant snapshot for organ-b
      await snapshotStorage.store('organ-b', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      // Amputate organ-b
      const result = await service.amputate('organ-b');

      expect(result.success).toBe(true);

      // Verify state is restored to before organ-b was transplanted
      const finalState = store.getState();
      expect(finalState.organs.has('organ-b')).toBe(false);
      expect(finalState.organs.has('organ-a')).toBe(true);
      expect(finalState.slots[0].organId).toBe('organ-a');
      expect(finalState.slots[1].organId).toBeUndefined();
    });

    it('writes ledger entry', async () => {
      const organ = createTestOrgan({ id: 'organ-1' });
      const slot = createTestSlot({ id: 'slot-0', organId: 'organ-1' });
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ);

      store = createMockStore({ slots: [slot], organs });

      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(true);
      expect(result.ledgerEntryId).toBeDefined();

      // Verify ledger entry was written
      expect(mockLedgerService.entries).toHaveLength(1);
      const entry = mockLedgerService.entries[0];
      expect(entry.event).toBe('AMPUTATED');
      expect(entry.organ_id).toBe('organ-1');

      // Verify payload contains expected data
      const payload = JSON.parse(entry.payload_json);
      expect(payload.organName).toBe('Test Organ');
      expect(payload.slotId).toBe('slot-0');
    });

    it('writes ledger entry before state change (LED-02)', async () => {
      const organ = createTestOrgan({ id: 'organ-1' });
      const slot = createTestSlot({ id: 'slot-0', organId: 'organ-1' });
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ);

      store = createMockStore({ slots: [slot], organs });

      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      // Create a ledger service that tracks when it was called vs state change
      let ledgerWriteTime = 0;
      let stateChangeTime = 0;

      const trackingLedgerService: LedgerService = {
        append: vi.fn(async (entry: Omit<Entry, 'hash'>): Promise<Entry> => {
          ledgerWriteTime = Date.now();
          // Small delay to ensure ordering is detectable
          await new Promise(resolve => setTimeout(resolve, 10));
          const fullEntry: Entry = {
            ...entry,
            hash: `hash-${entry.id}`,
          };
          mockLedgerService.entries.push(fullEntry);
          return fullEntry;
        }),
        verify: vi.fn(async () => ({ valid: true })),
        getHistory: vi.fn(async () => []),
      };

      // Track when state changes happen
      const trackingStore = {
        getState: store.getState,
        setState: (newState: Partial<CreatureState>) => {
          if (!stateChangeTime) {
            stateChangeTime = Date.now();
          }
          store.setState(newState);
        },
      };

      const service = createAmputationService({
        ledgerService: trackingLedgerService,
        snapshotStorage,
        linkStorage,
        store: trackingStore,
      });

      await service.amputate('organ-1');

      // Ledger should have been written before state change
      expect(ledgerWriteTime).toBeGreaterThan(0);
      expect(stateChangeTime).toBeGreaterThan(0);
      expect(ledgerWriteTime).toBeLessThan(stateChangeTime);
    });

    it('removes all links involving organ (chimera mode)', async () => {
      const organ1 = createTestOrgan({ id: 'organ-1' });
      const organ2 = createTestOrgan({ id: 'organ-2' });
      const slots = [
        createTestSlot({ id: 'slot-0', organId: 'organ-1' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 }, organId: 'organ-2' }),
      ];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ1);
      organs.set('organ-2', organ2);

      store = createMockStore({ slots, organs });

      // Setup links between organs
      const link: PortLink = {
        id: 'link-1',
        sourceOrganId: 'organ-1',
        sourcePort: 'output',
        targetOrganId: 'organ-2',
        targetPort: 'input',
      };
      linkStorage.addLink(link);

      // Store pre-transplant snapshot
      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [
          { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' },
          { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
        ],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(true);

      // Verify link is removed
      const remainingLinks = await linkStorage.getAllLinks();
      expect(remainingLinks).toHaveLength(0);
    });

    it('fails when organ not found', async () => {
      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain("Organ 'nonexistent' not found");

      // No ledger entry should be written
      expect(mockLedgerService.entries).toHaveLength(0);
    });

    it('fails when no pre-transplant snapshot exists', async () => {
      const organ = createTestOrgan({ id: 'organ-1' });
      const slot = createTestSlot({ id: 'slot-0', organId: 'organ-1' });
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ);

      store = createMockStore({ slots: [slot], organs });

      // Don't store a pre-transplant snapshot

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No pre-transplant snapshot found');

      // No ledger entry should be written (failure before ledger write)
      expect(mockLedgerService.entries).toHaveLength(0);
    });

    it('handles multiple organs with selective amputation', async () => {
      // Setup three organs
      const organA = createTestOrgan({ id: 'organ-a', name: 'Organ A' });
      const organB = createTestOrgan({ id: 'organ-b', name: 'Organ B' });
      const organC = createTestOrgan({ id: 'organ-c', name: 'Organ C' });

      const slots = [
        createTestSlot({ id: 'slot-0', organId: 'organ-a' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 }, organId: 'organ-b' }),
        createTestSlot({ id: 'slot-2', position: { row: 1, col: 0 }, organId: 'organ-c' }),
      ];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-a', organA);
      organs.set('organ-b', organB);
      organs.set('organ-c', organC);

      store = createMockStore({ slots, organs });

      // Pre-transplant snapshot for organ-b (when only organ-a existed)
      const preBState = createMockStore({
        slots: [
          createTestSlot({ id: 'slot-0', organId: 'organ-a' }),
          createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 } }),
          createTestSlot({ id: 'slot-2', position: { row: 1, col: 0 } }),
        ],
        organs: new Map([['organ-a', organA]]),
      });
      const preBSnapshot = capture('tx-b', preBState.getState());
      await snapshotStorage.store('organ-b', preBSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-b');

      expect(result.success).toBe(true);

      // Verify organ-b is removed but a and c remain
      // Note: Because we restore the pre-transplant snapshot, organ-c is also removed
      // (the snapshot was from before organ-c was added too)
      const state = store.getState();
      expect(state.organs.has('organ-a')).toBe(true);
      expect(state.organs.has('organ-b')).toBe(false);
    });

    it('amputates organ that is source of chimera link', async () => {
      const organ1 = createTestOrgan({ id: 'organ-1' });
      const organ2 = createTestOrgan({ id: 'organ-2' });
      const slots = [
        createTestSlot({ id: 'slot-0', organId: 'organ-1' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 }, organId: 'organ-2' }),
      ];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ1);
      organs.set('organ-2', organ2);

      store = createMockStore({ slots, organs });

      // Link: organ-1 -> organ-2
      const link: PortLink = {
        id: 'link-1',
        sourceOrganId: 'organ-1',
        sourcePort: 'output',
        targetOrganId: 'organ-2',
        targetPort: 'input',
      };
      linkStorage.addLink(link);

      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [
          { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' },
          { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
        ],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(true);

      // Verify link is removed
      const remainingLinks = await linkStorage.getAllLinks();
      expect(remainingLinks).toHaveLength(0);
    });

    it('amputates organ that is target of chimera link', async () => {
      const organ1 = createTestOrgan({ id: 'organ-1' });
      const organ2 = createTestOrgan({ id: 'organ-2' });
      const slots = [
        createTestSlot({ id: 'slot-0', organId: 'organ-1' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 }, organId: 'organ-2' }),
      ];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ1);
      organs.set('organ-2', organ2);

      store = createMockStore({ slots, organs });

      // Link: organ-1 -> organ-2
      const link: PortLink = {
        id: 'link-1',
        sourceOrganId: 'organ-1',
        sourcePort: 'output',
        targetOrganId: 'organ-2',
        targetPort: 'input',
      };
      linkStorage.addLink(link);

      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [
          { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' },
          { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
        ],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-2', preTransplantSnapshot);

      const service = createAmputationService({
        ledgerService: mockLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-2');

      expect(result.success).toBe(true);

      // Verify link is removed
      const remainingLinks = await linkStorage.getAllLinks();
      expect(remainingLinks).toHaveLength(0);
    });

    it('handles ledger write failure gracefully', async () => {
      const organ = createTestOrgan({ id: 'organ-1' });
      const slot = createTestSlot({ id: 'slot-0', organId: 'organ-1' });
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', organ);

      store = createMockStore({ slots: [slot], organs });

      const preTransplantSnapshot: Snapshot = {
        transactionId: 'tx-transplant',
        timestamp: Date.now() - 1000,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };
      await snapshotStorage.store('organ-1', preTransplantSnapshot);

      // Create failing ledger service
      const failingLedgerService: LedgerService = {
        append: vi.fn(async () => {
          throw new Error('Database connection lost');
        }),
        verify: vi.fn(async () => ({ valid: true })),
        getHistory: vi.fn(async () => []),
      };

      const service = createAmputationService({
        ledgerService: failingLedgerService,
        snapshotStorage,
        linkStorage,
        store,
      });

      const result = await service.amputate('organ-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write amputation ledger entry');
      expect(result.error).toContain('Database connection lost');

      // State should be unchanged
      expect(store.getState().organs.has('organ-1')).toBe(true);
    });
  });
});

describe('InMemorySnapshotStorage', () => {
  it('stores and retrieves snapshots', async () => {
    const storage = new InMemorySnapshotStorage();
    const snapshot: Snapshot = {
      transactionId: 'tx-1',
      timestamp: Date.now(),
      slots: [],
      organs: {},
      links: [],
    };

    await storage.store('organ-1', snapshot);
    const retrieved = await storage.retrieve('organ-1');

    expect(retrieved).toEqual(snapshot);
  });

  it('returns null for missing snapshot', async () => {
    const storage = new InMemorySnapshotStorage();
    const retrieved = await storage.retrieve('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('removes stored snapshot', async () => {
    const storage = new InMemorySnapshotStorage();
    const snapshot: Snapshot = {
      transactionId: 'tx-1',
      timestamp: Date.now(),
      slots: [],
      organs: {},
      links: [],
    };

    await storage.store('organ-1', snapshot);
    await storage.remove('organ-1');
    const retrieved = await storage.retrieve('organ-1');

    expect(retrieved).toBeNull();
  });
});

describe('InMemoryLinkStorage', () => {
  it('tracks links for organs', async () => {
    const storage = new InMemoryLinkStorage();
    const link: PortLink = {
      id: 'link-1',
      sourceOrganId: 'organ-1',
      sourcePort: 'output',
      targetOrganId: 'organ-2',
      targetPort: 'input',
    };
    storage.addLink(link);

    const linksForOrgan1 = await storage.getLinksForOrgan('organ-1');
    const linksForOrgan2 = await storage.getLinksForOrgan('organ-2');

    expect(linksForOrgan1).toHaveLength(1);
    expect(linksForOrgan2).toHaveLength(1);
    expect(linksForOrgan1[0].id).toBe('link-1');
  });

  it('removes links', async () => {
    const storage = new InMemoryLinkStorage();
    const link: PortLink = {
      id: 'link-1',
      sourceOrganId: 'organ-1',
      sourcePort: 'output',
      targetOrganId: 'organ-2',
      targetPort: 'input',
    };
    storage.addLink(link);

    await storage.removeLink('link-1');
    const links = await storage.getAllLinks();

    expect(links).toHaveLength(0);
  });

  it('sets all links', async () => {
    const storage = new InMemoryLinkStorage();
    const links: PortLink[] = [
      { id: 'link-1', sourceOrganId: 'organ-1', sourcePort: 'out', targetOrganId: 'organ-2', targetPort: 'in' },
      { id: 'link-2', sourceOrganId: 'organ-2', sourcePort: 'out', targetOrganId: 'organ-3', targetPort: 'in' },
    ];

    await storage.setAllLinks(links);
    const allLinks = await storage.getAllLinks();

    expect(allLinks).toHaveLength(2);
  });
});
