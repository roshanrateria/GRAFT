/**
 * Property Harness - Combined Module
 */
// Export from new universal directory
export { runUniversalProperties, createMockPropertyContext, testU1Totality, testU2Boundedness, testU3DeclarationFidelity, testU4Determinism, testU5IdempotentRender, testU6ThemeRobustness, testU7NoTrap, } from './universal/index.js';
export { runPropertyTests } from './runner.js';
// Backwards compatibility - re-export from old universal.ts for any direct imports
export { createPropertyContext } from './universal.js';
//# sourceMappingURL=index.js.map