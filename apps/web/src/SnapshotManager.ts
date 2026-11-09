/**
 * Snapshot Manager - Captures and restores Creature state for reversibility
 *
 * Implements REV-01: Transplant followed by amputation SHALL restore the exact prior state.
 * Snapshots capture the full state of slots, organs, and links before any transplant.
 */

import type { CreatureState, OrganSlot, OrganInstance } from './stores/creatureStore';

// =============================================================================
// Types
// =============================================================================

/**
 * Serialized slot state for snapshot
 */
export interface SlotSnapshot {
  id: string;
  position: { row: number; col: number };
  size: 'small' | 'medium' | 'large';
  organId?: string;
}

/**
 * Serialized organ state for snapshot
 */
export interface OrganSnapshot {
  id: string;
  name: string;
  manifest: {
    name: string;
    version: string;
    apiVersion: string;
    permissions: string[];
    ports: { name: string; direction: 'in' | 'out'; schema: object }[];
    slotSize: 'small' | 'medium' | 'large';
  };
  status: 'pending' | 'active' | 'quarantined' | 'decayed';
  installedAt: string;
}

/**
 * Port link for chimera mode (future feature)
 */
export interface PortLink {
  id: string;
  sourceOrganId: string;
  sourcePort: string;
  targetOrganId: string;
  targetPort: string;
}

/**
 * Immutable snapshot of Creature state at a point in time
 */
export interface Snapshot {
  /** Transaction ID this snapshot is associated with */
  transactionId: string;
  /** Unix timestamp when snapshot was taken */
  timestamp: number;
  /** Serialized slot states */
  slots: SlotSnapshot[];
  /** Map of organ ID to organ state */
  organs: Record<string, OrganSnapshot>;
  /** Port links (for chimera mode) */
  links: PortLink[];
}

// =============================================================================
// Snapshot Manager
// =============================================================================

/**
 * Capture the current state of the Creature into an immutable snapshot.
 *
 * @param transactionId - The ID of the transaction this snapshot is for
 * @param state - The current Creature state from the store
 * @param links - Optional array of current port links (for chimera mode)
 * @returns An immutable snapshot of the state
 */
export function capture(
  transactionId: string,
  state: Pick<CreatureState, 'slots' | 'organs'>,
  links: PortLink[] = []
): Snapshot {
  // Serialize slots (already serializable)
  const slots: SlotSnapshot[] = state.slots.map(slot => ({
    id: slot.id,
    position: { ...slot.position },
    size: slot.size,
    organId: slot.organId,
  }));

  // Serialize organs Map to record
  const organs: Record<string, OrganSnapshot> = {};
  state.organs.forEach((organ, id) => {
    organs[id] = {
      id: organ.id,
      name: organ.name,
      manifest: {
        name: organ.manifest.name,
        version: organ.manifest.version,
        apiVersion: organ.manifest.apiVersion,
        permissions: [...organ.manifest.permissions],
        ports: organ.manifest.ports.map(p => ({
          name: p.name,
          direction: p.direction,
          schema: { ...p.schema },
        })),
        slotSize: organ.manifest.slotSize,
      },
      status: organ.status,
      installedAt: organ.installedAt,
    };
  });

  // Serialize links (defensive copy)
  const serializedLinks: PortLink[] = links.map(link => ({ ...link }));

  return {
    transactionId,
    timestamp: Date.now(),
    slots,
    organs,
    links: serializedLinks,
  };
}

/**
 * Restore Creature state from a snapshot.
 *
 * @param snapshot - The snapshot to restore from
 * @param store - The Zustand store with actions to restore state
 */
export function restore(
  snapshot: Snapshot,
  store: {
    setState: (state: Partial<CreatureState>) => void;
    getState: () => CreatureState;
  }
): void {
  const currentState = store.getState();

  // Restore slots
  const restoredSlots: OrganSlot[] = snapshot.slots.map(s => ({
    id: s.id,
    position: { ...s.position },
    size: s.size,
    organId: s.organId,
  }));

  // Restore organs map
  const restoredOrgans = new Map<string, OrganInstance>();
  Object.values(snapshot.organs).forEach(organ => {
    restoredOrgans.set(organ.id, {
      id: organ.id,
      name: organ.name,
      manifest: {
        name: organ.manifest.name,
        version: organ.manifest.version,
        apiVersion: organ.manifest.apiVersion,
        permissions: [...organ.manifest.permissions],
        ports: organ.manifest.ports.map(p => ({
          name: p.name,
          direction: p.direction,
          schema: { ...p.schema },
        })),
        slotSize: organ.manifest.slotSize,
      },
      status: organ.status,
      installedAt: organ.installedAt,
    });
  });

  // Apply restored state (preserve non-snapshot domains like mood, tasks, etc.)
  store.setState({
    slots: restoredSlots,
    organs: restoredOrgans,
  });
}

/**
 * Deep compare two snapshots for full equality (including metadata).
 * Used to verify snapshot identity.
 *
 * @param a - First snapshot
 * @param b - Second snapshot
 * @returns true if snapshots are deeply equal including metadata
 */
export function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  // Quick checks including metadata
  if (a.transactionId !== b.transactionId) return false;
  if (a.timestamp !== b.timestamp) return false;
  return snapshotStateEqual(a, b);
}

/**
 * Compare only the state portions of two snapshots (excluding metadata).
 * Used to verify REV-01: exact state restoration.
 *
 * @param a - First snapshot
 * @param b - Second snapshot
 * @returns true if snapshot states (slots, organs, links) are equal
 */
export function snapshotStateEqual(a: Snapshot, b: Snapshot): boolean {
  // Compare state arrays/maps
  if (a.slots.length !== b.slots.length) return false;
  if (Object.keys(a.organs).length !== Object.keys(b.organs).length) return false;
  if (a.links.length !== b.links.length) return false;

  // Compare slots
  for (let i = 0; i < a.slots.length; i++) {
    const slotA = a.slots[i];
    const slotB = b.slots[i];
    if (
      slotA.id !== slotB.id ||
      slotA.position.row !== slotB.position.row ||
      slotA.position.col !== slotB.position.col ||
      slotA.size !== slotB.size ||
      slotA.organId !== slotB.organId
    ) {
      return false;
    }
  }

  // Compare organs
  for (const id of Object.keys(a.organs)) {
    if (!(id in b.organs)) return false;
    const organA = a.organs[id];
    const organB = b.organs[id];
    if (
      organA.id !== organB.id ||
      organA.name !== organB.name ||
      organA.status !== organB.status ||
      organA.installedAt !== organB.installedAt
    ) {
      return false;
    }
    // Compare manifest
    if (
      organA.manifest.name !== organB.manifest.name ||
      organA.manifest.version !== organB.manifest.version ||
      organA.manifest.apiVersion !== organB.manifest.apiVersion ||
      organA.manifest.slotSize !== organB.manifest.slotSize
    ) {
      return false;
    }
    // Compare permissions arrays
    if (organA.manifest.permissions.length !== organB.manifest.permissions.length) {
      return false;
    }
    for (let i = 0; i < organA.manifest.permissions.length; i++) {
      if (organA.manifest.permissions[i] !== organB.manifest.permissions[i]) {
        return false;
      }
    }
  }

  // Compare links
  for (let i = 0; i < a.links.length; i++) {
    const linkA = a.links[i];
    const linkB = b.links[i];
    if (
      linkA.id !== linkB.id ||
      linkA.sourceOrganId !== linkB.sourceOrganId ||
      linkA.sourcePort !== linkB.sourcePort ||
      linkA.targetOrganId !== linkB.targetOrganId ||
      linkA.targetPort !== linkB.targetPort
    ) {
      return false;
    }
  }

  return true;
}
