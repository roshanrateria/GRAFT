/**
 * Immune System Benchmark Runner - Specific Corpus
 *
 * Runs the immune system on a specific corpus and generates a detailed report.
 * Usage: pnpm benchmark:corpus -- corpus <corpus-name>
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { runImmuneSystem } from '../packages/immune/src/orchestrator.js';
import type { OrganBundle, ImmuneStage } from '../packages/immune/src/types.js';

// ============================================================================
// Types
// ============================================================================

type CorpusSource = 'dev' | 'held-out' | 'held-out-v2' | 'hostile';

interface CorpusOrgan {
  id: string;
  path: string;
  manifest: OrganManifest & {
    id?: string;
    expectedStage?: ImmuneStage | 'none';
    expectedReason?: string;
    isAttack?: boolean;
    category?: string;
    expectedRejection?: {
      stage: ImmuneStage | 'none';
      reason: string;
    };
  };
  indexHtml: string;
  source: CorpusSource;
}

interface OrganManifest {
  name: string;
  version: string;
  apiVersion: string;
  permissions: string[];
  ports: Array<{ name: string; direction: 'in' | 'out'; schema: Record<string, unknown> }>;
  slotSize: 'small' | 'medium' | 'large';
}

interface BenchmarkResult {
  organId: string;
  source: CorpusSource;
  category: string;
  isAttack: boolean;
  expectedStage: string;
  actualStage: string | null;
  passed: boolean;
  correct: boolean;
  rejectionReason: string | null;
  durationMs: number;
  error?: string;
}

interface BenchmarkReport {
  timestamp: string;
  corpus: string;
  summary: {
    totalOrgans: number;
    totalAttacks: number;
    totalBenign: number;
    caughtAttacks: number;
    missedAttacks: number;
    falseRejections: number;
    trueAcceptances: number;
    catchRate: number;
    falseRejectionRate: number;
  };
  byStage: {
    static: { caught: number; total: number; rate: number };
    manifest: { caught: number; total: number; rate: number };
    behavioral: { caught: number; total: number; rate: number };
    property: { caught: number; total: number; rate: number };
  };
  byCategory: Record<string, {
    total: number;
    caught: number;
    missed: number;
    catchRate: number;
  }>;
  misses: Array<{
    organId: string;
    source: string;
    category: string;
    expectedStage: string;
    reason: string;
  }>;
  falseRejectionsList: Array<{
    organId: string;
    source: string;
    rejectedAt: string;
    reason: string;
  }>;
  timing: {
    totalMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
  };
  results: BenchmarkResult[];
}

// ============================================================================
// Organ Loading
// ============================================================================

async function loadOrgansFromDirectory(
  dirPath: string,
  source: CorpusSource
): Promise<CorpusOrgan[]> {
  const organs: CorpusOrgan[] = [];
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const organDirs = entries.filter(e => e.isDirectory());
    
    for (const organDir of organDirs) {
      const organPath = join(dirPath, organDir.name);
      const manifestPath = join(organPath, 'manifest.json');
      const htmlPath = join(organPath, 'index.html');
      
      try {
        const [manifestContent, htmlContent] = await Promise.all([
          readFile(manifestPath, 'utf-8'),
          readFile(htmlPath, 'utf-8'),
        ]);
        
        const manifest = JSON.parse(manifestContent);
        
        organs.push({
          id: manifest.id || organDir.name,
          path: organPath,
          manifest,
          indexHtml: htmlContent,
          source,
        });
      } catch (err) {
        console.error(`  [!] Failed to load ${organDir.name}: ${err}`);
      }
    }
  } catch (err) {
    console.error(`[!] Failed to read directory ${dirPath}: ${err}`);
  }
  
  return organs;
}

// ============================================================================
// Benchmark Runner
// ============================================================================

async function runBenchmark(corpusName: string): Promise<BenchmarkReport> {
  const results: BenchmarkResult[] = [];
  const startTime = Date.now();
  
  console.log(`\n=== Immune System Benchmark: ${corpusName} ===\n`);
  console.log('Loading corpus organs...');
  
  // Determine corpus path
  let corpusPath: string;
  let source: CorpusSource;
  
  if (corpusName === 'hostile') {
    corpusPath = join(process.cwd(), 'organs', 'hostile');
    source = 'hostile';
  } else {
    corpusPath = join(process.cwd(), 'fixtures', 'corpus', corpusName);
    source = corpusName as CorpusSource;
  }
  
  const organs = await loadOrgansFromDirectory(corpusPath, source);
  
  console.log(`  ${corpusName} corpus: ${organs.length} organs\n`);
  
  if (organs.length === 0) {
    console.error(`[ERROR] No organs found in ${corpusPath}`);
    process.exit(1);
  }
  
  // Run immune system on each organ
  console.log('Running immune system...\n');
  
  let processed = 0;
  const total = organs.length;
  
  for (const organ of organs) {
    processed++;
    const progress = Math.round((processed / total) * 100);
    process.stdout.write(`\r  [${processed}/${total}] (${progress}%) Testing ${organ.id}...`);
    
    const organStartTime = Date.now();
    let result: BenchmarkResult;
    
    try {
      const bundle: OrganBundle = {
        manifest: organ.manifest,
        indexHtml: organ.indexHtml,
      };
      
      const report = await runImmuneSystem(bundle);
      const duration = Date.now() - organStartTime;
      
      // Determine if attack: check isAttack flag, or infer from expectedStage/expectedRejection
      let isAttack = organ.manifest.isAttack ?? false;
      if (!isAttack) {
        // Check expectedStage
        if (organ.manifest.expectedStage !== undefined && organ.manifest.expectedStage !== 'none') {
          isAttack = true;
        }
        // Check expectedRejection.stage
        else if (organ.manifest.expectedRejection?.stage !== undefined && 
                 organ.manifest.expectedRejection?.stage !== 'none') {
          isAttack = true;
        }
      }
      
      const expectedStage = organ.manifest.expectedStage ?? 
        organ.manifest.expectedRejection?.stage ?? 
        (isAttack ? 'unknown' : 'none');
      const actualStage = report.passed ? null : report.rejection?.stage ?? null;
      
      // Determine if result is correct
      let correct: boolean;
      if (isAttack) {
        // Attack should be rejected
        correct = !report.passed;
      } else {
        // Benign should pass
        correct = report.passed;
      }
      
      // Extract rejection reason
      let rejectionReason: string | null = null;
      if (report.rejection) {
        rejectionReason = report.rejection.message || report.rejection.reasonCode || null;
      } else if (!report.passed && report.stages.length > 0) {
        const failedStage = report.stages.find(s => !s.passed);
        if (failedStage?.error) {
          rejectionReason = failedStage.error.message || failedStage.error.code || null;
        }
      }
      
      // Infer category from organ ID if not specified
      let category = organ.manifest.category;
      if (!category) {
        if (organ.id.startsWith('attack-')) {
          // Infer from attack number ranges
          const num = parseInt(organ.id.split('-')[1], 10);
          if (num >= 1 && num <= 6) category = 'direct';
          else if (num >= 7 && num <= 13) category = 'obfuscated';
          else if (num >= 14 && num <= 19) category = 'escape';
          else if (num >= 20 && num <= 24) category = 'behavioral';
          else category = 'unknown-attack';
        } else if (organ.id.startsWith('benign-')) {
          category = 'benign';
        } else {
          category = isAttack ? 'unknown-attack' : 'benign';
        }
      }
      
      result = {
        organId: organ.id,
        source: organ.source,
        category,
        isAttack,
        expectedStage,
        actualStage,
        passed: report.passed,
        correct,
        rejectionReason,
        durationMs: duration,
      };
    } catch (err) {
      const duration = Date.now() - organStartTime;
      result = {
        organId: organ.id,
        source: organ.source,
        category: organ.manifest.category ?? 'unknown',
        isAttack: organ.manifest.isAttack ?? false,
        expectedStage: organ.manifest.expectedStage ?? 'unknown',
        actualStage: null,
        passed: false,
        correct: false,
        rejectionReason: null,
        durationMs: duration,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    
    results.push(result);
  }
  
  const totalDuration = Date.now() - startTime;
  console.log(`\n\n  Completed in ${totalDuration}ms\n`);
  
  // Generate report
  return generateReport(results, corpusName, totalDuration);
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(
  results: BenchmarkResult[],
  corpusName: string,
  totalMs: number
): BenchmarkReport {
  // Count attacks and benign
  const totalAttacks = results.filter(r => r.isAttack).length;
  const totalBenign = results.filter(r => !r.isAttack).length;
  
  // Count outcomes
  const caughtAttacks = results.filter(r => r.isAttack && !r.passed).length;
  const missedAttacks = results.filter(r => r.isAttack && r.passed).length;
  const falseRejections = results.filter(r => !r.isAttack && !r.passed).length;
  const trueAcceptances = results.filter(r => !r.isAttack && r.passed).length;
  
  // Calculate rates
  const catchRate = totalAttacks > 0 ? (caughtAttacks / totalAttacks) * 100 : 0;
  const falseRejectionRate = totalBenign > 0 ? (falseRejections / totalBenign) * 100 : 0;
  
  // By stage analysis (attacks only)
  const stageCounts: Record<ImmuneStage, { caught: number; total: number }> = {
    static: { caught: 0, total: 0 },
    manifest: { caught: 0, total: 0 },
    behavioral: { caught: 0, total: 0 },
    property: { caught: 0, total: 0 },
  };
  
  for (const result of results) {
    if (result.isAttack && result.actualStage) {
      stageCounts[result.actualStage as ImmuneStage].caught++;
    }
  }
  
  // Calculate catch rate by stage (cumulative)
  let cumulative = 0;
  const byStage: BenchmarkReport['byStage'] = {
    static: { caught: 0, total: totalAttacks, rate: 0 },
    manifest: { caught: 0, total: totalAttacks, rate: 0 },
    behavioral: { caught: 0, total: totalAttacks, rate: 0 },
    property: { caught: 0, total: totalAttacks, rate: 0 },
  };
  
  const stages: ImmuneStage[] = ['static', 'manifest', 'behavioral', 'property'];
  for (const stage of stages) {
    cumulative += stageCounts[stage].caught;
    byStage[stage].caught = cumulative;
    byStage[stage].rate = totalAttacks > 0 ? (cumulative / totalAttacks) * 100 : 0;
  }
  
  // By category
  const categoryMap = new Map<string, { total: number; caught: number; missed: number }>();
  for (const result of results) {
    if (!result.isAttack) continue;
    
    const cat = result.category || 'unknown';
    const entry = categoryMap.get(cat) || { total: 0, caught: 0, missed: 0 };
    entry.total++;
    if (!result.passed) {
      entry.caught++;
    } else {
      entry.missed++;
    }
    categoryMap.set(cat, entry);
  }
  
  const byCategory: BenchmarkReport['byCategory'] = {};
  for (const [cat, data] of categoryMap) {
    byCategory[cat] = {
      ...data,
      catchRate: data.total > 0 ? (data.caught / data.total) * 100 : 0,
    };
  }
  
  // Misses list
  const misses = results
    .filter(r => r.isAttack && r.passed)
    .map(r => ({
      organId: r.organId,
      source: r.source,
      category: r.category,
      expectedStage: r.expectedStage,
      reason: r.error || 'Passed all immune stages',
    }));
  
  // False rejections list
  const falseRejectionsList = results
    .filter(r => !r.isAttack && !r.passed)
    .map(r => ({
      organId: r.organId,
      source: r.source,
      rejectedAt: r.actualStage || 'unknown',
      reason: r.rejectionReason || 'Unknown reason',
    }));
  
  // Timing stats
  const durations = results.map(r => r.durationMs);
  const timing: BenchmarkReport['timing'] = {
    totalMs,
    avgMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    minMs: durations.length > 0 ? Math.min(...durations) : 0,
    maxMs: durations.length > 0 ? Math.max(...durations) : 0,
  };
  
  return {
    timestamp: new Date().toISOString(),
    corpus: corpusName,
    summary: {
      totalOrgans: results.length,
      totalAttacks,
      totalBenign,
      caughtAttacks,
      missedAttacks,
      falseRejections,
      trueAcceptances,
      catchRate,
      falseRejectionRate,
    },
    byStage,
    byCategory,
    misses,
    falseRejectionsList,
    timing,
    results,
  };
}

// ============================================================================
// Output
// ============================================================================

function printSummary(report: BenchmarkReport): void {
  console.log('=== Benchmark Summary ===\n');
  
  console.log(`Corpus: ${report.corpus}`);
  console.log(`  Total: ${report.summary.totalOrgans} organs\n`);
  
  console.log('Results:');
  console.log(`  Attacks:        ${report.summary.totalAttacks}`);
  console.log(`    Caught:       ${report.summary.caughtAttacks}`);
  console.log(`    Missed:       ${report.summary.missedAttacks}`);
  console.log(`  Benign:         ${report.summary.totalBenign}`);
  console.log(`    Accepted:     ${report.summary.trueAcceptances}`);
  console.log(`    False reject: ${report.summary.falseRejections}\n`);
  
  console.log('Catch Rate by Stage (cumulative):');
  for (const [stage, data] of Object.entries(report.byStage)) {
    console.log(`  ${stage.padEnd(12)} ${data.rate.toFixed(1)}% (${data.caught}/${data.total})`);
  }
  
  console.log('\nBy Category:');
  const sortedCategories = Object.entries(report.byCategory)
    .sort((a, b) => b[1].catchRate - a[1].catchRate);
  for (const [cat, data] of sortedCategories) {
    console.log(`  ${cat.padEnd(20)} ${data.catchRate.toFixed(1)}% (${data.caught}/${data.total})`);
  }
  
  if (report.misses.length > 0) {
    console.log('\n⚠ MISSES (attacks that passed):');
    for (const miss of report.misses) {
      console.log(`  - ${miss.organId} [${miss.source}/${miss.category}]`);
      console.log(`    Expected: ${miss.expectedStage}`);
      console.log(`    Reason: ${miss.reason}`);
    }
  }
  
  if (report.falseRejectionsList.length > 0) {
    console.log('\n⚠ FALSE REJECTIONS (benign organs rejected):');
    for (const fr of report.falseRejectionsList) {
      console.log(`  - ${fr.organId} [${fr.source}]`);
      console.log(`    Stage: ${fr.rejectedAt}`);
      console.log(`    Reason: ${fr.reason}`);
    }
  }
  
  console.log('\nTiming:');
  console.log(`  Total:   ${report.timing.totalMs}ms`);
  console.log(`  Average: ${report.timing.avgMs.toFixed(1)}ms`);
  console.log(`  Min:     ${report.timing.minMs}ms`);
  console.log(`  Max:     ${report.timing.maxMs}ms`);
  
  console.log('\n=== Key Metrics ===');
  console.log(`  Catch Rate:          ${report.summary.catchRate.toFixed(1)}%`);
  console.log(`  False Rejection Rate: ${report.summary.falseRejectionRate.toFixed(1)}%`);
}

async function saveReport(report: BenchmarkReport, corpusName: string): Promise<void> {
  const outputPath = join(process.cwd(), 'fixtures', 'corpus', `results-${corpusName}.json`);
  
  // Ensure directory exists
  await mkdir(join(process.cwd(), 'fixtures', 'corpus'), { recursive: true });
  
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport saved to: ${outputPath}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  // Parse arguments: pnpm benchmark:corpus -- corpus <name>
  const args = process.argv.slice(2);
  let corpusName: string | null = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === 'corpus' && args[i + 1]) {
      corpusName = args[i + 1];
      break;
    }
  }
  
  if (!corpusName) {
    console.error('Usage: pnpm benchmark:corpus -- corpus <corpus-name>');
    console.error('  corpus-name: dev, held-out, held-out-v2, hostile');
    process.exit(1);
  }
  
  try {
    const report = await runBenchmark(corpusName);
    printSummary(report);
    await saveReport(report, corpusName);
  } catch (err) {
    console.error('\n[FATAL] Benchmark failed:', err);
    process.exit(1);
  }
}

main();
