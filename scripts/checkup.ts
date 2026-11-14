#!/usr/bin/env tsx
/**
 * Re-verify all installed organs (Graft Checkup)
 *
 * Scans the ledger for installed organs (TRANSPLANT_APPROVED without an
 * AMPUTATED follow-up) and re-runs the full immune system on each stored
 * bundle, writing CHECKUP_PASS / CHECKUP_FAIL entries back to the ledger.
 *
 * This is the "decay sweep": an organ that passed its transplant-time checks
 * may fail today if its environment changed (API version drift, behavioral
 * flakiness, property regressions).
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

import { homedir } from 'node:os';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Immune system (real verification, same as transplant gate)
import { runImmuneSystem } from '../packages/immune/src/orchestrator.js';
import type { ImmuneReport } from '../packages/immune/src/types.js';

// Ledger
import { SQLiteLedgerService } from '../apps/server/src/db/ledger.js';
import { EventType, type Entry, GENESIS_PREV_HASH } from '../packages/ledger/src/index.js';

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

/** Parse CLI flags (--dry-run, --organ <id>) */
function parseArgs(argv: string[]): { dryRun: boolean; organId?: string } {
  const dryRun = argv.includes('--dry-run');
  const organIdx = argv.indexOf('--organ');
  const organId = organIdx !== -1 ? argv[organIdx + 1] : undefined;
  return { dryRun, organId };
}

// ============================================================================
// Organ Registry
// ============================================================================

/**
 * Get all installed organs from the ledger.
 * An organ is "installed" if it has a TRANSPLANT_APPROVED event whose payload
 * contains the approved bundle, and no AMPUTATED event afterwards.
 */
async function getInstalledOrgans(ledger: SQLiteLedgerService): Promise<InstalledOrgan[]> {
  const entries = await ledger.getHistory();

  // Find all transplanted organs
  const transplanted = new Map<string, { entry: Entry; bundle: OrganBundle }>();

  for (const entry of entries) {
    if (entry.event === EventType.TRANSPLANT_APPROVED && entry.organ_id) {
      try {
        const payload = JSON.parse(entry.payload_json);
        if (payload?.bundle?.manifest) {
          transplanted.set(entry.organ_id, { entry, bundle: payload.bundle });
        }
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
    if (
      (entry.event === EventType.CHECKUP_PASS || entry.event === EventType.CHECKUP_FAIL) &&
      entry.organ_id
    ) {
      const existing = lastCheckups.get(entry.organ_id);
      if (!existing || entry.ts > existing.timestamp) {
        lastCheckups.set(entry.organ_id, {
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
 * Write a checkup result to the ledger, chaining from the current head.
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
      report: details?.report
        ? {
            passed: details.report.passed,
            stages: details.report.stages,
          }
        : undefined,
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

  const reportPath = resolve(LOG_DIR, `checkup-${timestamp}.json`);
  try {
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('Report written to:', reportPath);
  } catch (error) {
    console.error('Failed to write report file:', error);
  }

  return report;
}

// ============================================================================
// Entry Point
// ============================================================================

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));

  try {
    const report = await runCheckup(options);
    return report.summary.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error('Checkup failed with error:', error);
    return 2;
  }
}

// Run when executed directly
const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().then(code => {
    process.exit(code);
  });
}

// Also export for programmatic use (e.g. demo fast-forward button)
export { runCheckup, getInstalledOrgans, writeCheckupEntry, parseArgs };
export type { CheckupReport, CheckupResult, InstalledOrgan };
