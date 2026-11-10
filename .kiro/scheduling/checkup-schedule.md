# Scheduled Checkup Configuration

This document describes how to configure scheduled checkups for the GRAFT Creature.

## Overview

The checkup script (`scripts/checkup.ts`) re-verifies all installed organs without making LLM calls. It should run on a schedule (e.g., nightly) to detect organ decay.

## Scheduling Options

### Option 1: Kiro Crew Cron Job (Recommended)

When running GRAFT under Kiro Crew, use the built-in cron scheduling:

```bash
# Schedule nightly checkup at 3 AM
kirocrew cron add "graft-checkup" "Run tsx scripts/checkup.ts" \
  --cron "0 3 * * *" \
  --timezone "America/Los_Angeles" \
  --timeout 1800
```

Or ask in chat: "Every night at 3 AM, run the GRAFT checkup script"

### Option 2: System Cron (Linux/macOS)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add nightly checkup at 3 AM
0 3 * * * cd /path/to/graft && pnpm exec tsx scripts/checkup.ts >> /var/log/graft-checkup.log 2>&1
```

### Option 3: Windows Task Scheduler

Create a scheduled task:

```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "scripts/checkup.ts" -WorkingDirectory "C:\path\to\graft"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "GRAFT-Checkup" -Action $action -Trigger $trigger
```

### Option 4: Docker/Kubernetes CronJob

For containerized deployments:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: graft-checkup
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checkup
            image: graft:latest
            command: ["tsx", "scripts/checkup.ts"]
          restartPolicy: OnFailure
```

## Checkup Script Behavior

The checkup script:

1. **Enumerates** all installed organs from the registry
2. **Runs** the immune system on each organ (no LLM calls)
3. **Writes** ledger entries for each result
4. **Reports** summary of passed/failed organs
5. **Triggers** Doctor healing proposals for decayed organs

## Exit Codes

- `0`: All organs passed checkup
- `1`: One or more organs failed checkup (decay detected)
- `2`: Checkup script error (configuration issue)

## Manual Trigger

Run checkup manually:

```bash
pnpm exec tsx scripts/checkup.ts
```

Or via the "Fast-forward the night" button in the Theatre UI.

## Integration with Doctor

When organs fail checkup:

1. Checkup writes `CHECKUP_FAIL` ledger entry
2. Doctor reads decay report from ledger
3. Doctor proposes healing patch via `heal()` method
4. User approves or rejects the patch
5. If approved, organ is updated and re-verified

## Non-LLM Requirement

The checkup script MUST NOT make LLM calls. It uses only:
- Static analysis (Stage 1)
- Manifest validation (Stage 2)
- Behavioral verification (Stage 3)
- Property fuzzing (Stage 4)

This ensures checkups are:
- **Fast** - No network latency
- **Free** - No API costs
- **Deterministic** - Same result for same input
