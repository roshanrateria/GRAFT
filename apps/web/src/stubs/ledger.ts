/**
 * Browser stub for @graft/ledger
 *
 * The real package computes entry hashes with node:crypto, which does not
 * exist in the browser. Browser flows therefore delegate hashing and appends
 * to the server (POST /api/ledger/append) and use this module only for the
 * shared TYPES and CONSTANTS.
 *
 * This stub must stay type-compatible with packages/ledger/src (Entry,
 * LedgerService, EventType values, GENESIS_PREV_HASH).
 */

// Genesis previous hash (64 zeros) - same value as the real package
export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Event types recorded in the ledger.
 * Values MUST mirror packages/ledger/src/types.ts (the server validates
 * against its own enum when /api/ledger/append is called).
 */
export enum EventType {
  /** User submits a wish */
  WISH = 'WISH',
  /** Spec finalized */
  SPEC = 'SPEC',
  /** Build complete */
  BUILD = 'BUILD',
  /** Immune system passed */
  IMMUNE_PASS = 'IMMUNE_PASS',
  /** Immune system rejected */
  IMMUNE_FAIL = 'IMMUNE_FAIL',
  /** User approved transplant */
  TRANSPLANT_APPROVED = 'TRANSPLANT_APPROVED',
  /** Organ removed */
  AMPUTATED = 'AMPUTATED',
  /** Ports linked */
  CHIMERA_LINKED = 'CHIMERA_LINKED',
  /** Checkup passed */
  CHECKUP_PASS = 'CHECKUP_PASS',
  /** Checkup failed */
  CHECKUP_FAIL = 'CHECKUP_FAIL',
  /** Healing patch proposed */
  HEAL_PROPOSED = 'HEAL_PROPOSED',
  /** Healing patch approved */
  HEAL_APPROVED = 'HEAL_APPROVED',
}

/** A single entry in the ledger hash chain (shape mirrors the real package) */
export type Entry = {
  /** Unique identifier for this entry */
  id: string;
  /** Unix timestamp in milliseconds */
  ts: number;
  /** ID of the organ this event relates to (null for system-level events) */
  organ_id: string | null;
  /** Type of event */
  event: EventType;
  /** JSON-encoded payload specific to the event type */
  payload_json: string;
  /** Hash of the previous entry in the chain (64 zeros for genesis) */
  prev_hash: string;
  /** SHA-256 hash of (prev_hash + canonical_json(row_without_hash)) */
  hash: string;
};

/**
 * Interface for the ledger service (shape mirrors the real package).
 * In the browser, the concrete implementation is FetchLedgerService, which
 * forwards appends to the server so the hash chain stays authoritative.
 */
export type LedgerService = {
  /** Append a new entry; the server computes and validates the hash chain. */
  append(entry: Omit<Entry, 'hash'>): Promise<Entry>;
  /** Verify the integrity of the entire chain. */
  verify(): Promise<{ valid: boolean; errorIndex?: number }>;
  /** Get the history of entries, optionally filtered by organ ID. */
  getHistory(organId?: string): Promise<Entry[]>;
};

export type VerificationResult = { valid: boolean; errorIndex?: number };

// Hash computation is server-side only in the browser.
export async function computeHash(): Promise<never> {
  throw new Error(
    'computeHash must be called on the server, not in the browser. Use the /api/ledger/append endpoint instead.'
  );
}
