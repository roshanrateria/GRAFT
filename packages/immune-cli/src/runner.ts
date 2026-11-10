/**
 * Immune System Runner
 *
 * Loads an organ bundle and runs the immune system pipeline.
 */

import { readFile, readdir, access } from 'fs/promises';
import { join, basename } from 'path';
import {
  runImmuneSystem,
  type OrganBundle,
  type OrganManifest,
  type ImmuneStage,
  type ImmuneReport,
  type StageResult
} from '@graft/immune';
import type { CLIOptions, CLIResult, JSONReport, JSONStageResult } from './types.js';

/**
 * Check if a path exists.
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load an organ bundle from a directory.
 */
async function loadOrganBundle(organDir: string): Promise<{ bundle: OrganBundle; name: string }> {
  // Check directory exists
  if (!await pathExists(organDir)) {
    throw new Error(`Organ directory not found: ${organDir}`);
  }

  // Read manifest
  const manifestPath = join(organDir, 'manifest.json');
  if (!await pathExists(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifestContent = await readFile(manifestPath, 'utf-8');
  let manifest: OrganManifest;
  try {
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    throw new Error(`Invalid manifest JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Read index.html
  const htmlPath = join(organDir, 'index.html');
  if (!await pathExists(htmlPath)) {
    throw new Error(`index.html not found: ${htmlPath}`);
  }

  const indexHtml = await readFile(htmlPath, 'utf-8');

  // Optionally read spec and properties
  const specPath = join(organDir, 'spec.md');
  const propertiesPath = join(organDir, 'properties.js');

  const bundle: OrganBundle = {
    manifest,
    indexHtml,
    spec: await pathExists(specPath) ? await readFile(specPath, 'utf-8') : undefined,
    properties: await pathExists(propertiesPath) ? await readFile(propertiesPath, 'utf-8') : undefined,
  };

  return {
    bundle,
    name: manifest.name || basename(organDir),
  };
}

/**
 * Run immune system on an organ directory.
 */
export async function runImmuneOnOrgan(
  organDir: string,
  options: CLIOptions = {}
): Promise<CLIResult> {
  try {
    // Load organ bundle
    const { bundle, name } = await loadOrganBundle(organDir);

    // Run immune system
    const report = await runImmuneSystem(bundle);

    // Filter to specific stage if requested
    if (options.stage) {
      const stageResult = report.stages.find(s => s.stage === options.stage);
      if (!stageResult) {
        return {
          exitCode: 2,
          output: `Error: Stage '${options.stage}' not found in report`,
        };
      }

      return {
        exitCode: stageResult.passed ? 0 : 1,
        output: formatStageResult(stageResult.stage, stageResult.passed, options.verbose),
        report,
      };
    }

    // Format output
    const output = options.json
      ? formatJSONOutput(name, report)
      : formatTextOutput(name, report, options.verbose);

    return {
      exitCode: report.passed ? 0 : 1,
      output,
      report,
    };
  } catch (error) {
    return {
      exitCode: 2,
      output: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Format a single stage result.
 */
function formatStageResult(stage: ImmuneStage, passed: boolean, verbose?: boolean): string {
  const status = passed ? 'PASSED' : 'FAILED';
  let output = `Stage ${stage}: ${status}`;

  if (verbose && !passed) {
    output += '\n  (no details available for single stage)';
  }

  return output;
}

/**
 * Format report as JSON.
 */
function formatJSONOutput(name: string, report: ImmuneReport): string {
  const jsonReport: JSONReport = {
    organ: name,
    stages: report.stages.map((s: StageResult) => {
      const stage: JSONStageResult = {
        name: s.stage,
        passed: s.passed,
        details: s.error?.message,
      };
      return stage;
    }),
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
 * Format report as text.
 */
function formatTextOutput(name: string, report: ImmuneReport, verbose?: boolean): string {
  const lines: string[] = [];

  lines.push(`Immune System Report for: ${name}`);
  lines.push('');

  // Stage results
  for (const stage of report.stages) {
    const status = stage.passed ? 'PASSED' : 'FAILED';
    const stageNum = getStageNumber(stage.stage);
    const stageName = capitalize(stage.stage);
    lines.push(`Stage ${stageNum} - ${stageName}: ${status}`);

    if (verbose && stage.error) {
      lines.push(`  Error: ${stage.error.message}`);
      if (stage.error.location) {
        lines.push(`  Location: ${stage.error.location.file}:${stage.error.location.line}`);
      }
    }
  }

  lines.push('');

  // Verdict
  if (report.passed) {
    lines.push('VERDICT: APPROVED');
  } else {
    lines.push('VERDICT: REJECTED');
    if (report.rejection) {
      lines.push(`  Reason: ${report.rejection.message}`);
      lines.push(`  Stage: ${report.rejection.stage}`);
      lines.push(`  Code: ${report.rejection.reasonCode}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get stage number (1-4).
 */
function getStageNumber(stage: ImmuneStage): number {
  const order: ImmuneStage[] = ['manifest', 'static', 'behavioral', 'property'];
  const idx = order.indexOf(stage);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Capitalize a string.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
