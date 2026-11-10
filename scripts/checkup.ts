#!/usr/bin/env ts-node
/**
 * Re-verify all installed organs
 *
 * This script is a thin wrapper around the nightly-checkup.ts script.
 * It exists for backwards compatibility and convenience.
 *
 * Triggered by:
 * - Scheduled by Crew bot (kirocrew cron)
 * - Manual "Fast-forward the night" demo button
 * - System cron
 * - pnpm checkup command
 *
 * Usage:
 *   pnpm checkup
 *   pnpm tsx scripts/checkup.ts [--dry-run] [--organ <id>]
 *
 * Exit codes:
 *   0 - All organs passed checkup
 *   1 - One or more organs failed checkup (decay detected)
 *   2 - Checkup script error (configuration issue)
 */

// Re-export and run the nightly checkup
import './nightly-checkup.js';

// ============================================================================
// Types
// ============================================================================

interface Organ {
  id: string;
  name: string;
  bundle: {
    manifest: {
      name: string;
      version: string;
      apiVersion: string;
      permissions: string[];
      ports: Array<{ name: string; direction: 'in' | 'out'; schema: Record<string, unknown> }>;
      slotSize: 'small' | 'medium' | 'large';
    };
    indexHtml: string;
    spec?: string;
    properties?: string;
  };
  installedAt: number;
  lastCheckup?: number;
  status: 'healthy' | 'decayed' | 'quarantined';
}

interface CheckupResult {
  organId: string;
  organName: string;
  pass: boolean;
  stage?: string;
  reason?: string;
  timestamp: number;
}

interface CheckupReport {
  timestamp: number;
  results: CheckupResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

// ============================================================================
// Organ Registry (Stub - would connect to actual registry)
// ============================================================================

/**
 * Get all installed organs from the registry.
 * In production, this would query the actual organ registry.
 */
async function getInstalledOrgans(): Promise<Organ[]> {
  // Stub: In production, this would:
  // 1. Connect to the Creature's registry (Zustand store or API)
  // 2. Return all organs with status 'healthy' or 'decayed'
  // 3. Exclude 'quarantined' organs (already hidden)

  console.log('Fetching installed organs from registry...');

  // Placeholder: Return empty array
  // The actual implementation would look like:
  // const response = await fetch('http://localhost:3000/api/organs');
  // const organs = await response.json();
  // return organs.filter(o => o.status !== 'quarantined');

  return [];
}

/**
 * Write checkup result to ledger.
 */
async function writeLedgerEntry(organId: string, result: 'pass' | 'fail', details?: { stage?: string; reason?: string }): Promise<void> {
  // Stub: In production, this would:
  // 1. Compute hash of previous entry + new data
  // 2. Append to ledger table in SQLite
  // 3. Include: timestamp, event_type (CHECKUP_PASS/CHECKUP_FAIL), organ_id, payload

  const eventType = result === 'pass' ? 'CHECKUP_PASS' : 'CHECKUP_FAIL';
  console.log(`  Ledger: ${eventType} for ${organId}`);

  // The actual implementation would look like:
  // const ledger = new SQLiteLedgerService(db);
  // await ledger.append({
  //   id: generateId(),
  //   ts: Date.now(),
  //   event: eventType,
  //   organ_id: organId,
  //   payload_json: JSON.stringify(details || {}),
  // });
}

// ============================================================================
// Immune System Integration (Stub - would import actual immune system)
// ============================================================================

/**
 * Run immune system verification on an organ bundle.
 *
 * This is the non-LLM verification that checks:
 * - Stage 1: Static analysis (banned constructs, CSP compliance)
 * - Stage 2: Manifest validation (permissions, ports, schema)
 * - Stage 3: Behavioral verification (runtime simulation)
 * - Stage 4: Property fuzzing (fast-check invariants)
 */
async function runImmuneSystem(bundle: Organ['bundle']): Promise<{
  pass: boolean;
  failedStage?: string;
  reason?: string;
}> {
  // Stub: In production, this would:
  // 1. Import the immune system orchestrator
  // 2. Run all 4 stages
  // 3. Return the result

  console.log('  Running immune system verification...');

  // The actual implementation would look like:
  // import { runImmuneSystem } from '@graft/immune';
  // const report = await runImmuneSystem(bundle);
  // return { pass: report.pass, failedStage: report.failedStage, reason: report.reason };

  // For now, return pass (no organs to check)
  return { pass: true };
}

// ============================================================================
// Checkup Main
// ============================================================================

async function checkup(): Promise<CheckupReport> {
  console.log('========================================');
  console.log('GRAFT Organ Checkup');
  console.log('========================================');
  console.log('');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  // 1. Get all installed organs
  const organs = await getInstalledOrgans();

  if (organs.length === 0) {
    console.log('No organs installed.');
    console.log('');
    console.log('Checkup complete: No organs to verify.');
    return {
      timestamp: Date.now(),
      results: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };
  }

  console.log(`Found ${organs.length} installed organ(s).`);
  console.log('');

  // 2. Run immune system on each organ
  const results: CheckupResult[] = [];

  for (const organ of organs) {
    console.log(`Checking: ${organ.name} (${organ.id})`);
    console.log(`  Installed: ${new Date(organ.installedAt).toISOString()}`);
    console.log(`  Last checkup: ${organ.lastCheckup ? new Date(organ.lastCheckup).toISOString() : 'Never'}`);
    console.log(`  Status: ${organ.status}`);

    const immuneResult = await runImmuneSystem(organ.bundle);

    const result: CheckupResult = {
      organId: organ.id,
      organName: organ.name,
      pass: immuneResult.pass,
      stage: immuneResult.failedStage,
      reason: immuneResult.reason,
      timestamp: Date.now(),
    };

    results.push(result);

    if (immuneResult.pass) {
      console.log('  ✓ PASSED');
      await writeLedgerEntry(organ.id, 'pass');
    } else {
      console.log(`  ✗ FAILED at stage: ${immuneResult.failedStage}`);
      console.log(`    Reason: ${immuneResult.reason}`);
      await writeLedgerEntry(organ.id, 'fail', {
        stage: immuneResult.failedStage,
        reason: immuneResult.reason,
      });
    }

    console.log('');
  }

  // 3. Generate summary
  const report: CheckupReport = {
    timestamp: Date.now(),
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
    },
  };

  // 4. Print summary
  console.log('========================================');
  console.log('Checkup Summary');
  console.log('========================================');
  console.log(`Total organs checked: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log('');

  // 5. Exit with appropriate code
  if (report.summary.failed > 0) {
    console.log('⚠ Some organs failed checkup.');
    console.log('Doctor will propose healing patches for decayed organs.');
    console.log('');
    process.exit(1);
  }

  console.log('✓ All organs healthy.');
  process.exit(0);
}

// ============================================================================
// Run Checkup
// ============================================================================

checkup().catch(error => {
  console.error('');
  console.error('========================================');
  console.error('Checkup Error');
  console.error('========================================');
  console.error('');
  console.error('An error occurred during checkup:');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error('This may indicate a configuration issue.');
  console.error('Please check the GRAFT setup and try again.');
  process.exit(2);
});
