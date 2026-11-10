/**
 * @graft/immune - Immune System Package
 *
 * 4-stage verification pipeline for organ safety.
 *
 * @packageDocumentation
 */
export { runImmuneSystem, isOrganSafe, getRejectionReason } from './orchestrator.js';
export type { ImmuneStage, ImmuneReport, StageResult, ImmuneError, RejectionReport, SourceLocation, OrganBundle, OrganManifest, OrganPort, BannedConstruct, BannedConstructType, StaticAnalysisResult, PermissionViolation, ManifestValidationResult, BehavioralResult, BehavioralMetrics, PropertyFailure, PropertyResult, } from './types.js';
export { analyzeJavaScript, analyzeHTML, performStaticAnalysis } from './static/index.js';
export { validateManifest, crossReferencePermissions } from './manifest/index.js';
export { runBehavioralCheck, createSandboxedIframe, measureBehavioralMetrics, validateBehavioralMetrics, } from './behavioral/index.js';
export { runUniversalProperties, createPropertyContext, runPropertyTests, } from './properties/index.js';
export { createRejection, createImmuneReport, formatRejection, formatImmuneReport, validateRejectionReport, } from './report.js';
//# sourceMappingURL=index.d.ts.map