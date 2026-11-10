/**
 * Manifest Zod Schemas
 *
 * Validation schemas for organ manifest structure.
 */
import { z } from 'zod';
export declare const OrganPortSchema: z.ZodObject<{
    name: z.ZodString;
    direction: z.ZodEnum<["in", "out"]>;
    schema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    direction: "in" | "out";
    schema: Record<string, unknown>;
}, {
    name: string;
    direction: "in" | "out";
    schema: Record<string, unknown>;
}>;
export declare const OrganManifestSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    apiVersion: z.ZodString;
    permissions: z.ZodArray<z.ZodString, "many">;
    ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        direction: z.ZodEnum<["in", "out"]>;
        schema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        direction: "in" | "out";
        schema: Record<string, unknown>;
    }, {
        name: string;
        direction: "in" | "out";
        schema: Record<string, unknown>;
    }>, "many">>;
    slotSize: z.ZodOptional<z.ZodEnum<["small", "medium", "large"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    apiVersion: string;
    permissions: string[];
    ports?: {
        name: string;
        direction: "in" | "out";
        schema: Record<string, unknown>;
    }[] | undefined;
    slotSize?: "small" | "medium" | "large" | undefined;
}, {
    name: string;
    version: string;
    apiVersion: string;
    permissions: string[];
    ports?: {
        name: string;
        direction: "in" | "out";
        schema: Record<string, unknown>;
    }[] | undefined;
    slotSize?: "small" | "medium" | "large" | undefined;
}>;
export type OrganPort = z.infer<typeof OrganPortSchema>;
export type OrganManifest = z.infer<typeof OrganManifestSchema>;
//# sourceMappingURL=schemas.d.ts.map