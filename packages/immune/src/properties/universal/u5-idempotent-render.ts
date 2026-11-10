/**
 * U5: Idempotent Render
 *
 * Same data twice yields identical DOM snapshot.
 *
 * Property: ∀ data. render(data) = render(data)
 */

import fc from 'fast-check';
import type { PropertyContext, PropertyTestResult } from './types.js';

/**
 * Test U5: Idempotent Render - Same data twice yields identical DOM snapshot.
 */
export function testU5IdempotentRender(context: PropertyContext): PropertyTestResult {
  try {
    // Test with fixed data first
    const fixedData = { type: 'data', id: 'test', value: { score: 5 } };

    // Send data once
    context.reset();
    context.sendMessage({
      type: 'init',
      apiVersion: '1.0.0',
      theme: 'dark',
      reducedMotion: false,
      granted: [],
    });
    context.sendMessage(fixedData);
    const snapshot1 = context.getDOMSnapshot();

    // Send same data again
    context.sendMessage(fixedData);
    const snapshot2 = context.getDOMSnapshot();

    if (snapshot1 !== snapshot2) {
      console.error(`U5 Idempotent Render: DOM snapshots differ for same data`);
      console.error(`Snapshot 1:`, snapshot1);
      console.error(`Snapshot 2:`, snapshot2);
      
      return {
        passed: false,
        message: 'Same data applied twice produced different DOM',
        seed: 0,
        counterexample: { snapshot1, snapshot2 },
      };
    }

    // Property-based test with arbitrary data
    const result = fc.check(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.anything(),
        }),
        (dataPayload) => {
          context.reset();
          
          context.sendMessage({
            type: 'init',
            apiVersion: '1.0.0',
            theme: 'dark',
            reducedMotion: false,
            granted: [],
          });
          
          const data = { type: 'data', ...dataPayload };
          
          // First render
          context.sendMessage(data);
          const snap1 = context.getDOMSnapshot();

          // Second render with same data
          context.sendMessage(data);
          const snap2 = context.getDOMSnapshot();

          return snap1 === snap2;
        }
      ),
      { numRuns: 30, seed: 42 }
    );

    if (result.failed) {
      console.error(`U5 Idempotent Render FAILED - Seed: ${result.seed}`);
      console.error(`Counterexample:`, result.counterexample);
      
      return {
        passed: false,
        message: 'Same data applied twice produced different DOM',
        seed: result.seed,
        counterexample: result.counterexample,
      };
    }

    return { passed: true, seed: result.seed };
  } catch (error) {
    return {
      passed: false,
      message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
      seed: 0,
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
}
