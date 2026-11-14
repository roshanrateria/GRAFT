/**
 * Organ Runtime
 *
 * Glue between the Nerve hosts of all live organs:
 * - hostRegistry: every active SandboxHost registers its NerveHost here
 * - routeEmit: routes an organ's `emit` to chimera-linked organs (`sendIn`)
 * - data sync: subscribes to the creature store and pushes domain changes to
 *   every organ subscribed to that path (via NerveHost.notifyDataChanged)
 */

import { DATA_DOMAIN_PATH_LIST, isDataDomainPath } from './dataProvider';
import type { NerveHost } from '../NerveHost';
import { useCreatureStore } from '../stores/creatureStore';

/**
 * Registry of live NerveHosts keyed by organ ID.
 * SandboxHost adds/removes itself as it mounts/unmounts.
 */
export const hostRegistry = new Map<string, NerveHost>();

/**
 * Cache of the most recent payload emitted by each organ port.
 * Key format: `${sourceOrganId}:${port}`.
 * Used to immediately feed initial data to newly linked chimera targets.
 */
export const lastEmittedValues = new Map<string, unknown>();

/**
 * Get the most recent value emitted by a given organ port.
 */
export function getLastEmittedValue(sourceOrganId: string, port: string): unknown | undefined {
  return lastEmittedValues.get(`${sourceOrganId}:${port}`);
}

/**
 * Route an emit from a source organ to all chimera-linked targets.
 * For each link whose source matches (organId, port), the payload is sent
 * into the target organ's linked input port via its NerveHost (`in` message).
 */
export function routeEmit(sourceOrganId: string, port: string, payload: unknown): void {
  lastEmittedValues.set(`${sourceOrganId}:${port}`, payload);

  const { chimeraLinks } = useCreatureStore.getState();

  const targets = chimeraLinks.filter(
    l => l.sourceOrganId === sourceOrganId && l.sourcePort === port
  );

  for (const link of targets) {
    hostRegistry.get(link.targetOrganId)?.sendIn(link.targetPort, payload);
  }
}

/**
 * Snapshot of the last-seen domain values (by reference) to detect changes.
 */
let lastDomainRefs: Array<{ path: string; ref: unknown }> = [];

function snapshotDomainRefs(): Array<{ path: string; ref: unknown }> {
  const state = useCreatureStore.getState();
  return [
    { path: 'mood.entries', ref: state.mood },
    { path: 'tasks.items', ref: state.tasks },
    { path: 'habits.checkins', ref: state.habits },
    { path: 'calendar.events', ref: state.calendar },
  ];
}

let unsubscribeStore: (() => void) | null = null;

/**
 * Subscribe to creature-store changes and push data updates to organs that
 * subscribed to a changed path. Idempotent; call once the first organ mounts.
 */
export function startDataSync(): void {
  if (unsubscribeStore) return;

  lastDomainRefs = snapshotDomainRefs();

  unsubscribeStore = useCreatureStore.subscribe(() => {
    const next = snapshotDomainRefs();
    for (let i = 0; i < next.length; i++) {
      const previous = lastDomainRefs[i];
      if (previous && previous.ref !== next[i].ref && isDataDomainPath(next[i].path)) {
        // Push to every live host; NerveHost filters by per-organ subscription
        // and permission.
        for (const host of hostRegistry.values()) {
          host.notifyDataChanged(next[i].path);
        }
      }
    }
    lastDomainRefs = next;
  });
}

/**
 * Stop the store subscription (used by tests).
 */
export function stopDataSync(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;
  lastDomainRefs = [];
}
