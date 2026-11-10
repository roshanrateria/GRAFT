/**
 * Nerve API v1 Type Definitions
 *
 * The Nerve API is the exclusive communication channel between organs and the Creature.
 * All messages are JSON with a type discriminator.
 *
 * @see docs/NERVE_API.md
 */
// ============================================================================
// API Version
// ============================================================================
/** Current Nerve API version */
export const NERVE_API_VERSION = '1.0.0';
// ============================================================================
// Message Type Guards
// ============================================================================
/** Check if a message is an init message */
export function isInitMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'init');
}
/** Check if a message is a data message */
export function isDataMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'data');
}
/** Check if a message is an in message */
export function isInMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'in');
}
/** Check if a message is a tick message */
export function isTickMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'tick');
}
/** Check if a message is a hello message */
export function isHelloMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'hello');
}
/** Check if a message is a read message */
export function isReadMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'read');
}
/** Check if a message is an emit message */
export function isEmitMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'emit');
}
/** Check if a message is a resize message */
export function isResizeMessage(msg) {
    return (typeof msg === 'object' &&
        msg !== null &&
        msg.type === 'resize');
}
// ============================================================================
// Constraints
// ============================================================================
/** Maximum messages per second per organ before quarantine */
export const RATE_LIMIT_PER_SECOND = 20;
/** Maximum payload size in bytes (16 KB) */
export const MAX_PAYLOAD_BYTES = 16 * 1024;
//# sourceMappingURL=types.js.map