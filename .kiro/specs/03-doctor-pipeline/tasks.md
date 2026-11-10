# Tasks: Doctor Pipeline

## Phase 3: Real Doctor

### Task 3.1: Doctor Interface
- [x] Create `packages/doctor/src/types.ts` with DoctorProvider interface
- [x] Create `packages/doctor/src/events.ts` with DoctorEvent types
- [x] Create `packages/doctor/src/anatomy.ts` with Anatomy type
- [x] Write type tests

### Task 3.2: LLM Provider
- [x] Create `packages/doctor/src/providers/llm.ts`
- [x] Implement HTTP client with streaming
- [x] Create prompt templates for spec/build/repair/heal
- [x] Implement memory file (anatomy.md)
- [x] Write integration tests (mock LLM)

### Task 3.3: Crew Provider
- [x] Read current Kiro Crew docs for invocation method
- [x] Create `packages/doctor/src/providers/crew.ts`
- [x] Implement bot invocation stub (webhooks/ACP) - BLOCKERS DOCUMENTED
- [x] Implement memory management - Handled by Crew automatically
- [x] Implement scheduling for checkups - Documented in .kiro/scheduling/
- [x] Write integration tests

### Task 3.4: Replay Provider Enhancement
- [x] Extend `packages/doctor/src/providers/replay.ts` from Task 2.7
- [x] Add all event types
- [x] Add realistic delays
- [x] Add "REPLAY" tag enforcement
- [x] Verify DOC-05

### Task 3.5: Doctor Gateway
- [ ] Create `apps/server/src/doctor/gateway.ts`
- [x] Implement provider selection via `DOCTOR_PROVIDER` env (llm | crew | replay)
- [ ] Implement streaming endpoint (WebSocket or SSE)
- [x] Add event logging (via LLM adapter)
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

- [x] DOC-01: Spec with ≤8 requirements before build
- [x] DOC-02: ≥3 properties per organ
- [x] DOC-03: Max 2 repair rounds (repair-loop.ts implemented)
- [ ] DOC-04: Never install without consent click (UI pending)
- [x] DOC-05: Replay labeled in UI
- [ ] 3 demo wishes pass live (requires LLM_API_KEY)

## Phase 3 Status (2026-11-10)

**Completed:**
- ✅ Task 3.1-3.4: Doctor interface and providers (llm, crew stub, replay)
- ✅ Property stage U1-U7 with fast-check
- ✅ Hostile organ rejection suite (6/6 passing)
- ✅ Repair loop with max 2 rounds
- ✅ Crew bot configuration documented
- ✅ Scheduled checkup enhancement

**Pending:**
- Task 3.5: Doctor Gateway (streaming endpoint)
- Task 3.6: Doctor UI Components (consent dialog)
- Task 3.7: Demo Wish Recordings

**Blockers:**
- Crew integration requires running Gateway with auth token
- Live wish testing requires LLM_API_KEY environment variable
