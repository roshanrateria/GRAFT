#!/usr/bin/env ts-node
/**
 * Schedule Checkup - Configure scheduled checkup runs
 *
 * This script sets up scheduled execution of the nightly checkup.
 * It supports multiple scheduling methods:
 *
 * 1. Node-based interval scheduler (default, cross-platform)
 *    Runs checkup at a specified time each day.
 *
 * 2. System cron (Unix only)
 *    Adds a cron job to run checkup at the scheduled time.
 *
 * 3. Windows Task Scheduler (Windows only)
 *    Creates a scheduled task to run checkup.
 *
 * Usage:
 *   pnpm tsx scripts/schedule-checkup.ts --method <node|cron|windows> [--hour 2] [--minute 0]
 *   pnpm tsx scripts/schedule-checkup.ts --status
 *   pnpm tsx scripts/schedule-checkup.ts --cancel
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';

const execAsync = promisify(exec);
const scriptDir = resolve();

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_HOUR = 2; // 2 AM
const DEFAULT_MINUTE = 0;
const PID_FILE = resolve(homedir(), '.graft', 'checkup-scheduler.pid');
const LOG_FILE = resolve(homedir(), '.graft', 'checkup-scheduler.log');
const CHECKUP_SCRIPT = resolve(process.cwd(), 'scripts', 'nightly-checkup.ts');

// ============================================================================
// Node-based Interval Scheduler
// ============================================================================

/**
 * Calculate milliseconds until next scheduled time.
 */
function msUntilNextRun(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Run the Node-based interval scheduler.
 * This runs in the background and executes checkup at the scheduled time.
 */
async function runNodeScheduler(hour: number, minute: number): Promise<void> {
  console.log(`Starting Node-based checkup scheduler...`);
  console.log(`Scheduled time: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

  const checkupScript = CHECKUP_SCRIPT;

  const runCheckup = async () => {
    console.log(`\n[${new Date().toISOString()}] Running scheduled checkup...`);

    try {
      // Use spawn to run the checkup script
      const child = spawn('pnpm', ['tsx', checkupScript], {
        stdio: 'inherit',
        shell: true,
      });

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0 || code === 1) {
            // 0 = all passed, 1 = some failed (both are valid outcomes)
            resolve();
          } else {
            reject(new Error(`Checkup exited with code ${code}`));
          }
        });
        child.on('error', reject);
      });

      console.log(`[${new Date().toISOString()}] Checkup complete.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Checkup error:`, error);
    }
  };

  // Schedule first run
  const msToFirst = msUntilNextRun(hour, minute);
  console.log(`First checkup in ${Math.round(msToFirst / 1000 / 60)} minutes.`);

  // Set up recurring timer
  const scheduleNext = () => {
    const msToNext = msUntilNextRun(hour, minute);
    setTimeout(async () => {
      await runCheckup();
      scheduleNext();
    }, msToNext);
  };

  // Initial schedule
  setTimeout(async () => {
    await runCheckup();
    scheduleNext();
  }, msToFirst);

  // Keep process alive
  console.log('Scheduler running. Press Ctrl+C to stop.');
  console.log(`PID file: ${PID_FILE}`);

  // Write PID file
  const pidDir = dirname(PID_FILE);
  if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
  }
  writeFileSync(PID_FILE, process.pid.toString());

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down scheduler...');
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down scheduler...');
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
    process.exit(0);
  });

  // Keep the process running
  await new Promise(() => {}); // Never resolves
}

// ============================================================================
// System Cron (Unix)
// ============================================================================

/**
 * Install a cron job for the checkup.
 */
async function installCronJob(hour: number, minute: number): Promise<void> {
  if (platform() === 'win32') {
    throw new Error('Cron scheduling is not available on Windows. Use --method windows instead.');
  }

  const cronLine = `${minute} ${hour} * * * cd "${process.cwd()}" && pnpm tsx "${CHECKUP_SCRIPT}" >> "${LOG_FILE}" 2>&1`;

  console.log('Installing cron job...');
  console.log(`Cron line: ${cronLine}`);

  try {
    // Check if crontab exists
    const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null || echo ""');

    // Remove any existing graft-checkup entries
    const lines = currentCron.split('\n').filter(line =>
      !line.includes('nightly-checkup.ts') && !line.includes('graft-checkup')
    );

    // Add new entry
    lines.push(cronLine);

    // Install new crontab
    const newCron = lines.join('\n');
    await execAsync(`echo "${newCron}" | crontab -`);

    console.log('✓ Cron job installed successfully.');
    console.log(`Checkup will run daily at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    console.log(`Logs: ${LOG_FILE}`);
  } catch (error) {
    console.error('Failed to install cron job:', error);
    throw error;
  }
}

/**
 * Remove cron job.
 */
async function removeCronJob(): Promise<void> {
  if (platform() === 'win32') {
    return;
  }

  try {
    const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null || echo ""');
    const lines = currentCron.split('\n').filter(line =>
      !line.includes('nightly-checkup.ts') && !line.includes('graft-checkup')
    );
    const newCron = lines.join('\n');
    await execAsync(`echo "${newCron}" | crontab -`);
    console.log('✓ Cron job removed.');
  } catch (error) {
    console.error('Failed to remove cron job:', error);
  }
}

// ============================================================================
// Windows Task Scheduler
// ============================================================================

/**
 * Create a Windows scheduled task for the checkup.
 */
async function installWindowsTask(hour: number, minute: number): Promise<void> {
  if (platform() !== 'win32') {
    throw new Error('Windows Task Scheduler is only available on Windows. Use --method cron instead.');
  }

  const taskName = 'GRAFT-NightlyCheckup';

  console.log('Creating Windows scheduled task...');

  try {
    // Delete existing task if present
    await execAsync(`schtasks /delete /tn "${taskName}" /f 2>nul || echo ""`);

    // Create new task
    const command = `pnpm tsx "${CHECKUP_SCRIPT}"`;
    const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    await execAsync(
      `schtasks /create /tn "${taskName}" /tr "cmd /c cd /d ${process.cwd()} && ${command}" ` +
      `/sc daily /st ${startTime} /rl HIGHEST /f`
    );

    console.log('✓ Windows scheduled task created successfully.');
    console.log(`Task name: ${taskName}`);
    console.log(`Checkup will run daily at ${startTime}`);
    console.log('');
    console.log('To view the task:');
    console.log(`  schtasks /query /tn "${taskName}" /v`);
    console.log('');
    console.log('To run manually:');
    console.log(`  schtasks /run /tn "${taskName}"`);
  } catch (error) {
    console.error('Failed to create Windows task:', error);
    throw error;
  }
}

/**
 * Remove Windows scheduled task.
 */
async function removeWindowsTask(): Promise<void> {
  if (platform() !== 'win32') {
    return;
  }

  const taskName = 'GRAFT-NightlyCheckup';

  try {
    await execAsync(`schtasks /delete /tn "${taskName}" /f 2>nul || echo ""`);
    console.log('✓ Windows scheduled task removed.');
  } catch (error) {
    console.error('Failed to remove Windows task:', error);
  }
}

// ============================================================================
// Status and Cancel
// ============================================================================

async function showStatus(): Promise<void> {
  console.log('Checkup Scheduler Status');
  console.log('========================');
  console.log('');

  // Check Node scheduler
  if (existsSync(PID_FILE)) {
    const pid = require('fs').readFileSync(PID_FILE, 'utf-8').trim();
    console.log(`Node scheduler: Running (PID ${pid})`);
  } else {
    console.log('Node scheduler: Not running');
  }

  // Check cron (Unix)
  if (platform() !== 'win32') {
    try {
      const { stdout: currentCron } = await execAsync('crontab -l 2>/dev/null || echo ""');
      const hasCron = currentCron.includes('nightly-checkup.ts');
      console.log(`Cron job: ${hasCron ? 'Installed' : 'Not installed'}`);
    } catch {
      console.log('Cron job: Not installed');
    }
  }

  // Check Windows Task Scheduler
  if (platform() === 'win32') {
    try {
      await execAsync('schtasks /query /tn "GRAFT-NightlyCheckup" 2>nul');
      console.log('Windows task: Installed');
    } catch {
      console.log('Windows task: Not installed');
    }
  }
}

async function cancelScheduler(): Promise<void> {
  console.log('Canceling checkup scheduler...');
  console.log('');

  // Stop Node scheduler
  if (existsSync(PID_FILE)) {
    const pid = require('fs').readFileSync(PID_FILE, 'utf-8').trim();
    try {
      process.kill(parseInt(pid), 'SIGTERM');
      console.log(`✓ Stopped Node scheduler (PID ${pid})`);
    } catch {
      console.log('Node scheduler process not found (may have already stopped)');
    }
    unlinkSync(PID_FILE);
  }

  // Remove cron job
  if (platform() !== 'win32') {
    await removeCronJob();
  }

  // Remove Windows task
  if (platform() === 'win32') {
    await removeWindowsTask();
  }

  console.log('');
  console.log('All scheduled checkups canceled.');
}

// ============================================================================
// CLI
// ============================================================================

interface CliOptions {
  method: 'node' | 'cron' | 'windows';
  hour: number;
  minute: number;
  status: boolean;
  cancel: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const result: CliOptions = {
    method: 'node',
    hour: DEFAULT_HOUR,
    minute: DEFAULT_MINUTE,
    status: false,
    cancel: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--method' && args[i + 1]) {
      result.method = args[i + 1] as 'node' | 'cron' | 'windows';
      i++;
    } else if (args[i] === '--hour' && args[i + 1]) {
      result.hour = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--minute' && args[i + 1]) {
      result.minute = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--status') {
      result.status = true;
    } else if (args[i] === '--cancel') {
      result.cancel = true;
    }
  }

  return result;
}

async function main() {
  const options = parseArgs();

  if (options.status) {
    await showStatus();
    return;
  }

  if (options.cancel) {
    await cancelScheduler();
    return;
  }

  console.log('========================================');
  console.log('GRAFT Checkup Scheduler');
  console.log('========================================');
  console.log('');
  console.log(`Method: ${options.method}`);
  console.log(`Time: ${options.hour.toString().padStart(2, '0')}:${options.minute.toString().padStart(2, '0')}`);
  console.log('');

  switch (options.method) {
    case 'node':
      await runNodeScheduler(options.hour, options.minute);
      break;
    case 'cron':
      await installCronJob(options.hour, options.minute);
      break;
    case 'windows':
      await installWindowsTask(options.hour, options.minute);
      break;
    default:
      console.error(`Unknown method: ${options.method}`);
      console.log('Available methods: node, cron, windows');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Scheduler error:', error);
  process.exit(1);
});
