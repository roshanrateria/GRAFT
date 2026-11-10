/**
 * Nerve API Protocol Constants
 *
 * Centralized constants for the Nerve API protocol.
 * These values define the contract between organs and the Creature.
 *
 * @see docs/NERVE_API.md
 */
/** Current Nerve API version (semver) */
export declare const NERVE_API_VERSION: "1.0.0";
/** Host-to-organ message type literals */
export declare const HOST_TO_ORGAN_MESSAGE_TYPES: {
    readonly init: "init";
    readonly data: "data";
    readonly in: "in";
    readonly tick: "tick";
};
/** Organ-to-host message type literals */
export declare const ORGAN_TO_HOST_MESSAGE_TYPES: {
    readonly hello: "hello";
    readonly read: "read";
    readonly emit: "emit";
    readonly resize: "resize";
};
/** All message type literals */
export declare const MESSAGE_TYPES: {
    readonly hello: "hello";
    readonly read: "read";
    readonly emit: "emit";
    readonly resize: "resize";
    readonly init: "init";
    readonly data: "data";
    readonly in: "in";
    readonly tick: "tick";
};
/** Type for host-to-organ message type strings */
export type HostToOrganMessageType = typeof HOST_TO_ORGAN_MESSAGE_TYPES[keyof typeof HOST_TO_ORGAN_MESSAGE_TYPES];
/** Type for organ-to-host message type strings */
export type OrganToHostMessageType = typeof ORGAN_TO_HOST_MESSAGE_TYPES[keyof typeof ORGAN_TO_HOST_MESSAGE_TYPES];
/** Type for all message type strings */
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
/** Maximum messages per second per organ before quarantine */
export declare const RATE_LIMIT_PER_SECOND = 20;
/** Time window for rate limiting in milliseconds */
export declare const RATE_LIMIT_WINDOW_MS = 1000;
/** Maximum payload size in bytes (16 KB) */
export declare const MAX_PAYLOAD_BYTES: number;
/** Maximum payload size in KB (for display/logging) */
export declare const MAX_PAYLOAD_KB = 16;
/** Valid data domain paths that organs can request */
export declare const DATA_DOMAIN_PATHS: {
    readonly moodEntries: "mood.entries";
    readonly tasksItems: "tasks.items";
    readonly habitsCheckins: "habits.checkins";
    readonly calendarEvents: "calendar.events";
};
/** Type for data domain path strings */
export type DataDomainPath = typeof DATA_DOMAIN_PATHS[keyof typeof DATA_DOMAIN_PATHS];
/** Array of all valid data domain paths */
export declare const VALID_DATA_DOMAINS: readonly string[];
/** Permission action prefixes for manifest declarations */
export declare const PERMISSION_PREFIXES: {
    readonly read: "read:";
    readonly emit: "emit:";
    readonly subscribe: "subscribe:";
};
/** Type for permission prefix strings */
export type PermissionPrefix = typeof PERMISSION_PREFIXES[keyof typeof PERMISSION_PREFIXES];
/** Array of all valid permission prefixes */
export declare const VALID_PERMISSION_PREFIXES: readonly string[];
/**
 * CSP directive template for organ sandbox.
 * Prevents external network requests, scripts, and most XSS vectors.
 */
export declare const CSP_DIRECTIVES: {
    readonly defaultSrc: "'none'";
    readonly scriptSrc: "'unsafe-inline'";
    readonly styleSrc: "'unsafe-inline'";
    readonly imgSrc: "data:";
};
/**
 * Full CSP header value for organ iframes.
 * Used in the sandbox host to isolate organ code.
 */
export declare const CSP_HEADER_TEMPLATE = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;";
/**
 * CSP meta tag HTML for embedding in organ documents.
 */
export declare const CSP_META_TAG = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;\">";
/**
 * Sandbox attribute value for organ iframes.
 * - allow-scripts: Required for organ JavaScript execution
 * - No allow-same-origin: Prevents origin-based attacks
 * - No allow-forms: Not needed for organs
 * - No allow-top-navigation: Security risk
 */
export declare const SANDBOX_ATTRIBUTE = "allow-scripts";
/** Interval for tick messages in milliseconds (100ms = 10 ticks/sec) */
export declare const TICK_INTERVAL_MS = 100;
/** Ticks per second */
export declare const TICKS_PER_SECOND = 10;
/** Quarantine timeout in milliseconds (organ hidden within 1 second of violation) */
export declare const QUARANTINE_TIMEOUT_MS = 1000;
/** Handshake timeout in milliseconds (organ must respond to init within 5 seconds) */
export declare const HANDSHAKE_TIMEOUT_MS = 5000;
/** Checkup interval for re-verification in milliseconds (default: 24 hours) */
export declare const CHECKUP_INTERVAL_MS: number;
/** Possible states of an organ */
export declare const ORGAN_STATES: {
    readonly loading: "loading";
    readonly handshake: "handshake";
    readonly active: "active";
    readonly quarantined: "quarantined";
    readonly decayed: "decayed";
};
/** Type for organ state strings */
export type OrganState = typeof ORGAN_STATES[keyof typeof ORGAN_STATES];
/** Error codes for Nerve API failures */
export declare const NERVE_ERROR_CODES: {
    /** Version mismatch between organ and host */
    readonly VERSION_MISMATCH: "NRV_VERSION_MISMATCH";
    /** Rate limit exceeded */
    readonly RATE_LIMIT_EXCEEDED: "NRV_RATE_LIMIT_EXCEEDED";
    /** Payload too large */
    readonly PAYLOAD_TOO_LARGE: "NRV_PAYLOAD_TOO_LARGE";
    /** Permission denied */
    readonly PERMISSION_DENIED: "NRV_PERMISSION_DENIED";
    /** Invalid message format */
    readonly INVALID_MESSAGE: "NRV_INVALID_MESSAGE";
    /** Handshake timeout */
    readonly HANDSHAKE_TIMEOUT: "NRV_HANDSHAKE_TIMEOUT";
    /** Organ quarantined */
    readonly ORGAN_QUARANTINED: "NRV_ORGAN_QUARANTINED";
};
/** Type for Nerve error code strings */
export type NerveErrorCode = typeof NERVE_ERROR_CODES[keyof typeof NERVE_ERROR_CODES];
/**
 * Check if an API version is compatible with the current version.
 * Uses semver major version matching.
 */
export declare function isVersionCompatible(version: string): boolean;
/**
 * Parse a semver version string into components.
 */
export declare function parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
} | null;
//# sourceMappingURL=protocol.d.ts.map