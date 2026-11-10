/**
 * Repair Loop Coordinator
 *
 * Coordinates between Doctor and Immune System to attempt repairs
 * on rejected organs. Maximum 2 repair rounds.
 *
 * Implements DOC-03: Repair Loop.
 */
import { runImmuneSystem } from '@graft/immune';
/** Maximum number of repair rounds */
export const MAX_REPAIR_ROUNDS = 2;
// ============================================================================
// Repair Loop Implementation
// ============================================================================
/**
 * Run the repair loop.
 *
 * 1. Submit organ to immune system
 * 2. If rejected, call Doctor.repair() with rejection report
 * 3. Re-submit repaired bundle
 * 4. Allow maximum 2 repair rounds
 * 5. Track repair history
 */
export async function runRepairLoop(doctor, bundle, onEvent) {
    const repairHistory = [];
    let currentBundle = bundle;
    let repairAttempts = 0;
    // Initial immune system check
    let report = await runImmuneSystem(currentBundle);
    // If passed, return immediately
    if (report.passed) {
        return {
            passed: true,
            report,
            bundle: currentBundle,
            repairAttempts: 0,
            repairHistory,
        };
    }
    // Attempt repairs up to MAX_REPAIR_ROUNDS
    while (!report.passed && repairAttempts < MAX_REPAIR_ROUNDS && report.rejection) {
        repairAttempts++;
        const rejection = report.rejection;
        // Emit repair-start event
        onEvent?.({
            type: 'repair-start',
            timestamp: Date.now(),
            data: { round: repairAttempts, rejection },
        });
        // Attempt repair via Doctor
        let repaired = false;
        let repairError;
        try {
            const repairEvents = doctor.repair(currentBundle, rejection);
            let repairedBundle;
            for await (const event of repairEvents) {
                onEvent?.(event);
                if (event.type === 'repair-complete' && event.data) {
                    repairedBundle = event.data.bundle;
                }
                else if (event.type === 'error' && event.data) {
                    repairError = event.data.message || 'Unknown repair error';
                }
            }
            if (repairedBundle) {
                currentBundle = repairedBundle;
                repaired = true;
            }
        }
        catch (error) {
            repairError = error instanceof Error ? error.message : 'Unknown error during repair';
        }
        // Record this repair attempt
        repairHistory.push({
            round: repairAttempts,
            rejection,
            repaired,
            error: repairError,
        });
        // Emit repair-complete event
        onEvent?.({
            type: 'repair-complete',
            timestamp: Date.now(),
            data: { round: repairAttempts, repaired, error: repairError },
        });
        // If repair succeeded, re-run immune system
        if (repaired) {
            report = await runImmuneSystem(currentBundle);
        }
        else {
            // If repair failed, break out - no point continuing
            break;
        }
    }
    return {
        passed: report.passed,
        report,
        bundle: currentBundle,
        repairAttempts,
        repairHistory,
    };
}
/**
 * Build organ from spec with repair loop.
 *
 * Convenience function that builds then runs repair loop.
 */
export async function buildWithRepairLoop(doctor, spec, anatomy, onEvent) {
    // Build the organ
    let bundle;
    const buildEvents = doctor.build(spec, anatomy);
    for await (const event of buildEvents) {
        onEvent?.(event);
        if (event.type === 'build-complete' && event.data) {
            bundle = event.data.bundle;
        }
    }
    if (!bundle) {
        throw new Error('Doctor did not produce an organ bundle');
    }
    // Run repair loop
    return runRepairLoop(doctor, bundle, onEvent);
}
//# sourceMappingURL=repair-loop.js.map