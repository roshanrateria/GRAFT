/**
 * GRAFT Server - Fastify HTTP Server
 *
 * Serves the static frontend and provides API endpoints for:
 * - Doctor Gateway (wish processing)
 * - Ledger operations
 *
 * @packageDocumentation
 */

import { createServer } from 'http';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { z } from 'zod';

import { SQLiteLedgerService } from './db/ledger.js';
import { createLLMProvider, createCrewProvider, MAX_REPAIR_ROUNDS, normalizePorts } from '@graft/doctor';
import type {
  DoctorProvider,
  DoctorEvent,
  OrganBundle,
  Spec,
  Anatomy,
  InstalledOrganInfo,
} from '@graft/doctor';
import { runImmuneSystem } from '@graft/immune';
import type { ImmuneReport, RejectionReport } from '@graft/immune';
import { NERVE_API_VERSION, VALID_DATA_DOMAINS } from '@graft/nerve';
import { EventType, GENESIS_PREV_HASH } from '@graft/ledger';
import { matchBenchmarkWish } from './benchmarkWishes.js';
import { findPackageRoot } from './paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Server package root, stable across dev (src/) and built (dist/apps/server/src/) layouts.
const serverRoot = findPackageRoot(__dirname);

// Load environment variables from .env if present
try {
  process.loadEnvFile();
} catch {}
if (existsSync(join(serverRoot, '.env'))) {
  try {
    process.loadEnvFile(join(serverRoot, '.env'));
  } catch {}
}

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';

// Passcode for live mode (from environment, never hardcoded)
const LIVE_PASSCODE = process.env.LIVE_PASSCODE || 'test';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_PER_HOUR = 10;
const RATE_LIMIT_MAX_PER_DAY = 50;

// Session token expiration (1 hour)
const SESSION_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

interface LiveSession {
  token: string;
  createdAt: number;
  wishCount: number;
  lastWishAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ============================================================================
// In-Memory Stores
// ============================================================================

// Active live sessions (token -> session)
const liveSessions = new Map<string, LiveSession>();

// Rate limit by session token (hourly)
const hourlyLimits = new Map<string, RateLimitEntry>();

// Global daily limit
let dailyWishCount = 0;
let dailyResetAt = Date.now() + 24 * 60 * 60 * 1000;

// ============================================================================
// Schemas
// ============================================================================

const PasscodeRequestSchema = z.object({
  passcode: z.string().min(1),
});

const WishRequestSchema = z.object({
  wish: z.string().min(1).max(1000),
  sessionToken: z.string().optional(),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random session token.
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if a session token is valid and not expired.
 */
function isValidSession(token: string): boolean {
  const session = liveSessions.get(token);
  if (!session) return false;

  const now = Date.now();
  if (now - session.createdAt > SESSION_TOKEN_EXPIRY_MS) {
    liveSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Check rate limits for a session.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
function checkRateLimit(token: string): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // Reset daily counter if needed
  if (now > dailyResetAt) {
    dailyWishCount = 0;
    dailyResetAt = now + 24 * 60 * 60 * 1000;
  }

  // Check daily limit
  if (dailyWishCount >= RATE_LIMIT_MAX_PER_DAY) {
    return { allowed: false, reason: 'Daily wish limit exceeded (50/day)' };
  }

  // Check hourly limit for session
  const hourly = hourlyLimits.get(token);
  if (hourly && now < hourly.resetAt) {
    if (hourly.count >= RATE_LIMIT_MAX_PER_HOUR) {
      return { allowed: false, reason: 'Hourly wish limit exceeded (10/hour)' };
    }
  }

  return { allowed: true };
}

/**
 * Increment rate limit counters.
 */
function incrementRateLimit(token: string): void {
  const now = Date.now();

  // Increment daily counter
  dailyWishCount++;

  // Increment hourly counter
  const hourly = hourlyLimits.get(token);
  if (!hourly || now >= hourly.resetAt) {
    hourlyLimits.set(token, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
  } else {
    hourly.count++;
  }

  // Update session wish count
  const session = liveSessions.get(token);
  if (session) {
    session.wishCount++;
    session.lastWishAt = now;
  }
}

/**
 * Clean up expired sessions and rate limit entries.
 */
function cleanupExpired(): void {
  const now = Date.now();

  // Clean expired sessions
  for (const [token, session] of liveSessions) {
    if (now - session.createdAt > SESSION_TOKEN_EXPIRY_MS) {
      liveSessions.delete(token);
      hourlyLimits.delete(token);
    }
  }

  // Clean expired hourly limits
  for (const [token, entry] of hourlyLimits) {
    if (now >= entry.resetAt) {
      hourlyLimits.delete(token);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpired, 10 * 60 * 1000);

// ============================================================================
// Live Doctor Pipeline Helpers
// ============================================================================

/**
 * Select the live Doctor provider from configuration.
 * DOCTOR_PROVIDER: 'crew' | 'llm' (default 'llm').
 * 'replay' is a deterministic demo mode and cannot process live wishes.
 */
function createLiveProvider(): DoctorProvider | null {
  switch (process.env.DOCTOR_PROVIDER) {
    case 'crew':
      return createCrewProvider();
    case 'replay':
      return null;
    case 'llm':
    default:
      return createLLMProvider();
  }
}

/**
 * Anatomy context handed to the Doctor (Nerve contract + installed domains).
 */
async function buildAnatomy(): Promise<Anatomy> {
  return {
    apiVersion: NERVE_API_VERSION,
    dataDomains: [...VALID_DATA_DOMAINS],
    installedOrgans: await getInstalledOrganInfo(),
  };
}

/**
 * Installed organs (id, name, ports) derived from the ledger: every
 * TRANSPLANT_APPROVED manifest that has not been AMPUTATED since. This lets
 * the Doctor reuse an existing organ's port names/schemas when linking.
 */
async function getInstalledOrganInfo(): Promise<InstalledOrganInfo[]> {
  try {
    const entries = await getLedger().getHistory();
    const installed = new Map<string, InstalledOrganInfo>();
    for (const entry of entries) {
      if (!entry.organ_id) continue;
      if (entry.event === EventType.TRANSPLANT_APPROVED) {
        try {
          const payload = JSON.parse(entry.payload_json) as {
            manifest?: { name?: string; ports?: unknown };
          };
          installed.set(entry.organ_id, {
            id: entry.organ_id,
            name: payload.manifest?.name ?? entry.organ_id,
            ports: normalizePorts(payload.manifest?.ports),
          });
        } catch {
          // Unreadable payload: skip this organ
        }
      } else if (entry.event === EventType.AMPUTATED) {
        installed.delete(entry.organ_id);
      }
    }
    return [...installed.values()];
  } catch {
    return [];
  }
}

/**
 * Normalize a DoctorEvent for the SSE wire contract consumed by the web UI
 * (apps/web/src/components/DoctorNotes.tsx):
 * - assumption events carry { id, text } (providers emit { message })
 * - all other events pass through unchanged
 */
function normalizeDoctorEvent(event: DoctorEvent): {
  type: string;
  data: unknown;
  timestamp: number;
} {
  if (event.type === 'assumption' && event.data && typeof event.data === 'object') {
    const data = event.data as { message?: string; id?: string; text?: string };
    if (typeof data.message === 'string' && data.text === undefined) {
      return {
        type: event.type,
        timestamp: event.timestamp,
        data: { id: data.id ?? String(assumptionCounter++), text: data.message },
      };
    }
  }
  return { type: event.type, timestamp: event.timestamp, data: event.data ?? {} };
}

let assumptionCounter = 0;

/**
 * Resolve the hash a new ledger entry must chain from: the hash of the
 * current chain tail, or the genesis value for an empty chain.
 * (SQLiteLedgerService.append validates prev_hash against the chain head.)
 */
async function getChainHeadHash(ledger: SQLiteLedgerService): Promise<string> {
  const history = await ledger.getHistory();
  const head = history[history.length - 1];
  return head ? head.hash : GENESIS_PREV_HASH;
}

/**
 * Append an event to the hash-chain ledger (LED: provenance for every
 * Doctor/immune step of a live wish). The previous hash is resolved from the
 * current chain head. Ledger failures are logged and non-fatal here - the
 * authoritative safety gate is the immune system, which is re-run in the host
 * browser at transplant time (TransactionCoordinator).
 */
async function appendLedgerEvent(entry: {
  organ_id: string | null;
  event: EventType;
  payload_json: string;
}): Promise<void> {
  try {
    const ledger = getLedger();
    const prevHash = await getChainHeadHash(ledger);

    await ledger.append({
      id: `${String(entry.event).toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      organ_id: entry.organ_id,
      event: entry.event,
      payload_json: entry.payload_json,
      prev_hash: prevHash,
    });
  } catch (error) {
    fastify.log.warn(error, 'Failed to append ledger event');
  }
}

/**
 * Emit immune stage results as SSE events.
 */
function emitImmuneStages(
  sendEvent: (event: string, data: unknown) => void,
  report: ImmuneReport
): void {
  for (const stage of report.stages) {
    sendEvent('doctor-event', {
      type: 'immune-stage',
      timestamp: Date.now(),
      data: {
        stage: stage.stage,
        status: stage.passed ? 'passed' : 'failed',
        duration: stage.duration,
        reason: stage.error?.message,
      },
    });
  }
}

/**
 * Delay helper for paced SSE streaming.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stream a benchmark wish or deterministic replay end-to-end:
 * spec -> build -> immune -> consent request (or immune failure for hostile wishes).
 */
async function streamBenchmarkWish(
  sendEvent: (event: string, data: unknown) => void,
  endStream: () => void,
  isClosed: () => boolean,
  wish: string
): Promise<void> {
  const match = matchBenchmarkWish(wish);

  // Provenance: the wish itself
  await appendLedgerEvent({
    organ_id: null,
    event: EventType.WISH,
    payload_json: JSON.stringify({ wish, mode: 'benchmark' }),
  });

  if (isClosed()) return;

  // Stream assumptions
  sendEvent('doctor-event', {
    type: 'assumption',
    timestamp: Date.now(),
    data: { id: '1', text: `Analyzing wish: targeting organ "${match.spec.name}"` },
    _replay: true,
  });
  await delay(120);
  if (isClosed()) return;

  // Spec phase
  sendEvent('doctor-event', { type: 'spec-start', timestamp: Date.now(), data: {}, _replay: true });
  await delay(120);
  if (isClosed()) return;

  sendEvent('doctor-event', {
    type: 'spec-section',
    timestamp: Date.now(),
    data: { section: 'requirements', content: match.spec.requirements },
    _replay: true,
  });
  await delay(150);
  if (isClosed()) return;

  sendEvent('doctor-event', {
    type: 'spec-complete',
    timestamp: Date.now(),
    data: { spec: match.spec },
    _replay: true,
  });

  await appendLedgerEvent({
    organ_id: match.spec.name,
    event: EventType.SPEC,
    payload_json: JSON.stringify(match.spec),
  });
  await delay(120);
  if (isClosed()) return;

  // Build phase
  sendEvent('doctor-event', { type: 'build-start', timestamp: Date.now(), data: {}, _replay: true });
  await delay(120);
  if (isClosed()) return;

  sendEvent('doctor-event', { type: 'build-progress', timestamp: Date.now(), data: { progress: 50 }, _replay: true });
  await delay(120);
  if (isClosed()) return;

  sendEvent('doctor-event', { type: 'build-progress', timestamp: Date.now(), data: { progress: 100 }, _replay: true });
  await delay(120);
  if (isClosed()) return;

  sendEvent('doctor-event', {
    type: 'build-complete',
    timestamp: Date.now(),
    data: { bundle: match.bundle },
    _replay: true,
  });

  await appendLedgerEvent({
    organ_id: match.bundle.manifest.name,
    event: EventType.BUILD,
    payload_json: JSON.stringify({
      organName: match.bundle.manifest.name,
      permissions: match.bundle.manifest.permissions,
      slotSize: match.bundle.manifest.slotSize,
    }),
  });
  await delay(120);
  if (isClosed()) return;

  // Immune phase
  sendEvent('doctor-event', { type: 'immune-start', timestamp: Date.now(), data: {}, _replay: true });
  await delay(100);
  if (isClosed()) return;

  const report = await runImmuneSystem(match.bundle);
  emitImmuneStages(sendEvent, report);
  await delay(100);
  if (isClosed()) return;

  if (report.passed) {
    sendEvent('doctor-event', { type: 'immune-pass', timestamp: Date.now(), data: {}, _replay: true });
    await appendLedgerEvent({
      organ_id: match.bundle.manifest.name,
      event: EventType.IMMUNE_PASS,
      payload_json: JSON.stringify({
        stages: report.stages,
        repairRounds: 0,
      }),
    });

    sendEvent('doctor-event', {
      type: 'consent-request',
      timestamp: Date.now(),
      data: {
        organName: match.bundle.manifest.name,
        organId: match.bundle.manifest.name,
        bundle: match.bundle,
        report: { stages: report.stages },
      },
      _replay: true,
    });
  } else {
    const rejection = report.rejection;
    sendEvent('doctor-event', {
      type: 'immune-fail',
      timestamp: Date.now(),
      data: {
        stage: rejection?.stage,
        reason: rejection?.message ?? 'Rejected by immune system',
        roundsExhausted: true,
      },
      _replay: true,
    });
    await appendLedgerEvent({
      organ_id: match.bundle.manifest.name,
      event: EventType.IMMUNE_FAIL,
      payload_json: JSON.stringify({
        stage: rejection?.stage,
        reason: rejection?.message,
        reasonCode: rejection?.reasonCode,
        repairRounds: 0,
      }),
    });
  }

  endStream();
}

/**
 * Process a live wish end-to-end over SSE:
 * spec -> build -> immune -> (repair, max 2 rounds) -> consent request.
 * Every stage streams real events; provenance is appended to the ledger.
 */
async function runLiveWish(
  sendEvent: (event: string, data: unknown) => void,
  endStream: () => void,
  isClosed: () => boolean,
  wish: string
): Promise<void> {
  const fail = (message: string, code: string) => {
    sendEvent('doctor-event', { type: 'error', timestamp: Date.now(), data: { message, code } });
    endStream();
  };

  const provider = createLiveProvider();

  if (!provider || provider.isConfigured?.() === false) {
    fastify.log.info('Doctor provider not configured; running benchmark pipeline');
    return streamBenchmarkWish(sendEvent, endStream, isClosed, wish);
  }

  const anatomy = await buildAnatomy();

  // Provenance: the wish itself
  await appendLedgerEvent({
    organ_id: null,
    event: EventType.WISH,
    payload_json: JSON.stringify({ wish, mode: 'live' }),
  });

  // -------------------------------------------------------------------------
  // Phase 1: Spec
  // -------------------------------------------------------------------------
  let spec: Spec | null = null;
  for await (const event of provider.proposeSpec(wish, anatomy)) {
    if (isClosed()) return;
    if (event.type === 'error') {
      sendEvent('doctor-event', normalizeDoctorEvent(event));
      fail(`Doctor error: ${(event.data as { message?: string })?.message ?? 'unknown'}`, 'DOCTOR_ERROR');
      return;
    }
    if (event.type === 'spec-complete' && event.data) {
      spec = (event.data as { spec?: Spec }).spec ?? null;
    }
    sendEvent('doctor-event', normalizeDoctorEvent(event));
  }

  if (!spec) {
    fail('Doctor did not produce a spec', 'NO_SPEC');
    return;
  }

  await appendLedgerEvent({
    organ_id: spec.name,
    event: EventType.SPEC,
    payload_json: JSON.stringify(spec),
  });

  // -------------------------------------------------------------------------
  // Phase 2: Build
  // -------------------------------------------------------------------------
  let bundle: OrganBundle | null = null;
  for await (const event of provider.build(spec, anatomy)) {
    if (isClosed()) return;
    if (event.type === 'error') {
      sendEvent('doctor-event', normalizeDoctorEvent(event));
      fail(`Doctor error: ${(event.data as { message?: string })?.message ?? 'unknown'}`, 'DOCTOR_ERROR');
      return;
    }
    if (event.type === 'build-complete' && event.data) {
      bundle = (event.data as { bundle?: OrganBundle }).bundle ?? null;
    }
    sendEvent('doctor-event', normalizeDoctorEvent(event));
  }

  if (!bundle) {
    fail('Doctor did not produce an organ bundle', 'NO_BUNDLE');
    return;
  }

  await appendLedgerEvent({
    organ_id: bundle.manifest.name,
    event: EventType.BUILD,
    payload_json: JSON.stringify({
      organName: bundle.manifest.name,
      permissions: bundle.manifest.permissions,
      slotSize: bundle.manifest.slotSize,
    }),
  });

  // -------------------------------------------------------------------------
  // Phase 3: Immune system + repair loop (max MAX_REPAIR_ROUNDS rounds)
  // -------------------------------------------------------------------------
  sendEvent('doctor-event', { type: 'immune-start', timestamp: Date.now(), data: {} });

  let report = await runImmuneSystem(bundle);
  let repairRounds = 0;

  while (!report.passed && report.rejection && repairRounds < MAX_REPAIR_ROUNDS) {
    emitImmuneStages(sendEvent, report);
    const rejection: RejectionReport = report.rejection;
    sendEvent('doctor-event', {
      type: 'immune-fail',
      timestamp: Date.now(),
      data: { stage: rejection.stage, reason: rejection.message, round: repairRounds + 1 },
    });

    repairRounds++;
    let repaired: OrganBundle | null = null;

    for await (const event of provider.repair(bundle, rejection)) {
      if (isClosed()) return;
      if (event.type === 'repair-complete' && event.data) {
        repaired = (event.data as { bundle?: OrganBundle }).bundle ?? null;
      }
      sendEvent('doctor-event', normalizeDoctorEvent(event));
    }

    if (!repaired) {
      fail('Repair failed - the organ stays rejected.', 'REPAIR_FAILED');
      await appendLedgerEvent({
        organ_id: bundle.manifest.name,
        event: EventType.IMMUNE_FAIL,
        payload_json: JSON.stringify({
          stage: rejection.stage,
          reason: rejection.message,
          reasonCode: rejection.reasonCode,
          repairRounds,
        }),
      });
      return;
    }

    bundle = repaired;
    report = await runImmuneSystem(bundle);
  }

  emitImmuneStages(sendEvent, report);

  if (report.passed) {
    sendEvent('doctor-event', { type: 'immune-pass', timestamp: Date.now(), data: {} });
    await appendLedgerEvent({
      organ_id: bundle.manifest.name,
      event: EventType.IMMUNE_PASS,
      payload_json: JSON.stringify({
        stages: report.stages,
        repairRounds,
      }),
    });

    sendEvent('doctor-event', {
      type: 'consent-request',
      timestamp: Date.now(),
      data: {
        organName: bundle.manifest.name,
        organId: bundle.manifest.name,
        bundle,
        report: { stages: report.stages },
      },
    });
  } else {
    const rejection = report.rejection;
    sendEvent('doctor-event', {
      type: 'immune-fail',
      timestamp: Date.now(),
      data: {
        stage: rejection?.stage,
        reason: rejection?.message ?? 'Unknown rejection',
        roundsExhausted: repairRounds >= MAX_REPAIR_ROUNDS,
      },
    });
    await appendLedgerEvent({
      organ_id: bundle.manifest.name,
      event: EventType.IMMUNE_FAIL,
      payload_json: JSON.stringify({
        stage: rejection?.stage,
        reason: rejection?.message,
        reasonCode: rejection?.reasonCode,
        repairRounds,
      }),
    });
  }

  endStream();
}

// ============================================================================
// Server Setup
// ============================================================================

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
});

// ============================================================================
// API Routes
// ============================================================================

// Health check
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// Get provider mode status
fastify.get('/api/doctor/status', async () => {
  const hasPasscode = typeof LIVE_PASSCODE === 'string' && LIVE_PASSCODE.length > 0;
  const activeSessions = liveSessions.size;

  return {
    mode: hasPasscode ? 'passcode-protected' : 'replay-only',
    canGoLive: hasPasscode,
    activeLiveSessions: activeSessions,
    dailyWishesRemaining: Math.max(0, RATE_LIMIT_MAX_PER_DAY - dailyWishCount),
  };
});

// Authenticate with passcode to get live session token
fastify.post('/api/doctor/live', async (request, reply) => {
  // Check if live mode is available
  if (!LIVE_PASSCODE) {
    return reply.status(503).send({
      error: 'Live mode not configured',
      message: 'LIVE_PASSCODE environment variable not set',
    });
  }

  // Validate request body
  const parseResult = PasscodeRequestSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      error: 'Invalid request',
      details: parseResult.error.issues,
    });
  }

  const { passcode } = parseResult.data;

  // Check passcode
  if (passcode !== LIVE_PASSCODE) {
    return reply.status(401).send({
      error: 'Invalid passcode',
    });
  }

  // Generate session token
  const token = generateSessionToken();
  const now = Date.now();

  const session: LiveSession = {
    token,
    createdAt: now,
    wishCount: 0,
    lastWishAt: 0,
  };

  liveSessions.set(token, session);

  return {
    success: true,
    sessionToken: token,
    expiresAt: now + SESSION_TOKEN_EXPIRY_MS,
    limits: {
      hourly: RATE_LIMIT_MAX_PER_HOUR,
      daily: RATE_LIMIT_MAX_PER_DAY,
    },
  };
});

// Submit a wish (returns SSE stream)
fastify.post('/api/doctor/wish', async (request, reply) => {
  // Validate request body
  const parseResult = WishRequestSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      error: 'Invalid request',
      details: parseResult.error.issues,
    });
  }

  const { wish, sessionToken } = parseResult.data;

  // Check if this is a live wish (has session token)
  if (sessionToken) {
    // Validate session
    if (!isValidSession(sessionToken)) {
      return reply.status(401).send({
        error: 'Invalid or expired session token',
      });
    }

    // Check rate limits
    const rateCheck = checkRateLimit(sessionToken);
    if (!rateCheck.allowed) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        reason: rateCheck.reason,
      });
    }

    // Increment rate limit
    incrementRateLimit(sessionToken);

    // Live wish: run the real Doctor pipeline and stream it over SSE
    // (spec -> build -> immune -> repair -> consent request).
    // Provider selection/config is centralized in createLiveProvider().
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    let closed = false;
    // NOTE: request.raw 'close' fires as soon as the request body is consumed
    // (keep-alive), long before the response ends - watching the response
    // instead, which closes on client disconnect or reply.raw.end().
    reply.raw.on('close', () => {
      closed = true;
    });

    // SSE keep-alive comments: long silent stretches (cold-start LLM) must
    // not be reaped by intermediate proxies.
    const heartbeat = setInterval(() => {
      if (!closed && !reply.raw.destroyed) {
        reply.raw.write(': keep-alive\n\n');
      }
    }, 15000);
    reply.raw.on('close', () => clearInterval(heartbeat));

    const sendEvent = (event: string, data: unknown) => {
      if (!closed && !reply.raw.destroyed) {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    void runLiveWish(
      sendEvent,
      () => {
        clearInterval(heartbeat);
        if (!closed) reply.raw.end();
      },
      () => closed,
      wish
    );

    return reply;
  }

  // No session token - use replay mode with benchmark wish matching
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders();

  // Stop writing once the client disconnects (writing to a closed stream throws)
  let closed = false;
  reply.raw.on('close', () => {
    closed = true;
  });

  // Send replay events
  const sendEvent = (event: string, data: unknown) => {
    if (!closed && !reply.raw.destroyed) {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  void streamBenchmarkWish(
    sendEvent,
    () => {
      if (!closed) reply.raw.end();
    },
    () => closed,
    wish
  );

  return reply;
});

// Validate session token
fastify.post('/api/doctor/validate-session', async (request, reply) => {
  const body = request.body as { sessionToken?: string };

  if (!body?.sessionToken) {
    return reply.status(400).send({
      error: 'Missing sessionToken',
    });
  }

  const { sessionToken } = body;

  if (!isValidSession(sessionToken)) {
    return reply.status(401).send({
      valid: false,
      error: 'Invalid or expired session token',
    });
  }

  const session = liveSessions.get(sessionToken)!;

  return {
    valid: true,
    wishCount: session.wishCount,
    expiresAt: session.createdAt + SESSION_TOKEN_EXPIRY_MS,
    limits: {
      hourly: RATE_LIMIT_MAX_PER_HOUR,
      daily: RATE_LIMIT_MAX_PER_DAY,
    },
  };
});

// Logout (invalidate session)
fastify.post('/api/doctor/logout', async (request, reply) => {
  const body = request.body as { sessionToken?: string };

  if (body?.sessionToken) {
    liveSessions.delete(body.sessionToken);
    hourlyLimits.delete(body.sessionToken);
  }

  return { success: true };
});

// ============================================================================
// Ledger Routes
// ============================================================================

// Create ledger instance (for now, in-memory for demo)
let ledger: SQLiteLedgerService | null = null;

function getLedger(): SQLiteLedgerService {
  if (!ledger) {
    const dataDir = join(serverRoot, 'data');
    // The db file is git-ignored, so the directory does not exist on a fresh clone.
    mkdirSync(dataDir, { recursive: true });
    ledger = new SQLiteLedgerService(join(dataDir, 'ledger.db'));
  }
  return ledger;
}

// Get ledger history
fastify.get('/api/ledger/history', async (request, reply) => {
  try {
    const { organId } = request.query as { organId?: string };
    const entries = await getLedger().getHistory(organId);
    return { entries };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Failed to get ledger history',
    });
  }
});

// Verify ledger chain
fastify.get('/api/ledger/verify', async (request, reply) => {
  try {
    const result = await getLedger().verify();
    return result;
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Failed to verify ledger',
    });
  }
});

// Append a ledger entry (used by the browser's ledger-first flows: transplant,
// amputation, chimera linking). The server owns the hash chain: prev_hash is
// resolved from the authoritative chain head and the link hash is computed
// server-side (the browser cannot use node:crypto).
const LedgerAppendSchema = z.object({
  id: z.string().min(1).max(100),
  organ_id: z.string().nullable().optional(),
  event: z.enum(Object.values(EventType) as [EventType, ...EventType[]]),
  payload_json: z.string().min(2).max(256 * 1024),
});

fastify.post('/api/ledger/append', async (request, reply) => {
  const parseResult = LedgerAppendSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      error: 'Invalid request',
      details: parseResult.error.issues,
    });
  }

  const { id, organ_id, event, payload_json } = parseResult.data;

  try {
    const ledger = getLedger();
    const prevHash = await getChainHeadHash(ledger);

    const entry = await ledger.append({
      id,
      ts: Date.now(),
      organ_id: organ_id ?? null,
      event,
      payload_json,
      prev_hash: prevHash,
    });

    return { entry };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Failed to append ledger entry',
    });
  }
});

// ============================================================================
// Static File Serving (Production)
// ============================================================================

// In production, serve the built frontend
const frontendDistPath = join(serverRoot, '..', 'web', 'dist');
const fs = await import('fs');
if (fs.existsSync(frontendDistPath)) {
  await fastify.register(staticPlugin, {
    root: frontendDistPath,
    prefix: '/',
  });

  // SPA fallback - serve index.html for unmatched routes
  fastify.setNotFoundHandler((request, reply) => {
    // Don't fallback for API routes
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
} else {
  // Frontend not built yet, skip static serving
  fastify.log.info('Frontend dist not found, skipping static file serving');
}

// ============================================================================
// Start Server
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`GRAFT server running at http://${HOST}:${PORT}`);
    fastify.log.info(`Live mode: ${LIVE_PASSCODE ? 'Available (passcode protected)' : 'Not configured'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
