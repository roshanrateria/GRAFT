/**
 * @graft/immune - Immune System Package
 *
 * 4-stage verification pipeline for organ safety.
 *
 * @packageDocumentation
 */

// Core orchestrator
export { runImmuneSystem, isOrganSafe, getRejectionReason } from './orchestrator.js';

// Types
export type {
  ImmuneStage,
  ImmuneReport,
  StageResult,
  ImmuneError,
  RejectionReport,
  SourceLocation,
  OrganBundle,
  OrganManifest,
  OrganPort,
  BannedConstruct,
  BannedConstructType,
  StaticAnalysisResult,
  PermissionViolation,
  ManifestValidationResult,
  BehavioralResult,
  BehavioralMetrics,
  PropertyFailure,
  PropertyResult,
} from './types.js';

// Static analysis
export { analyzeJavaScript, analyzeHTML, performStaticAnalysis } from './static/index.js';

// Manifest validation
export { validateManifest, crossReferencePermissions } from './manifest/index.js';

// Behavioral checks
export {
  runBehavioralCheck,
  createSandboxedIframe,
  measureBehavioralMetrics,
  validateBehavioralMetrics,
} from './behavioral/index.js';

// Property tests
export {
  runUniversalProperties,
  createPropertyContext,
  runPropertyTests,
} from './properties/index.js';

// Report utilities
export {
  createRejection,
  createImmuneReport,
  formatRejection,
  formatImmuneReport,
  validateRejectionReport,
} from './report.js';
