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
/** Current Nerve API version */
export declare const NERVE_API_VERSION: "1.0.0";
/** Supported theme modes */
export declare const ThemeSchema: z.ZodEnum<["light", "dark"]>;
/** Permission actions that organs can declare */
export declare const PermissionActionSchema: z.ZodEnum<["read", "emit", "subscribe"]>;
/** Permission string format: `<action>:<target>` */
export declare const PermissionSchema: z.ZodString;
/** Initial handshake message sent to organ after load */
export declare const InitMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"init">;
    apiVersion: z.ZodString;
    theme: z.ZodEnum<["light", "dark"]>;
    reducedMotion: z.ZodBoolean;
    granted: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "init";
    apiVersion: string;
    theme: "light" | "dark";
    reducedMotion: boolean;
    granted: string[];
}, {
    type: "init";
    apiVersion: string;
    theme: "light" | "dark";
    reducedMotion: boolean;
    granted: string[];
}>;
/** Data delivery message in response to a read request */
export declare const DataMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"data">;
    id: z.ZodString;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "data";
    id: string;
    value?: unknown;
}, {
    type: "data";
    id: string;
    value?: unknown;
}>;
/** Input from a linked organ (chimera) */
export declare const InMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"in">;
    port: z.ZodString;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "in";
    port: string;
    payload?: unknown;
}, {
    type: "in";
    port: string;
    payload?: unknown;
}>;
/** Time tick with injected clock */
export declare const TickMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"tick">;
    now: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "tick";
    now: number;
}, {
    type: "tick";
    now: number;
}>;
/** Union schema for all host-to-organ messages */
export declare const HostToOrganMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"init">;
    apiVersion: z.ZodString;
    theme: z.ZodEnum<["light", "dark"]>;
    reducedMotion: z.ZodBoolean;
    granted: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "init";
    apiVersion: string;
    theme: "light" | "dark";
    reducedMotion: boolean;
    granted: string[];
}, {
    type: "init";
    apiVersion: string;
    theme: "light" | "dark";
    reducedMotion: boolean;
    granted: string[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"data">;
    id: z.ZodString;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "data";
    id: string;
    value?: unknown;
}, {
    type: "data";
    id: string;
    value?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"in">;
    port: z.ZodString;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "in";
    port: string;
    payload?: unknown;
}, {
    type: "in";
    port: string;
    payload?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tick">;
    now: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "tick";
    now: number;
}, {
    type: "tick";
    now: number;
}>]>;
/** Handshake response from organ */
export declare const HelloMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"hello">;
    apiVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "hello";
    apiVersion: string;
}, {
    type: "hello";
    apiVersion: string;
}>;
/** Request to read data from a domain */
export declare const ReadMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"read">;
    id: z.ZodString;
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "read";
    path: string;
    id: string;
}, {
    type: "read";
    path: string;
    id: string;
}>;
/** Emit data to an output port (for chimera linking) */
export declare const EmitMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"emit">;
    port: z.ZodString;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "emit";
    port: string;
    payload?: unknown;
}, {
    type: "emit";
    port: string;
    payload?: unknown;
}>;
/** Request iframe resize */
export declare const ResizeMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "resize";
    height: number;
}, {
    type: "resize";
    height: number;
}>;
/** Union schema for all organ-to-host messages */
export declare const OrganToHostMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"hello">;
    apiVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "hello";
    apiVersion: string;
}, {
    type: "hello";
    apiVersion: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"read">;
    id: z.ZodString;
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "read";
    path: string;
    id: string;
}, {
    type: "read";
    path: string;
    id: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"emit">;
    port: z.ZodString;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "emit";
    port: string;
    payload?: unknown;
}, {
    type: "emit";
    port: string;
    payload?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "resize";
    height: number;
}, {
    type: "resize";
    height: number;
}>]>;
export type Theme = z.infer<typeof ThemeSchema>;
export type PermissionAction = z.infer<typeof PermissionActionSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type InitMessage = z.infer<typeof InitMessageSchema>;
export type DataMessage = z.infer<typeof DataMessageSchema>;
export type InMessage = z.infer<typeof InMessageSchema>;
export type TickMessage = z.infer<typeof TickMessageSchema>;
export type HostToOrganMessage = z.infer<typeof HostToOrganMessageSchema>;
export type HelloMessage = z.infer<typeof HelloMessageSchema>;
export type ReadMessage = z.infer<typeof ReadMessageSchema>;
export type EmitMessage = z.infer<typeof EmitMessageSchema>;
export type ResizeMessage = z.infer<typeof ResizeMessageSchema>;
export type OrganToHostMessage = z.infer<typeof OrganToHostMessageSchema>;
/**
 * Validate a host-to-organ message.
 * Returns the parsed message or throws a ZodError.
 */
export declare function validateHostToOrganMessage(data: unknown): HostToOrganMessage;
/**
 * Validate an organ-to-host message.
 * Returns the parsed message or throws a ZodError.
 */
export declare function validateOrganToHostMessage(data: unknown): OrganToHostMessage;
/**
 * Safely validate a host-to-organ message.
 * Returns a result object with success/failure status.
 */
export declare function safeValidateHostToOrganMessage(data: unknown): z.SafeParseReturnType<unknown, HostToOrganMessage>;
/**
 * Safely validate an organ-to-host message.
 * Returns a result object with success/failure status.
 */
export declare function safeValidateOrganToHostMessage(data: unknown): z.SafeParseReturnType<unknown, OrganToHostMessage>;
//# sourceMappingURL=schemas.d.ts.map