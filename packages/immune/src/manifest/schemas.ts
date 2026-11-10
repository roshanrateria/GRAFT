/**
 * Manifest Zod Schemas
 *
 * Validation schemas for organ manifest structure.
 */

import { z } from 'zod';

// ============================================================================
// Port Schema
// ============================================================================

export const OrganPortSchema = z.object({
  name: z.string().min(1, 'Port name is required'),
  direction: z.enum(['in', 'out'], {
    errorMap: () => ({ message: 'Port direction must be "in" or "out"' }),
  }),
  schema: z.record(z.unknown(), {
    errorMap: () => ({ message: 'Port schema must be a JSON object' }),
  }),
});

// ============================================================================
// Manifest Schema
// ============================================================================

export const OrganManifestSchema = z.object({
  name: z.string().min(1, 'Organ name is required'),
  version: z.string().min(1, 'Version is required'),
  apiVersion: z.string().min(1, 'API version is required'),
  permissions: z.array(z.string().regex(
    /^(read|emit|subscribe):.+$/,
    'Permission must be in format <action>:<target>'
  ), {
    errorMap: () => ({ message: 'Permissions must be an array of valid permission strings' }),
  }),
  ports: z.array(OrganPortSchema).optional(),
  slotSize: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Slot size must be "small", "medium", or "large"' }),
  }).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type OrganPort = z.infer<typeof OrganPortSchema>;
export type OrganManifest = z.infer<typeof OrganManifestSchema>;
