#!/usr/bin/env tsx
/**
 * Test LLM connection with NVIDIA API
 */

import { LLMDdoctorProvider } from '../packages/doctor/src/providers/llm.js';

async function testConnection() {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model = process.env.DOCTOR_MODEL || 'meta/llama-3.1-405b-instruct';
  
  console.log('=== LLM Connection Test ===\n');
  console.log(`API Key: ${apiKey ? 'SET (' + apiKey.substring(0, 10) + '...)' : 'NOT SET'}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${model}\n`);
  
  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY environment variable not set');
    process.exit(1);
  }
  
  const provider = new LLMDdoctorProvider({
    apiKey,
    baseUrl,
    model,
  });
  
  console.log(`Provider configured: ${provider.isConfigured()}`);
  console.log(`Provider name: ${provider.name}\n`);
  
  console.log('Testing spec generation...\n');
  
  try {
    const events: any[] = [];
    const anatomy = {
      apiVersion: '1.0.0',
      dataDomains: ['tasks', 'mood'],
      installedOrgans: [],
    };
    
    for await (const event of provider.proposeSpec('Show a simple counter', anatomy)) {
      events.push(event);
      console.log(`Event: ${event.type}`);
      if (event.type === 'spec') {
        console.log(`  Name: ${event.data.name}`);
        console.log(`  Requirements: ${event.data.requirements.substring(0, 100)}...`);
      }
    }
    
    console.log(`\nTotal events: ${events.length}`);
    const lastEvent = events[events.length - 1];
    console.log(`Last event type: ${lastEvent.type}`);
    
    if (lastEvent.type === 'spec') {
      console.log('\n✅ SUCCESS: LLM connection working');
    } else if (lastEvent.type === 'error') {
      console.log(`\n❌ ERROR: ${lastEvent.data.code} - ${lastEvent.data.message}`);
    }
  } catch (error: any) {
    console.error('\n❌ EXCEPTION:', error.message);
    console.error(error.stack);
  }
}

testConnection().catch(console.error);
