/**
 * Demo: LLM Doctor Provider
 *
 * Demonstrates the LLM adapter working with wish #1 (task-counter).
 * Run with: pnpm exec tsx scripts/demo-llm-doctor.ts
 *
 * Requirements:
 * - Set LLM_API_KEY environment variable
 * - Optionally set LLM_BASE_URL (defaults to OpenAI)
 * - Optionally set DOCTOR_MODEL (defaults to gpt-4o)
 */

import { createLLMProvider, LLMDdoctorProvider } from '../packages/doctor/dist/index.js';
import type { Anatomy } from '../packages/doctor/dist/index.js';

async function main() {
  console.log('=== LLM Doctor Provider Demo ===\n');

  const provider = createLLMProvider() as LLMDdoctorProvider;

  // Check configuration
  if (!provider.isConfigured()) {
    console.error('ERROR: LLM_API_KEY is not set.');
    console.error('\nTo use the LLM adapter, set the following environment variables:');
    console.error('  LLM_API_KEY     - Your LLM API key (required)');
    console.error('  LLM_BASE_URL    - LLM API base URL (default: OpenAI)');
    console.error('  DOCTOR_MODEL    - Model identifier (default: gpt-4o)');
    console.error('\nExample:');
    console.error('  export LLM_API_KEY=sk-...');
    console.error('  npx tsx scripts/demo-llm-doctor.ts');
    process.exit(1);
  }

  console.log(`Provider: ${provider.name}`);
  console.log(`Configured: Yes\n`);

  const anatomy: Anatomy = {
    apiVersion: '1.0.0',
    dataDomains: ['tasks', 'mood', 'notes'],
    installedOrgans: [],
  };

  // Wish #1 from fixtures/replays/task-counter.json
  const wish = 'Count my overdue tasks and warn me when there are more than five';

  console.log(`Processing wish: "${wish}"\n`);
  console.log('---\n');

  try {
    // Phase 1: Propose spec
    console.log('Phase 1: Proposing spec...\n');
    for await (const event of provider.proposeSpec(wish, anatomy)) {
      logEvent(event);
    }

    // Note: In a real flow, we'd parse the spec from the events
    // and then call build(), but for demo purposes, we'll stop here
    // to save API calls

  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log('\n=== Demo Complete ===');
}

function logEvent(event: any) {
  const timestamp = new Date(event.timestamp).toISOString();
  let message = `[${timestamp}] ${event.type}`;

  if (event.data) {
    if (event.data.message) {
      message += `: ${event.data.message}`;
    } else if (event.data.section && event.data.content) {
      message += `: ${event.data.section}`;
      console.log(message);
      console.log(event.data.content.substring(0, 200) + '...');
      return;
    } else if (event.data.spec) {
      message += `: ${event.data.spec.name}`;
    } else if (event.data.code) {
      message += `: [${event.data.code}] ${event.data.message}`;
    }
  }

  console.log(message);
}

main().catch(console.error);
