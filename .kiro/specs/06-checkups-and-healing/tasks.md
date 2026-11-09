# Tasks: Checkups and Healing

## Phase 4: Accountability

### Task 6.1: Checkup Script
- [ ] Create `scripts/checkup.ts`
- [ ] Implement organ enumeration from registry
- [ ] Implement immune system re-run
- [ ] Implement ledger entry writing
- [ ] Verify CHK-01 and CHK-02

### Task 6.2: Healing Doctor Method
- [ ] Update `packages/doctor/src/types.ts` with heal() in interface
- [ ] Implement in LLM provider (if using)
- [ ] Implement in Crew provider
- [ ] Add replay fixture for healing
- [ ] Write tests

### Task 6.3: Healing UI Flow
- [ ] Create `apps/web/src/HealingDialog.tsx`
- [ ] Show decay report
- [ ] Show proposed patch (spec delta, code diff)
- [ ] Implement approve/reject buttons
- [ ] Write HEAL_PROPOSED/HEAL_APPROVED ledger entries
- [ ] Verify CHK-03

### Task 6.4: Decay Simulator
- [ ] Create `apps/web/src/DecaySimulator.ts`
- [ ] Implement API version toggle
- [ ] Implement v2 behavior:
  - mood.entries → mood.log
  - nerve.now() async
- [ ] Create UI toggle in demo controls
- [ ] Verify CHK-04

### Task 6.5: Decay Demo Recording
- [ ] Record healing replay for v1 → v2 migration
- [ ] Save to `fixtures/replays/healing-v1-to-v2.json`
- [ ] Test full decay + heal + approve flow

### Task 6.6: "Fast-forward the Night" Button
- [ ] Create `apps/web/src/FastForwardButton.tsx`
- [ ] Triggers checkup script
- [ ] Shows progress indicator
- [ ] Displays results
- [ ] Write component tests

## Dependencies

- Task 6.2 depends on Task 3.1 (Doctor interface)
- Task 6.3 depends on 6.2
- Task 6.4 is independent
- Task 6.5 depends on 6.2, 6.4

## Acceptance Criteria

- [ ] CHK-01: All organs re-verified on checkup
- [ ] CHK-02: Checkup script has no LLM calls
- [ ] CHK-03: Healing proposed and waits for approval
- [ ] CHK-04: Decay simulator causes v1 failures
- [ ] DEM-02: "Fast-forward the night" button works
