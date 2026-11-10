/**
 * Immune Report Utilities
 *
 * Helpers for creating and formatting rejection reports.
 * Implements IMM-05: Rejection Report.
 */
// ============================================================================
// Report Creation
// ============================================================================
/**
 * Create a simple rejection report.
 */
export function createRejection(stage, code, message, options) {
    return {
        stage,
        reasonCode: code,
        message,
        source: options ? {
            file: options.file || 'unknown',
            line: options.line || 0,
            column: options.column,
        } : undefined,
        details: options?.details,
    };
}
/**
 * Create a full immune report from a rejection.
 */
export function createImmuneReport(rejection, stages) {
    return {
        passed: false,
        stages: stages.map(s => ({
            stage: s.stage,
            passed: s.passed,
            duration: s.duration,
        })),
        rejection,
        timestamp: Date.now(),
    };
}
// ============================================================================
// Report Formatting
// ============================================================================
/**
 * Format a rejection report for display.
 */
export function formatRejection(report) {
    const lines = [];
    lines.push(`❌ ORGAN REJECTED`);
    lines.push('');
    lines.push(`Stage: ${report.stage}`);
    lines.push(`Code: ${report.reasonCode}`);
    lines.push(`Reason: ${report.message}`);
    if (report.source) {
        lines.push('');
        lines.push(`Location: ${report.source.file}:${report.source.line}`);
        if (report.source.column !== undefined) {
            lines.push(`Column: ${report.source.column}`);
        }
    }
    if (report.details) {
        lines.push('');
        lines.push('Details:');
        for (const [key, value] of Object.entries(report.details)) {
            lines.push(`  ${key}: ${JSON.stringify(value)}`);
        }
    }
    return lines.join('\n');
}
/**
 * Format a full immune report for display.
 */
export function formatImmuneReport(report) {
    if (report.passed) {
        return `✓ ORGAN APPROVED\n\nAll ${report.stages.length} stages passed.`;
    }
    const lines = [];
    lines.push(formatRejection(report.rejection));
    lines.push('');
    lines.push('Stage Results:');
    for (const stage of report.stages) {
        const status = stage.passed ? '✓' : '✗';
        lines.push(`  ${status} ${stage.stage} (${stage.duration}ms)`);
    }
    return lines.join('\n');
}
// ============================================================================
// Report Validation
// ============================================================================
/**
 * Validate that a rejection report has all required fields.
 */
export function validateRejectionReport(report) {
    return (typeof report.stage === 'string' &&
        ['static', 'manifest', 'behavioral', 'property'].includes(report.stage) &&
        typeof report.reasonCode === 'string' &&
        report.reasonCode.length > 0 &&
        typeof report.message === 'string' &&
        report.message.length > 0);
}
//# sourceMappingURL=report.js.map