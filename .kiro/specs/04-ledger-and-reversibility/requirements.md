# 04: Ledger and Reversibility

## Overview

The ledger (Chart) is a tamper-evident hash chain recording all state changes. Amputation allows full reversibility of transplants.

---

## Requirements

### LED-01: Chain Integrity [PBT]
Any mutation of any ledger row SHALL be detected by chain verification.

### LED-02: Ledger First [EX]
THE SYSTEM SHALL write a ledger entry before applying each state change.

### REV-01: Reversibility [PBT]
Transplant followed by amputation SHALL restore the exact prior state.

### REV-02: Atomicity [PBT]
IF a transplant fails midway, THEN THE SYSTEM SHALL leave no partial state.

---

## Ledger Structure

### SQLite Table
```sql
CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  organ_id TEXT,
  event TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
```

### Hash Chain
```
hash = sha256(prev_hash + canonical_json(row_without_hash))
```

This is **tamper-evident**, not digitally signed. Do not call it "signed".

### Event Types
- `WISH` - User submits a wish
- `SPEC` - Spec finalized
- `BUILD` - Build complete
- `IMMUNE_PASS` - Immune system passed
- `IMMUNE_FAIL` - Immune system rejected
- `TRANSPLANT_APPROVED` - User approved transplant
- `AMPUTATED` - Organ removed
- `CHIMERA_LINKED` - Ports linked
- `CHECKUP_PASS` - Checkup passed
- `CHECKUP_FAIL` - Checkup failed
- `HEAL_PROPOSED` - Healing patch proposed
- `HEAL_APPROVED` - Healing patch approved

## Amputation Process

1. Restore snapshot (layout, registry state)
2. Remove organ from slot
3. Remove all links involving organ
4. Remove organ's stored state
5. Write `AMPUTATED` ledger entry

## Snapshots

Before every transplant:
- Snapshot Creature layout (organ positions)
- Snapshot organ registry
- Store snapshot with reference to upcoming transplant

## Verification

- "Verify chain" button in UI
- Recompute all hashes from genesis
- Report any mismatch
