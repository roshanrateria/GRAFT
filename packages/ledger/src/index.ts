// Types
export { EventType, type Entry, GENESIS_PREV_HASH } from './types.js';

// Canonical JSON utilities
export { sortedKeys, canonicalStringify } from './canonical-json.js';

// Verification
export { computeHash, verifyChain } from './verify.js';

// Service interface
export { type LedgerService } from './service.js';
