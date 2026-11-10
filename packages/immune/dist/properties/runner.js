/**
 * Property Test Runner
 *
 * Executes fast-check property tests with seed logging.
 */
import fc from 'fast-check';
/**
 * Run a single property test with fast-check.
 */
export function runPropertyTest(property, options) {
    try {
        const result = fc.check(property, options);
        if (result.failed) {
            return {
                passed: false,
                message: `Property test failed`,
                seed: result.seed,
                counterexample: result.counterexample,
                stack: typeof result.error === 'string' ? undefined : result.error?.stack,
            };
        }
        return {
            passed: true,
            seed: result.seed,
        };
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
/**
 * Run multiple property tests and aggregate results.
 */
export function runPropertyTests(tests, options) {
    const failures = [];
    for (const { id, property } of tests) {
        const result = runPropertyTest(property, options);
        if (!result.passed) {
            failures.push({
                propertyId: id,
                message: result.message || 'Property test failed',
                seed: result.seed,
                counterexample: result.counterexample,
                stack: result.stack,
            });
        }
    }
    return {
        passed: failures.length === 0,
        failures,
    };
}
/**
 * Create a property test from a predicate function.
 */
export function createProperty(predicate, arbitraries) {
    return fc.property(...arbitraries, (...args) => {
        try {
            const result = predicate(...args);
            return result === undefined || result === true;
        }
        catch (error) {
            return false;
        }
    });
}
//# sourceMappingURL=runner.js.map