/**
 * Nerve API Protocol Constants
 *
 * Centralized constants for the Nerve API protocol.
 * These values define the contract between organs and the Creature.
 *
 * @see docs/NERVE_API.md
 */

// ============================================================================
// API Version
// ============================================================================

/** Current Nerve API version (semver) */
export const NERVE_API_VERSION = '1.0.0' as const;

// ============================================================================
// Message Types
// ============================================================================

/** Host-to-organ message type literals */
export const HOST_TO_ORGAN_MESSAGE_TYPES = {
  init: 'init',
  data: 'data',
  in: 'in',
  tick: 'tick',
} as const;

/** Organ-to-host message type literals */
export const ORGAN_TO_HOST_MESSAGE_TYPES = {
  hello: 'hello',
  read: 'read',
  emit: 'emit',
  resize: 'resize',
} as const;

/** All message type literals */
export const MESSAGE_TYPES = {
  ...HOST_TO_ORGAN_MESSAGE_TYPES,
  ...ORGAN_TO_HOST_MESSAGE_TYPES,
} as const;

/** Type for host-to-organ message type strings */
export type HostToOrganMessageType = typeof HOST_TO_ORGAN_MESSAGE_TYPES[keyof typeof HOST_TO_ORGAN_MESSAGE_TYPES];

/** Type for organ-to-host message type strings */
export type OrganToHostMessageType = typeof ORGAN_TO_HOST_MESSAGE_TYPES[keyof typeof ORGAN_TO_HOST_MESSAGE_TYPES];

/** Type for all message type strings */
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// ============================================================================
// Rate Limiting
// ============================================================================

/** Maximum messages per second per organ before quarantine */
export const RATE_LIMIT_PER_SECOND = 20;

/** Time window for rate limiting in milliseconds */
export const RATE_LIMIT_WINDOW_MS = 1000;

// ============================================================================
// Payload Constraints
// ============================================================================

/** Maximum payload size in bytes (16 KB) */
export const MAX_PAYLOAD_BYTES = 16 * 1024;

/** Maximum payload size in KB (for display/logging) */
export const MAX_PAYLOAD_KB = 16;

// ============================================================================
// Data Domain Paths
// ============================================================================

/** Valid data domain paths that organs can request */
export const DATA_DOMAIN_PATHS = {
  moodEntries: 'mood.entries',
  tasksItems: 'tasks.items',
  habitsCheckins: 'habits.checkins',
  calendarEvents: 'calendar.events',
} as const;

/** Type for data domain path strings */
export type DataDomainPath = typeof DATA_DOMAIN_PATHS[keyof typeof DATA_DOMAIN_PATHS];

/** Array of all valid data domain paths */
export const VALID_DATA_DOMAINS: readonly string[] = Object.values(DATA_DOMAIN_PATHS);

// ============================================================================
// Permission Prefixes
// ============================================================================

/** Permission action prefixes for manifest declarations */
export const PERMISSION_PREFIXES = {
  read: 'read:',
  emit: 'emit:',
  subscribe: 'subscribe:',
} as const;

/** Type for permission prefix strings */
export type PermissionPrefix = typeof PERMISSION_PREFIXES[keyof typeof PERMISSION_PREFIXES];

/** Array of all valid permission prefixes */
export const VALID_PERMISSION_PREFIXES: readonly string[] = Object.values(PERMISSION_PREFIXES);

// ============================================================================
// Content Security Policy
// ============================================================================

/**
 * CSP directive template for organ sandbox.
 * Prevents external network requests, scripts, and most XSS vectors.
 */
export const CSP_DIRECTIVES = {
  defaultSrc: "'none'",
  scriptSrc: "'unsafe-inline'",
  styleSrc: "'unsafe-inline'",
  imgSrc: 'data:',
} as const;

/**
 * Full CSP header value for organ iframes.
 * Used in the sandbox host to isolate organ code.
 */
export const CSP_HEADER_TEMPLATE = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;`;

/**
 * CSP meta tag HTML for embedding in organ documents.
 */
export const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="${CSP_HEADER_TEMPLATE}">`;

// ============================================================================
// Sandbox Permissions
// ============================================================================

/**
 * Sandbox attribute value for organ iframes.
 * - allow-scripts: Required for organ JavaScript execution
 * - No allow-same-origin: Prevents origin-based attacks
 * - No allow-forms: Not needed for organs
 * - No allow-top-navigation: Security risk
 */
export const SANDBOX_ATTRIBUTE = 'allow-scripts';

// ============================================================================
// Time Constants
// ============================================================================

/** Interval for tick messages in milliseconds (100ms = 10 ticks/sec) */
export const TICK_INTERVAL_MS = 100;

/** Ticks per second */
export const TICKS_PER_SECOND = 10;

/** Quarantine timeout in milliseconds (organ hidden within 1 second of violation) */
export const QUARANTINE_TIMEOUT_MS = 1000;

/** Handshake timeout in milliseconds (organ must respond to init within 5 seconds) */
export const HANDSHAKE_TIMEOUT_MS = 5000;

/** Checkup interval for re-verification in milliseconds (default: 24 hours) */
export const CHECKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Organ States
// ============================================================================

/** Possible states of an organ */
export const ORGAN_STATES = {
  loading: 'loading',
  handshake: 'handshake',
  active: 'active',
  quarantined: 'quarantined',
  decayed: 'decayed',
} as const;

/** Type for organ state strings */
export type OrganState = typeof ORGAN_STATES[keyof typeof ORGAN_STATES];

// ============================================================================
// Error Codes
// ============================================================================

/** Error codes for Nerve API failures */
export const NERVE_ERROR_CODES = {
  /** Version mismatch between organ and host */
  VERSION_MISMATCH: 'NRV_VERSION_MISMATCH',
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'NRV_RATE_LIMIT_EXCEEDED',
  /** Payload too large */
  PAYLOAD_TOO_LARGE: 'NRV_PAYLOAD_TOO_LARGE',
  /** Permission denied */
  PERMISSION_DENIED: 'NRV_PERMISSION_DENIED',
  /** Invalid message format */
  INVALID_MESSAGE: 'NRV_INVALID_MESSAGE',
  /** Handshake timeout */
  HANDSHAKE_TIMEOUT: 'NRV_HANDSHAKE_TIMEOUT',
  /** Organ quarantined */
  ORGAN_QUARANTINED: 'NRV_ORGAN_QUARANTINED',
} as const;

/** Type for Nerve error code strings */
export type NerveErrorCode = typeof NERVE_ERROR_CODES[keyof typeof NERVE_ERROR_CODES];

// ============================================================================
// Protocol Versioning
// ============================================================================

/**
 * Check if an API version is compatible with the current version.
 * Uses semver major version matching.
 */
export function isVersionCompatible(version: string): boolean {
  const currentMajor = NERVE_API_VERSION.split('.')[0];
  const providedMajor = version.split('.')[0];
  return currentMajor === providedMajor;
}

/**
 * Parse a semver version string into components.
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return null;
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}
