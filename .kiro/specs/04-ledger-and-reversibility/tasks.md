# Tasks: Ledger and Reversibility

## Phase 4: Accountability

### Task 4.1: Ledger Package
- [x] Create `packages/ledger/src/types.ts` with Entry, EventType types
- [x] Create `packages/ledger/src/canonical-json.ts` for canonical serialization
- [x] Create `packages/ledger/src/service.ts` with LedgerService
- [x] Create `packages/ledger/src/verify.ts` with chain verification
- [x] Write PBT for LED-01 (chain integrity)

### Task 4.2: Ledger Database
- [x] Create `apps/server/src/db/schema.sql` with ledger table
- [x] Create `apps/server/src/db/ledger.ts` with SQLite operations
- [x] Implement append operation with hash computation
- [x] Implement history queries
- [x] Write tests

### Task 4.3: Snapshot Manager
- [x] Create `apps/web/src/SnapshotManager.ts`
- [x] Implement state capture
- [x] Implement state restore
- [x] Store snapshots with transaction IDs
- [x] Write tests

### Task 4.4: Transaction Coordinator
- [x] Create `apps/web/src/TransactionCoordinator.ts`
- [x] Implement atomic transplant with rollback
- [x] Write PBT for REV-02 (atomicity)
- [x] Write PBT for REV-01 (reversibility)
- [x] Verify LED-02 (ledger first)

### Task 4.5: Amputation Flow
- [x] Create `apps/web/src/AmputationService.ts`
- [x] Implement snapshot restore on amputation
- [x] Remove organ, links, state
- [x] Write ledger entry
- [x] Write integration tests

### Task 4.6: Ledger UI
- [x] Create `apps/web/src/ChartPanel.tsx` for ledger timeline (at apps/web/src/components/ChartPanel.tsx)
- [x] Implement "Verify chain" button
- [x] Show verification result
- [x] Display event history
- [x] Write component tests

## Dependencies

- Task 4.4 depends on 4.1, 4.2, 4.3
- Task 4.5 depends on 4.3, 4.4
- Task 4.6 depends on 4.1, 4.2

## Acceptance Criteria

- [x] PBT LED-01 passes: any mutation detected
- [x] PBT REV-01 passes: transplant+amputation restores state
- [x] PBT REV-02 passes: failure leaves no partial state
- [x] LED-02: ledger entry written before state change
- [x] "Verify chain" button works in UI
