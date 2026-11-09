# Design: Ledger and Reversibility

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  State Change                     │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│              Ledger Service                       │
│  1. Compute hash                                  │
│  2. Write entry                                   │
│  3. Return entry ID                               │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│              Apply State Change                   │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│               Snapshot Manager                    │
│  - Before transplant: snapshot state              │
│  - On amputation: restore snapshot                │
└──────────────────────────────────────────────────┘
```

## Ledger Service

```typescript
interface LedgerService {
  append(event: EventType, organId?: string, payload: unknown): Promise<Entry>;
  verify(): Promise<VerificationResult>;
  getHistory(organId?: string): Promise<Entry[]>;
}

interface Entry {
  id: string;
  ts: number;
  organ_id?: string;
  event: EventType;
  payload_json: string;
  prev_hash: string;
  hash: string;
}
```

### Canonical JSON
Before hashing, JSON must be canonical:
- Sorted keys
- No whitespace
- UTF-8 encoding

## Snapshot Manager

```typescript
interface SnapshotManager {
  capture(): Snapshot;
  restore(snapshot: Snapshot): void;
}

interface Snapshot {
  id: string;
  ts: number;
  layout: OrganSlot[];
  registry: OrganRegistry;
}
```

## Transaction Pattern

For atomicity (REV-02):

```typescript
async function transplant(organ: Organ): Promise<void> {
  const snapshot = snapshotManager.capture();
  const entry = await ledger.append('TRANSPLANT_APPROVED', organ.id, {...});
  
  try {
    // Apply all changes
    registry.add(organ);
    layout.place(organ);
    // ...
  } catch (error) {
    // Restore on failure
    snapshotManager.restore(snapshot);
    throw error;
  }
}
```

## Verification Algorithm

```
function verify():
  entries = get all entries ordered by ts
  prev_hash = "0".repeat(64)  // genesis
  
  for entry in entries:
    expected = sha256(prev_hash + canonical(entry without hash))
    if entry.hash != expected:
      return { valid: false, broken_at: entry.id }
    prev_hash = entry.hash
  
  return { valid: true }
```
