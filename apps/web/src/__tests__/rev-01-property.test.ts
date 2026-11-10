/**
 * REV-01: Reversibility Property-Based Test
 *
 * Property: Transplant followed by amputation SHALL restore the exact prior state.
 *
 * This test uses fast-check to generate arbitrary initial states, organs, and slots,
 * then verifies that the state before transplant equals the state after amputation.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TransactionCoordinator, type TransactionCoordinatorDeps } from '../TransactionCoordinator';
import { capture, snapshotStateEqual, type Snapshot } from '../SnapshotManager';
import type { CreatureState, OrganInstance, OrganSlot } from '../stores/creatureStore';
import type { ImmuneReport, OrganBundle, OrganPort } from '@graft/immune';
import type { LedgerService, Entry } from '@graft/ledger';

// =============================================================================
// Test Utilities
// =============================================================================

/** Create a mock store for testing */
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
    _getInternalState: () => state,
  };
}

/** Create a mock ledger service */
function createMockLedgerService(): LedgerService & { entries: Entry[] } {
  const entries: Entry[] = [];
  let lastHash = '0'.repeat(64);

  return {
    entries,
    append: async (entry: Omit<Entry, 'hash'>): Promise<Entry> => {
      const fullEntry: Entry = {
        ...entry,
        hash: `hash-${entries.length}`,
        prev_hash: lastHash,
      };
      lastHash = fullEntry.hash;
      entries.push(fullEntry);
      return fullEntry;
    },
    verify: async () => ({ valid: true }),
    getHistory: async () => [...entries],
  };
}

/** Create a mock immune system that always passes */
function createPassingImmuneSystem(): { run: (bundle: OrganBundle) => Promise<ImmuneReport> } {
  return {
    run: async (): Promise<ImmuneReport> => ({
      passed: true,
      stages: [
        { stage: 'static', passed: true, duration: 10 },
        { stage: 'manifest', passed: true, duration: 5 },
        { stage: 'behavioral', passed: true, duration: 50 },
        { stage: 'property', passed: true, duration: 100 },
      ],
      timestamp: Date.now(),
    }),
  };
}

// =============================================================================
// Fast-Check Arbitraries
// =============================================================================

/** Arbitrary for slot position */
const slotPositionArbitrary = fc.record({
  row: fc.integer({ min: 0, max: 4 }),
  col: fc.integer({ min: 0, max: 4 }),
});

/** Arbitrary for slot size */
const slotSizeArbitrary = fc.constantFrom<'small' | 'medium' | 'large'>('small', 'medium', 'large');

/** Arbitrary for a single slot */
const slotArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `slot-${s}`),
  position: slotPositionArbitrary,
  size: slotSizeArbitrary,
  organId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

/** Arbitrary for organ status */
const organStatusArbitrary = fc.constantFrom<'pending' | 'active' | 'quarantined' | 'decayed'>(
  'pending', 'active', 'quarantined', 'decayed'
);

/** Arbitrary for organ port */
const portArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  direction: fc.constantFrom<'in' | 'out'>('in', 'out'),
  schema: fc.constant({ type: 'object' }),
});

/** Arbitrary for organ manifest */
const manifestArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  version: fc.string({ minLength: 1, maxLength: 10 }),
  apiVersion: fc.string({ minLength: 1, maxLength: 10 }),
  permissions: fc.array(fc.string({ minLength: 1, maxLength: 20 })),
  ports: fc.array(portArbitrary, { maxLength: 5 }),
  slotSize: slotSizeArbitrary,
});

/** Arbitrary for organ instance */
const organInstanceArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `organ-${s}`),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  manifest: manifestArbitrary,
  status: organStatusArbitrary,
  installedAt: fc.date().map(d => d.toISOString()),
});

/** Arbitrary for a creature state (simplified for testing) */
const creatureStateArbitrary = fc.record({
  slots: fc.array(slotArbitrary, { minLength: 1, maxLength: 9 }),
  organs: fc.array(organInstanceArbitrary, { maxLength: 5 }),
});

/** Arbitrary for organ bundle */
const organBundleArbitrary = fc.record({
  manifest: manifestArbitrary,
  indexHtml: fc.constant('<!DOCTYPE html><html><body>Test Organ</body></html>'),
  spec: fc.option(fc.string(), { nil: undefined }),
  properties: fc.option(fc.string(), { nil: undefined }),
});

// =============================================================================
// Property Tests
// =============================================================================

describe('REV-01: Reversibility Property', () => {
  it('transplant followed by amputation restores exact prior state', async () => {
    await fc.assert(
      fc.asyncProperty(
        creatureStateArbitrary,
        organBundleArbitrary,
        fc.integer({ min: 0, max: 8 }),
        async (initialState, bundle, slotIndex) => {
          // Create store with initial state
          const organsMap = new Map<string, OrganInstance>();
          initialState.organs.forEach(o => organsMap.set(o.id, o));

          const store = createMockStore({
            slots: initialState.slots,
            organs: organsMap,
          });

          // Capture the exact state before any operation
          const stateBeforeTransplant = capture('before-transplant', store.getState());

          // Set up coordinator
          const ledgerService = createMockLedgerService();
          const immuneSystem = createPassingImmuneSystem();

          const coordinator = new TransactionCoordinator({
            ledgerService,
            store,
            immuneSystem,
          });

          // Find an empty slot for transplant
          const emptySlotIndex = Math.min(slotIndex, initialState.slots.length - 1);
          const targetSlot = initialState.slots[emptySlotIndex];

          // Skip if slot is already occupied
          if (targetSlot.organId) {
            return;
          }

          // Perform transplant
          const transplantResult = await coordinator.transplant(bundle, targetSlot.id);

          // Skip if transplant failed (slot not found, etc.)
          if (!transplantResult.success) {
            return;
          }

          // Verify state changed
          const stateAfterTransplant = capture('after-transplant', store.getState());
          expect(snapshotStateEqual(stateBeforeTransplant, stateAfterTransplant)).toBe(false);

          // Perform amputation
          const amputateResult = await coordinator.amputate(transplantResult.organId!);

          // Amputation should succeed
          expect(amputateResult.success).toBe(true);

          // Capture state after amputation
          const stateAfterAmputation = capture('after-amputation', store.getState());

          // REV-01: State after amputation MUST equal state before transplant
          const statesAreEqual = snapshotStateEqual(stateBeforeTransplant, stateAfterAmputation);

          // Log for debugging if property fails
          if (!statesAreEqual) {
            console.log('Initial slots:', stateBeforeTransplant.slots.map(s => s.id));
            console.log('Final slots:', stateAfterAmputation.slots.map(s => s.id));
            console.log('Initial organs:', Object.keys(stateBeforeTransplant.organs));
            console.log('Final organs:', Object.keys(stateAfterAmputation.organs));
          }

          expect(statesAreEqual).toBe(true);
        }
      ),
      {
        numRuns: 50,
        seed: undefined, // Log seed on failure for reproducibility
      }
    );
  });

  it('reversibility holds for empty initial state', async () => {
    const store = createMockStore({
      slots: [
        { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' },
        { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
      ],
      organs: new Map(),
    });

    const stateBefore = capture('before', store.getState());

    const ledgerService = createMockLedgerService();
    const coordinator = new TransactionCoordinator({
      ledgerService,
      store,
      immuneSystem: createPassingImmuneSystem(),
    });

    const bundle: OrganBundle = {
      manifest: {
        name: 'Test Organ',
        version: '1.0.0',
        apiVersion: '1.0',
        permissions: ['mood:read'],
        ports: [],
        slotSize: 'medium',
      },
      indexHtml: '<!DOCTYPE html><html><body>Test</body></html>',
    };

    const result = await coordinator.transplant(bundle, 'slot-0');
    expect(result.success).toBe(true);

    await coordinator.amputate(result.organId!);

    const stateAfter = capture('after', store.getState());
    expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);
  });

  it('reversibility holds with multiple organs', async () => {
    const organs = new Map<string, OrganInstance>();
    organs.set('organ-existing', {
      id: 'organ-existing',
      name: 'Existing Organ',
      manifest: {
        name: 'Existing Organ',
        version: '1.0.0',
        apiVersion: '1.0',
        permissions: [],
        ports: [],
        slotSize: 'medium',
      },
      status: 'active',
      installedAt: new Date().toISOString(),
    });

    const store = createMockStore({
      slots: [
        { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium', organId: 'organ-existing' },
        { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
        { id: 'slot-2', position: { row: 1, col: 0 }, size: 'large' },
      ],
      organs,
    });

    const stateBefore = capture('before-multi', store.getState());

    const ledgerService = createMockLedgerService();
    const coordinator = new TransactionCoordinator({
      ledgerService,
      store,
      immuneSystem: createPassingImmuneSystem(),
    });

    const bundle: OrganBundle = {
      manifest: {
        name: 'New Organ',
        version: '1.0.0',
        apiVersion: '1.0',
        permissions: ['tasks:read'],
        ports: [],
        slotSize: 'medium',
      },
      indexHtml: '<!DOCTYPE html><html><body>New</body></html>',
    };

    // Transplant to slot-1
    const result = await coordinator.transplant(bundle, 'slot-1');
    expect(result.success).toBe(true);

    // Verify existing organ is still there
    expect(store.getState().organs.get('organ-existing')).toBeDefined();

    // Amputate the new organ
    await coordinator.amputate(result.organId!);

    const stateAfter = capture('after-multi', store.getState());

    // State should be exactly as before
    expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);

    // Existing organ should still be present
    expect(store.getState().organs.get('organ-existing')).toBeDefined();
  });
});
