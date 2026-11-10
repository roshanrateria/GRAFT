/**
 * Immune System Orchestrator
 *
 * Runs all 4 stages in sequence with fail-closed logic.
 * Implements IMM-03: Fail Closed.
 */
import type { ImmuneReport, RejectionReport, OrganBundle } from './types.js';
/**
 * Run the complete immune system pipeline on an organ bundle.
 * Fails closed: any error means rejection.
 */
export declare function runImmuneSystem(bundle: OrganBundle): Promise<ImmuneReport>;
/**
 * Check if an organ bundle is safe for transplant.
 * Convenience wrapper around runImmuneSystem.
 */
export declare function isOrganSafe(bundle: OrganBundle): Promise<boolean>;
/**
 * Get detailed rejection reason for an organ.
 */
export declare function getRejectionReason(bundle: OrganBundle): Promise<RejectionReport | null>;
//# sourceMappingURL=orchestrator.d.ts.map