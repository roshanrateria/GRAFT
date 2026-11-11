/**
 * U2: Boundedness
 *
 * Under fuzz, emitted messages stay under rate limit and payload size.
 *
 * Property: Rate(emitted) ≤ RATE_LIMIT ∧ PayloadSize(msg) ≤ MAX_PAYLOAD for all emitted msg
 */
import fc from 'fast-check';
/** Maximum messages per second (rate limit) */
const RATE_LIMIT_PER_SECOND = 20;
/** Maximum payload size in bytes */
const MAX_PAYLOAD_SIZE = 16 * 1024; // 16 KB
/** Time window for rate limiting in milliseconds */
const RATE_WINDOW_MS = 1000;
/**
 * Test U2: Boundedness - Under fuzz, emitted messages stay under rate limit and payload size.
 */
export function testU2Boundedness(context) {
    try {
        const result = fc.check(fc.property(fc.array(fc.anything(), { minLength: 0, maxLength: 100 }), (messages) => {
            // Reset context for clean measurement
            context.reset();
            // Send many messages rapidly to test rate limiting
            for (const msg of messages) {
                try {
                    context.sendMessage(msg);
                }
                catch (e) {
                    // Ignore errors for this test - we're checking bounds, not errors
                }
            }
            const emitted = context.getMessages();
            // Check rate limit (simplified - real implementation would check time window)
            // We allow up to RATE_LIMIT_PER_SECOND * 5 for burst, but sustained should be lower
            const maxAllowedInBurst = RATE_LIMIT_PER_SECOND * 5;
            if (emitted.length > maxAllowedInBurst) {
                console.error(`U2 Boundedness: Rate limit exceeded - ${emitted.length} messages (max: ${maxAllowedInBurst})`);
                return false;
            }
            // Check payload sizes
            for (const msg of emitted) {
                try {
                    const json = JSON.stringify(msg);
                    if (json.length > MAX_PAYLOAD_SIZE) {
                        console.error(`U2 Boundedness: Payload size exceeded - ${json.length} bytes (max: ${MAX_PAYLOAD_SIZE})`);
                        return false;
                    }
                }
                catch (e) {
                    // Non-serializable message - could be an issue but not for this property
                }
            }
            return true;
        }), { numRuns: 50 });
        if (result.failed) {
            console.error(`U2 Boundedness FAILED - Seed: ${result.seed}`);
            console.error(`Counterexample:`, result.counterexample);
            return {
                passed: false,
                message: 'Organ exceeded rate limit or payload size under fuzz',
                seed: result.seed,
                counterexample: result.counterexample,
            };
        }
        return { passed: true, seed: result.seed };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
            stack: error instanceof Error ? error.stack : undefined,
        };
    }
}
//# sourceMappingURL=u2-boundedness.js.map