import { type Entry } from './types.js';
/**
 * Compute the hash for a ledger entry.
 * hash = sha256(prev_hash + canonical_json(row_without_hash))
 */
export declare function computeHash(prevHash: string, row: Omit<Entry, 'hash'>): string;
/**
 * Verify the integrity of a ledger chain.
 * Returns { valid: true } if all hashes are correct.
 * Returns { valid: false, errorIndex } if a mismatch is found.
 */
export declare function verifyChain(entries: Entry[]): {
    valid: boolean;
    errorIndex?: number;
};
//# sourceMappingURL=verify.d.ts.map