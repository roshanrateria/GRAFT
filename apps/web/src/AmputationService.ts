/**
 * Amputation Service
 *
 * Coordinates amputation (removal) of organs with:
 * - Pre-transplant snapshot restoration
 * - Link removal (chimera mode)
 * - Ledger entry recording
 * - Atomic state changes
 *
 * Implements:
 * - REV-01: Transplant followed by amputation SHALL restore the exact prior state.
 * - REV-02: Atomicity (failure leaves no partial state)
 * - LED-02: Ledger First (write ledger entry before state change)
 */

import { capture, restore, type Snapshot, type PortLink } from './SnapshotManager.js';
import type { CreatureState } from './stores/creatureStore.js';
import type { LedgerService, EventType } from '@graft/ledger';
import { getChainHeadHash } from './ledger/head.js';

// =============================================================================
// Types
// =============================================================================

/** Result of an amputation operation */
export interface AmputationResult {
  success: boolean;
  error?: string;
  ledgerEntryId?: string;
}

/** Snapshot storage for pre-transplant state */
export interface SnapshotStorage {
  /** Store a snapshot associated with an organ ID */
  store(organId: string, snapshot: Snapshot): Promise<void>;
  /** Retrieve the pre-transplant snapshot for an organ */
  retrieve(organId: string): Promise<Snapshot | null>;
  /** Remove stored snapshot for an organ */
  remove(organId: string): Promise<void>;
}

/** Link storage for chimera mode */
export interface LinkStorage {
  /** Get all links involving a specific organ */
  getLinksForOrgan(organId: string): Promise<PortLink[]>;
  /** Remove a link */
  removeLink(linkId: string): Promise<void>;
  /** Get all links */
  getAllLinks(): Promise<PortLink[]>;
  /** Set all links (for restoration) */
  setAllLinks(links: PortLink[]): Promise<void>;
}

/** Dependencies for the AmputationService */
export interface AmputationServiceDeps {
  /** Ledger service for recording state changes */
  ledgerService: LedgerService;
  /** Snapshot storage for retrieving pre-transplant snapshots */
  snapshotStorage: SnapshotStorage;
  /** Link storage for chimera mode */
  linkStorage: LinkStorage;
  /** Zustand store for state management */
  store: {
    getState: () => CreatureState;
    setState: (state: Partial<CreatureState>) => void;
  };
}

// =============================================================================
// In-Memory Implementations (for testing and default use)
// =============================================================================

/**
 * In-memory snapshot storage implementation.
 * Maps organ IDs to their pre-transplant snapshots.
 */
export class InMemorySnapshotStorage implements SnapshotStorage {
  private snapshots: Map<string, Snapshot> = new Map();

  async store(organId: string, snapshot: Snapshot): Promise<void> {
    this.snapshots.set(organId, snapshot);
  }

  async retrieve(organId: string): Promise<Snapshot | null> {
    return this.snapshots.get(organId) ?? null;
  }

  async remove(organId: string): Promise<void> {
    this.snapshots.delete(organId);
  }
}

/**
 * In-memory link storage implementation.
 * Stores port links for chimera mode.
 */
export class InMemoryLinkStorage implements LinkStorage {
  private links: Map<string, PortLink> = new Map();

  async getLinksForOrgan(organId: string): Promise<PortLink[]> {
    const result: PortLink[] = [];
    this.links.forEach(link => {
      if (link.sourceOrganId === organId || link.targetOrganId === organId) {
        result.push(link);
      }
    });
    return result;
  }

  async removeLink(linkId: string): Promise<void> {
    this.links.delete(linkId);
  }

  async getAllLinks(): Promise<PortLink[]> {
    return Array.from(this.links.values());
  }

  async setAllLinks(links: PortLink[]): Promise<void> {
    this.links.clear();
    links.forEach(link => this.links.set(link.id, link));
  }

  /** Add a link (for testing/setup) */
  addLink(link: PortLink): void {
    this.links.set(link.id, link);
  }
}

// =============================================================================
// Amputation Service
// =============================================================================

/**
 * AmputationService manages organ removal with full state restoration.
 *
 * Order of operations for amputation:
 * 1. Find the organ's slot
 * 2. Retrieve the snapshot from before transplant
 * 3. Write AMPUTATED ledger entry (LED-02: ledger first)
 * 4. Restore snapshot (layout, registry state)
 * 5. Remove organ from slot
 * 6. Remove all links involving this organ (if chimera)
 * 7. Remove organ's stored state
 * 8. Return success/error
 */
export class AmputationService {
  private ledgerService: LedgerService;
  private snapshotStorage: SnapshotStorage;
  private linkStorage: LinkStorage;
  private store: {
    getState: () => CreatureState;
    setState: (state: Partial<CreatureState>) => void;
  };

  constructor(deps: AmputationServiceDeps) {
    this.ledgerService = deps.ledgerService;
    this.snapshotStorage = deps.snapshotStorage;
    this.linkStorage = deps.linkStorage;
    this.store = deps.store;
  }

  /**
   * Amputate (remove) an organ and restore to prior state.
   *
   * @param organId - The organ to remove
   * @returns Result indicating success or failure with error details
   */
  async amputate(organId: string): Promise<AmputationResult> {
    const transactionId = `amp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // =========================================================================
    // Step 1: Find the organ and its slot
    // =========================================================================
    const state = this.store.getState();
    const organ = state.organs.get(organId);

    if (!organ) {
      return {
        success: false,
        error: `Organ '${organId}' not found`,
      };
    }

    const slot = state.slots.find(s => s.organId === organId);
    if (!slot) {
      return {
        success: false,
        error: `No slot found containing organ '${organId}'`,
      };
    }

    // =========================================================================
    // Step 2: Retrieve pre-transplant snapshot
    // =========================================================================
    const preTransplantSnapshot = await this.snapshotStorage.retrieve(organId);
    if (!preTransplantSnapshot) {
      return {
        success: false,
        error: `No pre-transplant snapshot found for organ '${organId}'`,
      };
    }

    // Capture current state for potential rollback on failure
    const currentSnapshot = capture(transactionId, state, await this.linkStorage.getAllLinks());

    // =========================================================================
    // Step 3: Write AMPUTATED Ledger Entry BEFORE State Mutation (LED-02)
    // =========================================================================
    try {
      const prevHash = await getChainHeadHash(this.ledgerService);

      await this.ledgerService.append({
        id: transactionId,
        ts: Date.now(),
        organ_id: organId,
        event: 'AMPUTATED' as EventType,
        payload_json: JSON.stringify({
          organName: organ.name,
          slotId: slot.id,
          transactionId,
        }),
        prev_hash: prevHash,
      });
    } catch (error) {
      return {
        success: false,
        error: `Failed to write amputation ledger entry: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // =========================================================================
    // Step 4-7: Perform State Changes
    // =========================================================================
    try {
      // Step 4: Restore pre-transplant snapshot (layout, registry state)
      restore(preTransplantSnapshot, this.store);

      // Step 5: Remove organ from slot (already handled by restore, but be explicit)
      const currentState = this.store.getState();
      const updatedSlots = currentState.slots.map(s =>
        s.id === slot.id ? { ...s, organId: undefined } : s
      );

      // Step 6: Remove all links involving this organ (chimera mode)
      const organLinks = await this.linkStorage.getLinksForOrgan(organId);
      for (const link of organLinks) {
        // Write CHIMERA_LINKED ledger entry for link removal (CHI-03)
        const linkPrevHash = await getChainHeadHash(this.ledgerService);

        await this.ledgerService.append({
          id: `${transactionId}-link-${link.id}`,
          ts: Date.now(),
          organ_id: organId,
          event: 'CHIMERA_LINKED' as EventType,
          payload_json: JSON.stringify({
            action: 'removed',
            linkId: link.id,
            sourceOrganId: link.sourceOrganId,
            sourcePort: link.sourcePort,
            targetOrganId: link.targetOrganId,
            targetPort: link.targetPort,
            reason: 'amputation',
          }),
          prev_hash: linkPrevHash,
        });
        
        await this.linkStorage.removeLink(link.id);
      }

      // Step 7: Remove organ's stored state
      const updatedOrgans = new Map(currentState.organs);
      updatedOrgans.delete(organId);

      // Apply final state
      this.store.setState({
        slots: updatedSlots,
        organs: updatedOrgans,
      });

      // Clean up stored snapshot
      await this.snapshotStorage.remove(organId);

      return {
        success: true,
        ledgerEntryId: transactionId,
      };
    } catch (error) {
      // Rollback on failure - restore the current state we captured
      try {
        restore(currentSnapshot, this.store);
        await this.linkStorage.setAllLinks(currentSnapshot.links);
      } catch (rollbackError) {
        console.error('Rollback failed during amputation error:', rollbackError);
      }

      return {
        success: false,
        error: `Amputation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an AmputationService with the given dependencies.
 */
export function createAmputationService(deps: AmputationServiceDeps): AmputationService {
  return new AmputationService(deps);
}
