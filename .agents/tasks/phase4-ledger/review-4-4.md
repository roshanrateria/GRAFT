# Review: Task 4.4 - Transaction Coordinator

**File:** `apps/web/src/TransactionCoordinator.ts`  
**Tests:** `apps/web/src/__tests__/rev-01-property.test.ts`, `apps/web/src/__tests__/rev-02-property.test.ts`

---

## Summary

The TransactionCoordinator implementation provides atomic transplant operations with proper immune system verification, snapshot capture, ledger-first state mutation, and automatic rollback on failure. All 11 property-based tests pass.

---

## Checklist Results

### 1. Atomic Transplant with Proper Rollback ✅

The implementation correctly captures a snapshot before any state mutation and restores it on failure:

```typescript
// Step 2: Capture Snapshot BEFORE State Change
const snapshot = capture(transactionId, currentState);

// Step 4: Mutate State (with try/catch)
try {
  // ... mutation logic
} catch (error) {
  // Step 5: Rollback on Failure
  this.rollback(snapshot);
}
```

The rollback mechanism uses the SnapshotManager's `restore()` function which correctly restores slots, organs, and links.

### 2. LED-02: Ledger Entry Written BEFORE State Mutation ✅

The ordering is explicitly verified in the tests:

```typescript
// LED-02: Ledger write must happen before state mutation
expect(orderOfOperations).toEqual(['ledger-write', 'state-mutation']);
```

The implementation follows this order:
1. Immune system verification
2. Snapshot capture
3. Ledger entry written
4. State mutation
5. Rollback if mutation fails

### 3. Immune System Verification Before Transplant ✅

The implementation runs immune system verification as the first step (Step 1), before any state changes:

```typescript
// Step 1: Immune System Verification
try {
  const immuneReport = await this.immuneSystem.run(bundle);
  if (!immuneReport.passed) {
    return { success: false, error: immuneReport.rejection?.message };
  }
} catch (error) {
  // Fail closed: any error during immune check means rejection
  return { success: false, error: `Immune system error: ...` };
}
```

### 4. PBT REV-01: Transplant + Amputation Restores State ✅

Three property-based tests verify reversibility:
- `transplant followed by amputation restores exact prior state` - arbitrary initial states with fast-check
- `reversibility holds for empty initial state` - edge case
- `reversibility holds with multiple organs` - complex state

All tests pass with `snapshotStateEqual()` verification.

### 5. PBT REV-02: Failure Leaves No Partial State ✅

Five property-based tests verify atomicity:
- `immune system failure leaves state unchanged` - no ledger entries, no state changes
- `ledger write failure leaves state unchanged` - no state changes
- `state mutation failure triggers rollback` - state restored
- `no partial organ in registry after failure` - verified no organs exist
- `atomicity with arbitrary failure points` - tests all failure scenarios

All tests pass. The Creature's operational state (slots, organs) is correctly restored on failure.

**Design Note:** When a state mutation fails after a ledger entry is written, the ledger entry remains. This is intentional behavior - the ledger is an audit trail, not Creature state. The test explicitly verifies this:
```typescript
// Ledger entry should have been written (before state mutation)
expect(ledgerService.entries.length).toBe(1);
```

### 6. Proper Error Handling (Fail Closed) ✅

The implementation follows fail-closed principles:

1. **Immune system errors** → rejection (line 117-120)
2. **Ledger write errors** → return failure before state change (line 153-160)
3. **State mutation errors** → rollback and return failure (line 222-234)
4. **Rollback errors** → logged but still return failure (line 228-231)

All error paths return `{ success: false, error: "..." }` rather than throwing or silently failing.

### 7. Tests Verify Ordering (LED-02) ✅

The `LED-02: Ledger First` test suite specifically verifies ordering:

```typescript
it('ledger entry is written before state mutation', async () => {
  const orderOfOperations: string[] = [];
  // ... wrap ledger and store to track order
  expect(orderOfOperations).toEqual(['ledger-write', 'state-mutation']);
});
```

Additional tests verify:
- `state not mutated if ledger write fails` - no mutation on ledger failure
- `amputation writes ledger before removing organ` - LED-02 for amputation

---

## Test Results

```
✓ apps/web/src/__tests__/rev-02-property.test.ts (8 tests)
  ✓ REV-02: Atomicity Property (5 tests)
  ✓ LED-02: Ledger First (3 tests)
✓ apps/web/src/__tests__/rev-01-property.test.ts (3 tests)
  ✓ REV-01: Reversibility Property (3 tests)

Test Files  2 passed (2)
Tests       11 passed (11)
```

---

## Design Considerations

### Orphaned Ledger Entries

When a state mutation fails after a ledger entry is written, the `TRANSPLANT_APPROVED` entry remains in the ledger with no corresponding organ in the registry. This is **intentional design**:

1. **Audit Trail Preservation:** The ledger is append-only for tamper-evidence. Deleting entries would break the hash chain.
2. **Historical Accuracy:** The entry accurately records that a transplant was approved but failed to complete.
3. **Creature State vs. Audit Trail:** REV-02 guarantees no partial **Creature state** (slots, organs), not no partial ledger history.

This design choice is explicitly tested and documented.

### Event Type Semantics

The `TRANSPLANT_APPROVED` event is documented as "User approved transplant" in `packages/ledger/src/types.ts`. The `TransactionCoordinator.transplant()` function should be called **after** user consent is obtained. The event name correctly reflects that consent was granted before this function was invoked.

---

## Verdict

**APPROVED**

The implementation correctly satisfies all requirements:
- LED-02: Ledger entries written before state mutations
- REV-01: Transplant + amputation restores exact prior state
- REV-02: Failures leave no partial Creature state
- Fail-closed error handling throughout
- Comprehensive PBT coverage with fast-check

All 11 property-based tests pass.
