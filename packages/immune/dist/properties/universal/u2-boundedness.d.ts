/**
 * U2: Boundedness
 *
 * Under fuzz, emitted messages stay under rate limit and payload size.
 *
 * Property: Rate(emitted) ≤ RATE_LIMIT ∧ PayloadSize(msg) ≤ MAX_PAYLOAD for all emitted msg
 */
import type { PropertyContext, PropertyTestResult } from './types.js';
/**
 * Test U2: Boundedness - Under fuzz, emitted messages stay under rate limit and payload size.
 */
export declare function testU2Boundedness(context: PropertyContext): PropertyTestResult;
//# sourceMappingURL=u2-boundedness.d.ts.map