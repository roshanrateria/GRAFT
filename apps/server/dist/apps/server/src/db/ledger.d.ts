import Database from 'better-sqlite3';
import { type Entry, type LedgerService } from '@graft/ledger';
/**
 * SQLite-backed implementation of the LedgerService interface.
 * Provides persistent storage for the hash-chain ledger.
 */
export declare class SQLiteLedgerService implements LedgerService {
    private db;
    /**
     * Initialize the ledger database with the schema.
     * @param dbPath - Path to the SQLite database file
     */
    constructor(dbPath: string);
    /**
     * Initialize the database schema from schema.sql.
     */
    private initializeSchema;
    /**
     * Get the last entry in the ledger, or null if empty.
     */
    private getLastEntry;
    /**
     * Append a new entry to the ledger.
     * The hash is computed automatically from the entry data.
     */
    append(entry: Omit<Entry, 'hash'>): Promise<Entry>;
    /**
     * Get the history of entries, optionally filtered by organ ID.
     * Returns entries in chronological order (oldest first).
     */
    getHistory(organId?: string): Promise<Entry[]>;
    /**
     * Verify the integrity of the entire chain.
     * Returns { valid: true } if all hashes are correct.
     * Returns { valid: false, errorIndex } if a mismatch is found.
     */
    verify(): Promise<{
        valid: boolean;
        errorIndex?: number;
    }>;
    /**
     * Close the database connection.
     * Should be called when shutting down the server.
     */
    close(): void;
    /**
     * Get the underlying database instance for advanced operations.
     * Use with caution - direct modifications may break chain integrity.
     */
    getDatabase(): Database.Database;
}
/**
 * Create a new ledger service with an in-memory database.
 * Useful for testing.
 */
export declare function createInMemoryLedger(): SQLiteLedgerService;
//# sourceMappingURL=ledger.d.ts.map