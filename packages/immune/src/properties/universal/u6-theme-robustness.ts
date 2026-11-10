/**
 * U6: Theme Robustness
 *
 * Light, dark, reduced-motion all render without errors.
 *
 * Property: ∀ theme ∈ {light, dark}, reducedMotion ∈ {true, false}. render(theme, reducedMotion) succeeds
 */

import fc from 'fast-check';
import type { PropertyContext, PropertyTestResult } from './types.js';

type Theme = 'light' | 'dark';

/**
 * Test U6: Theme Robustness - Light, dark, reduced-motion all render without errors.
 */
export function testU6ThemeRobustness(context: PropertyContext): PropertyTestResult {
  try {
    const themes: Theme[] = ['light', 'dark'];
    const reducedMotionOptions = [true, false];

    // Test all combinations
    for (const theme of themes) {
      for (const reducedMotion of reducedMotionOptions) {
        context.reset();
        
        try {
          context.sendMessage({
            type: 'init',
            apiVersion: '1.0.0',
            theme,
            reducedMotion,
            granted: [],
          });

          // Check if DOM is accessible
          const snapshot = context.getDOMSnapshot();
          
          // Snapshot should be a string (even if empty)
          if (typeof snapshot !== 'string') {
            console.error(`U6 Theme Robustness: Invalid snapshot for theme=${theme}, reducedMotion=${reducedMotion}`);
            
            return {
              passed: false,
              message: `Failed to render for theme=${theme}, reducedMotion=${reducedMotion}`,
              seed: 0,
              counterexample: { theme, reducedMotion, snapshot },
            };
          }
        } catch (error) {
          console.error(`U6 Theme Robustness: Error for theme=${theme}, reducedMotion=${reducedMotion}`);
          console.error(error);
          
          return {
            passed: false,
            message: `Error rendering for theme=${theme}, reducedMotion=${reducedMotion}: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
            counterexample: { theme, reducedMotion, error: String(error) },
          };
        }
      }
    }

    // Property-based test with arbitrary theme settings
    const result = fc.check(
      fc.property(
        fc.constantFrom(...themes),
        fc.boolean(),
        (theme, reducedMotion) => {
          context.reset();
          
          try {
            context.sendMessage({
              type: 'init',
              apiVersion: '1.0.0',
              theme,
              reducedMotion,
              granted: [],
            });

            const snapshot = context.getDOMSnapshot();
            return typeof snapshot === 'string';
          } catch (e) {
            return false;
          }
        }
      ),
      { numRuns: 20, seed: 42 }
    );

    if (result.failed) {
      console.error(`U6 Theme Robustness FAILED - Seed: ${result.seed}`);
      console.error(`Counterexample:`, result.counterexample);
      
      return {
        passed: false,
        message: 'Organ failed to render for some theme settings',
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
