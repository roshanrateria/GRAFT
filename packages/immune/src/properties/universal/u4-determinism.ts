/**
 * U4: Determinism
 *
 * Same init + data sequence yields same emitted sequence.
 *
 * Property: ∀ sequence. run(sequence) = run(sequence)
 */

import fc from 'fast-check';
import type { PropertyContext, PropertyTestResult } from './types.js';

/**
 * Test U4: Determinism - Same init + data sequence yields same emitted sequence.
 */
export function testU4Determinism(context: PropertyContext): PropertyTestResult {
  try {
    // First, test with a fixed sequence
    const fixedSeed = 12345;
    
    // Run sequence once
    context.reset();
    context.setNow(fixedSeed);
    context.setRandom(0.5);
    
    const sequence = [
      { type: 'init', apiVersion: '1.0.0', theme: 'dark', reducedMotion: false, granted: [] },
      { type: 'tick', now: 100 },
      { type: 'tick', now: 200 },
      { type: 'data', id: 'test', value: { score: 5 } },
    ];

    for (const msg of sequence) {
      context.sendMessage(msg);
    }
    const firstRun = [...context.getMessages()];

    // Reset and run again with same seed
    context.reset();
    context.setNow(fixedSeed);
    context.setRandom(0.5);
    
    for (const msg of sequence) {
      context.sendMessage(msg);
    }
    const secondRun = [...context.getMessages()];

    // Compare outputs
    if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
      console.error(`U4 Determinism: Outputs differ for same input sequence`);
      console.error(`First run:`, firstRun);
      console.error(`Second run:`, secondRun);
      
      return {
        passed: false,
        message: 'Organ produced different outputs for same input sequence',
        seed: fixedSeed,
        counterexample: { firstRun, secondRun },
      };
    }

    // Property-based test with arbitrary sequences
    const result = fc.check(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.array(
          fc.record({
            type: fc.constant('tick'),
            now: fc.integer({ min: 0, max: 1000000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (seed, ticks) => {
          // First run
          context.reset();
          context.setNow(seed);
          context.setRandom(seed / 1000000);
          
          context.sendMessage({
            type: 'init',
            apiVersion: '1.0.0',
            theme: 'dark',
            reducedMotion: false,
            granted: [],
          });
          
          for (const tick of ticks) {
            context.sendMessage(tick);
          }
          const run1 = [...context.getMessages()];

          // Second run with same inputs
          context.reset();
          context.setNow(seed);
          context.setRandom(seed / 1000000);
          
          context.sendMessage({
            type: 'init',
            apiVersion: '1.0.0',
            theme: 'dark',
            reducedMotion: false,
            granted: [],
          });
          
          for (const tick of ticks) {
            context.sendMessage(tick);
          }
          const run2 = [...context.getMessages()];

          return JSON.stringify(run1) === JSON.stringify(run2);
        }
      ),
      { numRuns: 30, seed: 42 }
    );

    if (result.failed) {
      console.error(`U4 Determinism FAILED - Seed: ${result.seed}`);
      console.error(`Counterexample:`, result.counterexample);
      
      return {
        passed: false,
        message: 'Organ produced non-deterministic outputs',
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
