/**
 * Transaction Coordinator
 *
 * Coordinates atomic transplant operations with:
 * - Immune system verification
 * - Snapshot capture for rollback
 * - Ledger-first state mutation
 * - Automatic rollback on failure
 *
 * Implements:
 * - LED-02: Ledger First (write ledger entry before state change)
 * - REV-01: Reversibility (transplant + amputation restores exact prior state)
 * - REV-02: Atomicity (failure leaves no partial state)
 */

import { capture, restore, type Snapshot } from './SnapshotManager.js';
import type { CreatureState, OrganInstance } from './stores/creatureStore.js';
import type { ImmuneReport, OrganBundle } from '@graft/immune';
import { runImmuneSystem } from '@graft/immune';
import type { LedgerService, Entry, EventType } from '@graft/ledger';

// =============================================================================
// Types
// =============================================================================

/** Result of a transplant operation */
export interface TransplantResult {
  success: boolean;
  error?: string;
  organId?: string;
  ledgerEntryId?: string;
}

/** Dependencies for the TransactionCoordinator */
export interface TransactionCoordinatorDeps {
  /** Ledger service for recording state changes */
  ledgerService: LedgerService;
  /** Zustand store for state management */
  store: {
    getState: () => CreatureState;
    setState: (state: Partial<CreatureState>) => void;
  };
  /** Optional immune system override (for testing) */
  immuneSystem?: {
    run: (bundle: OrganBundle) => Promise<ImmuneReport>;
  };
}

/** Snapshot with metadata for tracking */
interface TrackedSnapshot {
  snapshot: Snapshot;
  transactionId: string;
  organId: string | null;
}

// =============================================================================
// Transaction Coordinator
// =============================================================================

/**
 * TransactionCoordinator manages atomic transplant operations.
 *
 * Order of operations for transplant:
 * 1. Run immune system verification (fail fast if organ is unsafe)
 * 2. Capture snapshot BEFORE any state change
 * 3. Write TRANSPLANT_APPROVED ledger entry (LED-02: ledger first)
 * 4. Mutate state (add organ to slot, registry)
 * 5. On any failure after snapshot: rollback to snapshot
 */
export class TransactionCoordinator {
  private ledgerService: LedgerService;
  private store: {
    getState: () => CreatureState;
    setState: (state: Partial<CreatureState>) => void;
  };
  private immuneSystem: {
    run: (bundle: OrganBundle) => Promise<ImmuneReport>;
  };

  /** Active snapshots for potential rollback */
  private pendingSnapshots: Map<string, TrackedSnapshot> = new Map();

  constructor(deps: TransactionCoordinatorDeps) {
    this.ledgerService = deps.ledgerService;
    this.store = deps.store;
    this.immuneSystem = deps.immuneSystem ?? { run: runImmuneSystem };
  }

  /**
   * Perform an atomic transplant operation.
   *
   * @param bundle - The organ bundle to transplant
   * @param slotId - The slot to place the organ in
   * @returns Result indicating success or failure with error details
   */
  async transplant(
    bundle: OrganBundle,
    slotId: string
  ): Promise<TransplantResult> {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organId = bundle.manifest.name.toLowerCase().replace(/\s+/g, '-');

    // =========================================================================
    // Step 1: Immune System Verification
    // =========================================================================
    try {
      const immuneReport = await this.immuneSystem.run(bundle);

      if (!immuneReport.passed) {
        return {
          success: false,
          error: immuneReport.rejection?.message ?? 'Immune system rejected organ',
        };
      }
    } catch (error) {
      // Fail closed: any error during immune check means rejection
      return {
        success: false,
        error: `Immune system error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // =========================================================================
    // Step 2: Capture Snapshot BEFORE State Change
    // =========================================================================
    const currentState = this.store.getState();
    const snapshot = capture(transactionId, currentState);

    // Track snapshot for potential rollback
    this.pendingSnapshots.set(transactionId, {
      snapshot,
      transactionId,
      organId,
    });

    // =========================================================================
    // Step 3: Write Ledger Entry BEFORE State Mutation (LED-02)
    // =========================================================================
    let ledgerEntry: Entry;
    try {
      ledgerEntry = await this.ledgerService.append({
        id: transactionId,
        ts: Date.now(),
        organ_id: organId,
        event: 'TRANSPLANT_APPROVED' as EventType,
        payload_json: JSON.stringify({
          slotId,
          organName: bundle.manifest.name,
          manifest: bundle.manifest,
        }),
        prev_hash: '', // Will be computed by ledger service
      });
    } catch (error) {
      // Ledger write failed - rollback not needed (no state changed yet)
      this.pendingSnapshots.delete(transactionId);
      return {
        success: false,
        error: `Failed to write ledger entry: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // =========================================================================
    // Step 4: Mutate State
    // =========================================================================
    try {
      const state = this.store.getState();
      const slots = state.slots;
      const organs = state.organs;

      // Find the target slot
      const targetSlot = slots.find(s => s.id === slotId);
      if (!targetSlot) {
        throw new Error(`Slot ${slotId} not found`);
      }

      // Check slot is empty
      if (targetSlot.organId) {
        throw new Error(`Slot ${slotId} already has an organ`);
      }

      // Create organ instance
      const organInstance: OrganInstance = {
        id: organId,
        name: bundle.manifest.name,
        manifest: {
          name: bundle.manifest.name,
          version: bundle.manifest.version,
          apiVersion: bundle.manifest.apiVersion,
          permissions: bundle.manifest.permissions,
          ports: bundle.manifest.ports.map(p => ({
            name: p.name,
            direction: p.direction,
            schema: p.schema,
          })),
          slotSize: bundle.manifest.slotSize,
        },
        status: 'active',
        installedAt: new Date().toISOString(),
      };

      // Update state atomically
      const updatedSlots = slots.map(s =>
        s.id === slotId ? { ...s, organId } : s
      );

      const updatedOrgans = new Map(organs);
      updatedOrgans.set(organId, organInstance);

      this.store.setState({
        slots: updatedSlots,
        organs: updatedOrgans,
      });

      // Clear tracked snapshot on success
      this.pendingSnapshots.delete(transactionId);

      return {
        success: true,
        organId,
        ledgerEntryId: ledgerEntry.id,
      };
    } catch (error) {
      // =========================================================================
      // Step 5: Rollback on Failure
      // =========================================================================
      try {
        this.rollback(snapshot);
      } catch (rollbackError) {
        // Log rollback failure but still report transplant failure
        console.error('Rollback failed during transplant error:', rollbackError);
      }
      this.pendingSnapshots.delete(transactionId);

      return {
        success: false,
        error: `Transplant failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Rollback to a previous state using a snapshot.
   *
   * @param snapshot - The snapshot to restore
   */
  rollback(snapshot: Snapshot): void {
    restore(snapshot, this.store);
  }

  /**
   * Amputate (remove) an organ and restore to prior state.
   *
   * @param organId - The organ to remove
   * @returns Result indicating success or failure
   */
  async amputate(organId: string): Promise<TransplantResult> {
    const transactionId = `amp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Find the organ
    const state = this.store.getState();
    const organ = state.organs.get(organId);

    if (!organ) {
      return {
        success: false,
        error: `Organ ${organId} not found`,
      };
    }

    // Find the slot containing this organ
    const slot = state.slots.find(s => s.organId === organId);
    if (!slot) {
      return {
        success: false,
        error: `No slot found containing organ ${organId}`,
      };
    }

    // Capture snapshot before amputation
    const snapshot = capture(transactionId, state);

    // Write AMPUTATED ledger entry before state change (LED-02)
    try {
      await this.ledgerService.append({
        id: transactionId,
        ts: Date.now(),
        organ_id: organId,
        event: 'AMPUTATED' as EventType,
        payload_json: JSON.stringify({
          organName: organ.name,
          slotId: slot.id,
        }),
        prev_hash: '', // Will be computed by ledger service
      });
    } catch (error) {
      return {
        success: false,
        error: `Failed to write amputation ledger entry: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Perform amputation
    try {
      const organs = state.organs;
      const slots = state.slots;

      // Remove organ from registry
      const updatedOrgans = new Map(organs);
      updatedOrgans.delete(organId);

      // Remove organ reference from slot
      const updatedSlots = slots.map(s =>
        s.id === slot.id ? { ...s, organId: undefined } : s
      );

      this.store.setState({
        slots: updatedSlots,
        organs: updatedOrgans,
      });

      return {
        success: true,
        organId,
        ledgerEntryId: transactionId,
      };
    } catch (error) {
      // Rollback on failure
      this.rollback(snapshot);
      return {
        success: false,
        error: `Amputation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get a pending snapshot by transaction ID (for testing).
   */
  getPendingSnapshot(transactionId: string): Snapshot | undefined {
    return this.pendingSnapshots.get(transactionId)?.snapshot;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a TransactionCoordinator with the given dependencies.
 */
export function createTransactionCoordinator(
  deps: TransactionCoordinatorDeps
): TransactionCoordinator {
  return new TransactionCoordinator(deps);
}
