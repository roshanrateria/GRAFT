# Tasks: Immune System

## Phase 2: Immune v1 + Vertical Slice

### Task 2.1: Static Analysis Core
- [x] Create `packages/immune/src/static/js-analyzer.ts` using acorn + acorn-walk
- [x] Create `packages/immune/src/static/html-analyzer.ts` using parse5
- [x] Implement banned construct detection
- [x] Write PBT for IMM-01 (banned construct detection)
- [x] Write tests with obfuscated examples

### Task 2.2: Manifest Validation
- [x] Create `packages/immune/src/manifest/schemas.ts` with zod schemas
- [x] Create `packages/immune/src/manifest/validator.ts`
- [x] Implement permission validation
- [x] Write PBT for IMM-02 (permission violation)
- [x] Write tests for edge cases

### Task 2.3: Behavioral Harness
- [x] Create `packages/immune/src/behavioral/harness.ts` for browser sandbox (implemented in packages/immune/src/behavioral/index.ts)
- [x] Implement load time measurement
- [x] Implement error detection
- [x] Implement DOM node counting
- [x] Implement CSP violation detection
- [ ] Write tests (no dedicated behavioral test file; exercised via hostile.test.ts)

### Task 2.4: Property Harness
- [x] Create `packages/immune/src/properties/universal.ts` with U1-U7
- [x] Create `packages/immune/src/properties/runner.ts` for fast-check execution
- [x] Implement seed logging on failure
- [ ] Integrate axe-core for accessibility (not implemented; axe-core is not a dependency)
- [x] Write PBT for IMM-04

### Task 2.5: Immune Orchestrator
- [x] Create `packages/immune/src/orchestrator.ts` to run all stages
- [x] Implement fail-closed logic (IMM-03)
- [x] Create `packages/immune/src/report.ts` for structured reports
- [x] Implement IMM-05 (reason code, message, source location)
- [x] Write integration tests

### Task 2.6: Hostile Organ Suite
- [x] Create `organs/hostile/01-direct-fetch/` (Stage 1 reject)
- [x] Create `organs/hostile/02-obfuscated-fetch/` (Stage 1 reject)
- [x] Create `organs/hostile/03-cookie-access/` (Stage 1 reject)
- [x] Create `organs/hostile/04-message-flood/` (Stage 3 reject)
- [x] Create `organs/hostile/05-undeclared-port/` (Stage 2 reject)
- [x] Create `organs/hostile/06-top-access/` (Stage 1 reject)
- [x] Write test asserting IMM-06 (all 6 rejected at expected stages)

### Task 2.7: Replay Doctor Provider
- [x] Create `packages/doctor/src/providers/replay.ts`
- [x] Implement playback of `fixtures/replays/*.json`
- [x] Add realistic streaming delays
- [ ] Add "REPLAY" tag in UI (not implemented; events carry _replay but the web UI shows no badge)
- [x] Write tests

## Dependencies

- Task 2.5 depends on 2.1, 2.2, 2.3, 2.4
- Task 2.6 depends on 2.5
- Task 2.7 is independent

## Acceptance Criteria

- [x] All 6 hostile organs rejected at correct stages
- [x] PBT for IMM-01, IMM-02, IMM-04 pass
- [x] Static analysis catches computed access to window
- [x] Property fuzz logs seed on failure
