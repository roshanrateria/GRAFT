import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  type Entry,
  type LedgerService,
  computeHash,
  verifyChain,
  GENESIS_PREV_HASH
} from '@graft/ledger';
import { findPackageRoot } from '../paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * SQLite-backed implementation of the LedgerService interface.
 * Provides persistent storage for the hash-chain ledger.
 */
export class SQLiteLedgerService implements LedgerService {
  private db: Database.Database;

  /**
   * Initialize the ledger database with the schema.
   * @param dbPath - Path to the SQLite database file
   */
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  /**
   * Initialize the database schema from schema.sql.
   */
  private initializeSchema(): void {
    const candidates = [
      join(__dirname, 'schema.sql'), // dev (src/db) and dist if the build copies the asset
      join(findPackageRoot(__dirname), 'src', 'db', 'schema.sql'), // built: tsc does not copy .sql assets
    ];
    const schemaPath = candidates.find((p) => existsSync(p));
    if (!schemaPath) {
      throw new Error(`schema.sql not found (tried: ${candidates.join(', ')})`);
    }
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  /**
   * Get the last entry in the ledger, or null if empty.
   */
  private getLastEntry(): Entry | null {
    const stmt = this.db.prepare(`
      SELECT id, ts, organ_id, event, payload_json, prev_hash, hash
      FROM ledger
      ORDER BY ts DESC, id DESC
      LIMIT 1
    `);
    const row = stmt.get() as Omit<Entry, 'organ_id'> & { organ_id: string | null } | undefined;
    if (!row) {
      return null;
    }
    return {
      ...row,
      organ_id: row.organ_id,
    } as Entry;
  }

  /**
   * Append a new entry to the ledger.
   * The hash is computed automatically from the entry data.
   */
  async append(entry: Omit<Entry, 'hash'>): Promise<Entry> {
    // Determine the previous hash
    const lastEntry = this.getLastEntry();
    const prevHash = lastEntry ? lastEntry.hash : GENESIS_PREV_HASH;

    // Validate that the entry's prev_hash matches
    if (entry.prev_hash !== prevHash) {
      throw new Error(`Invalid prev_hash: expected ${prevHash}, got ${entry.prev_hash}`);
    }

    // Compute the hash for this entry
    const hash = computeHash(prevHash, entry);

    // Insert the entry
    const stmt = this.db.prepare(`
      INSERT INTO ledger (id, ts, organ_id, event, payload_json, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const fullEntry: Entry = {
      ...entry,
      hash,
    };

    stmt.run(
      entry.id,
      entry.ts,
      entry.organ_id,
      entry.event,
      entry.payload_json,
      entry.prev_hash,
      hash
    );

    return fullEntry;
  }

  /**
   * Get the history of entries, optionally filtered by organ ID.
   * Returns entries in chronological order (oldest first).
   */
  async getHistory(organId?: string): Promise<Entry[]> {
    let stmt: Database.Statement;
    
    if (organId) {
      stmt = this.db.prepare(`
        SELECT id, ts, organ_id, event, payload_json, prev_hash, hash
        FROM ledger
        WHERE organ_id = ?
        ORDER BY ts ASC, id ASC
      `);
      const rows = stmt.all(organId) as Array<Omit<Entry, 'organ_id'> & { organ_id: string | null }>;
      return rows.map(row => ({
        ...row,
        organ_id: row.organ_id,
      })) as Entry[];
    } else {
      stmt = this.db.prepare(`
        SELECT id, ts, organ_id, event, payload_json, prev_hash, hash
        FROM ledger
        ORDER BY ts ASC, id ASC
      `);
      const rows = stmt.all() as Array<Omit<Entry, 'organ_id'> & { organ_id: string | null }>;
      return rows.map(row => ({
        ...row,
        organ_id: row.organ_id,
      })) as Entry[];
    }
  }

  /**
   * Verify the integrity of the entire chain.
   * Returns { valid: true } if all hashes are correct.
   * Returns { valid: false, errorIndex } if a mismatch is found.
   */
  async verify(): Promise<{ valid: boolean; errorIndex?: number }> {
    const entries = await this.getHistory();
    return verifyChain(entries);
  }

  /**
   * Close the database connection.
   * Should be called when shutting down the server.
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get the underlying database instance for advanced operations.
   * Use with caution - direct modifications may break chain integrity.
   */
  getDatabase(): Database.Database {
    return this.db;
  }
}

/**
 * Create a new ledger service with an in-memory database.
 * Useful for testing.
 */
export function createInMemoryLedger(): SQLiteLedgerService {
  return new SQLiteLedgerService(':memory:');
}
