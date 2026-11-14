#!/usr/bin/env tsx
/**
 * Complete Demo: Wish → Organ → Repair Loop → Transplant
 * 
 * Demonstrates the full GRAFT pipeline with automatic repair:
 * 1. Wish (user request)
 * 2. Spec generation (Doctor)
 * 3. Organ build (Doctor)
 * 4. Immune system validation
 * 5. Repair loop (up to 2 rounds)
 * 6. Final result (shipped or rejected)
 * 
 * Run with:
 * LLM_API_KEY=... LLM_BASE_URL=https://integrate.api.nvidia.com/v1 DOCTOR_MODEL=nvidia/nemotron-3.5-bolt-e4b \
 * npx tsx scripts/demo-repair-loop.ts
 */

import { LLMDoctorProvider } from '../packages/doctor/src/providers/llm.js';
import { buildWithRepairLoop } from '../packages/doctor/src/repair-loop.js';
import type { Anatomy, DoctorEvent, Spec } from '../packages/doctor/src/types.js';

const WISH = 'Show a simple counter of my completed tasks';

async function main() {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.DOCTOR_MODEL || 'nvidia/nemotron-3.5-bolt-e4b';

  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY not set');
    console.error('\nUsage:');
    console.error('  LLM_API_KEY=... npx tsx scripts/demo-repair-loop.ts');
    process.exit(1);
  }

  console.log('=== Complete Demo: Wish → Organ → Repair Loop ===\n');
  console.log(`Model: ${model}`);
  console.log(`Wish: "${WISH}"\n`);

  const provider = new LLMDoctorProvider({ apiKey, baseUrl, model });
  
  const anatomy: Anatomy = {
    apiVersion: '1.0.0',
    dataDomains: ['tasks', 'mood', 'notes', 'habits'],
    installedOrgans: [],
  };

  try {
    // ============================================================
    // Phase 1: Spec Generation
    // ============================================================
    console.log('📋 Phase 1: Generating spec...\n');
    
    let spec: Spec | null = null;
    const specStartTime = Date.now();
    
    for await (const event of provider.proposeSpec(WISH, anatomy)) {
      if (event.type === 'spec-complete' && event.data?.spec) {
        spec = event.data.spec as Spec;
        console.log(`✅ Spec generated: ${spec.name}`);
        console.log(`   Time: ${Date.now() - specStartTime}ms\n`);
      }
      
      if (event.type === 'error') {
        console.error(`❌ Error: ${event.data?.message}`);
        process.exit(1);
      }
    }
    
    if (!spec) {
      console.error('❌ No spec generated');
      process.exit(1);
    }

    // ============================================================
    // Phase 2: Build + Repair Loop
    // ============================================================
    console.log('🔨 Phase 2: Building organ with repair loop...\n');
    
    const repairStartTime = Date.now();
    let lastEvent = '';
    
    const result = await buildWithRepairLoop(provider, spec, anatomy, (event: DoctorEvent) => {
      // Log all events for debugging
      if (event.type === 'error') {
        console.log(`   ERROR EVENT: ${JSON.stringify(event.data)}`);
      }
      
      // Show progress
      if (event.type !== lastEvent) {
        lastEvent = event.type;
        
        if (event.type === 'build-start') {
          console.log('   Building initial organ...');
        } else if (event.type === 'build-complete') {
          console.log('   ✓ Initial build complete\n');
          if (event.data?.bundle) {
            const bundle = event.data.bundle as any;
            console.log(`   Initial manifest:`);
            console.log(`     slotSize: ${bundle.manifest?.slotSize} (${typeof bundle.manifest?.slotSize})`);
            console.log(`     permissions: ${JSON.stringify(bundle.manifest?.permissions)}`);
            console.log(`     ports: ${JSON.stringify(bundle.manifest?.ports)}`);
            console.log(`     indexHtml length: ${bundle.indexHtml?.length} bytes`);
          }
        } else if (event.type === 'repair-start') {
          console.log(`\n   🔧 Repair round ${event.data?.round}...`);
          console.log(`      Rejection: ${event.data?.rejection?.reasonCode}`);
          console.log(`      Message: ${event.data?.rejection?.message?.substring(0, 150)}...`);
          console.log(`      Details: ${JSON.stringify(event.data?.rejection?.details)?.substring(0, 200)}...`);
        } else if (event.type === 'repair-complete') {
          if (event.data?.repaired) {
            console.log(`      ✓ Repair completed, re-validating...`);
          } else {
            console.log(`      ✗ Repair failed: ${event.data?.error}`);
          }
        } else if (event.type === 'assumption') {
          console.log(`      Assumption: ${event.data?.message}`);
        }
      }
    });
    
    const totalTime = Date.now() - repairStartTime;

    // ============================================================
    // Phase 3: Final Result
    // ============================================================
    console.log('\n=== Final Result ===\n');
    
    if (result.passed) {
      console.log('🎉 SUCCESS! Organ passed immune system.\n');
      console.log(`   Bundle: ${result.bundle.manifest.name} v${result.bundle.manifest.version}`);
      console.log(`   Permissions: ${result.bundle.manifest.permissions?.join(', ') || 'none'}`);
      console.log(`   Repair rounds: ${result.repairAttempts}`);
      console.log(`   Total time: ${totalTime}ms\n`);
      
      if (result.repairAttempts === 0) {
        console.log('   ✨ Shipped first try! No repairs needed.');
      } else {
        console.log(`   🔧 Required ${result.repairAttempts} repair round(s).`);
      }
      
      console.log('\n   In the full system, this organ would now await user consent for transplant.');
      
    } else {
      console.log('❌ REJECTED after repair loop.\n');
      console.log(`   Final stage: ${result.report.rejection?.stage}`);
      console.log(`   Reason: ${result.report.rejection?.message}`);
      console.log(`   Repair rounds attempted: ${result.repairAttempts}`);
      console.log(`   Total time: ${totalTime}ms\n`);
      
      if (result.repairHistory.length > 0) {
        console.log('   Repair history:');
        result.repairHistory.forEach((attempt) => {
          console.log(`     Round ${attempt.round}: ${attempt.repaired ? '✓ repaired' : '✗ failed'}`);
          console.log(`       Rejection: ${attempt.rejection.reasonCode}`);
          if (attempt.error) {
            console.log(`       Error: ${attempt.error}`);
          }
        });
      }
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log('\n=== Summary ===\n');
    console.log(`Wish: "${WISH}"`);
    console.log(`Spec: ${spec.name}`);
    console.log(`Organ: ${result.bundle.manifest.name}`);
    console.log(`Result: ${result.passed ? 'SHIPPED ✓' : 'REJECTED ✗'}`);
    console.log(`Repair rounds: ${result.repairAttempts}/${2}`);
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);
