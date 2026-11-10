/**
 * Manifest Validator
 *
 * Validates organ manifest and cross-references with AST-detected calls.
 * Implements IMM-02: Permission Violation Rejection.
 */
import type { ManifestValidationResult, OrganManifest } from '../types.js';
/**
 * Validate organ manifest structure and permissions.
 */
export declare function validateManifest(manifestJson: string): ManifestValidationResult;
/**
 * Cross-reference manifest permissions with actual code behavior.
 * Extracts read/emit calls from JavaScript and checks they're declared.
 */
export declare function crossReferencePermissions(manifest: OrganManifest, javascriptCode: string): ManifestValidationResult;
//# sourceMappingURL=validator.d.ts.map