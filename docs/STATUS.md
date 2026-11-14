# GRAFT Implementation Status

**Last Updated:** 2026-11-13
**Overall Progress:** 25 of 33 tracked requirements implemented (76%), 4 partial, 4 not started

This file replaces an earlier version that claimed 96% (25 of 26). That figure left out the requirements for specs 05, 06 and 08 (CHI, CHK, DEM) and overstated two items. "Implemented" below means code exists and, where noted, tests pass. It is not a claim that the system is safe.

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| IMPLEMENTED | 25 | 76% |
| PARTIAL | 4 | 12% |
| STUB | 0 | 0% |
| NOT_STARTED | 4 | 12% |

## Test State (verified by running)

- `pnpm test` (root, `vitest run`): 23 files, 3 failed, 458 passed, 1 skipped (462 tests).
- `cd apps/web && npx vitest run`: 11 files, 3 failed, 165 passed (168 tests). This run includes `*.test.tsx`, which the root config does not collect.
- All 3 failures are in `apps/web/src/__tests__/chimera-linking.test.ts`, against `apps/web/src/ChimeraLinking.ts`:
  1. `schemasCompatible (CHI-01) > primitive roots: integer feeds integer and number, but not string or the reverse`. `number` is accepted where `integer` is required (type normalization makes the check symmetric).
  2. `schemasCompatible (CHI-01) > a multi-field object cannot feed a primitive input`. The check returns true for a two-field output and a primitive input.
  3. `schemasCompatible (CHI-01) > tolerates an organ whose manifest has no ports array`. `getCompatibleTargets` throws `TypeError: organ.manifest.ports is not iterable`.
- These are documented, not fixed.
- Playwright e2e (`tests/e2e`) was not run for this update.

---

## Phase 0: Setup
- [x] Infrastructure created (no requirements)

---

## Phase 1: Creature + Nerve

### CRE-01: Slot Grid Rendering [EX]
- [x] **IMPLEMENTED**
- `apps/web/src/Creature.tsx` renders the slot grid with seeded data; `OrganSlot` renders individual slots
- See: `apps/web/src/Creature.tsx`, `apps/web/src/components/OrganSlot.tsx`

### NRV-01: Message Schema Enforcement [PBT]
- [x] **IMPLEMENTED**
- Zod schemas in `packages/nerve/src/schemas.ts`; invalid messages are dropped
- Tests: `packages/nerve/src/__tests__/schemas.test.ts` (126 tests)

### NRV-02: Rate Limit Enforcement [PBT]
- [x] **IMPLEMENTED**
- 20 messages per second per organ (`RATE_LIMIT_PER_SECOND` in `packages/nerve/src/protocol.ts`), quarantine on violation
- See: `apps/web/src/NerveHost.ts`, tests in `apps/web/src/__tests__/NerveHost.test.ts`

### NRV-03: API Version Mismatch [EX]
- [x] **IMPLEMENTED**
- `NerveHost.handleHello` marks a mismatched organ as decayed; `NERVE_API_VERSION` is `1.0.0`

---

## Phase 2: Immune System

### IMM-01: Banned Construct Rejection [PBT]
- [x] **IMPLEMENTED**
- Static analysis detects banned constructs, including computed window access
- See: `packages/immune/src/static/js-analyzer.ts`, `packages/immune/src/__tests__/static.test.ts`

### IMM-02: Permission Violation Rejection [PBT]
- [x] **IMPLEMENTED**
- See: `packages/immune/src/manifest/validator.ts`, `packages/immune/src/__tests__/manifest.test.ts`

### IMM-03: Fail Closed [EX]
- [x] **IMPLEMENTED**
- Orchestrator rejects on any stage error: `packages/immune/src/orchestrator.ts`

### IMM-04: Universal Properties [PBT]
- [x] **IMPLEMENTED**
- U1 to U7 in `packages/immune/src/properties/universal/`; seed logged on failure
- Tests: `packages/immune/src/__tests__/universal-properties.test.ts`

### IMM-05: Rejection Report [EX]
- [x] **IMPLEMENTED**
- Reason code, sentence and source location: `packages/immune/src/report.ts`

### IMM-06: Hostile Organ Suite [EX]
- [x] **IMPLEMENTED**
- All 6 hostile organs are rejected: `packages/immune/src/__tests__/hostile.test.ts`
- Organs: `organs/hostile/01-direct-fetch`, `02-obfuscated-fetch`, `03-cookie-access`, `04-message-flood`, `05-undeclared-port`, `06-top-access` (earlier docs called the last one `06-dom-escape`; the directory is `06-top-access`)

---

## Phase 3: Doctor Pipeline

### DOC-01: Spec First [EX]
- [x] **IMPLEMENTED**
- See: `packages/doctor/src/providers/llm.ts`

### DOC-02: Organ Properties [EX]
- [x] **IMPLEMENTED**
- The Doctor prompts for at least 3 organ-specific properties (`packages/doctor/src/providers/llm.ts`). Not verified against live output.

### DOC-03: Repair Rounds [EX]
- [x] **IMPLEMENTED**
- Max 2 repair rounds: `packages/doctor/src/repair-loop.ts`, `packages/doctor/src/__tests__/repair-loop.test.ts`

### DOC-04: Explicit Consent [EX]
- [x] **IMPLEMENTED**
- `ConsentDialog` has a Transplant button; install happens on click
- See: `apps/web/src/components/ConsentDialog.tsx`. A prior live e2e run (`live-doctor.spec.ts`) was seen failing at the consent step; it was not re-run.

### DOC-05: Replay Labeling [EX]
- [~] **PARTIAL**
- The replay provider and the server's no-session path mark events `_replay: true` (`packages/doctor/src/providers/replay.ts`, `apps/server/src/index.ts`)
- **Missing**: the web UI does not show a "REPLAY" badge. `DoctorNotes.tsx` shows a "LIVE" badge only after passcode login and does not read `_replay`.
- Earlier versions of this file claimed the UI displays "REPLAY MODE". It does not.

---

## Phase 4: Ledger and Reversibility

### LED-01: Chain Integrity [PBT]
- [x] **IMPLEMENTED**
- PBT: `packages/ledger/src/__tests__/led-01-property.test.ts`; see `packages/ledger/src/verify.ts`

### LED-02: Ledger First [EX]
- [x] **IMPLEMENTED**
- See: `apps/web/src/TransactionCoordinator.ts`

### REV-01: Reversibility [PBT]
- [x] **IMPLEMENTED**
- PBT: `apps/web/src/__tests__/rev-01-property.test.ts`

### REV-02: Atomicity [PBT]
- [x] **IMPLEMENTED**
- PBT: `apps/web/src/__tests__/rev-02-property.test.ts`

---

## Phase 5: Chimeras and Theatre UI

### CHI-01: Schema Compatibility [PBT]
- [~] **PARTIAL**
- `schemasCompatible` and `validateLink` exist in `apps/web/src/ChimeraLinking.ts`
- 3 tests fail (see Test State): integer/number direction, multi-field object into a primitive, missing ports array
- The tests for this requirement are example tests. No fast-check property exists for CHI-01, although the requirement is tagged [PBT].

### CHI-02: Cycle Prevention [PBT]
- [x] **IMPLEMENTED**
- `wouldCreateCycle` and `hasPath` in `apps/web/src/ChimeraLinking.ts`; example tests for direct, multi-hop and self links pass (`chimera-linking.test.ts`)
- No fast-check property exists, although the requirement is tagged [PBT].

### CHI-03: Link Cleanup [EX]
- [x] **IMPLEMENTED**
- `removeOrgan` in `apps/web/src/stores/creatureStore.ts` filters out links that involve the removed organ
- Not verified: that a ledger entry is written for the link removal.

### UI-01: Accessibility [EX]
- [~] **PARTIAL**
- Contrast and keyboard tests exist in `apps/web/src/__tests__/accessibility.test.tsx`
- **Missing**: axe-core. It is not a dependency, and the test file does not import it. No screen reader testing. Full WCAG validation needs manual testing with assistive technology.

### UI-02: Reduced Motion [EX]
- [x] **IMPLEMENTED**
- `TopBar` reads `prefers-reduced-motion`

### UI-03: Heartbeat Line [EX]
- [x] **IMPLEMENTED**
- ECG state is steady, erratic or flatline from organ status (`apps/web/src/components/TopBar.tsx`). Note: erratic is driven by `decayed` or `pending` status, and flatline by `quarantined`.

### UI-04: Keyboard Chimera [EX]
- [x] **IMPLEMENTED**
- Tab to a port, Enter to select an output, Tab to a highlighted target, Enter to link, Escape to cancel
- Links are created ledger-first (`createChimeraLink`); status is announced with `aria-live`
- See: `apps/web/src/components/OrganSlot.tsx`, `apps/web/src/ChimeraLinking.ts`
- Subject to the CHI-01 limitations above.

---

## Phase 6: Checkups and Healing

### CHK-01: Checkup Re-verification [EX]
- [x] **IMPLEMENTED** (script only, no UI)
- `scripts/checkup.ts` and `scripts/nightly-checkup.ts` re-run `runImmuneSystem` on stored bundles and write `CHECKUP_PASS` or `CHECKUP_FAIL` ledger entries
- Run with `pnpm checkup` or `pnpm checkup:dry`. Not run end to end for this update.

### CHK-02: No LLM in Checkup [EX]
- [x] **IMPLEMENTED**
- The scripts import only the immune orchestrator, the ledger and Node built-ins. The `nightly-checkup.ts` header states it makes no LLM calls.

### CHK-03: Healing Proposal [EX]
- [~] **PARTIAL**
- `heal()` exists in the `DoctorProvider` interface and the LLM provider (`packages/doctor/src/types.ts`, `packages/doctor/src/providers/llm.ts`). Ledger event types `HEAL_PROPOSED` and `HEAL_APPROVED` exist.
- **Missing**: no healing dialog, no approve/reject flow in the web app, no healing replay fixture.

### CHK-04: Decay Simulator [EX]
- [ ] **NOT_STARTED**
- No decay simulator or API v2 toggle exists in `apps/web`. Organs can enter `decayed` status only through a Nerve API version mismatch at handshake.

---

## Phase 7: Demo Mode

### DEM-01: Hostile Organ Injection [EX]
- [ ] **NOT_STARTED**
- No demo controls panel in `apps/web`. A hostile wish can be typed manually (a wish containing "weather" or "fetch" returns the canned hostile bundle).

### DEM-02: Fast-forward the Night [EX]
- [ ] **NOT_STARTED**
- No button. The CLI equivalent is `pnpm checkup`.

### DEM-03: Reset to Seeded State [EX]
- [ ] **NOT_STARTED**
- No reset control. Spec 08 has requirements and a design but no `tasks.md`.

---

## Phase 8: Ship
- Video, blog post and submission form are outside the code. PLACEHOLDER: record status here.

---

## Additional Implementation Notes

### Server API Endpoints
- `GET /api/health`, `GET /api/doctor/status`, `POST /api/doctor/live` (passcode), `POST /api/doctor/wish` (SSE), `POST /api/doctor/validate-session`, `POST /api/doctor/logout`, `GET /api/ledger/history`, `GET /api/ledger/verify`, `POST /api/ledger/append`
- `POST /api/doctor/wish` with a session token runs the real Doctor pipeline (spec, build, immune, repair, consent-request). Without a token it streams canned benchmark wishes marked `_replay: true`.
- `LIVE_PASSCODE` defaults to `test` when unset (`apps/server/src/index.ts`). This is a known weakness. Set it explicitly.
- SQLite ledger: `apps/server/src/db/ledger.ts`. The database file is `apps/server/data/ledger.db` and is git-ignored.

### Live Doctor Providers
- `llm` targets the NVIDIA Integrate API by default (`https://integrate.api.nvidia.com/v1`, model `nvidia/nemotron-3.5-bolt-e4b`) using JSON-schema response format. Earlier notes in this file about the hosted endpoint rejecting `guided_json` and `nvext` come from the author's live runs and were not re-verified here.
- `llm` also works against any OpenAI-compatible gateway: with a Gemini base URL (`https://generativelanguage.googleapis.com/v1beta/openai/`) it sends `reasoning_effort: 'low'` and a larger token budget (Gemini thinking models spend `max_tokens` on thoughts), and retries any stream whose JSON comes back truncated as a non-streamed request. `chat_template_kwargs` (NVIDIA-only) is not sent to other gateways. Verified live end-to-end with `gemini-3.5-flash-lite` (wish → spec stream → build → immune pass → consent-request in ~5 s).
- `crew` is a REST client for the Kiro Crew Gateway. It was not exercised live for this update.
- `replay` is for deterministic demos (`fixtures/replays/*.json`).
- Recorded live run: see `docs/wish-trial-results.md` (9 of 10 wishes passed the full pipeline).

### Property-Based Testing
- fast-check suites live beside the code, not in `tests/properties/`. That directory exists locally but is empty and therefore not tracked by git.
- Files: `packages/ledger/src/__tests__/led-01-property.test.ts`, `apps/web/src/__tests__/rev-01-property.test.ts`, `apps/web/src/__tests__/rev-02-property.test.ts`, `packages/immune/src/__tests__/universal-properties.test.ts`, `packages/nerve/src/__tests__/schemas.test.ts`
- Host properties H2 (acyclicity) and H5 (quarantine) have no dedicated property suite. CHI-01 and CHI-02 have example tests only.

### E2E Tests
- Playwright specs: `tests/e2e/wish-consent-amputate.spec.ts`, `tests/e2e/live-doctor.spec.ts`
- Run with `pnpm exec playwright test`. `playwright.config.ts` starts the stack through `scripts/dev-e2e.mjs` (API on 3001, web on 3000).

### Web Test Infrastructure
- `apps/web` has its own vitest config (jsdom). Root `vitest.config.ts` includes `*.test.ts` only, so `*.test.tsx` runs only from `apps/web`.
- `@graft/ledger` is aliased to a browser-safe stub (`apps/web/src/stubs/ledger.ts`) because `node:crypto` stays server-side.

### Repository hygiene
- `dist/` folders are committed.
- Several source files imported by tracked code were untracked when this was written (for example `ChimeraLinking.ts`, `TransplantService.ts`, `host/`, `ledger/`, `stubs/`, `.kiro/settings/mcp.json`).

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
| Chimera linking | `apps/web/src/ChimeraLinking.ts` |
| Checkup scripts | `scripts/checkup.ts`, `scripts/nightly-checkup.ts` |
