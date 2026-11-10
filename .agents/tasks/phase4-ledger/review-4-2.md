# Review: Task 4.2 (Ledger Database)

## Files Reviewed

- `apps/server/src/db/schema.sql` - Database schema
- `apps/server/src/db/ledger.ts` - SQLite implementation
- `apps/server/src/db/__tests__/ledger.test.ts` - Unit tests

## 1. Schema Verification

**Spec Requirements (Task 4.2):**
- Create `apps/server/src/db/schema.sql` with ledger table
- Implement append operation with hash computation
- Implement history queries

**Implementation:**

The schema.sql defines a `ledger` table with:
- `id TEXT PRIMARY KEY` - Unique identifier
- `ts INTEGER NOT NULL` - Unix timestamp
- `organ_id TEXT` - Optional organ reference (nullable)
- `event TEXT NOT NULL` - Event type
- `payload_json TEXT NOT NULL` - JSON payload
- `prev_hash TEXT NOT NULL` - Previous entry hash
- `hash TEXT NOT NULL` - Current entry hash

Indexes on `organ_id` and `ts` support the query patterns.

**Verdict:** Schema correctly matches Entry type from `@graft/ledger`.

## 2. Append Operation with Hash Computation

**Code Analysis:**

```typescript
async append(entry: Omit<Entry, 'hash'>): Promise<Entry> {
  const lastEntry = this.getLastEntry();
  const prevHash = lastEntry ? lastEntry.hash : GENESIS_PREV_HASH;
  
  if (entry.prev_hash !== prevHash) {
    throw new Error(`Invalid prev_hash: expected ${prevHash}, got ${entry.prev_hash}`);
  }
  
  const hash = computeHash(prevHash, entry);
  // ... insert
}
```

**Verdict:** Correctly uses `computeHash` from `@graft/ledger`. Validates prev_hash matches the chain before computing and inserting. Fails closed on mismatch.

## 3. History Queries

**Code Analysis:**

```typescript
async getHistory(organId?: string): Promise<Entry[]> {
  if (organId) {
    // Filtered query with WHERE organ_id = ?
  } else {
    // Full query
  }
  // ORDER BY ts ASC, id ASC for chronological order
}
```

**Verdict:** Works correctly with and without organId filter. Returns entries in chronological order (oldest first). Correctly handles nullable organ_id field.

## 4. Verify Operation

**Code Analysis:**

```typescript
async verify(): Promise<{ valid: boolean; errorIndex?: number }> {
  const entries = await this.getHistory();
  return verifyChain(entries);
}
```

**Verdict:** Correctly delegates to `verifyChain` from `@graft/ledger`. Returns the full verification result.

## 5. Error Handling (Fail Closed)

**Analysis:**

- Invalid prev_hash throws error - prevents chain corruption
- Database errors from better-sqlite3 propagate as exceptions
- Schema initialization runs in constructor, fails immediately on problems
- `verify()` returns `{ valid: false, errorIndex }` on any chain break

**Verdict:** Proper fail-closed behavior. Errors result in rejection/exception, not silent failures.

## 6. Test Coverage

**Tests in `ledger.test.ts`:**

| Category | Tests |
|----------|-------|
| append | Genesis entry hash, subsequent entries linked, prev_hash validation error |
| getHistory | Empty ledger, chronological order, organ_id filtering |
| verify | Empty ledger valid, correct chain valid, detects data tampering, detects hash tampering, detects broken chain links |

**Test Results:** All 11 tests pass.

**Verdict:** Tests cover all three main operations with positive and negative cases. Tampering tests verify chain integrity detection works.

## 7. Interface Compliance

**Analysis:**

`SQLiteLedgerService` implements `LedgerService` interface from `@graft/ledger`:
- `append(entry: Omit<Entry, 'hash'>): Promise<Entry>` ✓
- `verify(): Promise<{ valid: boolean; errorIndex?: number }>` ✓
- `getHistory(organId?: string): Promise<Entry[]>` ✓

**Verdict:** Full interface compliance.

## Summary

| Requirement | Status |
|-------------|--------|
| Schema matches spec | PASS |
| append computes hash correctly | PASS |
| getHistory with/without filter | PASS |
| verify uses @graft/ledger | PASS |
| Fail-closed error handling | PASS |
| Tests cover append, query, verify | PASS |
| Interface compliance | PASS |

**No blockers found.**

