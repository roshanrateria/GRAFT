#!/usr/bin/env tsx
/**
 * Wish Trial Script (Replay Mode)
 * 
 * Runs wish trials using replay fixtures for deterministic demonstration.
 * This shows what a successful wish trial would look like with real Doctor output.
 */

import { ReplayDoctorProvider } from '../packages/doctor/src/providers/replay.js';
import type { Anatomy, DoctorEvent } from '../packages/doctor/src/types.js';
import * as fs from 'fs';
import * as path from 'path';

const REPLAY_DIR = 'fixtures/replays';

interface WishResult {
  wish: string;
  outcome: 'SHIPPED_FIRST_TRY' | 'AFTER_REPAIR' | 'REJECTED';
  duration: number;
  error?: string;
}

async function runWishTrialReplay(): Promise<void> {
  console.log('=== Wish Trial (Replay Mode) ===\n');
  console.log('Using recorded Doctor outputs from fixtures/replays/\n');
  
  // Load all replay fixtures
  const replayFiles = fs.readdirSync(REPLAY_DIR).filter(f => f.endsWith('.json'));
  
  if (replayFiles.length === 0) {
    console.error('No replay fixtures found');
    process.exit(1);
  }
  
  console.log(`Found ${replayFiles.length} replay fixtures:\n`);
  
  const anatomy: Anatomy = {
    apiVersion: '1.0.0',
    dataDomains: ['tasks', 'mood', 'notes', 'habits'],
    installedOrgans: [],
  };
  
  const results: WishResult[] = [];
  let shipped = 0;
  let repaired = 0;
  let rejected = 0;
  
  for (const file of replayFiles) {
    const fixturePath = path.join(REPLAY_DIR, file);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    console.log(`[${results.length + 1}/${replayFiles.length}] Running: "${fixture.wish}"`);
    
    const provider = new ReplayDoctorProvider({
      fixture,
      eventDelayMs: 0,
      labelReplay: true,
    });
    
    const startTime = Date.now();
    let result: WishResult = {
      wish: fixture.wish,
      outcome: 'REJECTED',
      duration: 0,
    };
    
    try {
      // Track event types
      let hasSpec = false;
      let hasBuild = false;
      let passedImmune = false;
      let lastEventType = '';
      
      for await (const event of provider.proposeSpec(fixture.wish, anatomy) as AsyncIterable<DoctorEvent>) {
        lastEventType = event.type;
        
        if (event.type === 'spec' || event.type === 'spec-complete') {
          hasSpec = true;
        }
        
        if (event.type === 'build-complete') {
          hasBuild = true;
        }
        
        if (event.type === 'immune-pass') {
          passedImmune = true;
        }
      }
      
      console.log(`  Events: spec=${hasSpec}, build=${hasBuild}, immune=${passedImmune}`);
      
      if (passedImmune && fixture.passed) {
        result.outcome = 'SHIPPED_FIRST_TRY';
        shipped++;
      } else {
        result.outcome = 'REJECTED';
        rejected++;
      }
    } catch (error: any) {
      result.error = error.message;
      result.outcome = 'REJECTED';
      rejected++;
    }
    
    result.duration = Date.now() - startTime;
    results.push(result);
    
    console.log(`  Outcome: ${result.outcome} (${result.duration}ms)\n`);
  }
  
  // Summary
  console.log('=== Summary ===\n');
  console.log(`Total wishes: ${replayFiles.length}`);
  console.log(`Shipped first try: ${shipped} (${(shipped / replayFiles.length * 100).toFixed(1)}%)`);
  console.log(`After repair: ${repaired} (${(repaired / replayFiles.length * 100).toFixed(1)}%)`);
  console.log(`Rejected: ${rejected} (${(rejected / replayFiles.length * 100).toFixed(1)}%)`);
  console.log(`\nTotal duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  console.log(`Average per wish: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);
  
  // Detailed results
  console.log('\n=== Detailed Results ===\n');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.wish}`);
    console.log(`   Outcome: ${r.outcome}`);
    if (r.error) console.log(`   Error: ${r.error}`);
    console.log(`   Duration: ${r.duration}ms\n`);
  });
  
  console.log('---');
  console.log('Note: This used replay fixtures, not live Doctor output.');
  console.log('For live trials, set LLM_API_KEY and run run-live-wishes.ts');
}

runWishTrialReplay().catch(console.error);
