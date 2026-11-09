/**
 * Recursively sort object keys in alphabetical order.
 * Returns a new object with sorted keys.
 */
export declare function sortedKeys<T>(obj: T): T;
/**
 * Canonical JSON stringify with sorted keys and no whitespace.
 * Produces deterministic output suitable for hashing.
 */
export declare function canonicalStringify(obj: unknown): string;
//# sourceMappingURL=canonical-json.d.ts.map