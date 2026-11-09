/**
 * Recursively sort object keys in alphabetical order.
 * Returns a new object with sorted keys.
 */
export function sortedKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sortedKeys(item));
    }
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = sortedKeys(obj[key]);
    }
    return sorted;
}
/**
 * Canonical JSON stringify with sorted keys and no whitespace.
 * Produces deterministic output suitable for hashing.
 */
export function canonicalStringify(obj) {
    return JSON.stringify(sortedKeys(obj));
}
//# sourceMappingURL=canonical-json.js.map