/**
 * Immune System Types
 *
 * Core types for the 4-stage verification pipeline.
 */

// ============================================================================
// Immune Report
// ============================================================================

/** Stage of the immune system pipeline */
export type ImmuneStage = 'static' | 'manifest' | 'behavioral' | 'property';

/** Result of a single stage check */
export interface StageResult {
  stage: ImmuneStage;
  passed: boolean;
  duration: number;
  error?: ImmuneError;
}

/** Structured error from immune system */
export interface ImmuneError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Source location if available */
  location?: SourceLocation;
  /** Additional context */
  details?: Record<string, unknown>;
}

/** Source location for error reporting */
export interface SourceLocation {
  file: string;
  line: number;
  column?: number;
}

/** Complete immune system report */
export interface ImmuneReport {
  /** Whether all stages passed */
  passed: boolean;
  /** Results from each stage */
  stages: StageResult[];
  /** Rejection details if failed */
  rejection?: RejectionReport;
  /** Organ identifier */
  organId?: string;
  /** Timestamp */
  timestamp: number;
}

/** Detailed rejection report (IMM-05) */
export interface RejectionReport {
  /** Which stage failed */
  stage: ImmuneStage;
  /** Machine-readable reason code */
  reasonCode: string;
  /** Human-readable sentence */
  message: string;
  /** Source location where available */
  source?: SourceLocation;
  /** Additional debugging info */
  details?: Record<string, unknown>;
}

// ============================================================================
// Static Analysis Types
// ============================================================================

/** Banned construct detected in code */
export interface BannedConstruct {
  /** Type of banned construct */
  type: BannedConstructType;
  /** Description of why it's banned */
  reason: string;
  /** Location in source code */
  location: SourceLocation;
}

/** Categories of banned constructs */
export type BannedConstructType =
  | 'eval'
  | 'new-function'
  | 'dynamic-import'
  | 'import-scripts'
  | 'fetch'
  | 'xmlhttprequest'
  | 'websocket'
  | 'eventsource'
  | 'send-beacon'
  | 'worker'
  | 'cookie-access'
  | 'local-storage'
  | 'session-storage'
  | 'indexed-db'
  | 'window-parent'
  | 'window-top'
  | 'window-opener'
  | 'window-frames'
  | 'location-write'
  | 'iframe'
  | 'script-src'
  | 'external-url'
  | 'form-action'
  | 'settimeout-string'
  | 'setinterval-string'
  | 'direct-date'
  | 'direct-random'
  | 'computed-window-access'
  | 'infinite-loop';

/** Result of static analysis */
export interface StaticAnalysisResult {
  passed: boolean;
  constructs: BannedConstruct[];
  error?: ImmuneError;
}

// ============================================================================
// Manifest Validation Types
// ============================================================================

/** Permission violation detected */
export interface PermissionViolation {
  /** Type of violation */
  type: 'undeclared-read' | 'undeclared-emit' | 'undeclared-port' | 'invalid-permission';
  /** The violating permission/action */
  permission: string;
  /** Location if available */
  location?: SourceLocation;
  /** Description */
  message: string;
}

/** Result of manifest validation */
export interface ManifestValidationResult {
  passed: boolean;
  violations: PermissionViolation[];
  error?: ImmuneError;
}

// ============================================================================
// Behavioral Check Types
// ============================================================================

/** Behavioral metrics from organ run */
export interface BehavioralMetrics {
  /** Load time in milliseconds */
  loadTime: number;
  /** Whether organ threw uncaught error */
  hasErrors: boolean;
  /** Error messages if any */
  errors: string[];
  /** DOM node count */
  domNodeCount: number;
  /** Whether CSP violations detected */
  hasCSPViolations: boolean;
  /** CSP violation details */
  cspViolations: string[];
  /** Messages sent by organ */
  messages: unknown[];
  /**
   * Environment the check ran in ('browser' = real sandbox run, 'node' = skipped).
   * When 'node', the sandbox cannot execute (no DOM); the check runs for real
   * in the host browser at transplant time (TransactionCoordinator).
   */
  environment?: 'browser' | 'node';
  /** Whether the organ code actually executed */
  executed?: boolean;
}

/** Result of behavioral check */
export interface BehavioralResult {
  passed: boolean;
  metrics: BehavioralMetrics;
  error?: ImmuneError;
}

// ============================================================================
// Property Fuzz Types
// ============================================================================

/** Property test failure */
export interface PropertyFailure {
  /** Property ID (e.g., U1-U7 or custom) */
  propertyId: string;
  /** Error message */
  message: string;
  /** Seed for reproduction */
  seed: number;
  /** Counterexample input */
  counterexample?: unknown;
  /** Stack trace if available */
  stack?: string;
}

/** Result of property fuzzing */
export interface PropertyResult {
  passed: boolean;
  failures: PropertyFailure[];
  error?: ImmuneError;
}

// ============================================================================
// Organ Bundle Types
// ============================================================================

/** Organ manifest structure */
export interface OrganManifest {
  name: string;
  version: string;
  apiVersion: string;
  permissions: string[];
  ports: OrganPort[];
  slotSize: 'small' | 'medium' | 'large';
}

/** Organ port definition */
export interface OrganPort {
  name: string;
  direction: 'in' | 'out';
  schema: Record<string, unknown>;
}

/** Complete organ bundle */
export interface OrganBundle {
  manifest: OrganManifest;
  indexHtml: string;
  spec?: string;
  properties?: string;
}
