/**
 * Nerve API v1 Zod Schemas
 *
 * Runtime validation schemas for all Nerve API messages.
 * Invalid messages are dropped and logged per NRV-01.
 *
 * @see packages/nerve/src/types.ts
 * @see docs/NERVE_API.md
 */
import { z } from 'zod';
// ============================================================================
// API Version
// ============================================================================
/** Current Nerve API version */
export const NERVE_API_VERSION = '1.0.0';
// ============================================================================
// Theme Schema
// ============================================================================
/** Supported theme modes */
export const ThemeSchema = z.enum(['light', 'dark']);
// ============================================================================
// Permissions Schema
// ============================================================================
/** Permission actions that organs can declare */
export const PermissionActionSchema = z.enum(['read', 'emit', 'subscribe']);
/** Permission string format: `<action>:<target>` */
export const PermissionSchema = z.string().regex(/^(read|emit|subscribe):.+$/, 'Permission must be in format <action>:<target>');
// ============================================================================
// Host → Organ Message Schemas
// ============================================================================
/** Initial handshake message sent to organ after load */
export const InitMessageSchema = z.object({
    type: z.literal('init'),
    apiVersion: z.string().min(1),
    theme: ThemeSchema,
    reducedMotion: z.boolean(),
    granted: z.array(PermissionSchema),
});
/** Data delivery message in response to a read request */
export const DataMessageSchema = z.object({
    type: z.literal('data'),
    id: z.string().min(1),
    value: z.unknown(),
});
/** Input from a linked organ (chimera) */
export const InMessageSchema = z.object({
    type: z.literal('in'),
    port: z.string().min(1),
    payload: z.unknown(),
});
/** Time tick with injected clock */
export const TickMessageSchema = z.object({
    type: z.literal('tick'),
    now: z.number().int().nonnegative(),
});
/** Union schema for all host-to-organ messages */
export const HostToOrganMessageSchema = z.discriminatedUnion('type', [
    InitMessageSchema,
    DataMessageSchema,
    InMessageSchema,
    TickMessageSchema,
]);
// ============================================================================
// Organ → Host Message Schemas
// ============================================================================
/** Handshake response from organ */
export const HelloMessageSchema = z.object({
    type: z.literal('hello'),
    apiVersion: z.string().min(1),
});
/** Request to read data from a domain */
export const ReadMessageSchema = z.object({
    type: z.literal('read'),
    id: z.string().min(1),
    path: z.string().min(1),
});
/** Emit data to an output port (for chimera linking) */
export const EmitMessageSchema = z.object({
    type: z.literal('emit'),
    port: z.string().min(1),
    payload: z.unknown(),
});
/** Request iframe resize */
export const ResizeMessageSchema = z.object({
    type: z.literal('resize'),
    height: z.number().int().positive(),
});
/** Union schema for all organ-to-host messages */
export const OrganToHostMessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema,
    ReadMessageSchema,
    EmitMessageSchema,
    ResizeMessageSchema,
]);
// ============================================================================
// Validation Helpers
// ============================================================================
/**
 * Validate a host-to-organ message.
 * Returns the parsed message or throws a ZodError.
 */
export function validateHostToOrganMessage(data) {
    return HostToOrganMessageSchema.parse(data);
}
/**
 * Validate an organ-to-host message.
 * Returns the parsed message or throws a ZodError.
 */
export function validateOrganToHostMessage(data) {
    return OrganToHostMessageSchema.parse(data);
}
/**
 * Safely validate a host-to-organ message.
 * Returns a result object with success/failure status.
 */
export function safeValidateHostToOrganMessage(data) {
    return HostToOrganMessageSchema.safeParse(data);
}
/**
 * Safely validate an organ-to-host message.
 * Returns a result object with success/failure status.
 */
export function safeValidateOrganToHostMessage(data) {
    return OrganToHostMessageSchema.safeParse(data);
}
//# sourceMappingURL=schemas.js.map