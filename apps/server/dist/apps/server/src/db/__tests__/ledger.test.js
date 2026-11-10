import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInMemoryLedger } from '../ledger.js';
import { EventType, GENESIS_PREV_HASH } from '@graft/ledger';
describe('SQLiteLedgerService', () => {
    let ledger;
    beforeEach(() => {
        ledger = createInMemoryLedger();
    });
    afterEach(() => {
        ledger.close();
    });
    describe('append', () => {
        it('creates a valid genesis entry with correct hash', async () => {
            const entry = await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            expect(entry.hash).toBeDefined();
            expect(entry.hash).toHaveLength(64); // SHA-256 produces 64 hex chars
            expect(entry.prev_hash).toBe(GENESIS_PREV_HASH);
        });
        it('creates subsequent entries linked to previous hash', async () => {
            const entry1 = await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            const entry2 = await ledger.append({
                id: 'entry-2',
                ts: Date.now() + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: entry1.hash,
            });
            expect(entry2.prev_hash).toBe(entry1.hash);
            expect(entry2.hash).not.toBe(entry1.hash);
        });
        it('throws error if prev_hash does not match chain', async () => {
            await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            // Try to append with wrong prev_hash
            await expect(ledger.append({
                id: 'entry-2',
                ts: Date.now() + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: 'wrong-hash',
            })).rejects.toThrow('Invalid prev_hash');
        });
    });
    describe('getHistory', () => {
        it('returns empty array for empty ledger', async () => {
            const history = await ledger.getHistory();
            expect(history).toEqual([]);
        });
        it('returns all entries in chronological order', async () => {
            const now = Date.now();
            await ledger.append({
                id: 'entry-1',
                ts: now,
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            await ledger.append({
                id: 'entry-2',
                ts: now + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: (await ledger.getHistory())[0].hash,
            });
            await ledger.append({
                id: 'entry-3',
                ts: now + 2000,
                organ_id: 'organ-123',
                event: EventType.BUILD,
                payload_json: JSON.stringify({ build: 'success' }),
                prev_hash: (await ledger.getHistory())[1].hash,
            });
            const history = await ledger.getHistory();
            expect(history).toHaveLength(3);
            expect(history[0].id).toBe('entry-1');
            expect(history[1].id).toBe('entry-2');
            expect(history[2].id).toBe('entry-3');
        });
        it('filters by organ_id when provided', async () => {
            const now = Date.now();
            await ledger.append({
                id: 'entry-1',
                ts: now,
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            await ledger.append({
                id: 'entry-2',
                ts: now + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: (await ledger.getHistory())[0].hash,
            });
            await ledger.append({
                id: 'entry-3',
                ts: now + 2000,
                organ_id: 'organ-456',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Timer organ' }),
                prev_hash: (await ledger.getHistory())[1].hash,
            });
            const organ123History = await ledger.getHistory('organ-123');
            expect(organ123History).toHaveLength(1);
            expect(organ123History[0].id).toBe('entry-2');
            expect(organ123History[0].organ_id).toBe('organ-123');
            const organ456History = await ledger.getHistory('organ-456');
            expect(organ456History).toHaveLength(1);
            expect(organ456History[0].id).toBe('entry-3');
            // No entries for non-existent organ
            const noHistory = await ledger.getHistory('organ-999');
            expect(noHistory).toHaveLength(0);
        });
    });
    describe('verify', () => {
        it('returns valid for empty ledger', async () => {
            const result = await ledger.verify();
            expect(result.valid).toBe(true);
        });
        it('returns valid for correct chain', async () => {
            const now = Date.now();
            let lastHash = GENESIS_PREV_HASH;
            for (let i = 1; i <= 5; i++) {
                const entry = await ledger.append({
                    id: `entry-${i}`,
                    ts: now + i * 1000,
                    organ_id: i % 2 === 0 ? 'organ-123' : null,
                    event: EventType.WISH,
                    payload_json: JSON.stringify({ index: i }),
                    prev_hash: lastHash,
                });
                lastHash = entry.hash;
            }
            const result = await ledger.verify();
            expect(result.valid).toBe(true);
        });
        it('detects tampering with entry data', async () => {
            // Create a valid chain
            const entry1 = await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            await ledger.append({
                id: 'entry-2',
                ts: Date.now() + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: entry1.hash,
            });
            // Tamper with the first entry directly in the database
            const db = ledger.getDatabase();
            db.prepare(`
        UPDATE ledger SET payload_json = ? WHERE id = ?
      `).run(JSON.stringify({ wish: 'TAMPERED' }), 'entry-1');
            // Verification should detect the tampering
            const result = await ledger.verify();
            expect(result.valid).toBe(false);
            expect(result.errorIndex).toBe(0);
        });
        it('detects tampering with hash', async () => {
            // Create a valid chain
            const entry1 = await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            await ledger.append({
                id: 'entry-2',
                ts: Date.now() + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: entry1.hash,
            });
            // Tamper with the hash directly in the database
            const db = ledger.getDatabase();
            db.prepare(`
        UPDATE ledger SET hash = ? WHERE id = ?
      `).run('0'.repeat(64), 'entry-1');
            // Verification should detect the tampering
            const result = await ledger.verify();
            expect(result.valid).toBe(false);
            expect(result.errorIndex).toBe(0);
        });
        it('detects broken chain links', async () => {
            // Create a valid chain
            const entry1 = await ledger.append({
                id: 'entry-1',
                ts: Date.now(),
                organ_id: null,
                event: EventType.WISH,
                payload_json: JSON.stringify({ wish: 'Add a counter' }),
                prev_hash: GENESIS_PREV_HASH,
            });
            await ledger.append({
                id: 'entry-2',
                ts: Date.now() + 1000,
                organ_id: 'organ-123',
                event: EventType.SPEC,
                payload_json: JSON.stringify({ spec: 'Counter organ' }),
                prev_hash: entry1.hash,
            });
            // Tamper with the prev_hash to break the chain
            const db = ledger.getDatabase();
            db.prepare(`
        UPDATE ledger SET prev_hash = ? WHERE id = ?
      `).run('broken-prev-hash', 'entry-2');
            // Verification should detect the broken link
            const result = await ledger.verify();
            expect(result.valid).toBe(false);
            expect(result.errorIndex).toBe(1);
        });
    });
});
//# sourceMappingURL=ledger.test.js.map