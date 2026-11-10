/**
 * Property Harness - Combined Module
 */

// Export from new universal directory
export {
  runUniversalProperties,
  createMockPropertyContext,
  testU1Totality,
  testU2Boundedness,
  testU3DeclarationFidelity,
  testU4Determinism,
  testU5IdempotentRender,
  testU6ThemeRobustness,
  testU7NoTrap,
} from './universal/index.js';

export type { PropertyContext, PropertyTestResult, UniversalPropertyResult } from './universal/types.js';

export { runPropertyTests, type PropertyTestResult as RunnerPropertyTestResult } from './runner.js';

// Backwards compatibility - re-export from old universal.ts for any direct imports
export { createPropertyContext } from './universal.js';
