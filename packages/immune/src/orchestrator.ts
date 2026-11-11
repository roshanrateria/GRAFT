/**
 * Immune System Orchestrator
 *
 * Runs all 4 stages in sequence with fail-closed logic.
 * Implements IMM-03: Fail Closed.
 */

import { performStaticAnalysis } from './static/index.js';
import { extractInlineScripts } from './static/index.js';
import { validateManifest, crossReferencePermissions } from './manifest/index.js';
import { runBehavioralCheck } from './behavioral/index.js';
import { runUniversalProperties, createMockPropertyContext as createPropertyContext } from './properties/index.js';
import type {
  ImmuneReport,
  ImmuneStage,
  StageResult,
  RejectionReport,
  OrganBundle,
  ImmuneError,
} from './types.js';

// ============================================================================
// Immune System Runner
// ============================================================================

/**
 * Run the complete immune system pipeline on an organ bundle.
 * Fails closed: any error means rejection.
 */
export async function runImmuneSystem(
  bundle: OrganBundle
): Promise<ImmuneReport> {
  const stages: StageResult[] = [];
  const startTime = Date.now();

  try {
    // Stage 1: Static Scan
    const staticResult = await runStage('static', async () => {
      return performStaticAnalysis(bundle.indexHtml, JSON.stringify(bundle.manifest));
    });
    stages.push(staticResult);

    if (!staticResult.passed) {
      return createRejectionReport('static', staticResult.error, stages);
    }

    // Stage 2: Manifest Check
    const manifestResult = await runStage('manifest', async () => {
      const manifestJson = JSON.stringify(bundle.manifest);

      // Validate manifest structure
      const validation = validateManifest(manifestJson);

      if (!validation.passed) {
        return validation;
      }

      // Extract JavaScript from HTML for cross-referencing
      const scripts = extractInlineScripts(bundle.indexHtml);
      const jsCode = scripts.map(s => s.code).join('\n');

      // Cross-reference with code
      const crossRef = crossReferencePermissions(bundle.manifest, jsCode);

      return {
        passed: crossRef.passed,
        violations: crossRef.violations,
        error: crossRef.error,
      };
    });
    stages.push(manifestResult);

    if (!manifestResult.passed) {
      return createRejectionReport('manifest', manifestResult.error, stages);
    }

    // Stage 3: Behavioral Run
    const behavioralResult = await runStage('behavioral', async () => {
      return runBehavioralCheck(bundle.indexHtml, bundle.manifest);
    });
    stages.push(behavioralResult);

    if (!behavioralResult.passed) {
      return createRejectionReport('behavioral', behavioralResult.error, stages);
    }

    // Stage 4: Property Fuzz
    const propertyResult = await runStage('property', async () => {
      const context = createPropertyContext({
        permissions: bundle.manifest.permissions || [],
        ports: bundle.manifest.ports?.map((p: any) => p.name) || [],
      });
      
      return runUniversalProperties(context);
    });
    stages.push(propertyResult);

    if (!propertyResult.passed) {
      return createRejectionReport('property', propertyResult.error, stages);
    }

    // All stages passed
    return {
      passed: true,
      stages,
      timestamp: startTime,
    };
  } catch (error) {
    // Fail closed: any unhandled error means rejection
    const errorInfo: ImmuneError = {
      code: 'IMM_INTERNAL_ERROR',
      message: `Internal immune system error: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    };

    return createRejectionReport(
      stages.length > 0 ? stages[stages.length - 1].stage : 'static',
      errorInfo,
      stages
    );
  }
}

/**
 * Run a single stage with timing and error handling.
 */
async function runStage(
  stage: ImmuneStage,
  runner: () => Promise<any>
): Promise<StageResult> {
  const startTime = Date.now();

  try {
    const result = await runner();
    const duration = Date.now() - startTime;

    // If stage failed but no error was provided, create one from the result
    let error = result.error;
    if (!result.passed && !error) {
      // Stage failed without explicit error - create one from result details
      if (result.constructs && result.constructs.length > 0) {
        // Static analysis: use first banned construct
        const construct = result.constructs[0];
        error = {
          code: `IMM_BANNED_${construct.type.toUpperCase().replace(/-/g, '_')}`,
          message: construct.reason,
          location: construct.location,
        };
      } else if (result.violations && result.violations.length > 0) {
        // Manifest validation: use first violation
        const violation = result.violations[0];
        error = {
          code: 'IMM_MANIFEST_VIOLATION',
          message: violation.message,
          location: violation.location,
        };
      } else if (result.failures && result.failures.length > 0) {
        // Property tests: use first failure
        const failure = result.failures[0];
        error = {
          code: `IMM_PROPERTY_${failure.propertyId}_FAILED`,
          message: failure.message || `Property ${failure.propertyId} failed`,
          details: {
            propertyId: failure.propertyId,
            seed: failure.seed,
            counterexample: failure.counterexample,
          },
        };
      } else {
        error = {
          code: 'IMM_STAGE_FAILED',
          message: `Stage ${stage} failed without specific error`,
        };
      }
    }

    return {
      stage,
      passed: result.passed ?? true,
      duration,
      error,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      stage,
      passed: false,
      duration,
      error: {
        code: 'IMM_STAGE_ERROR',
        message: `Stage ${stage} failed: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
    };
  }
}

/**
 * Create a rejection report from a stage failure.
 */
function createRejectionReport(
  stage: ImmuneStage,
  error: ImmuneError | undefined,
  stages: StageResult[]
): ImmuneReport {
  const rejection: RejectionReport = {
    stage,
    reasonCode: error?.code || 'IMM_UNKNOWN_ERROR',
    message: error?.message || 'Unknown error',
    source: error?.location,
    details: error?.details,
  };

  return {
    passed: false,
    stages,
    rejection,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an organ bundle is safe for transplant.
 * Convenience wrapper around runImmuneSystem.
 */
export async function isOrganSafe(bundle: OrganBundle): Promise<boolean> {
  const report = await runImmuneSystem(bundle);
  return report.passed;
}

/**
 * Get detailed rejection reason for an organ.
 */
export async function getRejectionReason(
  bundle: OrganBundle
): Promise<RejectionReport | null> {
  const report = await runImmuneSystem(bundle);
  return report.rejection || null;
}
