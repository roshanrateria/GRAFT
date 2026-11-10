/**
 * Immune Report Utilities
 *
 * Helpers for creating and formatting rejection reports.
 * Implements IMM-05: Rejection Report.
 */
import type { ImmuneReport, RejectionReport, ImmuneStage } from './types.js';
/**
 * Create a simple rejection report.
 */
export declare function createRejection(stage: ImmuneStage, code: string, message: string, options?: {
    file?: string;
    line?: number;
    column?: number;
    details?: Record<string, unknown>;
}): RejectionReport;
/**
 * Create a full immune report from a rejection.
 */
export declare function createImmuneReport(rejection: RejectionReport, stages: Array<{
    stage: ImmuneStage;
    passed: boolean;
    duration: number;
}>): ImmuneReport;
/**
 * Format a rejection report for display.
 */
export declare function formatRejection(report: RejectionReport): string;
/**
 * Format a full immune report for display.
 */
export declare function formatImmuneReport(report: ImmuneReport): string;
/**
 * Validate that a rejection report has all required fields.
 */
export declare function validateRejectionReport(report: RejectionReport): boolean;
//# sourceMappingURL=report.d.ts.map