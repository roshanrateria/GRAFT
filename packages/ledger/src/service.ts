import type { Entry } from './types.js';
import { computeHash } from './verify.js';

/**
 * Interface for the ledger service.
 * Implementations may use in-memory storage, SQLite, etc.
 */
export interface LedgerService {
  /**
   * Append a new entry to the ledger.
   * The hash is computed automatically from the entry data.
   */
  append(entry: Omit<Entry, 'hash'>): Promise<Entry>;

  /**
   * Verify the integrity of the entire chain.
   * Returns { valid: true } if all hashes are correct.
   * Returns { valid: false, errorIndex } if a mismatch is found.
   */
  verify(): Promise<{ valid: boolean; errorIndex?: number }>;

  /**
   * Get the history of entries, optionally filtered by organ ID.
   * Returns entries in chronological order (oldest first).
   */
  getHistory(organId?: string): Promise<Entry[]>;
}
