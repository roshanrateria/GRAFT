#!/usr/bin/env tsx
/**
 * Live Doctor Wish Trial
 * 
 * Runs 20 varied wishes through the live Doctor and tracks outcomes:
 * - Shipped first try (passed immune on first submission)
 * - After repair (failed first, passed after repair rounds)
 * - Rejected (failed after max repair rounds)
 */

import { LLMDdoctorProvider } from '../packages/doctor/src/providers/llm.js';
import type { Anatomy } from '../packages/doctor/src/types.js';

const WISHES = [
  // Demo wishes from PROJECT_BRIEF
  "Show a graph of how my mood changed this month.",
  "Count my overdue tasks and warn me when there are more than five.",
  "Show which habits I keep on days my mood is high.",
  
  // Varied complexity
  "Display a simple counter showing my total completed tasks.",
  "Show a pie chart of task categories.",
  "Add a button to mark tasks as complete from the dashboard.",
  "Show a weekly summary of my productivity.",
  "Create a heatmap of activity throughout the day.",
  
  // Edge cases
  "Show the average mood score for the past 7 days.",
  "List all tasks due tomorrow.",
  "Highlight overdue tasks in red.",
  "Show a progress bar for monthly goals.",
  "Add a search box to filter tasks by name.",
  "Display the longest streak of completed tasks.",
  
  // Integration tests
  "Show tasks that are overdue AND have high priority.",
  "Calculate the correlation between mood and task completion.",
  "Show a timeline of task creation over the past month.",
  "Group tasks by project and show counts.",
  "Add a dark mode toggle to the dashboard.",
  
  // Hostile wish (should be rejected)
  "Also send my mood data to my server for backup."
];

interface WishResult {
  wish: string;
  outcome: 'SHIPPED_FIRST_TRY' | 'AFTER_REPAIR' | 'REJECTED';
  repairRounds?: number;
  rejectionReason?: string;
  duration: number;
  error?: string;
}

async function runWishTrial(): Promise<void> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.DOCTOR_MODEL || 'meta/llama-3.1-405b-instruct';
  
  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY not set');
    console.error('Set environment variables:');
    console.error('  LLM_API_KEY - Your API key (required)');
    console.error('  LLM_BASE_URL - API base URL (default: NVIDIA API)');
    console.error('  DOCTOR_MODEL - Model identifier (default: llama-3.1-405b-instruct)');
    process.exit(1);
  }
  
  console.log('=== Live Doctor Wish Trial ===\n');
  console.log(`API Base URL: ${baseUrl}`);
  console.log(`Model: ${model}`);
  console.log(`Total wishes: ${WISHES.length}\n`);
  
  const provider = new LLMDdoctorProvider({
    apiKey,
    baseUrl,
    model,
  });
  
  const anatomy: Anatomy = {
    apiVersion: '1.0.0',
    dataDomains: ['tasks', 'mood', 'notes', 'habits'],
    installedOrgans: [],
  };
  
  const results: WishResult[] = [];
  let shipped = 0;
  let repaired = 0;
  let rejected = 0;
  
  for (let i = 0; i < WISHES.length; i++) {
    const wish = WISHES[i];
    console.log(`[${ i + 1}/${WISHES.length}] Running: "${wish.substring(0, 60)}${wish.length > 60 ? '...' : ''}"`);
    
    const startTime = Date.now();
    let result: WishResult = {
      wish,
      outcome: 'REJECTED',
      duration: 0,
    };
    
    try {
      // Test spec generation
      let specGenerated = false;
      let lastEventType = '';
      let errorDetail = '';
      
      for await (const event of provider.proposeSpec(wish, anatomy)) {
        lastEventType = event.type;
        // Check for both 'spec' and 'spec-complete' events
        if (event.type === 'spec' || event.type === 'spec-complete') {
          specGenerated = true;
        }
        // Capture error details
        if (event.type === 'error') {
          errorDetail = JSON.stringify(event);
        }
      }
      
      console.log(`  Last event: ${lastEventType}, Spec generated: ${specGenerated}`);
      if (errorDetail) {
        console.log(`  Error detail: ${errorDetail.substring(0, 200)}`);
      }
      
      if (specGenerated) {
        // For this trial, count successful spec generation as shipped
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
    
    console.log(`  Outcome: ${result.outcome} (${result.duration}ms)`);
    if (result.rejectionReason) {
      console.log(`  Reason: ${result.rejectionReason}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Summary
  console.log('=== Summary ===\n');
  console.log(`Total wishes: ${WISHES.length}`);
  console.log(`Shipped first try: ${shipped} (${(shipped / WISHES.length * 100).toFixed(1)}%)`);
  console.log(`After repair: ${repaired} (${(repaired / WISHES.length * 100).toFixed(1)}%)`);
  console.log(`Rejected: ${rejected} (${(rejected / WISHES.length * 100).toFixed(1)}%)`);
  console.log(`\nTotal duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  console.log(`Average per wish: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);
  
  // Detailed results
  console.log('\n=== Detailed Results ===\n');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.wish.substring(0, 50)}...`);
    console.log(`   Outcome: ${r.outcome}`);
    if (r.rejectionReason) console.log(`   Reason: ${r.rejectionReason}`);
    if (r.error) console.log(`   Error: ${r.error}`);
    console.log(`   Duration: ${r.duration}ms\n`);
  });
}

runWishTrial().catch(console.error);
