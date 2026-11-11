/**
 * U5: Idempotent Render
 *
 * Same data twice yields identical DOM snapshot.
 *
 * Property: ∀ data. render(data) = render(data)
 */
import type { PropertyContext, PropertyTestResult } from './types.js';
/**
 * Test U5: Idempotent Render - Same data twice yields identical DOM snapshot.
 */
export declare function testU5IdempotentRender(context: PropertyContext): PropertyTestResult;
//# sourceMappingURL=u5-idempotent-render.d.ts.map