#!/usr/bin/env node
/**
 * @graft/immune-cli - Immune System CLI
 *
 * Run the immune system on organ directories.
 *
 * Usage:
 *   pnpm immune <dir>
 *   pnpm immune organs/handwritten/mood-weather
 *
 * Options:
 *   --json          Output JSON report
 *   --verbose       Detailed output
 *   --stage <name>  Run only specific stage
 *
 * Exit codes:
 *   0  Organ passed all stages
 *   1  Organ rejected (failed immune check)
 *   2  Error (invalid input, missing files, etc.)
 */
import { parseArgs } from 'util';
import { resolve } from 'path';
import { runImmuneOnOrgan } from './runner.js';
const CLI_VERSION = '0.1.0';
/**
 * Print usage information.
 */
function printUsage() {
    console.log(`
graft-immune <dir> [options]

Run the immune system on an organ directory.

Arguments:
  <dir>              Path to organ directory (required)

Options:
  --json             Output JSON report
  --verbose          Detailed output
  --stage <name>     Run only specific stage (manifest|static|behavioral|property)
  --help, -h         Show this help
  --version, -v      Show version

Exit codes:
  0  Organ passed all stages
  1  Organ rejected (failed immune check)
  2  Error (invalid input, missing files, etc.)

Examples:
  pnpm immune organs/handwritten/mood-weather
  pnpm immune organs/hostile/01-direct-fetch --json
  pnpm immune ./my-organ --stage static
`);
}
/**
 * Main CLI entry point.
 */
async function main() {
    const { values, positionals } = parseArgs({
        options: {
            json: {
                type: 'boolean',
                short: 'j',
            },
            verbose: {
                type: 'boolean',
                short: 'V',
            },
            stage: {
                type: 'string',
            },
            help: {
                type: 'boolean',
                short: 'h',
            },
            version: {
                type: 'boolean',
                short: 'v',
            },
        },
        strict: true,
        allowPositionals: true,
    });
    // Handle --help
    if (values.help) {
        printUsage();
        process.exit(0);
    }
    // Handle --version
    if (values.version) {
        console.log(`graft-immune v${CLI_VERSION}`);
        process.exit(0);
    }
    // Require organ directory
    if (positionals.length === 0) {
        console.error('Error: Organ directory is required');
        console.error('');
        printUsage();
        process.exit(2);
    }
    const organDir = resolve(positionals[0]);
    // Validate stage option
    const validStages = ['manifest', 'static', 'behavioral', 'property'];
    if (values.stage && !validStages.includes(values.stage)) {
        console.error(`Error: Invalid stage '${values.stage}'. Must be one of: ${validStages.join(', ')}`);
        process.exit(2);
    }
    // Run immune system
    const result = await runImmuneOnOrgan(organDir, {
        json: values.json,
        verbose: values.verbose,
        stage: values.stage,
    });
    // Output result
    console.log(result.output);
    // Exit with appropriate code
    process.exit(result.exitCode);
}
// Run CLI
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(2);
});
//# sourceMappingURL=index.js.map