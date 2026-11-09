# Tasks: Doctor Pipeline

## Phase 3: Real Doctor

### Task 3.1: Doctor Interface
- [ ] Create `packages/doctor/src/types.ts` with DoctorProvider interface
- [ ] Create `packages/doctor/src/events.ts` with DoctorEvent types
- [ ] Create `packages/doctor/src/anatomy.ts` with Anatomy type
- [ ] Write type tests

### Task 3.2: LLM Provider
- [ ] Create `packages/doctor/src/providers/llm.ts`
- [ ] Implement HTTP client with streaming
- [ ] Create prompt templates for spec/build/repair/heal
- [ ] Implement memory file (anatomy.md)
- [ ] Write integration tests (mock LLM)

### Task 3.3: Crew Provider
- [ ] Read current Kiro Crew docs for invocation method
- [ ] Create `packages/doctor/src/providers/crew.ts`
- [ ] Implement bot invocation (webhooks/ACP)
- [ ] Implement memory management
- [ ] Implement scheduling for checkups
- [ ] Write integration tests

### Task 3.4: Replay Provider Enhancement
- [ ] Extend `packages/doctor/src/providers/replay.ts` from Task 2.7
- [ ] Add all event types
- [ ] Add realistic delays
- [ ] Add "REPLAY" tag enforcement
- [ ] Verify DOC-05

### Task 3.5: Doctor Gateway
- [ ] Create `apps/server/src/doctor/gateway.ts`
- [ ] Implement provider selection via `DOCTOR_PROVIDER` env
- [ ] Implement streaming endpoint (WebSocket or SSE)
- [ ] Add event logging
- [ ] Write tests

### Task 3.6: Doctor UI Components
- [ ] Create `apps/web/src/DoctorNotes.tsx` for case file display
- [ ] Create `apps/web/src/WishInput.tsx` for wish submission
- [ ] Create `apps/web/src/ConsentDialog.tsx` for transplant approval
- [ ] Implement event streaming consumption
- [ ] Write component tests

### Task 3.7: Demo Wish Recordings
- [ ] Record replay for wish 1: "Show a graph of my mood this month"
- [ ] Record replay for wish 2: "Count overdue tasks"
- [ ] Record replay for wish 3: "Show habits when mood is high"
- [ ] Record replay for hostile wish
- [ ] Save to `fixtures/replays/`

## Dependencies

- Task 3.5 depends on 3.1, 3.2, 3.3, 3.4
- Task 3.6 depends on 3.5
- Task 3.7 depends on 3.5, 3.6

## Acceptance Criteria

- [ ] DOC-01: Spec with ≤8 requirements before build
- [ ] DOC-02: ≥3 properties per organ
- [ ] DOC-03: Max 2 repair rounds
- [ ] DOC-04: Never install without consent click
- [ ] DOC-05: Replay labeled in UI
- [ ] 3 demo wishes pass live
