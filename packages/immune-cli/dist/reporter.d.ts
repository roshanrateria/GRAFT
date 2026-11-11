/**
 * Reporter
 *
 * Output formatting for immune CLI.
 */
import type { ImmuneReport } from '@graft/immune';
/**
 * Format a report as text (human-readable).
 */
export declare function formatTextReport(organName: string, report: ImmuneReport, verbose?: boolean): string;
/**
 * Format a report as JSON.
 */
export declare function formatJSONReport(organName: string, report: ImmuneReport): string;
/**
 * Format error message.
 */
export declare function formatError(message: string): string;
//# sourceMappingURL=reporter.d.ts.map