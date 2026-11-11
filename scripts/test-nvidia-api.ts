#!/usr/bin/env tsx
/**
 * Test NVIDIA API with their exact pattern
 */

// Node 22+ has built-in fetch

async function testNvidiaAPI() {
  const apiKey = process.env.LLM_API_KEY;
  const invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  
  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY not set');
    process.exit(1);
  }
  
  console.log('=== NVIDIA API Test ===\n');
  console.log(`API Key: ${apiKey.substring(0, 15)}...`);
  console.log(`Invoke URL: ${invokeUrl}\n`);
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'text/event-stream',
    'Content-Type': 'application/json',
  };
  
  const payload = {
    model: 'nvidia/nemotron-3.5-bolt-e4b',
    messages: [
      {
        role: 'user',
        content: 'Which number is larger, 9.11 or 9.8?'
      }
    ],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 1024,
    seed: 42,
    stream: true,
    parallel_tool_calls: true,
    chat_template_kwargs: {
      enable_thinking: true
    }
  };
  
  console.log('Sending request...\n');
  
  try {
    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      return;
    }
    
    if (!response.body) {
      console.error('No response body');
      return;
    }
    
    console.log('Streaming response:\n');
    
    // Handle SSE stream
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data === '[DONE]') {
          console.log('\n✅ Stream complete');
          break;
        }
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].delta) {
            process.stdout.write(json.choices[0].delta.content || '');
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    console.log('\n\n✅ SUCCESS: NVIDIA API working');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testNvidiaAPI().catch(console.error);
