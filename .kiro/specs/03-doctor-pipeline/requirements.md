# 03: Doctor Pipeline

## Overview

The Doctor is the agent that turns wishes into organ bundles. It proposes specs, builds organs, and handles repairs.

---

## Requirements

### DOC-01: Spec First [EX]
WHEN a wish is submitted, THE SYSTEM SHALL produce a spec with at most 8 EARS requirements before building.

### DOC-02: Organ Properties [EX]
THE SYSTEM SHALL produce at least 3 organ-specific properties per organ.

### DOC-03: Repair Rounds [EX]
IF an organ is rejected, THEN THE SYSTEM SHALL attempt at most 2 repair rounds using the structured report.

### DOC-04: Explicit Consent [EX]
THE SYSTEM SHALL never install an organ without the user's explicit consent.

### DOC-05: Replay Labeling [EX]
WHILE using the replay provider, THE SYSTEM SHALL label output as replay.

---

## Doctor Interface

```typescript
interface DoctorProvider {
  proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
  build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
  repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;
  heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
```

## Doctor Events
- `assumption` - One-line assumption stated
- `spec_progress` - Spec lines appearing
- `property_progress` - Properties appearing
- `build_progress` - Code appearing
- `submit` - Bundle submitted to immune system
- `outcome` - Pass/fail with report

## Providers

### 1. Crew Provider
- Persistent Kiro Crew bot with memory
- Memory holds: anatomy, user preferences, rejection history
- Invocation via Kiro Crew API (webhooks/ACP)

### 2. LLM Provider
- Direct HTTP calls to LLM API
- Configuration: `LLM_BASE_URL`, `LLM_API_KEY`, `DOCTOR_MODEL`
- Mirrors anatomy to `doctor/memory/anatomy.md`
- Fallback if Crew integration blocked

### 3. Replay Provider
- Plays back recorded `fixtures/replays/*.json`
- Realistic streaming delays
- UI shows "REPLAY" tag
- For deterministic tests and demo safety

## Pipeline Flow

1. State assumptions in one line
2. Write spec.md (max 8 EARS requirements, `[PBT]` or `[EX]` tags)
3. Write properties.js (≥3 fast-check properties)
4. Write organ bundle (using Tissue kit, Nerve API only)
5. Submit to immune system
6. On failure, repair (max 2 rounds) using structured report
7. Present for consent (never auto-install)
