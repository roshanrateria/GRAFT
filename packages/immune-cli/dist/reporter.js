/**
 * Reporter
 *
 * Output formatting for immune CLI.
 */
/**
 * Format a report as text (human-readable).
 */
export function formatTextReport(organName, report, verbose = false) {
    const lines = [];
    lines.push(`Immune System Report for: ${organName}`);
    lines.push('');
    // Stage results
    const stageOrder = ['manifest', 'static', 'behavioral', 'property'];
    for (let i = 0; i < stageOrder.length; i++) {
        const stageName = stageOrder[i];
        const result = report.stages.find(s => s.stage === stageName);
        if (result) {
            const status = result.passed ? 'PASSED' : 'FAILED';
            const capitalizedName = capitalize(stageName);
            lines.push(`Stage ${i + 1} - ${capitalizedName}: ${status}`);
            if (verbose && result.error) {
                lines.push(`  Error: ${result.error.message}`);
                if (result.error.location) {
                    lines.push(`  Location: ${result.error.location.file}:${result.error.location.line}`);
                }
                if (result.error.details) {
                    lines.push(`  Details: ${JSON.stringify(result.error.details, null, 2)}`);
                }
            }
        }
    }
    lines.push('');
    // Verdict
    if (report.passed) {
        lines.push('VERDICT: APPROVED');
    }
    else {
        lines.push('VERDICT: REJECTED');
        if (report.rejection) {
            lines.push(`  Reason: ${report.rejection.message}`);
            lines.push(`  Stage: ${report.rejection.stage}`);
            lines.push(`  Code: ${report.rejection.reasonCode}`);
            if (report.rejection.source) {
                lines.push(`  Source: ${report.rejection.source.file}:${report.rejection.source.line}`);
            }
        }
    }
    return lines.join('\n');
}
/**
 * Format a report as JSON.
 */
export function formatJSONReport(organName, report) {
    const stageOrder = ['manifest', 'static', 'behavioral', 'property'];
    const stages = stageOrder.map(stageName => {
        const result = report.stages.find(s => s.stage === stageName);
        if (!result) {
            return {
                name: stageName,
                passed: false,
                details: 'Stage not run',
            };
        }
        const stageResult = {
            name: stageName,
            passed: result.passed,
        };
        if (result.error) {
            stageResult.details = result.error.message;
        }
        return stageResult;
    });
    const jsonReport = {
        organ: organName,
        stages,
        verdict: report.passed ? 'APPROVED' : 'REJECTED',
    };
    if (report.rejection) {
        jsonReport.rejection = {
            stage: report.rejection.stage,
            reasonCode: report.rejection.reasonCode,
            message: report.rejection.message,
        };
    }
    return JSON.stringify(jsonReport, null, 2);
}
/**
 * Format error message.
 */
export function formatError(message) {
    return `Error: ${message}`;
}
/**
 * Capitalize a string.
 */
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
//# sourceMappingURL=reporter.js.map