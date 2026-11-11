/**
 * Run 20 Varied Wishes with Live Doctor
 *
 * This script runs 20 diverse wishes through the LLM DoctorProvider,
 * tracking outcomes (shipped first try, after repair, rejected).
 */

// Use compiled dist imports
import { createLLMProvider, runRepairLoop } from '../packages/doctor/dist/index.js';
import type { DoctorProvider, DoctorEvent, Spec, Anatomy, OrganBundle } from '../packages/doctor/dist/index.js';
import { runImmuneSystem } from '../packages/immune/dist/index.js';
import type { ImmuneReport } from '../packages/immune/dist/index.js';

// ============================================================================
// Test LLM Connection
// ============================================================================

async function testLLMConnection(): Promise<{ ok: boolean; error?: string; model?: string }> {
  const doctor = createLLMProvider();
  
  if (!process.env.LLM_API_KEY) {
    return { ok: false, error: 'LLM_API_KEY not set' };
  }

  try {
    // Try a minimal request with timeout
    const events = doctor.proposeSpec('Hello', { apiVersion: '1.0.0', dataDomains: [], installedOrgans: [] });
    
    // Create a timeout promise
    const timeoutPromise = new Promise<{ ok: false; error: string }>((resolve) => {
      setTimeout(() => resolve({ ok: false, error: 'LLM API connection timeout (10s) - API may be blocked by network or firewall' }), 10000);
    });
    
    // Race between events and timeout
    const result = await Promise.race([
      (async () => {
        for await (const event of events) {
          if (event.type === 'error') {
            const data = event.data as { message?: string };
            return { ok: false, error: data.message || 'Unknown error' } as const;
          }
          if (event.type === 'spec-start' || event.type === 'assumption') {
            return { ok: true, model: doctor.name } as const;
          }
        }
        return { ok: false, error: 'No response from LLM API' } as const;
      })(),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Configuration
// ============================================================================

const WISHES = [
  "Show me today's mood as a weather icon",
  "Track my water intake with a daily goal",
  "Display a countdown to my next meeting",
  "Show random inspirational quotes",
  "Track my daily steps from a pedometer",
  "Create a simple Pomodoro timer",
  "Display my weekly mood chart",
  "Track habits with streaks",
  "Show my top 3 tasks for today",
  "Create a simple note-taking widget",
  "Display upcoming calendar events",
  "Track caffeine intake",
  "Show weather-based activity suggestions",
  "Create a gratitude journal entry",
  "Display a random vocabulary word",
  "Track meditation minutes",
  "Show sleep quality indicator",
  "Create a simple expense tracker",
  "Display birthday countdown",
  "Track reading progress in a book",
];

const DEFAULT_ANATOMY: Anatomy = {
  apiVersion: '1.0.0',
  dataDomains: ['mood', 'tasks', 'calendar', 'health', 'notes'],
  installedOrgans: [],
  preferences: {},
};

// ============================================================================
// Result Types
// ============================================================================

interface WishResult {
  wish: string;
  wishIndex: number;
  outcome: 'shipped-first-try' | 'after-repair' | 'rejected' | 'error';
  timeMs: number;
  specGenerated: boolean;
  buildGenerated: boolean;
  immuneStagesPassed: number;
  repairAttempts: number;
  errorMessage?: string;
  rejectionStage?: string;
  rejectionReason?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function collectSpec(
  doctor: DoctorProvider,
  wish: string,
  anatomy: Anatomy
): Promise<{ spec: Spec | null; error?: string }> {
  try {
    const events = doctor.proposeSpec(wish, anatomy);
    let spec: Spec | null = null;

    for await (const event of events) {
      if (event.type === 'spec-complete' && event.data) {
        spec = (event.data as { spec: Spec }).spec;
      } else if (event.type === 'error' && event.data) {
        const errorData = event.data as { message?: string };
        return { spec: null, error: errorData.message || 'Unknown error' };
      }
    }

    return { spec };
  } catch (error) {
    return { spec: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function buildOrgan(
  doctor: DoctorProvider,
  spec: Spec,
  anatomy: Anatomy
): Promise<{ bundle: OrganBundle | null; error?: string }> {
  try {
    const events = doctor.build(spec, anatomy);
    let bundle: OrganBundle | null = null;

    for await (const event of events) {
      if (event.type === 'build-complete' && event.data) {
        bundle = (event.data as { bundle: OrganBundle }).bundle;
      } else if (event.type === 'error' && event.data) {
        const errorData = event.data as { message?: string };
        return { bundle: null, error: errorData.message || 'Unknown error' };
      }
    }

    return { bundle };
  } catch (error) {
    return { bundle: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function runWishTrials(): Promise<WishResult[]> {
  const doctor = createLLMProvider();
  const results: WishResult[] = [];

  // Check if configured
  if (!doctor.isConfigured?.()) {
    console.log('ERROR: LLM_API_KEY not configured');
    console.log('Set LLM_API_KEY environment variable to run live trials.');
    return WISHES.map((wish, i) => ({
      wish,
      wishIndex: i + 1,
      outcome: 'error' as const,
      timeMs: 0,
      specGenerated: false,
      buildGenerated: false,
      immuneStagesPassed: 0,
      repairAttempts: 0,
      errorMessage: 'LLM_API_KEY not configured',
    }));
  }

  console.log(`Running ${WISHES.length} wishes with LLM Doctor: ${doctor.name}`);
  console.log('=' .repeat(60));

  for (let i = 0; i < WISHES.length; i++) {
    const wish = WISHES[i];
    const startTime = Date.now();
    const result: WishResult = {
      wish,
      wishIndex: i + 1,
      outcome: 'error',
      timeMs: 0,
      specGenerated: false,
      buildGenerated: false,
      immuneStagesPassed: 0,
      repairAttempts: 0,
    };

    console.log(`\n[${i + 1}/${WISHES.length}] "${wish}"`);

    try {
      // Step 1: Generate spec
      console.log('  → Generating spec...');
      const { spec, error: specError } = await collectSpec(doctor, wish, DEFAULT_ANATOMY);

      if (specError || !spec) {
        result.errorMessage = specError || 'No spec generated';
        console.log(`  ✗ Spec failed: ${result.errorMessage}`);
        result.timeMs = Date.now() - startTime;
        results.push(result);
        continue;
      }

      result.specGenerated = true;
      console.log(`  ✓ Spec generated: ${spec.name}`);

      // Step 2: Build organ
      console.log('  → Building organ...');
      const { bundle, error: buildError } = await buildOrgan(doctor, spec, DEFAULT_ANATOMY);

      if (buildError || !bundle) {
        result.errorMessage = buildError || 'No bundle generated';
        console.log(`  ✗ Build failed: ${result.errorMessage}`);
        result.timeMs = Date.now() - startTime;
        results.push(result);
        continue;
      }

      result.buildGenerated = true;
      console.log('  ✓ Organ built');

      // Step 3: Run immune system with repair loop
      console.log('  → Running immune system...');
      const repairResult = await runRepairLoop(doctor, bundle);

      result.repairAttempts = repairResult.repairAttempts;
      result.immuneStagesPassed = repairResult.report.stages.filter(s => s.passed).length;

      if (repairResult.passed) {
        if (repairResult.repairAttempts === 0) {
          result.outcome = 'shipped-first-try';
          console.log('  ✓ SHIPPED (first try)');
        } else {
          result.outcome = 'after-repair';
          console.log(`  ✓ SHIPPED (after ${repairResult.repairAttempts} repair(s))`);
        }
      } else {
        result.outcome = 'rejected';
        result.rejectionStage = repairResult.report.rejection?.stage;
        result.rejectionReason = repairResult.report.rejection?.message;
        console.log(`  ✗ REJECTED at ${result.rejectionStage}: ${result.rejectionReason}`);
      }
    } catch (error) {
      result.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ✗ Error: ${result.errorMessage}`);
    }

    result.timeMs = Date.now() - startTime;
    results.push(result);

    // Progress indicator
    const shipped = results.filter(r => r.outcome === 'shipped-first-try').length;
    const repaired = results.filter(r => r.outcome === 'after-repair').length;
    const rejected = results.filter(r => r.outcome === 'rejected').length;
    const errors = results.filter(r => r.outcome === 'error').length;
    console.log(`  Progress: ${shipped} shipped, ${repaired} repaired, ${rejected} rejected, ${errors} errors`);
  }

  return results;
}

// ============================================================================
// Output
// ============================================================================

function formatResultsMarkdown(results: WishResult[], connectionError?: string): string {
  const shippedFirstTry = results.filter(r => r.outcome === 'shipped-first-try').length;
  const afterRepair = results.filter(r => r.outcome === 'after-repair').length;
  const rejected = results.filter(r => r.outcome === 'rejected').length;
  const errors = results.filter(r => r.outcome === 'error').length;
  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);
  const avgTime = results.length > 0 ? Math.round(totalTime / results.length) : 0;

  let md = `# Wish Trial Results

**Date:** ${new Date().toISOString()}
**Doctor Provider:** LLM (NVIDIA API)
**Total Wishes:** ${results.length}

${connectionError ? `## ⚠️ LLM Connection Issue

The live LLM Doctor was unavailable during this run:

\`\`\`
${connectionError}
\`\`\`

This could be due to:
- LLM_API_KEY not set or expired
- Network/firewall restrictions
- API endpoint unavailable
- API quota exhausted

To run live trials:
1. Set LLM_API_KEY environment variable
2. Ensure network access to the LLM API endpoint
3. Verify API quota is available

---

` : ''}## Summary

| Metric | Value |
|--------|-------|
| Shipped First Try | ${shippedFirstTry} (${Math.round((shippedFirstTry / results.length) * 100)}%) |
| After Repair | ${afterRepair} (${Math.round((afterRepair / results.length) * 100)}%) |
| Rejected | ${rejected} (${Math.round((rejected / results.length) * 100)}%) |
| Errors | ${errors} (${Math.round((errors / results.length) * 100)}%) |
| Total Time | ${(totalTime / 1000).toFixed(1)}s |
| Avg Time per Wish | ${(avgTime / 1000).toFixed(1)}s |

## Detailed Results

| # | Wish | Outcome | Time | Stages Passed | Repairs | Notes |
|---|------|---------|------|---------------|---------|-------|
`;

  for (const r of results) {
    const outcomeEmoji = r.outcome === 'shipped-first-try' ? '✓✓' :
                         r.outcome === 'after-repair' ? '✓⟳' :
                         r.outcome === 'rejected' ? '✗' : '⚠';
    const notes = r.errorMessage || r.rejectionReason || '-';
    const truncatedWish = r.wish.length > 40 ? r.wish.substring(0, 37) + '...' : r.wish;
    md += `| ${r.wishIndex} | ${truncatedWish} | ${outcomeEmoji} ${r.outcome} | ${(r.timeMs / 1000).toFixed(1)}s | ${r.immuneStagesPassed}/4 | ${r.repairAttempts} | ${notes.substring(0, 50)} |\n`;
  }

  md += `
## Outcome Definitions

- **shipped-first-try**: Organ passed all 4 immune stages on first submission
- **after-repair**: Organ failed initially, passed after repair rounds (max 2)
- **rejected**: Organ failed after max repair rounds
- **error**: Error during spec/build phase

## Immune System Stages

1. **Static**: AST analysis for banned constructs
2. **Manifest**: Schema and permission validation
3. **Behavioral**: Runtime sandbox testing
4. **Property**: Fast-check property-based fuzzing

## Environment

- Node.js: ${process.version}
- Platform: ${process.platform}
- LLM_API_KEY: ${process.env.LLM_API_KEY ? '✓ Set' : '✗ Not set'}
- LLM_BASE_URL: ${process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1 (default)'}
`;

  return md;
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  console.log('GRAFT Wish Trial Runner');
  console.log('='.repeat(60));

  // Test LLM connection first
  console.log('\nTesting LLM connection...');
  const connectionTest = await testLLMConnection();
  
  if (!connectionTest.ok) {
    console.log(`\nLLM connection failed: ${connectionTest.error}`);
    console.log('Writing results with error status for all wishes.');
    
    const emptyResults: WishResult[] = WISHES.map((wish, i) => ({
      wish,
      wishIndex: i + 1,
      outcome: 'error' as const,
      timeMs: 0,
      specGenerated: false,
      buildGenerated: false,
      immuneStagesPassed: 0,
      repairAttempts: 0,
      errorMessage: connectionTest.error,
    }));

    const md = formatResultsMarkdown(emptyResults, connectionTest.error);
    const outputPath = 'docs/wish-trial-results.md';
    const fs = await import('fs/promises');
    await fs.mkdir('docs', { recursive: true });
    await fs.writeFile(outputPath, md);
    console.log(`\nResults written to ${outputPath}`);
    return;
  }

  console.log(`LLM connected: ${connectionTest.model}`);
  
  const results = await runWishTrials();
  const md = formatResultsMarkdown(results);

  const outputPath = 'docs/wish-trial-results.md';
  const fs = await import('fs/promises');
  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile(outputPath, md);

  console.log('\n' + '='.repeat(60));
  console.log(`Results written to ${outputPath}`);

  // Final summary
  const shippedFirstTry = results.filter(r => r.outcome === 'shipped-first-try').length;
  const afterRepair = results.filter(r => r.outcome === 'after-repair').length;
  const rejected = results.filter(r => r.outcome === 'rejected').length;

  console.log(`\nCompleted ${results.length} wish trials.`);
  console.log(`Summary: ${shippedFirstTry} shipped first try, ${afterRepair} after repair, ${rejected} rejected.`);
}

main().catch(console.error);
