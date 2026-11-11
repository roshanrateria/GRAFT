/**
 * Universal Properties (U1-U7)
 *
 * Every organ must pass these properties.
 * Implements IMM-04: Universal Properties.
 *
 * This module re-exports from the new universal/ directory for backwards compatibility.
 */
// Re-export everything from the new modular structure
export { runUniversalProperties, createMockPropertyContext, testU1Totality, testU2Boundedness, testU3DeclarationFidelity, testU4Determinism, testU5IdempotentRender, testU6ThemeRobustness, testU7NoTrap, } from './universal/index.js';
import { createMockPropertyContext } from './universal/index.js';
/**
 * Create a mock property context for testing.
 * Backwards-compatible wrapper around createMockPropertyContext.
 */
export function createPropertyContext() {
    return createMockPropertyContext();
}
//# sourceMappingURL=universal.js.map