import { createHash } from 'crypto';
import { canonicalStringify } from './canonical-json.js';
import { GENESIS_PREV_HASH, type Entry } from './types.js';

/**
 * Compute the hash for a ledger entry.
 * hash = sha256(prev_hash + canonical_json(row_without_hash))
 */
export function computeHash(
  prevHash: string,
  row: Omit<Entry, 'hash'>
): string {
  // Create the row without hash for canonical serialization
  const rowWithoutHash = {
    id: row.id,
    ts: row.ts,
    organ_id: row.organ_id,
    event: row.event,
    payload_json: row.payload_json,
    prev_hash: row.prev_hash,
  };

  const canonical = canonicalStringify(rowWithoutHash);
  const input = prevHash + canonical;

  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Verify the integrity of a ledger chain.
 * Returns { valid: true } if all hashes are correct.
 * Returns { valid: false, errorIndex } if a mismatch is found.
 */
export function verifyChain(entries: Entry[]): { valid: boolean; errorIndex?: number } {
  if (entries.length === 0) {
    return { valid: true };
  }

  // Verify each entry's hash
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Genesis entry must have GENESIS_PREV_HASH
    if (i === 0 && entry.prev_hash !== GENESIS_PREV_HASH) {
      return { valid: false, errorIndex: i };
    }

    // Verify the hash is correct for this entry
    const expectedHash = computeHash(entry.prev_hash, entry);

    if (entry.hash !== expectedHash) {
      return { valid: false, errorIndex: i };
    }

    // Verify prev_hash links correctly (except for genesis)
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (entry.prev_hash !== prevEntry.hash) {
        return { valid: false, errorIndex: i };
      }
    }
  }

  return { valid: true };
}
