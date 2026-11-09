/**
 * Recursively sort object keys in alphabetical order.
 * Returns a new object with sorted keys.
 */
export function sortedKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortedKeys(item)) as T;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sorted[key] = sortedKeys((obj as Record<string, unknown>)[key]);
  }

  return sorted as T;
}

/**
 * Canonical JSON stringify with sorted keys and no whitespace.
 * Produces deterministic output suitable for hashing.
 */
export function canonicalStringify(obj: unknown): string {
  return JSON.stringify(sortedKeys(obj));
}
