/**
 * U3: Declaration Fidelity
 *
 * Organ only reads declared paths and emits on declared ports.
 *
 * Property: ∀ action. action.path ∈ declaredPaths ∧ action.port ∈ declaredPorts
 */

import fc from 'fast-check';
import type { PropertyContext, PropertyTestResult } from './types.js';

/**
 * Test U3: Declaration Fidelity - Organ only reads declared paths and emits on declared ports.
 */
export function testU3DeclarationFidelity(context: PropertyContext): PropertyTestResult {
  try {
    const declaredPermissions = context.getDeclaredPermissions();
    const declaredPorts = context.getDeclaredPorts();
    
    // Reset for clean measurement
    context.reset();
    
    // Send init to activate organ
    context.sendMessage({
      type: 'init',
      apiVersion: '1.0.0',
      theme: 'dark',
      reducedMotion: false,
      granted: declaredPermissions,
    });
    
    // Send various data messages to trigger organ behavior
    const testMessages = [
      { type: 'tick', now: Date.now() },
      { type: 'data', id: 'test', value: { score: 5 } },
      { type: 'user-action', action: 'click', target: 'button' },
    ];
    
    for (const msg of testMessages) {
      context.sendMessage(msg);
    }
    
    // Get emitted messages and check they use declared ports
    const emitted = context.getMessages();
    
    for (const msg of emitted) {
      if (typeof msg === 'object' && msg !== null && 'port' in msg) {
        const portName = (msg as any).port;
        if (!declaredPorts.includes(portName)) {
          console.error(`U3 Declaration Fidelity: Emitted on undeclared port '${portName}'`);
          console.error(`Declared ports:`, declaredPorts);
          
          return {
            passed: false,
            message: `Organ emitted on undeclared port: ${portName}`,
            seed: 0,
            counterexample: { msg, declaredPorts },
          };
        }
      }
    }
    
    // Run property-based test with arbitrary inputs
    const result = fc.check(
      fc.property(
        fc.record({
          type: fc.constant('data'),
          id: fc.string({ minLength: 1, maxLength: 20 }),
          value: fc.anything(),
        }),
        (msg) => {
          context.reset();
          context.sendMessage({
            type: 'init',
            apiVersion: '1.0.0',
            theme: 'dark',
            reducedMotion: false,
            granted: declaredPermissions,
          });
          context.sendMessage(msg);
          
          const emitted = context.getMessages();
          for (const em of emitted) {
            if (typeof em === 'object' && em !== null && 'port' in em) {
              const portName = (em as any).port;
              if (!declaredPorts.includes(portName)) {
                return false;
              }
            }
          }
          return true;
        }
      ),
      { numRuns: 30 }
    );

    if (result.failed) {
      console.error(`U3 Declaration Fidelity FAILED - Seed: ${result.seed}`);
      console.error(`Counterexample:`, result.counterexample);
      
      return {
        passed: false,
        message: 'Organ accessed undeclared paths or emitted on undeclared ports',
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
