/**
 * U1: Totality
 *
 * For any arbitrary host message, the organ never throws unhandled.
 *
 * Property: ∀ msg ∈ Arbitrary. organ.receive(msg) does not throw
 */

import fc from 'fast-check';
import type { PropertyContext, PropertyTestResult } from './types.js';

/**
 * Test U1: Totality - For any arbitrary host message, the organ never throws unhandled.
 */
export function testU1Totality(context: PropertyContext): PropertyTestResult {
  try {
    const result = fc.check(
      fc.property(
        fc.anything(),
        (msg) => {
          try {
            context.sendMessage(msg);
            return true; // If no error, property holds
          } catch (e) {
            // Log the seed on failure
            console.error(`U1 Totality failed with seed, message caused exception:`, msg, e);
            return false; // Unhandled exception
          }
        }
      ),
      { numRuns: 100 }
    );

    if (result.failed) {
      // Log seed for reproducibility
      console.error(`U1 Totality FAILED - Seed: ${result.seed}`);
      console.error(`Counterexample:`, result.counterexample);
      
      return {
        passed: false,
        message: 'Organ threw unhandled exception on arbitrary input',
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
