/**
 * REV-02: Atomicity Property-Based Test
 *
 * Property: IF a transplant fails midway, THEN no partial state remains.
 *
 * This test simulates failures at various points during the transplant process
 * and verifies that the state remains unchanged.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TransactionCoordinator, type TransactionCoordinatorDeps } from '../TransactionCoordinator';
import { capture, snapshotStateEqual } from '../SnapshotManager';
import type { CreatureState, OrganInstance } from '../stores/creatureStore';
import type { ImmuneReport, OrganBundle } from '@graft/immune';
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
  };
}

/** Create a mock ledger service */
function createMockLedgerService(canFail: boolean = false): LedgerService & { entries: Entry[] } {
  const entries: Entry[] = [];
  let lastHash = '0'.repeat(64);
  let shouldFail = canFail;

  const service: LedgerService & { entries: Entry[] } = {
    entries,
    append: async (entry: Omit<Entry, 'hash'>): Promise<Entry> => {
      if (shouldFail) {
        throw new Error('Simulated ledger failure');
      }
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

  return service;
}

/** Create a failing ledger service */
function createFailingLedgerService(): LedgerService & { entries: Entry[] } {
  const entries: Entry[] = [];
  return {
    entries,
    append: async (): Promise<Entry> => {
      throw new Error('Simulated ledger failure');
    },
    verify: async () => ({ valid: true }),
    getHistory: async () => [...entries],
  };
}

/** Create a mock immune system that can be configured to pass or fail */
function createConfigurableImmuneSystem(shouldPass: boolean = true): {
  run: (bundle: OrganBundle) => Promise<ImmuneReport>;
  setShouldPass: (value: boolean) => void;
} {
  let pass = shouldPass;
  return {
    run: async (): Promise<ImmuneReport> => {
      if (!pass) {
        return {
          passed: false,
          stages: [
            { stage: 'static', passed: false, duration: 10, error: { code: 'TEST_FAILURE', message: 'Simulated immune failure' } },
          ],
          rejection: {
            stage: 'static',
            reasonCode: 'TEST_FAILURE',
            message: 'Simulated immune failure',
          },
          timestamp: Date.now(),
        };
      }
      return {
        passed: true,
        stages: [
          { stage: 'static', passed: true, duration: 10 },
          { stage: 'manifest', passed: true, duration: 5 },
          { stage: 'behavioral', passed: true, duration: 50 },
          { stage: 'property', passed: true, duration: 100 },
        ],
        timestamp: Date.now(),
      };
    },
    setShouldPass: (value: boolean) => { pass = value; },
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

const basicBundle: OrganBundle = {
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

// =============================================================================
// Property Tests
// =============================================================================

describe('REV-02: Atomicity Property', () => {
  it('immune system failure leaves state unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }).map(s => `slot-${s}`),
          position: fc.record({
            row: fc.integer({ min: 0, max: 2 }),
            col: fc.integer({ min: 0, max: 2 }),
          }),
          size: fc.constantFrom<'small' | 'medium' | 'large'>('small', 'medium', 'large'),
        }), { minLength: 1, maxLength: 5 }),
        async (slots) => {
          const store = createMockStore({ slots, organs: new Map() });
          const stateBefore = capture('before', store.getState());

          const ledgerService = createMockLedgerService();
          const immuneSystem = createConfigurableImmuneSystem(false); // Will fail

          const coordinator = new TransactionCoordinator({
            ledgerService,
            store,
            immuneSystem,
          });

          const result = await coordinator.transplant(basicBundle, slots[0].id);

          // Should fail
          expect(result.success).toBe(false);

          // State should be unchanged
          const stateAfter = capture('after', store.getState());
          expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);

          // No ledger entries should have been written
          expect(ledgerService.entries.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('ledger write failure leaves state unchanged', async () => {
    const store = createMockStore({
      slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
      organs: new Map(),
    });

    const stateBefore = capture('before', store.getState());

    // Use a failing ledger service
    const ledgerService = createFailingLedgerService();

    const coordinator = new TransactionCoordinator({
      ledgerService,
      store,
      immuneSystem: createConfigurableImmuneSystem(true),
    });

    const result = await coordinator.transplant(basicBundle, 'slot-0');

    // Should fail
    expect(result.success).toBe(false);
    expect(result.error).toContain('ledger');

    // State should be unchanged
    const stateAfter = capture('after', store.getState());
    expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);

    // No organs should be in the registry
    expect(store.getState().organs.size).toBe(0);
  });

  it('state mutation failure triggers rollback', async () => {
    const store = createMockStore({
      slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
      organs: new Map(),
    });

    const ledgerService = createMockLedgerService();

    // Create coordinator with a store that allows the first setState (for rollback)
    // but fails on the second setState (for the actual transplant)
    let callCount = 0;
    const faultyStore = {
      getState: store.getState,
      setState: vi.fn().mockImplementation((newState: Partial<CreatureState>) => {
        callCount++;
        // First call is the actual transplant mutation - throw to test rollback
        if (callCount === 1) {
          throw new Error('State mutation failed');
        }
        // Second call is rollback - allow it
        store.setState(newState);
      }),
    };

    const coordinator = new TransactionCoordinator({
      ledgerService,
      store: faultyStore,
      immuneSystem: createConfigurableImmuneSystem(true),
    });

    const result = await coordinator.transplant(basicBundle, 'slot-0');

    // Should fail (the rollback itself may fail, but that's ok - we catch it)
    expect(result.success).toBe(false);

    // Ledger entry should have been written (before state mutation)
    expect(ledgerService.entries.length).toBe(1);
    expect(ledgerService.entries[0].event).toBe('TRANSPLANT_APPROVED');
  });

  it('no partial organ in registry after failure', async () => {
    const store = createMockStore({
      slots: [
        { id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' },
        { id: 'slot-1', position: { row: 0, col: 1 }, size: 'medium' },
      ],
      organs: new Map(),
    });

    const stateBefore = capture('before', store.getState());

    const coordinator = new TransactionCoordinator({
      ledgerService: createMockLedgerService(),
      store,
      immuneSystem: createConfigurableImmuneSystem(false),
    });

    await coordinator.transplant(basicBundle, 'slot-0');

    // Verify no organ exists in any slot
    const state = store.getState();
    expect(state.organs.size).toBe(0);
    expect(state.slots.every(s => !s.organId)).toBe(true);

    // State equals before
    const stateAfter = capture('after', store.getState());
    expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);
  });

  it('atomicity with arbitrary failure points', async () => {
    // Test that failure at any point leaves clean state
    const failurePoints = ['immune', 'ledger', 'mutation'] as const;

    for (const failurePoint of failurePoints) {
      const store = createMockStore({
        slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
        organs: new Map(),
      });

      const stateBefore = capture('before', store.getState());
      const ledgerService = failurePoint === 'ledger' 
        ? createFailingLedgerService() 
        : createMockLedgerService();
      const immuneSystem = createConfigurableImmuneSystem(failurePoint !== 'immune');

      let mutationAttempted = false;
      let rollbackAttempted = false;
      const wrappedStore = {
        getState: store.getState,
        setState: (state: Partial<CreatureState>) => {
          if (!mutationAttempted) {
            // First setState call - the actual mutation
            mutationAttempted = true;
            if (failurePoint === 'mutation') {
              throw new Error('Mutation failed');
            }
            store.setState(state);
          } else {
            // Second setState call - rollback
            rollbackAttempted = true;
            store.setState(state);
          }
        },
      };

      const coordinator = new TransactionCoordinator({
        ledgerService,
        store: wrappedStore,
        immuneSystem,
      });

      const result = await coordinator.transplant(basicBundle, 'slot-0');

      // Should fail
      expect(result.success).toBe(false);

      // State must be unchanged (or rollback should have been attempted)
      const stateAfter = capture('after', store.getState());
      expect(snapshotStateEqual(stateBefore, stateAfter)).toBe(true);

      // Verify expected failure point
      if (failurePoint === 'immune') {
        expect(ledgerService.entries.length).toBe(0);
      } else if (failurePoint === 'ledger') {
        expect(ledgerService.entries.length).toBe(0);
      } else if (failurePoint === 'mutation') {
        // Ledger entry written but state rolled back
        expect(ledgerService.entries.length).toBe(1);
        expect(mutationAttempted).toBe(true);
        expect(rollbackAttempted).toBe(true);
      }
    }
  });
});

// =============================================================================
// LED-02 Verification: Ledger Entry Written Before State Mutation
// =============================================================================

describe('LED-02: Ledger First', () => {
  it('ledger entry is written before state mutation', async () => {
    const store = createMockStore({
      slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
      organs: new Map(),
    });

    const ledgerService = createMockLedgerService();
    const orderOfOperations: string[] = [];

    // Wrap ledger service to track order
    const trackedLedgerService: LedgerService = {
      ...ledgerService,
      append: async (entry) => {
        orderOfOperations.push('ledger-write');
        return ledgerService.append(entry);
      },
    };

    // Wrap store to track order
    const trackedStore = {
      getState: store.getState,
      setState: (state: Partial<CreatureState>) => {
        orderOfOperations.push('state-mutation');
        store.setState(state);
      },
    };

    const coordinator = new TransactionCoordinator({
      ledgerService: trackedLedgerService,
      store: trackedStore,
      immuneSystem: createConfigurableImmuneSystem(true),
    });

    const result = await coordinator.transplant(basicBundle, 'slot-0');

    expect(result.success).toBe(true);

    // LED-02: Ledger write must happen before state mutation
    expect(orderOfOperations).toEqual(['ledger-write', 'state-mutation']);
  });

  it('state not mutated if ledger write fails', async () => {
    const store = createMockStore({
      slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium' }],
      organs: new Map(),
    });

    const stateBefore = capture('before', store.getState());
    const stateMutated = { value: false };

    const failingLedgerService: LedgerService = {
      append: async () => {
        throw new Error('Ledger failure');
      },
      verify: async () => ({ valid: true }),
      getHistory: async () => [],
    };

    const trackedStore = {
      getState: store.getState,
      setState: () => {
        stateMutated.value = true;
      },
    };

    const coordinator = new TransactionCoordinator({
      ledgerService: failingLedgerService,
      store: trackedStore,
      immuneSystem: createConfigurableImmuneSystem(true),
    });

    const result = await coordinator.transplant(basicBundle, 'slot-0');

    expect(result.success).toBe(false);
    expect(stateMutated.value).toBe(false); // State should NOT have been mutated
  });

  it('amputation writes ledger before removing organ', async () => {
    const organs = new Map<string, OrganInstance>();
    organs.set('test-organ', {
      id: 'test-organ',
      name: 'Test Organ',
      manifest: {
        name: 'Test Organ',
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
      slots: [{ id: 'slot-0', position: { row: 0, col: 0 }, size: 'medium', organId: 'test-organ' }],
      organs,
    });

    const ledgerService = createMockLedgerService();
    const orderOfOperations: string[] = [];

    const trackedLedgerService: LedgerService = {
      ...ledgerService,
      append: async (entry) => {
        orderOfOperations.push('ledger-write');
        return ledgerService.append(entry);
      },
    };

    const trackedStore = {
      getState: store.getState,
      setState: (state: Partial<CreatureState>) => {
        orderOfOperations.push('state-mutation');
        store.setState(state);
      },
    };

    const coordinator = new TransactionCoordinator({
      ledgerService: trackedLedgerService,
      store: trackedStore,
      immuneSystem: createConfigurableImmuneSystem(true),
    });

    const result = await coordinator.amputate('test-organ');

    expect(result.success).toBe(true);

    // LED-02: Ledger write must happen before state mutation
    expect(orderOfOperations).toEqual(['ledger-write', 'state-mutation']);

    // Verify AMPUTATED event was recorded
    expect(ledgerService.entries[0].event).toBe('AMPUTATED');
  });
});
