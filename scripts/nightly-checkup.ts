#!/usr/bin/env ts-node
/**
 * Nightly Checkup - Re-verifies all installed organs
 *
 * This script runs the immune system on every installed organ.
 * It is a plain script that makes no LLM calls (costs no credits).
 *
 * Usage:
 *   pnpm tsx scripts/nightly-checkup.ts [--dry-run] [--organ <id>]
 *
 * Exit codes:
 *   0 - All organs passed checkup
 *   1 - One or more organs failed checkup (decay detected)
 *   2 - Checkup script error (configuration issue)
 *
 * Scheduling:
 *   Can be scheduled via:
 *   - System cron (Unix): 0 2 * * * cd /path/to/graft && pnpm tsx scripts/nightly-checkup.ts
 *   - Windows Task Scheduler: See scripts/schedule-checkup.ts
 *   - Node-based interval: See scripts/schedule-checkup.ts
 */

import { resolve, dirname } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

// Import immune system
import { runImmuneSystem } from '../packages/immune/src/orchestrator.js';
import type { ImmuneReport } from '../packages/immune/src/types.js';

// Import ledger
import { SQLiteLedgerService } from '../apps/server/src/db/ledger.js';
import { EventType, type Entry, GENESIS_PREV_HASH } from '../packages/ledger/src/index.js';

const __dirname = resolve();

// ============================================================================
// Types
// ============================================================================

interface OrganBundle {
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
}

interface InstalledOrgan {
  id: string;
  name: string;
  bundle: OrganBundle;
  installedAt: number;
  lastCheckup?: number;
  status: 'active' | 'decayed' | 'quarantined';
}

interface CheckupResult {
  organId: string;
  organName: string;
  pass: boolean;
  stage?: string;
  reason?: string;
  timestamp: number;
  report?: ImmuneReport;
}

interface CheckupReport {
  timestamp: number;
  results: CheckupResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  config: {
    dryRun: boolean;
    organId?: string;
    database: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

// Database path - use environment or default
const DB_PATH = process.env.GRAFT_DB ?? resolve(homedir(), '.graft', 'graft.db');
const LOG_DIR = resolve(process.cwd(), 'logs');

// ============================================================================
// Organ Registry
// ============================================================================

/**
 * Get all installed organs from the ledger.
 * An organ is "installed" if it has a TRANSPLANT_APPROVED event and no AMPUTATED event.
 */
async function getInstalledOrgans(ledger: SQLiteLedgerService): Promise<InstalledOrgan[]> {
  const entries = await ledger.getHistory();

  // Find all transplanted organs
  const transplanted = new Map<string, { entry: Entry; bundle: OrganBundle }>();

  for (const entry of entries) {
    if (entry.event === EventType.TRANSPLANT_APPROVED) {
      try {
        const payload = JSON.parse(entry.payload_json);
        transplanted.set(entry.organ_id!, {
          entry,
          bundle: payload.bundle,
        });
      } catch (e) {
        console.error(`Failed to parse transplant payload for ${entry.organ_id}:`, e);
      }
    }
  }

  // Remove amputated organs
  for (const entry of entries) {
    if (entry.event === EventType.AMPUTATED && entry.organ_id) {
      transplanted.delete(entry.organ_id);
    }
  }

  // Find last checkup for each organ
  const lastCheckups = new Map<string, { pass: boolean; timestamp: number }>();
  for (const entry of entries) {
    if (entry.event === EventType.CHECKUP_PASS || entry.event === EventType.CHECKUP_FAIL) {
      const existing = lastCheckups.get(entry.organ_id!);
      if (!existing || entry.ts > existing.timestamp) {
        lastCheckups.set(entry.organ_id!, {
          pass: entry.event === EventType.CHECKUP_PASS,
          timestamp: entry.ts,
        });
      }
    }
  }

  // Build result
  const organs: InstalledOrgan[] = [];

  for (const [id, data] of transplanted) {
    const lastCheckup = lastCheckups.get(id);

    organs.push({
      id,
      name: data.bundle.manifest?.name ?? 'Unknown',
      bundle: data.bundle,
      installedAt: data.entry.ts,
      lastCheckup: lastCheckup?.timestamp,
      status: lastCheckup && !lastCheckup.pass ? 'decayed' : 'active',
    });
  }

  return organs;
}

// ============================================================================
// Ledger Entry Writer
// ============================================================================

/**
 * Write a checkup result to the ledger.
 */
async function writeCheckupEntry(
  ledger: SQLiteLedgerService,
  organId: string,
  passed: boolean,
  details?: { stage?: string; reason?: string; report?: ImmuneReport }
): Promise<Entry> {
  const lastEntry = (await ledger.getHistory()).pop();
  const prevHash = lastEntry?.hash ?? GENESIS_PREV_HASH;

  const entry: Omit<Entry, 'hash'> = {
    id: `checkup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    organ_id: organId,
    event: passed ? EventType.CHECKUP_PASS : EventType.CHECKUP_FAIL,
    payload_json: JSON.stringify({
      stage: details?.stage,
      reason: details?.reason,
      report: details?.report ? {
        passed: details.report.passed,
        stages: details.report.stages,
      } : undefined,
    }),
    prev_hash: prevHash,
  };

  return ledger.append(entry);
}

// ============================================================================
// Checkup Main
// ============================================================================

async function runCheckup(options: { dryRun: boolean; organId?: string }): Promise<CheckupReport> {
  const timestamp = Date.now();

  console.log('========================================');
  console.log('GRAFT Organ Checkup');
  console.log('========================================');
  console.log('');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Mode:', options.dryRun ? 'DRY RUN (no ledger writes)' : 'LIVE');
  if (options.organId) {
    console.log('Filter: Organ', options.organId);
  }
  console.log('');

  // Initialize ledger
  let ledger: SQLiteLedgerService;
  try {
    // Ensure database directory exists
    const dbDir = dirname(DB_PATH);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    ledger = new SQLiteLedgerService(DB_PATH);
    console.log('Database:', DB_PATH);
  } catch (error) {
    console.error('Failed to initialize ledger:', error);
    throw error;
  }

  // Get installed organs
  let organs: InstalledOrgan[];
  try {
    organs = await getInstalledOrgans(ledger);

    if (options.organId) {
      organs = organs.filter(o => o.id === options.organId);
    }
  } catch (error) {
    console.error('Failed to get installed organs:', error);
    throw error;
  }

  if (organs.length === 0) {
    console.log('No organs installed.');
    console.log('');
    console.log('Checkup complete: No organs to verify.');

    return {
      timestamp,
      results: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
      config: {
        dryRun: options.dryRun,
        organId: options.organId,
        database: DB_PATH,
      },
    };
  }

  console.log(`Found ${organs.length} installed organ(s).`);
  console.log('');

  // Run immune system on each organ
  const results: CheckupResult[] = [];

  for (const organ of organs) {
    console.log(`Checking: ${organ.name} (${organ.id})`);
    console.log(`  Installed: ${new Date(organ.installedAt).toISOString()}`);
    console.log(`  Last checkup: ${organ.lastCheckup ? new Date(organ.lastCheckup).toISOString() : 'Never'}`);
    console.log(`  Status: ${organ.status}`);

    let immuneReport: ImmuneReport;
    try {
      immuneReport = await runImmuneSystem(organ.bundle);
    } catch (error) {
      console.error('  Immune system error:', error);
      immuneReport = {
        passed: false,
        stages: [],
        rejection: {
          stage: 'property',
          reasonCode: 'CHECKUP_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      };
    }

    const result: CheckupResult = {
      organId: organ.id,
      organName: organ.name,
      pass: immuneReport.passed,
      stage: immuneReport.rejection?.stage,
      reason: immuneReport.rejection?.message,
      timestamp: Date.now(),
      report: immuneReport,
    };

    results.push(result);

    if (immuneReport.passed) {
      console.log('  ✓ PASSED');
    } else {
      console.log(`  ✗ FAILED at stage: ${immuneReport.rejection?.stage}`);
      console.log(`    Reason: ${immuneReport.rejection?.message}`);
      if (immuneReport.rejection?.source) {
        console.log(`    Source: ${immuneReport.rejection.source.file}:${immuneReport.rejection.source.line}`);
      }
    }

    // Write to ledger (unless dry run)
    if (!options.dryRun) {
      try {
        await writeCheckupEntry(ledger, organ.id, immuneReport.passed, {
          stage: result.stage,
          reason: result.reason,
          report: immuneReport,
        });
        console.log('  Ledger entry written');
      } catch (error) {
        console.error('  Failed to write ledger entry:', error);
      }
    }

    console.log('');
  }

  // Generate summary
  const report: CheckupReport = {
    timestamp,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      skipped: 0,
    },
    config: {
      dryRun: options.dryRun,
      organId: options.organId,
      database: DB_PATH,
    },
  };

  // Print summary
  console.log('========================================');
  console.log('Checkup Summary');
  console.log('========================================');
  console.log(`Total organs checked: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log('');

  // Write report to file
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  const reportPath = resolve(LOG_DIR, `checkup-${new Date().toISOString().split('T')[0]}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to: ${reportPath}`);
  console.log('');

  // Return appropriate exit code
  if (report.summary.failed > 0) {
    console.log('⚠ Some organs failed checkup.');
    console.log('Doctor will propose healing patches for decayed organs.');
    console.log('');
  } else {
    console.log('✓ All organs healthy.');
    console.log('');
  }

  return report;
}

// ============================================================================
// CLI
// ============================================================================

function parseArgs(): { dryRun: boolean; organId?: string } {
  const args = process.argv.slice(2);
  const result: { dryRun: boolean; organId?: string } = { dryRun: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      result.dryRun = true;
    } else if (args[i] === '--organ' && args[i + 1]) {
      result.organId = args[i + 1];
      i++;
    }
  }

  return result;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs();

  try {
    const report = await runCheckup(options);

    // Exit with appropriate code
    if (report.summary.failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
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
  }
}

main();
