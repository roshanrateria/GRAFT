/**
 * Manifest Validator
 *
 * Validates organ manifest and cross-references with AST-detected calls.
 * Implements IMM-02: Permission Violation Rejection.
 */

import { z } from 'zod';
import { OrganManifestSchema } from './schemas.js';
import type {
  ManifestValidationResult,
  PermissionViolation,
  OrganManifest,
} from '../types.js';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

// ============================================================================
// Allowed Permissions
// ============================================================================

/** Valid data domains that can be read */
const VALID_DATA_DOMAINS = [
  'mood.entries',
  'tasks.items',
  'habits.checkins',
  'calendar.events',
];

/** Valid permission actions */
const VALID_ACTIONS = ['read', 'emit', 'subscribe'];

// ============================================================================
// Manifest Validator
// ============================================================================

/**
 * Validate organ manifest structure and permissions.
 */
export function validateManifest(
  manifestJson: string
): ManifestValidationResult {
  const violations: PermissionViolation[] = [];

  try {
    // Parse JSON
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestJson);
    } catch (e) {
      return {
        passed: false,
        violations: [],
        error: {
          code: 'IMM_MANIFEST_PARSE_ERROR',
          message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        },
      };
    }

    // Validate schema
    const parseResult = OrganManifestSchema.safeParse(manifest);
    if (!parseResult.success) {
      // Format Zod errors for better error messages
      const formattedErrors = parseResult.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      
      return {
        passed: false,
        violations: [],
        error: {
          code: 'IMM_MANIFEST_SCHEMA_ERROR',
          message: `Schema validation failed: ${parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          details: { errors: formattedErrors },
        },
      };
    }

    const validManifest = parseResult.data;

    // Check permissions are valid
    for (const permission of validManifest.permissions) {
      const violation = checkPermissionValidity(permission);
      if (violation) {
        violations.push(violation);
      }
    }

    // Check for duplicate permissions
    const seenPermissions = new Set<string>();
    for (const permission of validManifest.permissions) {
      if (seenPermissions.has(permission)) {
        violations.push({
          type: 'invalid-permission',
          permission,
          message: `Duplicate permission: ${permission}`,
        });
      }
      seenPermissions.add(permission);
    }

    // Check ports
    if (validManifest.ports) {
      for (const port of validManifest.ports) {
        // Check if emit permission exists for output ports
        if (port.direction === 'out') {
          const hasPermission = validManifest.permissions.some(
            p => p === `emit:${port.name}`
          );
          if (!hasPermission) {
            violations.push({
              type: 'invalid-permission',
              permission: `emit:${port.name}`,
              message: `Output port "${port.name}" requires emit:${port.name} permission`,
            });
          }
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  } catch (error) {
    return {
      passed: false,
      violations: [],
      error: {
        code: 'IMM_MANIFEST_ERROR',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

/**
 * Cross-reference manifest permissions with actual code behavior.
 * Extracts read/emit calls from JavaScript and checks they're declared.
 */
export function crossReferencePermissions(
  manifest: OrganManifest,
  javascriptCode: string
): ManifestValidationResult {
  const violations: PermissionViolation[] = [];

  try {
    // Extract actual reads and emits from code
    const actualCalls = extractNerveCalls(javascriptCode);

    // Check all reads are declared
    for (const read of actualCalls.reads) {
      const permission = `read:${read}`;
      if (!manifest.permissions.includes(permission)) {
        violations.push({
          type: 'undeclared-read',
          permission,
          message: `Undeclared read: organ reads from "${read}" but has no "${permission}" permission`,
        });
      }
    }

    // Check all emits are declared
    for (const emit of actualCalls.emits) {
      const permission = `emit:${emit}`;
      if (!manifest.permissions.includes(permission)) {
        violations.push({
          type: 'undeclared-emit',
          permission,
          message: `Undeclared emit: organ emits to "${emit}" but has no "${permission}" permission`,
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  } catch (error) {
    return {
      passed: false,
      violations: [],
      error: {
        code: 'IMM_PERMISSION_ERROR',
        message: `Permission cross-reference error: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function checkPermissionValidity(permission: string): PermissionViolation | null {
  const parts = permission.split(':');
  if (parts.length !== 2) {
    return {
      type: 'invalid-permission',
      permission,
      message: `Invalid permission format: ${permission}. Expected format: <action>:<target>`,
    };
  }

  const [action, target] = parts;

  if (!VALID_ACTIONS.includes(action)) {
    return {
      type: 'invalid-permission',
      permission,
      message: `Invalid permission action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}`,
    };
  }

  // For read permissions, check target is a valid domain
  if (action === 'read' && !VALID_DATA_DOMAINS.includes(target)) {
    return {
      type: 'invalid-permission',
      permission,
      message: `Invalid read target: ${target}. Valid targets: ${VALID_DATA_DOMAINS.join(', ')}`,
    };
  }

  // For emit/subscribe, just require a non-empty target
  if ((action === 'emit' || action === 'subscribe') && !target) {
    return {
      type: 'invalid-permission',
      permission,
      message: `Invalid ${action} target: must specify a port name`,
    };
  }

  return null;
}

/**
 * Extract nerve.read() and nerve.emit() calls from JavaScript code.
 */
function extractNerveCalls(code: string): { reads: string[]; emits: string[] } {
  const reads: Set<string> = new Set();
  const emits: Set<string> = new Set();

  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
    });

    walk.simple(ast, {
      CallExpression(node: any) {
        // Check for nerve.read('path')
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'nerve' &&
          node.callee.property.type === 'Identifier'
        ) {
          const methodName = node.callee.property.name;

          if (methodName === 'read' && node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              reads.add(arg.value);
            }
          }

          if (methodName === 'emit' && node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              emits.add(arg.value);
            }
          }
        }
      },
    });
  } catch (error) {
    // If parsing fails, return empty (will be caught by static analysis)
  }

  return {
    reads: Array.from(reads),
    emits: Array.from(emits),
  };
}
