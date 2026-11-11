/**
 * U1: Totality
 *
 * For any arbitrary host message, the organ never throws unhandled.
 *
 * Property: ∀ msg ∈ Arbitrary. organ.receive(msg) does not throw
 */
import type { PropertyContext, PropertyTestResult } from './types.js';
/**
 * Test U1: Totality - For any arbitrary host message, the organ never throws unhandled.
 */
export declare function testU1Totality(context: PropertyContext): PropertyTestResult;
//# sourceMappingURL=u1-totality.d.ts.map