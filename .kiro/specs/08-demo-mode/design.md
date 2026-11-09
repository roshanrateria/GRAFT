# Design: Demo Mode

## Component Tree

```
DemoControls
├── HostileInjection
│   ├── Dropdown (select organ)
│   └── InjectButton
├── FastForwardButton
├── DecayToggle
├── ResetButton
└── ReplayModeToggle
```

## Hostile Injection Flow

```
User clicks Inject
       │
       ▼
Select hostile organ (random or specific)
       │
       ▼
Load organ bundle from organs/hostile/
       │
       ▼
If replay mode:
  Play corresponding replay file
       │
       ▼
Run through immune system
       │
       ▼
Show Laboratory Overlay
       │
       ▼
REJECTED stamp at expected stage
       │
       ▼
Show reason with source line
```

## Fast-forward Flow

```
User clicks Fast-forward
       │
       ▼
Show progress indicator
       │
       ▼
Execute scripts/checkup.ts
       │
       ▼
Stream results:
  - Organ 1: PASS
  - Organ 2: PASS
  - Organ 3: FAIL
       │
       ▼
If any FAIL:
  - Doctor.heal() called
  - Healing dialog appears
  - User approves/rejects
       │
       ▼
Show summary: "2 passed, 1 healed"
```

## Reset Flow

```
User clicks Reset
       │
       ▼
Show confirmation dialog:
  "This will remove all organs and reset data. Continue?"
       │
       ▼
User confirms
       │
       ▼
Remove all organs from registry
       │
       ▼
Clear ledger (keep genesis)
       │
       ▼
Reset data store to seeded state
       │
       ▼
Clear organ slots in UI
       │
       ▼
Show "Reset complete" toast
```

## Replay Mode Implementation

### State
```typescript
interface ReplayState {
  enabled: boolean;
  currentReplay: ReplayFile | null;
  position: number;  // event index
}

interface ReplayFile {
  wish: string;
  events: DoctorEvent[];
  delays: { min: number; max: number };
}
```

### Provider Selection
```typescript
function getDoctorProvider(): DoctorProvider {
  if (replayState.enabled) {
    return new ReplayProvider(replayState);
  }
  return providers[process.env.DOCTOR_PROVIDER || 'replay'];
}
```

### UI Badge
```tsx
{replayState.enabled && (
  <div className="replay-badge">
    REPLAY
  </div>
)}
```

## Demo Data

### Seeded State
- 90 days of mood entries (1-10 scale)
- 50 tasks (various completion states)
- 3 habits with 90 days of check-ins
- 30 calendar events

### Seeded Random
```typescript
// Deterministic seed
const SEED = 12345;

// Use seeded RNG
import { create } from 'random-seed';
const random = create(SEED);
```

## Keyboard Shortcuts (for demo)

| Shortcut | Action |
|----------|--------|
| Ctrl+D | Toggle demo controls |
| Ctrl+H | Inject hostile organ |
| Ctrl+N | Fast-forward night |
| Ctrl+R | Reset (with confirmation) |
