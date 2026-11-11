/**
 * U3: Declaration Fidelity
 *
 * Organ only reads declared paths and emits on declared ports.
 *
 * Property: ∀ action. action.path ∈ declaredPaths ∧ action.port ∈ declaredPorts
 */
import type { PropertyContext, PropertyTestResult } from './types.js';
/**
 * Test U3: Declaration Fidelity - Organ only reads declared paths and emits on declared ports.
 */
export declare function testU3DeclarationFidelity(context: PropertyContext): PropertyTestResult;
//# sourceMappingURL=u3-declaration-fidelity.d.ts.map