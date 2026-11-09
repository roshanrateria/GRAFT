/**
 * Tests for SnapshotManager
 *
 * Tests REV-01: Transplant followed by amputation SHALL restore the exact prior state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { capture, restore, snapshotsEqual, snapshotStateEqual, type Snapshot, type PortLink } from '../SnapshotManager';
import type { CreatureState, OrganInstance, OrganSlot } from '../stores/creatureStore';

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

// =============================================================================
// Tests
// =============================================================================

describe('SnapshotManager', () => {
  describe('capture', () => {
    it('creates accurate snapshot of empty state', () => {
      const store = createMockStore({
        slots: [],
        organs: new Map(),
      });

      const snapshot = capture('tx-001', store.getState());

      expect(snapshot.transactionId).toBe('tx-001');
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.slots).toEqual([]);
      expect(snapshot.organs).toEqual({});
      expect(snapshot.links).toEqual([]);
    });

    it('captures slots with organ references', () => {
      const slots: OrganSlot[] = [
        createTestSlot({ id: 'slot-0', organId: 'organ-1' }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 } }),
      ];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', createTestOrgan());

      const store = createMockStore({ slots, organs });

      const snapshot = capture('tx-002', store.getState());

      expect(snapshot.slots).toHaveLength(2);
      expect(snapshot.slots[0].id).toBe('slot-0');
      expect(snapshot.slots[0].organId).toBe('organ-1');
      expect(snapshot.slots[1].id).toBe('slot-1');
      expect(snapshot.slots[1].organId).toBeUndefined();
    });

    it('captures organ instances', () => {
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', createTestOrgan({ id: 'organ-1', name: 'First Organ' }));
      organs.set('organ-2', createTestOrgan({
        id: 'organ-2',
        name: 'Second Organ',
        status: 'quarantined',
      }));

      const store = createMockStore({
        slots: [createTestSlot()],
        organs,
      });

      const snapshot = capture('tx-003', store.getState());

      expect(Object.keys(snapshot.organs)).toHaveLength(2);
      expect(snapshot.organs['organ-1'].name).toBe('First Organ');
      expect(snapshot.organs['organ-2'].name).toBe('Second Organ');
      expect(snapshot.organs['organ-2'].status).toBe('quarantined');
    });

    it('captures port links for chimera mode', () => {
      const links: PortLink[] = [
        {
          id: 'link-1',
          sourceOrganId: 'organ-1',
          sourcePort: 'output',
          targetOrganId: 'organ-2',
          targetPort: 'input',
        },
      ];

      const store = createMockStore();

      const snapshot = capture('tx-004', store.getState(), links);

      expect(snapshot.links).toHaveLength(1);
      expect(snapshot.links[0].sourceOrganId).toBe('organ-1');
      expect(snapshot.links[0].targetOrganId).toBe('organ-2');
    });

    it('creates immutable snapshots (defensive copies)', () => {
      const slots: OrganSlot[] = [createTestSlot()];
      const organs = new Map<string, OrganInstance>();
      organs.set('organ-1', createTestOrgan());

      const store = createMockStore({ slots, organs });

      const snapshot = capture('tx-005', store.getState());

      // Modify original state
      slots[0].organId = 'modified';
      organs.get('organ-1')!.status = 'decayed';

      // Snapshot should not be affected
      expect(snapshot.slots[0].organId).toBeUndefined();
      expect(snapshot.organs['organ-1'].status).toBe('active');
    });
  });

  describe('restore', () => {
    it('restores empty state', () => {
      const store = createMockStore({
        slots: [createTestSlot()],
        organs: new Map([['organ-1', createTestOrgan()]]),
      });

      const emptySnapshot: Snapshot = {
        transactionId: 'tx-restore-1',
        timestamp: Date.now(),
        slots: [],
        organs: {},
        links: [],
      };

      restore(emptySnapshot, store);

      expect(store.getState().slots).toHaveLength(0);
      expect(store.getState().organs.size).toBe(0);
    });

    it('restores slots and organs from snapshot', () => {
      const store = createMockStore({
        slots: [],
        organs: new Map(),
      });

      const snapshot: Snapshot = {
        transactionId: 'tx-restore-2',
        timestamp: Date.now(),
        slots: [
          { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium', organId: 'organ-1' },
          { id: 'slot-1', position: { row: 0, col: 1 }, size: 'large' },
        ],
        organs: {
          'organ-1': {
            id: 'organ-1',
            name: 'Restored Organ',
            manifest: {
              name: 'Restored Organ',
              version: '1.0.0',
              apiVersion: '1.0',
              permissions: ['mood:read', 'tasks:write'],
              ports: [],
              slotSize: 'medium',
            },
            status: 'active',
            installedAt: '2024-01-15T10:30:00Z',
          },
        },
        links: [],
      };

      restore(snapshot, store);

      const state = store.getState();
      expect(state.slots).toHaveLength(2);
      expect(state.slots[0].organId).toBe('organ-1');
      expect(state.organs.size).toBe(1);
      expect(state.organs.get('organ-1')?.name).toBe('Restored Organ');
    });

    it('restores exact prior state after transplant simulation', () => {
      // Initial state
      const initialSlots: OrganSlot[] = [
        createTestSlot({ id: 'slot-0', position: { row: 0, col: 0 } }),
        createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 } }),
      ];
      const initialOrgans = new Map<string, OrganInstance>();

      const store = createMockStore({
        slots: initialSlots,
        organs: initialOrgans,
      });

      // Capture state before transplant
      const beforeSnapshot = capture('tx-before', store.getState());

      // Simulate transplant: add organ
      const newOrgan = createTestOrgan({ id: 'organ-transplant' });
      store.setState({
        slots: initialSlots.map(s =>
          s.id === 'slot-0' ? { ...s, organId: 'organ-transplant' } : s
        ),
        organs: new Map([['organ-transplant', newOrgan]]),
      });

      // Verify state changed
      expect(store.getState().slots[0].organId).toBe('organ-transplant');
      expect(store.getState().organs.size).toBe(1);

      // Restore from snapshot (simulating amputation)
      restore(beforeSnapshot, store);

      // Should be exactly back to initial state
      const restoredState = store.getState();
      expect(restoredState.slots).toHaveLength(2);
      expect(restoredState.slots[0].organId).toBeUndefined();
      expect(restoredState.slots[1].organId).toBeUndefined();
      expect(restoredState.organs.size).toBe(0);

      // Verify state equality (excluding metadata like transactionId/timestamp)
      const afterRestoreSnapshot = capture('tx-after', store.getState());
      expect(snapshotStateEqual(beforeSnapshot, afterRestoreSnapshot)).toBe(true);
    });
  });

  describe('snapshotsEqual', () => {
    it('returns true for identical snapshots', () => {
      const snapshot1: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };
      const snapshot2: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: {},
        links: [],
      };

      expect(snapshotsEqual(snapshot1, snapshot2)).toBe(true);
    });

    it('returns false for different transaction IDs', () => {
      const snapshot1: Snapshot = {
        transactionId: 'tx-1',
        timestamp: 1234567890,
        slots: [],
        organs: {},
        links: [],
      };
      const snapshot2: Snapshot = {
        transactionId: 'tx-2',
        timestamp: 1234567890,
        slots: [],
        organs: {},
        links: [],
      };

      expect(snapshotsEqual(snapshot1, snapshot2)).toBe(false);
    });

    it('returns false for different slots', () => {
      const snapshot1: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium', organId: 'a' }],
        organs: {},
        links: [],
      };
      const snapshot2: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium', organId: 'b' }],
        organs: {},
        links: [],
      };

      expect(snapshotsEqual(snapshot1, snapshot2)).toBe(false);
    });

    it('returns false for different organs', () => {
      const snapshot1: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [],
        organs: {
          'organ-1': createTestOrgan(),
        },
        links: [],
      };
      const snapshot2: Snapshot = {
        transactionId: 'tx-same',
        timestamp: 1234567890,
        slots: [],
        organs: {
          'organ-1': createTestOrgan({ status: 'quarantined' }),
        },
        links: [],
      };

      expect(snapshotsEqual(snapshot1, snapshot2)).toBe(false);
    });
  });

  describe('multiple capture/restore cycles', () => {
    it('handles sequential capture and restore operations', () => {
      // Start with empty state
      const store = createMockStore({
        slots: [
          createTestSlot({ id: 'slot-0' }),
          createTestSlot({ id: 'slot-1', position: { row: 0, col: 1 } }),
          createTestSlot({ id: 'slot-2', position: { row: 1, col: 0 } }),
        ],
        organs: new Map(),
      });

      // Capture initial state
      const snapshot0 = capture('cycle-0', store.getState());

      // Add first organ
      const organ1 = createTestOrgan({ id: 'organ-1', name: 'First' });
      store.setState({
        slots: store.getState().slots.map(s =>
          s.id === 'slot-0' ? { ...s, organId: 'organ-1' } : s
        ),
        organs: new Map([['organ-1', organ1]]),
      });

      const snapshot1 = capture('cycle-1', store.getState());
      expect(store.getState().organs.size).toBe(1);

      // Add second organ
      const organ2 = createTestOrgan({ id: 'organ-2', name: 'Second' });
      store.setState({
        slots: store.getState().slots.map(s =>
          s.id === 'slot-1' ? { ...s, organId: 'organ-2' } : s
        ),
        organs: new Map([['organ-1', organ1], ['organ-2', organ2]]),
      });

      const snapshot2 = capture('cycle-2', store.getState());
      expect(store.getState().organs.size).toBe(2);

      // Restore to snapshot1
      restore(snapshot1, store);
      expect(store.getState().organs.size).toBe(1);
      expect(store.getState().organs.get('organ-1')).toBeDefined();
      expect(store.getState().organs.get('organ-2')).toBeUndefined();
      expect(store.getState().slots[0].organId).toBe('organ-1');
      expect(store.getState().slots[1].organId).toBeUndefined();

      // Restore to snapshot0
      restore(snapshot0, store);
      expect(store.getState().organs.size).toBe(0);
      expect(store.getState().slots.every(s => !s.organId)).toBe(true);

      // Jump to snapshot2
      restore(snapshot2, store);
      expect(store.getState().organs.size).toBe(2);
      expect(store.getState().slots[0].organId).toBe('organ-1');
      expect(store.getState().slots[1].organId).toBe('organ-2');
    });
  });
});
