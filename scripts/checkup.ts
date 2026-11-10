#!/usr/bin/env ts-node
/**
 * Re-verify all installed organs
 * 
 * This script runs the immune system on every installed organ.
 * It is a plain script that makes no LLM calls (costs no credits).
 * 
 * Triggered by:
 * - Scheduled by Crew bot
 * - Manual "Fast-forward the night" demo button
 * 
 * Usage:
 *   ts-node scripts/checkup.ts
 */

import { createInterface } from 'readline';

// Placeholder imports - will be implemented in Phase 4
// import { Registry } from '../apps/web/src/Registry';
// import { ImmuneSystem } from '../packages/immune/src';
// import { Ledger } from '../packages/ledger/src';

interface Organ {
  id: string;
  name: string;
  bundle: {
    manifest: unknown;
    code: string;
    spec: string;
    properties: string;
  };
}

interface CheckupResult {
  organId: string;
  organName: string;
  pass: boolean;
  stage?: string;
  reason?: string;
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

async function checkup(): Promise<CheckupReport> {
  console.log('Starting checkup...');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');
  
  // Placeholder implementation
  // In Phase 4, this will:
  // 1. Get all installed organs from registry
  // 2. Run immune system on each
  // 3. Write ledger entries
  // 4. Return structured report
  
  const organs: Organ[] = []; // await registry.getAllInstalled();
  
  if (organs.length === 0) {
    console.log('No organs installed.');
    return {
      timestamp: Date.now(),
      results: [],
      summary: { total: 0, passed: 0, failed: 0 }
    };
  }
  
  const results: CheckupResult[] = [];
  
  for (const organ of organs) {
    console.log(`Checking organ: ${organ.name} (${organ.id})`);
    
    // const report = await immune.run(organ.bundle);
    // results.push({
    //   organId: organ.id,
    //   organName: organ.name,
    //   pass: report.pass,
    //   stage: report.failedStage,
    //   reason: report.reason
    // });
    
    // if (!report.pass) {
    //   // Write CHECKUP_FAIL ledger entry
    //   // Emit event for Doctor to handle healing
    //   console.log(`  FAILED at stage: ${report.failedStage}`);
    //   console.log(`  Reason: ${report.reason}`);
    // } else {
    //   // Write CHECKUP_PASS ledger entry
    //   console.log(`  PASSED`);
    // }
  }
  
  const report: CheckupReport = {
    timestamp: Date.now(),
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length
    }
  };
  
  console.log('');
  console.log('=== Checkup Summary ===');
  console.log(`Total: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  
  // Exit with error code if any failed
  if (report.summary.failed > 0) {
    console.log('');
    console.log('Some organs failed checkup.');
    console.log('Doctor will propose healing patches.');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run checkup
checkup().catch(error => {
  console.error('Checkup failed with error:', error);
  process.exit(1);
});
