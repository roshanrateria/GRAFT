/**
 * Universal Properties (U1-U7)
 *
 * Every organ must pass these properties.
 * Implements IMM-04: Universal Properties.
 *
 * This module re-exports from the new universal/ directory for backwards compatibility.
 */
export { runUniversalProperties, createMockPropertyContext, testU1Totality, testU2Boundedness, testU3DeclarationFidelity, testU4Determinism, testU5IdempotentRender, testU6ThemeRobustness, testU7NoTrap, } from './universal/index.js';
export type { PropertyContext, PropertyTestResult, UniversalPropertyResult } from './universal/types.js';
import type { PropertyContext } from './universal/types.js';
/**
 * Create a mock property context for testing.
 * Backwards-compatible wrapper around createMockPropertyContext.
 */
export declare function createPropertyContext(): PropertyContext;
//# sourceMappingURL=universal.d.ts.map