# Tasks: Immune System

## Phase 2: Immune v1 + Vertical Slice

### Task 2.1: Static Analysis Core
- [ ] Create `packages/immune/src/static/js-analyzer.ts` using acorn + acorn-walk
- [ ] Create `packages/immune/src/static/html-analyzer.ts` using parse5
- [ ] Implement banned construct detection
- [ ] Write PBT for IMM-01 (banned construct detection)
- [ ] Write tests with obfuscated examples

### Task 2.2: Manifest Validation
- [ ] Create `packages/immune/src/manifest/schemas.ts` with zod schemas
- [ ] Create `packages/immune/src/manifest/validator.ts`
- [ ] Implement permission validation
- [ ] Write PBT for IMM-02 (permission violation)
- [ ] Write tests for edge cases

### Task 2.3: Behavioral Harness
- [ ] Create `packages/immune/src/behavioral/harness.ts` for browser sandbox
- [ ] Implement load time measurement
- [ ] Implement error detection
- [ ] Implement DOM node counting
- [ ] Implement CSP violation detection
- [ ] Write tests

### Task 2.4: Property Harness
- [ ] Create `packages/immune/src/properties/universal.ts` with U1-U7
- [ ] Create `packages/immune/src/properties/runner.ts` for fast-check execution
- [ ] Implement seed logging on failure
- [ ] Integrate axe-core for accessibility
- [ ] Write PBT for IMM-04

### Task 2.5: Immune Orchestrator
- [ ] Create `packages/immune/src/orchestrator.ts` to run all stages
- [ ] Implement fail-closed logic (IMM-03)
- [ ] Create `packages/immune/src/report.ts` for structured reports
- [ ] Implement IMM-05 (reason code, message, source location)
- [ ] Write integration tests

### Task 2.6: Hostile Organ Suite
- [ ] Create `organs/hostile/01-direct-fetch/` (Stage 1 reject)
- [ ] Create `organs/hostile/02-obfuscated-fetch/` (Stage 1 reject)
- [ ] Create `organs/hostile/03-cookie-access/` (Stage 1 reject)
- [ ] Create `organs/hostile/04-message-flood/` (Stage 3 reject)
- [ ] Create `organs/hostile/05-undeclared-port/` (Stage 2 reject)
- [ ] Create `organs/hostile/06-top-access/` (Stage 1 reject)
- [ ] Write test asserting IMM-06 (all 6 rejected at expected stages)

### Task 2.7: Replay Doctor Provider
- [ ] Create `packages/doctor/src/providers/replay.ts`
- [ ] Implement playback of `fixtures/replays/*.json`
- [ ] Add realistic streaming delays
- [ ] Add "REPLAY" tag in UI
- [ ] Write tests

## Dependencies

- Task 2.5 depends on 2.1, 2.2, 2.3, 2.4
- Task 2.6 depends on 2.5
- Task 2.7 is independent

## Acceptance Criteria

- [ ] All 6 hostile organs rejected at correct stages
- [ ] PBT for IMM-01, IMM-02, IMM-04 pass
- [ ] Static analysis catches computed access to window
- [ ] Property fuzz logs seed on failure
