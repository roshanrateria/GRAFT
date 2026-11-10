# Tasks: Ledger and Reversibility

## Phase 4: Accountability

### Task 4.1: Ledger Package
- [ ] Create `packages/ledger/src/types.ts` with Entry, EventType types
- [ ] Create `packages/ledger/src/canonical-json.ts` for canonical serialization
- [ ] Create `packages/ledger/src/service.ts` with LedgerService
- [ ] Create `packages/ledger/src/verify.ts` with chain verification
- [ ] Write PBT for LED-01 (chain integrity)

### Task 4.2: Ledger Database
- [ ] Create `apps/server/src/db/schema.sql` with ledger table
- [ ] Create `apps/server/src/db/ledger.ts` with SQLite operations
- [ ] Implement append operation with hash computation
- [ ] Implement history queries
- [ ] Write tests

### Task 4.3: Snapshot Manager
- [ ] Create `apps/web/src/SnapshotManager.ts`
- [ ] Implement state capture
- [ ] Implement state restore
- [ ] Store snapshots with transaction IDs
- [ ] Write tests

### Task 4.4: Transaction Coordinator
- [ ] Create `apps/web/src/TransactionCoordinator.ts`
- [ ] Implement atomic transplant with rollback
- [ ] Write PBT for REV-02 (atomicity)
- [ ] Write PBT for REV-01 (reversibility)
- [ ] Verify LED-02 (ledger first)

### Task 4.5: Amputation Flow
- [ ] Create `apps/web/src/AmputationService.ts`
- [ ] Implement snapshot restore on amputation
- [ ] Remove organ, links, state
- [ ] Write ledger entry
- [ ] Write integration tests

### Task 4.6: Ledger UI
- [ ] Create `apps/web/src/ChartPanel.tsx` for ledger timeline
- [ ] Implement "Verify chain" button
- [ ] Show verification result
- [ ] Display event history
- [ ] Write component tests

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
