/**
 * CLI Types
 *
 * Types for the immune CLI.
 */
import type { ImmuneReport, ImmuneStage } from '@graft/immune';
/** CLI options */
export interface CLIOptions {
    /** Output as JSON */
    json?: boolean;
    /** Verbose output */
    verbose?: boolean;
    /** Run only specific stage */
    stage?: ImmuneStage;
}
/** CLI result */
export interface CLIResult {
    /** Exit code */
    exitCode: 0 | 1 | 2;
    /** Output to print */
    output: string;
    /** Report if available */
    report?: ImmuneReport;
}
/** JSON report format for --json output */
export interface JSONReport {
    /** Organ name */
    organ: string;
    /** Stage results */
    stages: JSONStageResult[];
    /** Verdict: APPROVED or REJECTED */
    verdict: 'APPROVED' | 'REJECTED';
    /** Rejection reason if rejected */
    rejection?: {
        stage: ImmuneStage;
        reasonCode: string;
        message: string;
    };
}
/** Stage result in JSON format */
export interface JSONStageResult {
    /** Stage name */
    name: ImmuneStage;
    /** Whether stage passed */
    passed: boolean;
    /** Stage details */
    details?: string;
    /** Findings (for static stage) */
    findings?: unknown[];
    /** Metrics (for behavioral stage) */
    metrics?: unknown;
    /** Seed (for property stage) */
    seed?: number;
}
//# sourceMappingURL=types.d.ts.map