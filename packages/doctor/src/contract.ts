/**
 * Port contract helpers.
 *
 * The spec step extracts the ports/permissions a wish names as structured
 * data. These pure helpers make that contract authoritative on the manifest,
 * so the model cannot silently rename, retype or drop ports at build/repair.
 */

import type { OrganBundle, OrganPort } from './types.js';

export interface Contract {
  ports?: unknown;
  permissions?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Coerce untrusted model output into a clean port list.
 * Drops malformed entries and de-duplicates by (name, direction).
 */
export function normalizePorts(raw: unknown): OrganPort[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: OrganPort[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const direction = item.direction;
    if (!name || (direction !== 'in' && direction !== 'out')) continue;
    const key = `${direction}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      name,
      direction,
      schema: isRecord(item.schema) ? item.schema : {},
    });
  }
  return result;
}

/** Keep only string entries, trimmed and de-duplicated. */
export function normalizePermissions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const value = item.trim();
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

/**
 * Apply a port contract to a bundle.
 *
 * - Ports: the contract's ports win when present; otherwise the manifest's
 *   own (normalized) ports are kept. Never undefined.
 * - Permissions: manifest permissions plus the contract's.
 * - Every `out` port gets its `emit:<name>` permission; `emit:` permissions
 *   for ports that are not declared `out` are dropped.
 */
export function applyContract(bundle: OrganBundle, contract: Contract = {}): OrganBundle {
  const contractPorts = normalizePorts(contract.ports);
  const ports = contractPorts.length > 0 ? contractPorts : normalizePorts(bundle.manifest?.ports);

  const outNames = new Set(ports.filter(p => p.direction === 'out').map(p => p.name));
  const merged = normalizePermissions([
    ...normalizePermissions(bundle.manifest?.permissions),
    ...normalizePermissions(contract.permissions),
  ]).filter(p => !p.startsWith('emit:') || outNames.has(p.slice('emit:'.length)));

  for (const name of outNames) {
    const emit = `emit:${name}`;
    if (!merged.includes(emit)) merged.push(emit);
  }

  return {
    ...bundle,
    manifest: { ...bundle.manifest, ports, permissions: merged },
  };
}
