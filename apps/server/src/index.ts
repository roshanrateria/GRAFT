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
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import { z } from 'zod';

import { SQLiteLedgerService } from './db/ledger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';

// Passcode for live mode (from environment, never hardcoded)
const LIVE_PASSCODE = process.env.LIVE_PASSCODE;

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

// Submit a wish
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

    // TODO: Forward to LLM provider
    // For now, return a placeholder
    return {
      mode: 'live',
      wish,
      message: 'Live wish processing not yet implemented. Connect LLM provider.',
    };
  }

  // No session token - use replay mode
  // TODO: Forward to replay provider
  return {
    mode: 'replay',
    wish,
    message: 'Replay mode active. Passcode required for live mode.',
  };
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
    ledger = new SQLiteLedgerService(join(__dirname, '..', 'data', 'ledger.db'));
  }
  return ledger;
}

// Get ledger history
fastify.get('/api/ledger/history', async (request, reply) => {
  try {
    const entries = await getLedger().getHistory();
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

// ============================================================================
// Static File Serving (Production)
// ============================================================================

// In production, serve the built frontend
const frontendDistPath = join(__dirname, '..', '..', 'web', 'dist');
try {
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
} catch {
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
