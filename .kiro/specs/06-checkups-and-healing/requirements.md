# 06: Checkups and Healing

## Overview

Checkups re-verify installed organs on a schedule. When organs decay, the Doctor proposes healing patches.

---

## Requirements

### CHK-01: Checkup Re-verification [EX]
THE SYSTEM SHALL re-verify every installed organ on each checkup using the same immune system.

### CHK-02: No LLM in Checkup [EX]
THE SYSTEM SHALL run checkups as plain scripts that make no LLM calls.

### CHK-03: Healing Proposal [EX]
WHEN a checkup fails, THE SYSTEM SHALL draft a healing patch and wait for approval.

### CHK-04: Decay Simulator [EX]
WHEN the decay simulator is enabled, THE SYSTEM SHALL cause v1 organs to fail checkup.

---

## Checkup Script

### Purpose
Re-run immune system on all installed organs. No LLM calls (costs no credits).

### Location
`scripts/checkup.ts`

### Trigger
- Scheduled by Crew bot
- Manual trigger via "Fast-forward the night" demo button

### Process
```typescript
async function checkup(): Promise<CheckupReport> {
  const organs = await registry.getAllInstalled();
  const results = [];
  
  for (const organ of organs) {
    const report = await immune.run(organ);
    if (!report.pass) {
      // Write CHECKUP_FAIL ledger entry
      // Notify Doctor to propose healing
    } else {
      // Write CHECKUP_PASS ledger entry
    }
    results.push({ organ, report });
  }
  
  return { results, timestamp: Date.now() };
}
```

## Healing Process

### Trigger
- Checkup failure for an organ
- Manual request

### Doctor Role
Doctor's `heal()` method:
1. Analyze decay report (what changed, what failed)
2. Update spec if needed
3. Rebuild organ for new API version
4. Submit to immune system
5. Present for approval

### User Flow
1. Checkup fails, organ marked as decayed
2. Doctor proposes healing patch
3. User reviews patch (spec delta, code changes)
4. User approves or rejects
5. If approved: transplant replaces old organ

## Decay Simulator

### Purpose
Demo feature to show healing in action.

### Mechanism
Switch that changes host to Nerve API v2:
- `mood.entries` renamed to `mood.log`
- `nerve.now()` becomes async

### Result
- v1 organs fail checkup (apiVersion mismatch, property failures)
- Doctor heals them for v2
- User approves healing

### UI
- Toggle switch in demo controls
- "API Version: v1" → "API Version: v2"
- Visual indication of simulated decay
