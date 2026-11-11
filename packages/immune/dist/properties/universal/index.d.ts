/**
 * Universal Properties Index
 *
 * Exports all U1-U7 property tests and utilities.
 */
export type { PropertyContext, PropertyTestResult, UniversalPropertyResult } from './types.js';
export { testU1Totality } from './u1-totality.js';
export { testU2Boundedness } from './u2-boundedness.js';
export { testU3DeclarationFidelity } from './u3-declaration-fidelity.js';
export { testU4Determinism } from './u4-determinism.js';
export { testU5IdempotentRender } from './u5-idempotent-render.js';
export { testU6ThemeRobustness } from './u6-theme-robustness.js';
export { testU7NoTrap } from './u7-no-trap.js';
import type { PropertyFailure } from '../../types.js';
import type { PropertyContext } from './types.js';
/**
 * Run all universal properties (U1-U7) against an organ.
 */
export declare function runUniversalProperties(context: PropertyContext): {
    passed: boolean;
    failures: PropertyFailure[];
};
/**
 * Create a mock property context for testing.
 */
export declare function createMockPropertyContext(options?: {
    permissions?: string[];
    ports?: string[];
    interactive?: boolean;
}): PropertyContext;
//# sourceMappingURL=index.d.ts.map