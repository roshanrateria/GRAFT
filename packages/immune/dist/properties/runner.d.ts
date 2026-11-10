/**
 * Property Test Runner
 *
 * Executes fast-check property tests with seed logging.
 */
import fc from 'fast-check';
import type { PropertyResult } from '../types.js';
export interface PropertyTestResult {
    passed: boolean;
    message?: string;
    seed: number;
    counterexample?: unknown;
    stack?: string;
}
/**
 * Run a single property test with fast-check.
 */
export declare function runPropertyTest(property: fc.IProperty<unknown>, options?: fc.Parameters<unknown>): PropertyTestResult;
/**
 * Run multiple property tests and aggregate results.
 */
export declare function runPropertyTests(tests: Array<{
    id: string;
    property: fc.IProperty<unknown>;
}>, options?: fc.Parameters<unknown>): PropertyResult;
/**
 * Create a property test from a predicate function.
 */
export declare function createProperty(predicate: (...args: unknown[]) => boolean | void, arbitraries: fc.Arbitrary<unknown>[]): fc.IProperty<unknown>;
//# sourceMappingURL=runner.d.ts.map