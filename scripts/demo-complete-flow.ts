#!/usr/bin/env tsx
/**
 * Complete Demo: Wish → Organ → Immune System
 * 
 * Demonstrates the full GRAFT pipeline:
 * 1. Wish (user request)
 * 2. Spec generation (Doctor)
 * 3. Organ build (Doctor)
 * 4. Immune system validation
 * 5. Consent/transplant
 * 
 * Run with:
 * LLM_API_KEY=... LLM_BASE_URL=https://integrate.api.nvidia.com/v1 DOCTOR_MODEL=nvidia/nemotron-3.5-bolt-e4b \
 * npx tsx scripts/demo-complete-flow.ts
 */

import { LLMDdoctorProvider } from '../packages/doctor/src/providers/llm.js';
import { runImmuneSystem } from '../packages/immune/src/orchestrator.js';
import type { Anatomy, DoctorEvent, Spec, OrganBundle } from '../packages/doctor/src/types.js';

const WISH = 'Show a simple counter of my completed tasks';

async function main() {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.DOCTOR_MODEL || 'nvidia/nemotron-3.5-bolt-e4b';

  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY not set');
    console.error('\nUsage:');
    console.error('  LLM_API_KEY=... npx tsx scripts/demo-complete-flow.ts');
    process.exit(1);
  }

  console.log('=== Complete Demo: Wish → Organ → Immune System ===\n');
  console.log(`Model: ${model}`);
  console.log(`Wish: "${WISH}"\n`);

  const provider = new LLMDdoctorProvider({ apiKey, baseUrl, model });
  
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
    const specEvents: DoctorEvent[] = [];
    
    for await (const event of provider.proposeSpec(WISH, anatomy)) {
      specEvents.push(event);
      
      if (event.type === 'spec-complete' && event.data?.spec) {
        spec = event.data.spec as Spec;
        console.log(`✅ Spec generated: ${spec.name}`);
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
    
    console.log(`   Requirements: ${spec.requirements?.split('\n').length || 0} lines`);
    console.log(`   Design: ${spec.design?.substring(0, 100)}...\n`);

    // ============================================================
    // Phase 2: Build Organ
    // ============================================================
    console.log('🔨 Phase 2: Building organ...\n');
    
    let bundle: OrganBundle | null = null;
    const buildEvents: DoctorEvent[] = [];
    
    for await (const event of provider.build(spec, anatomy)) {
      buildEvents.push(event);
      
      if (event.type === 'build-complete' && event.data?.bundle) {
        bundle = event.data.bundle as OrganBundle;
        console.log('✅ Organ built successfully');
      }
      
      if (event.type === 'build-progress') {
        console.log(`   ${event.data?.step} (${event.data?.progress}%)`);
      }
      
      if (event.type === 'error') {
        console.error(`❌ Build error: ${event.data?.message}`);
        process.exit(1);
      }
    }
    
    if (!bundle) {
      console.error('❌ No organ bundle generated');
      process.exit(1);
    }
    
    console.log(`   Manifest: ${bundle.manifest.name} v${bundle.manifest.version}`);
    console.log(`   Permissions: ${bundle.manifest.permissions?.join(', ') || 'none'}`);
    console.log(`   Ports: ${bundle.manifest.ports?.length || 0}`);
    console.log(`   Slot size: ${bundle.manifest.slotSize}`);
    console.log(`   HTML size: ${bundle.indexHtml.length} bytes\n`);
    
    // Show manifest for debugging
    console.log('📋 Generated Manifest:\n');
    console.log(JSON.stringify(bundle.manifest, null, 2));
    console.log('\n---\n');

    // ============================================================
    // Phase 3: Immune System Validation
    // ============================================================
    console.log('🛡️ Phase 3: Immune system validation...\n');
    
    // Run immune system with the full bundle
    const result = await runImmuneSystem(bundle);
    
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    if (result.passed) {
      console.log('✅ PASSED immune system\n');
    } else {
      console.log('❌ REJECTED by immune system\n');
      console.log(`   Stage: ${result.stage}`);
      console.log(`   Reason: ${result.reason}`);
      
      if (result.sourceLine) {
        console.log(`   Line: ${result.sourceLine}`);
      }
      
      console.log('\n   This organ would need repair and resubmission.');
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log('\n=== Summary ===\n');
    console.log(`Wish: "${WISH}"`);
    console.log(`Spec: ${spec.name}`);
    console.log(`Organ: ${bundle.manifest.name}`);
    console.log(`Immune: ${result.passed ? 'PASSED ✓' : 'REJECTED ✗'}`);
    
    if (result.passed) {
      console.log('\n🎉 This organ is ready for transplant!');
      console.log('   In the full system, it would now await user consent.');
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
