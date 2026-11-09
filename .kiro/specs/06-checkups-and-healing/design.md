# Design: Checkups and Healing

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Crew Bot Scheduler                   │
│  - Periodic trigger (e.g., nightly)              │
│  - Or manual "Fast-forward the night"            │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│          scripts/checkup.ts                       │
│  - Plain script, no LLM                          │
│  - Re-runs immune on all organs                  │
│  - Writes ledger entries                         │
└───────────────────┬──────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │ pass                  │ fail
        ▼                       ▼
┌───────────────┐    ┌─────────────────────┐
│ CHECKUP_PASS  │    │ Doctor.heal()       │
│ ledger entry  │    │ - Analyze decay     │
└───────────────┘    │ - Propose patch     │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ User Approval       │
                     │ - Review patch      │
                     │ - Approve/Reject    │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │ approve               │ reject
                    ▼                       ▼
           ┌─────────────────┐    ┌─────────────────┐
           │ HEAL_APPROVED   │    │ Organ remains   │
           │ ledger entry    │    │ decayed         │
           │ Transplant      │    └─────────────────┘
           └─────────────────┘
```

## Checkup Script Design

### Entry Point
```typescript
// scripts/checkup.ts
import { Registry } from '../apps/web/src/Registry';
import { ImmuneSystem } from '../packages/immune/src';
import { Ledger } from '../packages/ledger/src';

async function main() {
  const registry = new Registry();
  const immune = new ImmuneSystem();
  const ledger = new Ledger();
  
  const organs = await registry.getAllInstalled();
  
  for (const organ of organs) {
    const report = await immune.run(organ.bundle);
    
    if (report.pass) {
      await ledger.append('CHECKUP_PASS', organ.id, { 
        stages: report.stages 
      });
    } else {
      await ledger.append('CHECKUP_FAIL', organ.id, {
        stage: report.failedStage,
        reason: report.reason
      });
      
      // Emit event for Doctor to handle
      process.stdout.write(JSON.stringify({
        type: 'checkup_failed',
        organId: organ.id,
        report
      }) + '\n');
    }
  }
}

main();
```

### Constraints
- No LLM calls
- No external network requests
- Pure computation + database writes
- Exits 0 on success, 1 on any failure

## Decay Simulator Design

### State
```typescript
interface DecaySimulator {
  enabled: boolean;
  apiVersion: 'v1' | 'v2';
  
  enable(): void;
  disable(): void;
  
  // v2 differences
  getMoodDomain(): string;  // v1: 'entries', v2: 'log'
  isNowAsync(): boolean;    // v1: false, v2: true
}
```

### Integration
- Toggle in UI (demo controls)
- When enabled:
  - Host announces API v2
  - v1 organs fail `hello` version check
  - Properties using old paths fail
  - Doctor receives decay report

## Healing Flow

### Decay Report
```typescript
interface DecayReport {
  organId: string;
  failedChecks: {
    stage: string;
    reason: string;
    location?: SourceLocation;
  }[];
  apiChanges?: {
    oldVersion: string;
    newVersion: string;
    breakingChanges: string[];
  };
}
```

### Doctor's heal() Response
```typescript
async *heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent> {
  yield { type: 'assumption', content: 'Updating for Nerve API v2' };
  
  // Update spec
  yield { type: 'spec_delta', changes: [...] };
  
  // Rebuild with:
  // - mood.log instead of mood.entries
  // - await nerve.now() instead of nerve.now()
  yield { type: 'build_progress', content: '...' };
  
  // Submit to immune
  yield { type: 'submit', bundle: newBundle };
  
  // Return result
  yield { type: 'outcome', pass: true };
}
```
