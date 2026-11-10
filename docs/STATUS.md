# GRAFT Implementation Status

**Last Updated:** 2026-11-10
**Overall Progress:** 73% implemented (19/26 requirements)

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| IMPLEMENTED | 19 | 73% |
| PARTIAL | 4 | 15% |
| STUB | 2 | 8% |
| NOT_STARTED | 1 | 4% |

---

## Phase 0: Setup

- [x] Infrastructure created (no requirements)

---

## Phase 1: Creature + Nerve

### CRE-01: Slot Grid Rendering [EX]
- [x] **IMPLEMENTED**
- Creature.tsx renders slot grid with seeded data
- OrganSlot component renders individual slots
- See: `apps/web/src/Creature.tsx`, `apps/web/src/components/OrganSlot.tsx`

### NRV-01: Message Schema Enforcement [PBT]
- [x] **IMPLEMENTED**
- Zod schemas validate all messages in `packages/nerve/src/schemas.ts`
- Invalid messages are dropped and logged
- PBT tests: `packages/nerve/src/__tests__/schemas.test.ts`

### NRV-02: Rate Limit Enforcement [PBT]
- [x] **IMPLEMENTED**
- Rate limit of 20 messages/second enforced in NerveHost
- Quarantine within 1 second on violation
- See: `apps/web/src/NerveHost.ts`, `packages/nerve/src/protocol.ts`

### NRV-03: API Version Mismatch [EX]
- [x] **IMPLEMENTED**
- Version check in NerveHost marks mismatched organs as decayed
- `NERVE_API_VERSION` constant in schemas.ts

---

## Phase 2: Immune System

### IMM-01: Banned Construct Rejection [PBT]
- [x] **IMPLEMENTED**
- Static analysis (Stage 1) detects banned constructs including computed window access
- PBT tests verify detection of all banned patterns
- See: `packages/immune/src/static/js-analyzer.ts`, `packages/immune/src/__tests__/static.test.ts`

### IMM-02: Permission Violation Rejection [PBT]
- [x] **IMPLEMENTED**
- Stage 2 (Manifest Check) validates permissions
- AST analysis verifies actual reads/emits match declarations
- See: `packages/immune/src/manifest/validator.ts`, `packages/immune/src/__tests__/manifest.test.ts`

### IMM-03: Fail Closed [EX]
- [x] **IMPLEMENTED**
- Orchestrator rejects on any stage error
- See: `packages/immune/src/orchestrator.ts`

### IMM-04: Universal Properties [PBT]
- [x] **IMPLEMENTED**
- U1-U7 implemented in `packages/immune/src/properties/universal/`
- Seed logged on failure
- Tests: `packages/immune/src/__tests__/universal-properties.test.ts`

### IMM-05: Rejection Report [EX]
- [x] **IMPLEMENTED**
- Reports include reason code, human sentence, and source location
- See: `packages/immune/src/report.ts`

### IMM-06: Hostile Organ Suite [EX]
- [x] **IMPLEMENTED**
- All 6 hostile organs rejected at expected stages
- Tests: `packages/immune/src/__tests__/hostile.test.ts`
- Organs: `organs/hostile/01-direct-fetch` through `06-dom-escape`

---

## Phase 3: Doctor Pipeline

### DOC-01: Spec First [EX]
- [x] **IMPLEMENTED**
- LLM provider generates spec before building
- See: `packages/doctor/src/providers/llm.ts`

### DOC-02: Organ Properties [EX]
- [x] **IMPLEMENTED**
- Doctor generates at least 3 organ-specific properties
- See: `packages/doctor/src/providers/llm.ts` (properties generation)

### DOC-03: Repair Rounds [EX]
- [x] **IMPLEMENTED**
- Max 2 repair rounds with structured rejection report
- See: `packages/doctor/src/repair-loop.ts`, `packages/doctor/src/__tests__/repair-loop.test.ts`

### DOC-04: Explicit Consent [EX]
- [x] **IMPLEMENTED**
- Transplant button requires user click
- ConsentDialog component presents for approval
- See: `apps/web/src/components/ConsentDialog.tsx`

### DOC-05: Replay Labeling [EX]
- [x] **IMPLEMENTED**
- Replay provider labels output with `_replay: true` and displays "REPLAY MODE"
- See: `packages/doctor/src/providers/replay.ts`

---

## Phase 4: Ledger and Reversibility

### LED-01: Chain Integrity [PBT]
- [x] **IMPLEMENTED**
- Hash chain verification detects any mutation
- PBT tests: `packages/ledger/src/__tests__/led-01-property.test.ts`
- See: `packages/ledger/src/verify.ts`

### LED-02: Ledger First [EX]
- [x] **IMPLEMENTED**
- Ledger entry written before state mutation
- Tests verify ordering with timestamps
- See: `apps/web/src/TransactionCoordinator.ts`

### REV-01: Reversibility [PBT]
- [x] **IMPLEMENTED**
- Transplant + amputation restores exact prior state
- PBT tests: `apps/web/src/__tests__/rev-01-property.test.ts`
- See: `apps/web/src/AmputationService.ts`, `apps/web/src/SnapshotManager.ts`

### REV-02: Atomicity [PBT]
- [x] **IMPLEMENTED**
- Failed transplant leaves no partial state
- PBT tests: `apps/web/src/__tests__/rev-02-property.test.ts`
- See: `apps/web/src/TransactionCoordinator.ts`

---

## Phase 5: Theatre UI

### UI-01: Accessibility [EX]
- [~] **PARTIAL**
- Contrast tests verify WCAG AA compliance
- Keyboard operability tests exist
- **Missing**: Full axe-core integration, screen reader testing
- See: `apps/web/src/__tests__/accessibility.test.tsx`

### UI-02: Reduced Motion [EX]
- [x] **IMPLEMENTED**
- TopBar checks `prefers-reduced-motion` preference
- Animations disabled when set
- See: `apps/web/src/components/TopBar.tsx`

### UI-03: Heartbeat Line [EX]
- [x] **IMPLEMENTED**
- ECG reflects organ health states (steady/erratic/flatline)
- See: `apps/web/src/components/TopBar.tsx`

### UI-04: Keyboard Chimera [EX]
- [ ] **STUB**
- Keyboard navigation for chimera linking not yet implemented
- Design exists in `design-theatre.md`

---

## Phase 6: Ship

- [ ] No formal requirements for this phase
- Video and blog post deliverables

---

## Additional Implementation Notes

### Server API Endpoints
- [~] **PARTIAL** - Ledger database service exists but HTTP endpoints not yet exposed
- SQLiteLedgerService: `apps/server/src/db/ledger.ts`
- **Missing**: `/api/ledger/history`, `/api/ledger/verify` endpoints

### Property-Based Testing
- All PBT requirements use fast-check with seed logging
- Universal properties U1-U7 fully implemented
- Property tests in `tests/properties/` directory (currently empty - tests are co-located with packages)

### E2E Tests
- Directory structure exists at `tests/e2e/` and `tests/properties/`
- **Not yet populated** - Playwright tests pending

---

## Key Files

| Component | Location |
|-----------|----------|
| Nerve API Schemas | `packages/nerve/src/schemas.ts` |
| Nerve Host | `apps/web/src/NerveHost.ts` |
| Tissue Kit | `packages/nerve/src/tissue.ts` |
| Immune Orchestrator | `packages/immune/src/orchestrator.ts` |
| Static Analyzer | `packages/immune/src/static/js-analyzer.ts` |
| Manifest Validator | `packages/immune/src/manifest/validator.ts` |
| Behavioral Harness | `packages/immune/src/behavioral/index.ts` |
| Universal Properties | `packages/immune/src/properties/universal/` |
| Doctor Types | `packages/doctor/src/types.ts` |
| LLM Provider | `packages/doctor/src/providers/llm.ts` |
| Replay Provider | `packages/doctor/src/providers/replay.ts` |
| Ledger Package | `packages/ledger/src/` |
| SQLite Ledger | `apps/server/src/db/ledger.ts` |
| Snapshot Manager | `apps/web/src/SnapshotManager.ts` |
| Transaction Coordinator | `apps/web/src/TransactionCoordinator.ts` |
| Amputation Service | `apps/web/src/AmputationService.ts` |
