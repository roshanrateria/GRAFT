import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EventType, GENESIS_PREV_HASH } from '../types.js';
import { computeHash, verifyChain } from '../verify.js';
/**
 * LED-01: Chain Integrity [PBT]
 * Any mutation of any ledger row SHALL be detected by chain verification.
 */
// Arbitrary for EventType
const eventTypeArb = fc.constantFrom(...Object.values(EventType));
// Arbitrary for a valid ledger entry (without hash - that's computed)
// We don't include prev_hash here because it's computed based on position in chain
const entryWithoutHashArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    ts: fc.integer({ min: 0, max: Date.now() * 2 }),
    organ_id: fc.option(fc.string({ minLength: 1, maxLength: 36 }), { nil: null }),
    event: eventTypeArb,
    payload_json: fc.string({ minLength: 2, maxLength: 1000 }),
});
describe('Unit tests for chain building', () => {
    it('computes hash correctly for a single entry', () => {
        const entry = {
            id: 'test-1',
            ts: 1000,
            organ_id: null,
            event: EventType.WISH,
            payload_json: '{}',
            prev_hash: GENESIS_PREV_HASH,
        };
        const hash = computeHash(GENESIS_PREV_HASH, entry);
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]+$/);
    });
    it('builds and verifies a simple chain', () => {
        // Build chain from scratch with proper prev_hash linking
        const chain = [];
        // Entry 1: Genesis
        const entry1Data = { id: '1', ts: 1000, organ_id: null, event: EventType.WISH, payload_json: '{}' };
        const hash1 = computeHash(GENESIS_PREV_HASH, { ...entry1Data, prev_hash: GENESIS_PREV_HASH });
        chain.push({ ...entry1Data, prev_hash: GENESIS_PREV_HASH, hash: hash1 });
        // Entry 2: Links to entry 1
        const entry2Data = { id: '2', ts: 2000, organ_id: 'organ-1', event: EventType.SPEC, payload_json: '{}' };
        const hash2 = computeHash(hash1, { ...entry2Data, prev_hash: hash1 });
        chain.push({ ...entry2Data, prev_hash: hash1, hash: hash2 });
        // Entry 3: Links to entry 2
        const entry3Data = { id: '3', ts: 3000, organ_id: 'organ-1', event: EventType.BUILD, payload_json: '{}' };
        const hash3 = computeHash(hash2, { ...entry3Data, prev_hash: hash2 });
        chain.push({ ...entry3Data, prev_hash: hash2, hash: hash3 });
        // Verify
        const result = verifyChain(chain);
        expect(result.valid).toBe(true);
    });
});
/**
 * Build a valid chain of entries from arbitrary data.
 * Entries don't need prev_hash - it will be set during chain building.
 */
function buildValidChain(entries) {
    const result = [];
    for (let i = 0; i < entries.length; i++) {
        const prevHash = i === 0 ? GENESIS_PREV_HASH : result[i - 1].hash;
        // Set prev_hash on the entry before computing hash
        const entryWithPrevHash = { ...entries[i], prev_hash: prevHash };
        const hash = computeHash(prevHash, entryWithPrevHash);
        result.push({
            ...entryWithPrevHash,
            hash,
        });
    }
    return result;
}
describe('LED-01: Chain Integrity', () => {
    it('property: valid chain passes verification', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), (entries) => {
            const chain = buildValidChain(entries);
            const result = verifyChain(chain);
            return result.valid === true;
        }), {
            verbose: true,
            // Log seed on failure for reproducibility
            seed: undefined, // Will use random seed, logged on failure
        });
    });
    it('property: mutating any row id is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), fc.string({ minLength: 1, maxLength: 10 }), (entries, seed, newValue) => {
            const chain = buildValidChain(entries);
            const indexToMutate = seed % chain.length;
            // Mutate the id
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, id: newValue + entry.id } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false && result.errorIndex === indexToMutate;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: mutating any row timestamp is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), fc.integer({ min: 1, max: 1000000 }), (entries, seed, delta) => {
            const chain = buildValidChain(entries);
            const indexToMutate = seed % chain.length;
            // Mutate the timestamp
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, ts: entry.ts + delta } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false && result.errorIndex === indexToMutate;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: mutating any row event type is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), eventTypeArb, (entries, seed, newEvent) => {
            const chain = buildValidChain(entries);
            const indexToMutate = seed % chain.length;
            // Only mutate if different event type
            if (chain[indexToMutate].event === newEvent) {
                return true; // Skip - no actual mutation
            }
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, event: newEvent } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false && result.errorIndex === indexToMutate;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: mutating any row payload is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), fc.string({ minLength: 1, maxLength: 10 }), (entries, seed, mutation) => {
            const chain = buildValidChain(entries);
            const indexToMutate = seed % chain.length;
            // Mutate payload_json
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, payload_json: mutation + entry.payload_json } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false && result.errorIndex === indexToMutate;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: mutating any row hash is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), fc.hexaString({ minLength: 64, maxLength: 64 }), (entries, seed, newHash) => {
            const chain = buildValidChain(entries);
            const indexToMutate = seed % chain.length;
            // Only mutate if different hash
            if (chain[indexToMutate].hash === newHash) {
                return true; // Skip - no actual mutation
            }
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, hash: newHash } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false && result.errorIndex === indexToMutate;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: mutating prev_hash breaks chain linkage', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 2, maxLength: 20 }), fc.integer({ min: 1, max: 100000 }), fc.hexaString({ minLength: 64, maxLength: 64 }), (entries, seed, newPrevHash) => {
            const chain = buildValidChain(entries);
            const indexToMutate = Math.max(1, seed % chain.length); // Never mutate first entry
            // Only mutate if different
            if (chain[indexToMutate].prev_hash === newPrevHash) {
                return true; // Skip - no actual mutation
            }
            const mutatedChain = chain.map((entry, i) => i === indexToMutate ? { ...entry, prev_hash: newPrevHash } : entry);
            const result = verifyChain(mutatedChain);
            return result.valid === false;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: inserting a row is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 2, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), entryWithoutHashArb, (entries, seed, newEntry) => {
            const chain = buildValidChain(entries);
            const insertIndex = seed % (chain.length + 1);
            // Insert a new entry at a random position with a prev_hash that's unlikely to match
            const newEntryWithHash = {
                ...newEntry,
                prev_hash: GENESIS_PREV_HASH,
                hash: computeHash(GENESIS_PREV_HASH, { ...newEntry, prev_hash: GENESIS_PREV_HASH }),
            };
            const mutatedChain = [
                ...chain.slice(0, insertIndex),
                newEntryWithHash,
                ...chain.slice(insertIndex),
            ];
            const result = verifyChain(mutatedChain);
            return result.valid === false;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: removing a row is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 2, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), (entries, seed) => {
            const chain = buildValidChain(entries);
            const removeIndex = seed % chain.length;
            // Remove an entry
            const mutatedChain = chain.filter((_, i) => i !== removeIndex);
            // Empty chain is valid
            if (mutatedChain.length === 0) {
                return true;
            }
            const result = verifyChain(mutatedChain);
            // Removing the last entry leaves a valid chain
            // (the remaining entries still form a valid chain)
            if (removeIndex === chain.length - 1) {
                return result.valid === true;
            }
            // Removing any other entry should break the chain
            return result.valid === false;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
    it('property: swapping rows is detected', () => {
        fc.assert(fc.property(fc.array(entryWithoutHashArb, { minLength: 3, maxLength: 20 }), fc.integer({ min: 0, max: 100000 }), fc.integer({ min: 0, max: 100000 }), (entries, seed1, seed2) => {
            const chain = buildValidChain(entries);
            const i1 = seed1 % chain.length;
            let i2 = seed2 % chain.length;
            // Ensure different indices
            if (i1 === i2) {
                i2 = (i2 + 1) % chain.length;
            }
            // Swap entries
            const mutatedChain = [...chain];
            [mutatedChain[i1], mutatedChain[i2]] = [mutatedChain[i2], mutatedChain[i1]];
            const result = verifyChain(mutatedChain);
            return result.valid === false;
        }), {
            verbose: true,
            seed: undefined,
        });
    });
});
/**
 * Helper to log seed on failure for reproducibility.
 * Fast-check automatically logs the seed when a property fails.
 * To reproduce a failure, set the seed option:
 *
 * fc.assert(property, { seed: <failed-seed> })
 */
//# sourceMappingURL=led-01-property.test.js.map