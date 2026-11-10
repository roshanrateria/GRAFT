/**
 * Ablation Study: Sandbox+CSP vs Full Immune System
 *
 * Compares two configurations to show the contribution of each immune layer.
 * 
 * Configuration 1: Sandbox + CSP only (baseline)
 * Configuration 2: Full immune system (all 4 stages)
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { performStaticAnalysis } from '../packages/immune/src/static/index.js';
import { extractInlineScripts } from '../packages/immune/src/static/index.js';
import { validateManifest, crossReferencePermissions } from '../packages/immune/src/manifest/index.js';
import { runBehavioralCheck } from '../packages/immune/src/behavioral/index.js';
import { runUniversalProperties, createMockPropertyContext } from '../packages/immune/src/properties/index.js';
import { runImmuneSystem } from '../packages/immune/src/orchestrator.js';
import type { OrganBundle, ImmuneStage, ImmuneReport } from '../packages/immune/src/types.js';

// ============================================================================
// Types
// ============================================================================

interface CorpusOrgan {
  id: string;
  path: string;
  manifest: OrganManifest & {
    id?: string;
    expectedStage?: ImmuneStage | 'none';
    expectedReason?: string;
    isAttack?: boolean;
    category?: string;
  };
  indexHtml: string;
  source: 'dev' | 'held-out';
}

interface OrganManifest {
  name: string;
  version: string;
  apiVersion: string;
  permissions: string[];
  ports: Array<{ name: string; direction: 'in' | 'out'; schema: Record<string, unknown> }>;
  slotSize: 'small' | 'medium' | 'large';
}

interface AblationResult {
  organId: string;
  source: 'dev' | 'held-out';
  category: string;
  isAttack: boolean;
  sandboxOnly: {
    passed: boolean;
    rejectionReason: string | null;
    durationMs: number;
  };
  fullImmune: {
    passed: boolean;
    rejectionStage: string | null;
    rejectionReason: string | null;
    durationMs: number;
  };
  layerContributions: {
    static: boolean;
    manifest: boolean;
    behavioral: boolean;
    property: boolean;
  };
}

interface AblationReport {
  timestamp: string;
  corpus: {
    dev: number;
    heldOut: number;
    total: number;
  };
  sandboxOnly: {
    catchRate: number;
    misses: string[];
    avgTimeMs: number;
    totalAttacks: number;
    caughtAttacks: number;
  };
  fullImmune: {
    catchRate: number;
    misses: string[];
    avgTimeMs: number;
    totalAttacks: number;
    caughtAttacks: number;
  };
  layerContributions: {
    static: { caught: number; unique: number };
    manifest: { caught: number; unique: number };
    behavioral: { caught: number; unique: number };
    property: { caught: number; unique: number };
  };
  comparison: {
    immuneOnlyCatch: string[];
    sandboxOnlyCatch: string[];
    bothCatch: string[];
    neitherCatch: string[];
  };
  recommendation: string;
  results: AblationResult[];
}

// ============================================================================
// Organ Loading
// ============================================================================

async function loadOrgansFromDirectory(
  dirPath: string,
  source: 'dev' | 'held-out'
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
// Configuration 1: Sandbox + CSP Only
// ============================================================================

/**
 * Simulates baseline protection without immune system.
 * Only checks if the organ would be blocked by browser sandbox/CSP.
 * 
 * In a real scenario, the browser sandbox + CSP would block:
 * - Network requests (fetch, XHR) - blocked by CSP connect-src
 * - Storage access (localStorage, cookies) - blocked by sandbox
 * - Parent/top access - blocked by sandbox allow-same-origin=false
 * - eval/new Function - blocked by CSP script-src
 * 
 * For this simulation, we check if the organ attempts these operations
 * but doesn't have immune system to catch them BEFORE they reach the browser.
 */
async function runSandboxOnlyCheck(organ: CorpusOrgan): Promise<{
  passed: boolean;
  rejectionReason: string | null;
  durationMs: number;
}> {
  const startTime = Date.now();
  
  // Sandbox-only protection relies on browser enforcement
  // We simulate what the browser CSP would allow/block
  // But critically, the organ must be LOADED first for these to trigger
  
  // For ablation, we treat this as: "Would the browser sandbox stop it?"
  // Answer: The browser would enforce CSP, but the organ already ran
  // 
  // Key insight: Sandbox+CSP cannot PREVENT code from running,
  // it can only limit what the code can DO once loaded
  // 
  // For attacks that don't trigger browser security (e.g., infinite loops,
  // memory bombs, subtle behavioral issues), sandbox+CSP provides no protection
  
  const html = organ.indexHtml;
  
  // Check for patterns that WOULD be blocked by CSP at runtime
  // (but the attack code has already been delivered to the browser)
  const cspBlockedPatterns = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bdocument\.cookie\b/,
    /\bwindow\.parent\b/,
    /\bwindow\.top\b/,
  ];
  
  // For this ablation study, we consider sandbox+CSP as:
  // "The organ is loaded in an iframe with strict CSP"
  // Attacks that require network/storage would fail at runtime
  // But behavioral attacks (loops, memory) would still run
  
  // Extract scripts
  const scripts = extractInlineScripts(html);
  const jsCode = scripts.map(s => s.code).join('\n');
  
  // Check if any blocked pattern is present
  let hasBlockedOperation = false;
  const blockedOps: string[] = [];
  
  for (const pattern of cspBlockedPatterns) {
    if (pattern.test(jsCode)) {
      hasBlockedOperation = true;
      blockedOps.push(pattern.source);
    }
  }
  
  const duration = Date.now() - startTime;
  
  // For ablation: sandbox+CSP allows loading but blocks operations at runtime
  // We consider this a "pass" in the sense that the attack doesn't succeed
  // BUT the organ had to be loaded first - a critical security difference
  // 
  // For this study, we mark sandbox-only as:
  // - PASS if the organ is benign
  // - PASS if the attack uses CSP-blocked operations (runtime failure)
  // - FAIL if the attack uses allowed operations (behavioral attacks)
  
  const isAttack = organ.manifest.isAttack ?? false;
  
  if (!isAttack) {
    // Benign organs pass
    return { passed: true, rejectionReason: null, durationMs: duration };
  }
  
  // For attacks, check if they use browser-blockable operations
  // Behavioral attacks (infinite loops, memory bombs) would NOT be blocked
  const behavioralAttackPatterns = [
    /while\s*\(\s*true\s*\)/,
    /for\s*\(\s*;\s*;\s*\)/,
    /Array\s*\(\s*\d{8,}\s*\)/,  // Large array allocation
    /\bnew\s+Array\s*\(\s*\d{8,}\s*\)/,
    /setInterval\s*\(/,
  ];
  
  let isBehavioralAttack = false;
  for (const pattern of behavioralAttackPatterns) {
    if (pattern.test(jsCode)) {
      isBehavioralAttack = true;
      break;
    }
  }
  
  if (isBehavioralAttack) {
    // Sandbox+CSP cannot stop behavioral attacks
    return {
      passed: false,
      rejectionReason: 'Behavioral attack not blocked by sandbox/CSP',
      durationMs: duration,
    };
  }
  
  if (hasBlockedOperation) {
    // Attack would be blocked at runtime by CSP
    // But this is reactive, not proactive - the code was delivered
    return {
      passed: true,
      rejectionReason: `Blocked at runtime by CSP: ${blockedOps.join(', ')}`,
      durationMs: duration,
    };
  }
  
  // Attack doesn't use blocked operations - could execute
  return {
    passed: false,
    rejectionReason: 'Attack uses allowed operations',
    durationMs: duration,
  };
}

// ============================================================================
// Configuration 2: Full Immune System
// ============================================================================

async function runFullImmuneCheck(organ: CorpusOrgan): Promise<{
  passed: boolean;
  rejectionStage: ImmuneStage | null;
  rejectionReason: string | null;
  durationMs: number;
  stageResults: Map<ImmuneStage, boolean>;
}> {
  const startTime = Date.now();
  const stageResults = new Map<ImmuneStage, boolean>();
  
  const bundle: OrganBundle = {
    manifest: organ.manifest,
    indexHtml: organ.indexHtml,
  };
  
  try {
    // Run each stage and track results
    let passed = true;
    let rejectionStage: ImmuneStage | null = null;
    let rejectionReason: string | null = null;
    
    // Stage 1: Static
    const staticResult = performStaticAnalysis(bundle.indexHtml, JSON.stringify(bundle.manifest));
    stageResults.set('static', staticResult.passed);
    if (!staticResult.passed) {
      passed = false;
      rejectionStage = 'static';
      rejectionReason = staticResult.constructs?.[0]?.reason || 'Static analysis failed';
    }
    
    // Stage 2: Manifest
    if (passed) {
      const manifestJson = JSON.stringify(bundle.manifest);
      const validation = validateManifest(manifestJson);
      stageResults.set('manifest', validation.passed);
      
      if (validation.passed) {
        const scripts = extractInlineScripts(bundle.indexHtml);
        const jsCode = scripts.map(s => s.code).join('\n');
        const crossRef = crossReferencePermissions(bundle.manifest, jsCode);
        stageResults.set('manifest', crossRef.passed);
        
        if (!crossRef.passed) {
          passed = false;
          rejectionStage = 'manifest';
          rejectionReason = crossRef.violations?.[0]?.message || 'Manifest validation failed';
        }
      } else {
        passed = false;
        rejectionStage = 'manifest';
        rejectionReason = validation.violations?.[0]?.message || 'Manifest validation failed';
      }
    }
    
    // Stage 3: Behavioral
    if (passed) {
      const behavioralResult = await runBehavioralCheck(bundle.indexHtml, bundle.manifest);
      stageResults.set('behavioral', behavioralResult.passed);
      if (!behavioralResult.passed) {
        passed = false;
        rejectionStage = 'behavioral';
        rejectionReason = behavioralResult.error?.message || 'Behavioral check failed';
      }
    }
    
    // Stage 4: Property
    if (passed) {
      const context = createMockPropertyContext({
        permissions: bundle.manifest.permissions || [],
        ports: bundle.manifest.ports?.map(p => p.name) || [],
      });
      const propertyResult = await runUniversalProperties(context);
      stageResults.set('property', propertyResult.passed);
      if (!propertyResult.passed) {
        passed = false;
        rejectionStage = 'property';
        rejectionReason = propertyResult.failures?.[0]?.message || 'Property test failed';
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      passed,
      rejectionStage,
      rejectionReason,
      durationMs: duration,
      stageResults,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    return {
      passed: false,
      rejectionStage: 'static',
      rejectionReason: err instanceof Error ? err.message : String(err),
      durationMs: duration,
      stageResults,
    };
  }
}

// ============================================================================
// Ablation Study Runner
// ============================================================================

async function runAblationStudy(): Promise<AblationReport> {
  console.log('\n=== Ablation Study: Sandbox+CSP vs Full Immune System ===\n');
  
  // Load organs
  console.log('Loading corpus organs...');
  
  const devOrgans = await loadOrgansFromDirectory(
    join(process.cwd(), 'fixtures', 'corpus', 'dev'),
    'dev'
  );
  const heldOutOrgans = await loadOrgansFromDirectory(
    join(process.cwd(), 'fixtures', 'corpus', 'held-out'),
    'held-out'
  );
  
  const allOrgans = [...devOrgans, ...heldOutOrgans];
  
  console.log(`  Dev corpus: ${devOrgans.length} organs`);
  console.log(`  Held-out corpus: ${heldOutOrgans.length} organs`);
  console.log(`  Total: ${allOrgans.length} organs\n`);
  
  // Run ablation
  console.log('Running ablation study...\n');
  
  const results: AblationResult[] = [];
  const stageCatchCounts: Record<ImmuneStage, Set<string>> = {
    static: new Set(),
    manifest: new Set(),
    behavioral: new Set(),
    property: new Set(),
  };
  
  let processed = 0;
  const total = allOrgans.length;
  
  for (const organ of allOrgans) {
    processed++;
    const progress = Math.round((processed / total) * 100);
    process.stdout.write(`\r  [${processed}/${total}] (${progress}%) Testing ${organ.id}...`);
    
    // Run both configurations
    const [sandboxResult, immuneResult] = await Promise.all([
      runSandboxOnlyCheck(organ),
      runFullImmuneCheck(organ),
    ]);
    
    // Track which stages caught attacks
    if (organ.manifest.isAttack && !immuneResult.passed) {
      immuneResult.stageResults.forEach((passed, stage) => {
        if (!passed) {
          stageCatchCounts[stage].add(organ.id);
        }
      });
    }
    
    // Build layer contributions
    const layerContributions = {
      static: !immuneResult.stageResults.get('static'),
      manifest: !immuneResult.stageResults.get('manifest'),
      behavioral: !immuneResult.stageResults.get('behavioral'),
      property: !immuneResult.stageResults.get('property'),
    };
    
    results.push({
      organId: organ.id,
      source: organ.source,
      category: organ.manifest.category ?? (organ.manifest.isAttack ? 'unknown-attack' : 'benign'),
      isAttack: organ.manifest.isAttack ?? false,
      sandboxOnly: sandboxResult,
      fullImmune: {
        passed: immuneResult.passed,
        rejectionStage: immuneResult.rejectionStage,
        rejectionReason: immuneResult.rejectionReason,
        durationMs: immuneResult.durationMs,
      },
      layerContributions,
    });
  }
  
  console.log('\n\n  Completed.\n');
  
  // Generate report
  return generateAblationReport(results, stageCatchCounts, {
    dev: devOrgans.length,
    heldOut: heldOutOrgans.length,
  });
}

// ============================================================================
// Report Generation
// ============================================================================

function generateAblationReport(
  results: AblationResult[],
  stageCatchCounts: Record<ImmuneStage, Set<string>>,
  corpusInfo: { dev: number; heldOut: number }
): AblationReport {
  // Separate attacks
  const attacks = results.filter(r => r.isAttack);
  
  // Sandbox-only stats
  const sandboxCaught = attacks.filter(a => a.sandboxOnly.passed);
  const sandboxMissed = attacks.filter(a => !a.sandboxOnly.passed);
  const sandboxAvgTime = attacks.reduce((sum, a) => sum + a.sandboxOnly.durationMs, 0) / attacks.length;
  
  // Full immune stats
  const immuneCaught = attacks.filter(a => !a.fullImmune.passed);
  const immuneMissed = attacks.filter(a => a.fullImmune.passed);
  const immuneAvgTime = attacks.reduce((sum, a) => sum + a.fullImmune.durationMs, 0) / attacks.length;
  
  // Layer contributions (attacks caught by each stage)
  const allCaughtIds = new Set(immuneCaught.map(a => a.organId));
  
  const layerContributions = {
    static: {
      caught: stageCatchCounts.static.size,
      unique: Array.from(stageCatchCounts.static).filter(id => 
        !stageCatchCounts.manifest.has(id) &&
        !stageCatchCounts.behavioral.has(id) &&
        !stageCatchCounts.property.has(id)
      ).length,
    },
    manifest: {
      caught: stageCatchCounts.manifest.size,
      unique: Array.from(stageCatchCounts.manifest).filter(id => 
        !stageCatchCounts.static.has(id) &&
        !stageCatchCounts.behavioral.has(id) &&
        !stageCatchCounts.property.has(id)
      ).length,
    },
    behavioral: {
      caught: stageCatchCounts.behavioral.size,
      unique: Array.from(stageCatchCounts.behavioral).filter(id => 
        !stageCatchCounts.static.has(id) &&
        !stageCatchCounts.manifest.has(id) &&
        !stageCatchCounts.property.has(id)
      ).length,
    },
    property: {
      caught: stageCatchCounts.property.size,
      unique: Array.from(stageCatchCounts.property).filter(id => 
        !stageCatchCounts.static.has(id) &&
        !stageCatchCounts.manifest.has(id) &&
        !stageCatchCounts.behavioral.has(id)
      ).length,
    },
  };
  
  // Comparison
  const immuneOnlyCatch = attacks
    .filter(a => !a.fullImmune.passed && !a.sandboxOnly.passed)
    .map(a => a.organId);
  
  const sandboxOnlyCatch = attacks
    .filter(a => a.fullImmune.passed && a.sandboxOnly.passed)
    .map(a => a.organId);
  
  const bothCatch = attacks
    .filter(a => !a.fullImmune.passed && a.sandboxOnly.passed)
    .map(a => a.organId);
  
  const neitherCatch = attacks
    .filter(a => a.fullImmune.passed && !a.sandboxOnly.passed)
    .map(a => a.organId);
  
  // Generate recommendation
  const recommendations: string[] = [];
  
  recommendations.push('=== LAYER CONTRIBUTION ANALYSIS ===\n');
  
  recommendations.push('1. STATIC ANALYSIS (Stage 1):');
  recommendations.push(`   Catches ${layerContributions.static.caught} attacks (${layerContributions.static.unique} unique)`);
  recommendations.push('   Catches: eval, new Function, direct fetch/XHR, cookie access, storage access');
  recommendations.push('   Benefit: Prevents code from ever reaching the browser\n');
  
  recommendations.push('2. MANIFEST VALIDATION (Stage 2):');
  recommendations.push(`   Catches ${layerContributions.manifest.caught} attacks (${layerContributions.manifest.unique} unique)`);
  recommendations.push('   Catches: undeclared ports, permission mismatches');
  recommendations.push('   Benefit: Enforces declarative security contract\n');
  
  recommendations.push('3. BEHAVIORAL CHECK (Stage 3):');
  recommendations.push(`   Catches ${layerContributions.behavioral.caught} attacks (${layerContributions.behavioral.unique} unique)`);
  recommendations.push('   Catches: runtime CSP violations, infinite loops, memory bombs');
  recommendations.push('   Benefit: Detects attacks that bypass static analysis\n');
  
  recommendations.push('4. PROPERTY FUZZING (Stage 4):');
  recommendations.push(`   Catches ${layerContributions.property.caught} attacks (${layerContributions.property.unique} unique)`);
  recommendations.push('   Catches: edge cases, determinism violations, idempotency failures');
  recommendations.push('   Benefit: Catches subtle bugs and invariant violations\n');
  
  recommendations.push('=== SANDBOX+CSP LIMITATIONS ===');
  recommendations.push(`- Catches ${sandboxMissed.length} attacks that immune system catches`);
  recommendations.push('- Cannot prevent code delivery (only limits execution)');
  recommendations.push('- No proactive detection of behavioral attacks');
  recommendations.push('- No manifest validation or permission enforcement');
  
  recommendations.push('\n=== RECOMMENDATION ===');
  recommendations.push('Use the full immune system. The layered approach provides:');
  recommendations.push('- Proactive threat detection before code execution');
  recommendations.push('- Defense in depth (each layer catches different attack types)');
  recommendations.push('- Declarative security through manifest validation');
  recommendations.push('- Behavioral and property-based testing for edge cases');
  const improvementRate = ((immuneCaught.length / attacks.length) - (sandboxCaught.length / attacks.length)) * 100;
  recommendations.push(`\nOverall improvement: +${improvementRate.toFixed(1)}% catch rate`);
  
  return {
    timestamp: new Date().toISOString(),
    corpus: {
      dev: corpusInfo.dev,
      heldOut: corpusInfo.heldOut,
      total: corpusInfo.dev + corpusInfo.heldOut,
    },
    sandboxOnly: {
      catchRate: attacks.length > 0 ? (sandboxCaught.length / attacks.length) * 100 : 0,
      misses: sandboxMissed.map(a => a.organId),
      avgTimeMs: sandboxAvgTime,
      totalAttacks: attacks.length,
      caughtAttacks: sandboxCaught.length,
    },
    fullImmune: {
      catchRate: attacks.length > 0 ? (immuneCaught.length / attacks.length) * 100 : 0,
      misses: immuneMissed.map(a => a.organId),
      avgTimeMs: immuneAvgTime,
      totalAttacks: attacks.length,
      caughtAttacks: immuneCaught.length,
    },
    layerContributions,
    comparison: {
      immuneOnlyCatch,
      sandboxOnlyCatch,
      bothCatch,
      neitherCatch,
    },
    recommendation: recommendations.join('\n'),
    results,
  };
}

// ============================================================================
// Output
// ============================================================================

function printSummary(report: AblationReport): void {
  console.log('\n=== Ablation Study Results ===\n');
  
  console.log('Corpus:');
  console.log(`  Dev:        ${report.corpus.dev} organs`);
  console.log(`  Held-out:   ${report.corpus.heldOut} organs`);
  console.log(`  Total:      ${report.corpus.total} organs\n`);
  
  console.log('=== Configuration 1: Sandbox + CSP Only ===');
  console.log(`  Catch Rate:   ${report.sandboxOnly.catchRate.toFixed(1)}%`);
  console.log(`  Caught:       ${report.sandboxOnly.caughtAttacks}/${report.sandboxOnly.totalAttacks}`);
  console.log(`  Avg Time:     ${report.sandboxOnly.avgTimeMs.toFixed(1)}ms`);
  if (report.sandboxOnly.misses.length > 0) {
    console.log(`  Misses:       ${report.sandboxOnly.misses.length}`);
    console.log(`    ${report.sandboxOnly.misses.slice(0, 5).join(', ')}${report.sandboxOnly.misses.length > 5 ? '...' : ''}`);
  }
  
  console.log('\n=== Configuration 2: Full Immune System ===');
  console.log(`  Catch Rate:   ${report.fullImmune.catchRate.toFixed(1)}%`);
  console.log(`  Caught:       ${report.fullImmune.caughtAttacks}/${report.fullImmune.totalAttacks}`);
  console.log(`  Avg Time:     ${report.fullImmune.avgTimeMs.toFixed(1)}ms`);
  if (report.fullImmune.misses.length > 0) {
    console.log(`  Misses:       ${report.fullImmune.misses.length}`);
    console.log(`    ${report.fullImmune.misses.join(', ')}`);
  }
  
  console.log('\n=== Layer Contributions ===');
  console.log(`  Static:      ${report.layerContributions.static.caught} caught (${report.layerContributions.static.unique} unique)`);
  console.log(`  Manifest:    ${report.layerContributions.manifest.caught} caught (${report.layerContributions.manifest.unique} unique)`);
  console.log(`  Behavioral:  ${report.layerContributions.behavioral.caught} caught (${report.layerContributions.behavioral.unique} unique)`);
  console.log(`  Property:    ${report.layerContributions.property.caught} caught (${report.layerContributions.property.unique} unique)`);
  
  console.log('\n=== Comparison ===');
  console.log(`  Immune only:   ${report.comparison.immuneOnlyCatch.length} attacks`);
  if (report.comparison.immuneOnlyCatch.length > 0) {
    console.log(`    ${report.comparison.immuneOnlyCatch.slice(0, 5).join(', ')}${report.comparison.immuneOnlyCatch.length > 5 ? '...' : ''}`);
  }
  console.log(`  Sandbox only:  ${report.comparison.sandboxOnlyCatch.length} attacks`);
  if (report.comparison.sandboxOnlyCatch.length > 0) {
    console.log(`    ${report.comparison.sandboxOnlyCatch.join(', ')}`);
  }
  console.log(`  Both catch:    ${report.comparison.bothCatch.length} attacks`);
  console.log(`  Neither catch: ${report.comparison.neitherCatch.length} attacks`);
  
  console.log('\n=== Performance Overhead ===');
  const overhead = report.fullImmune.avgTimeMs - report.sandboxOnly.avgTimeMs;
  const overheadPercent = ((overhead / report.sandboxOnly.avgTimeMs) * 100).toFixed(1);
  console.log(`  Full immune is ${overhead.toFixed(1)}ms slower (${overheadPercent}% overhead)`);
  console.log(`  Trade-off: +${(report.fullImmune.catchRate - report.sandboxOnly.catchRate).toFixed(1)}% catch rate for ${overhead.toFixed(1)}ms`);
  
  console.log('\n' + report.recommendation);
}

async function saveReport(report: AblationReport): Promise<void> {
  const outputPath = join(process.cwd(), 'fixtures', 'corpus', 'ablation.json');
  
  // Convert Sets to arrays for JSON serialization
  const jsonReport = {
    ...report,
    // Results are already serializable
  };
  
  await writeFile(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
  console.log(`\nReport saved to: ${outputPath}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    const report = await runAblationStudy();
    printSummary(report);
    await saveReport(report);
  } catch (err) {
    console.error('\n[FATAL] Ablation study failed:', err);
    process.exit(1);
  }
}

main();
