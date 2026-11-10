/**
 * Repair Loop Coordinator
 *
 * Coordinates between Doctor and Immune System to attempt repairs
 * on rejected organs. Maximum 2 repair rounds.
 *
 * Implements DOC-03: Repair Loop.
 */
import type { DoctorProvider, DoctorEvent, OrganBundle, Spec, Anatomy, RejectionReport } from './types.js';
import type { ImmuneReport } from '@graft/immune';
/** Result of repair loop */
export interface RepairLoopResult {
    /** Whether the organ ultimately passed */
    passed: boolean;
    /** Final immune report */
    report: ImmuneReport;
    /** Final organ bundle (may be repaired) */
    bundle: OrganBundle;
    /** Number of repair attempts made */
    repairAttempts: number;
    /** History of repair attempts */
    repairHistory: RepairAttempt[];
}
/** Record of a single repair attempt */
export interface RepairAttempt {
    /** Round number (1-indexed) */
    round: number;
    /** Rejection that triggered this repair */
    rejection: RejectionReport;
    /** Whether repair succeeded */
    repaired: boolean;
    /** Error if repair failed */
    error?: string;
}
/** Maximum number of repair rounds */
export declare const MAX_REPAIR_ROUNDS = 2;
/**
 * Run the repair loop.
 *
 * 1. Submit organ to immune system
 * 2. If rejected, call Doctor.repair() with rejection report
 * 3. Re-submit repaired bundle
 * 4. Allow maximum 2 repair rounds
 * 5. Track repair history
 */
export declare function runRepairLoop(doctor: DoctorProvider, bundle: OrganBundle, onEvent?: (event: DoctorEvent) => void): Promise<RepairLoopResult>;
/**
 * Build organ from spec with repair loop.
 *
 * Convenience function that builds then runs repair loop.
 */
export declare function buildWithRepairLoop(doctor: DoctorProvider, spec: Spec, anatomy: Anatomy, onEvent?: (event: DoctorEvent) => void): Promise<RepairLoopResult>;
//# sourceMappingURL=repair-loop.d.ts.map