/**
 * Crew Doctor Provider
 *
 * Integrates with Kiro Crew for persistent agent behavior with memory.
 *
 * INTEGRATION CONTRACT:
 *
 * The Kiro Crew Gateway runs as a separate process (default: localhost:5476)
 * and exposes a REST API. This provider speaks that API directly:
 *
 * 1. `GET  {gatewayUrl}/api/health`
 *    - 200 when the Gateway is up.
 *
 * 2. `POST {gatewayUrl}/api/bots/{botName}/invocations`
 *    - Headers: `Authorization: Bearer {KIROCREW_TOKEN}`
 *    - Body: `{ input: string, context?: object }`
 *    - Response: one of
 *        `{ reply: string }`                  - plain text reply
 *        `{ output: string }`                 - plain text reply (alt key)
 *        `{ events: DoctorEvent[] }`          - structured event stream
 *      Unknown fields are ignored; the first recognized shape wins.
 *
 * Configuration (environment variables):
 * - KIROCREW_GATEWAY_URL (default http://localhost:5476)
 * - KIROCREW_TOKEN       (token minted via `kirocrew token`)
 * - KIROCREW_BOT         (bot name, default graft-doctor)
 *
 * USAGE:
 * 1. Install and start the Crew Gateway: `kirocrew gateway`
 * 2. Configure the graft-doctor agent in Crew
 * 3. Set the environment variables above
 * 4. Set DOCTOR_PROVIDER=crew
 *
 * SCHEDULED CHECKUPS (Night Doctor):
 * Checkups run without any Doctor provider and cost no credits.
 * See scripts/nightly-checkup.ts (scheduled via scripts/schedule-checkup.ts).
 *
 * @packageDocumentation
 */

import type {
  DoctorProvider,
  DoctorEvent,
  OrganBundle,
  Anatomy,
  Spec,
  RejectionReport,
  DecayReport,
} from '../types.js';
import { applyContract, normalizePorts, normalizePermissions } from '../contract.js';

// ============================================================================
// Crew Configuration
// ============================================================================

/** Configuration for Crew provider */
export interface CrewConfig {
  /** Crew Gateway URL (defaults to localhost:5476) */
  gatewayUrl?: string;
  /** Auth token for Gateway */
  token?: string;
  /** Bot name or session ID */
  botName?: string;
  /** Timeout for responses (ms) */
  timeout?: number;
}

/** Shape of an invocation response from the Crew Gateway */
interface CrewInvocationResponse {
  reply?: string;
  output?: string;
  events?: DoctorEvent[];
}

// ============================================================================
// Crew Prompts
// ============================================================================

/** System instruction sent with every bot invocation */
const CREW_SYSTEM_DIRECTIVE =
  'You are the graft-doctor bot for the GRAFT Creature. Respond with valid JSON only, no prose, no markdown fences unless wrapping a single JSON object.';

const SPEC_INSTRUCTION = (wish: string, anatomy: Anatomy): string =>
  `Produce an organ spec for this wish.
Wish: "${wish}"

Anatomy context: ${JSON.stringify(anatomy)}

Include "ports": the ports the wish explicitly names as [{"name","direction":"in|out","schema":{}}], copied exactly (reuse an installed organ's port name/schema from the anatomy when the wish says to link; [] if none named), and "permissions": the permissions the wish explicitly names ([] if none).

Respond with JSON: {"organName": "<kebab-case-name>", "requirements": "<EARS-format requirements, one per line>", "design": "<design overview>", "ports": [], "permissions": []}`;

const BUILD_INSTRUCTION = (spec: Spec, anatomy: Anatomy): string =>
  `Build an organ bundle from this spec.

Name: ${spec.name}
Requirements:
${spec.requirements}

Design:
${spec.design}

Port contract (binding, use exactly, never rename or retype): ${JSON.stringify({ ports: spec.ports ?? [], permissions: spec.permissions ?? [] })}

Anatomy context: ${JSON.stringify(anatomy)}

Rules for the bundle:
- manifest.apiVersion must be "${anatomy.apiVersion}"
- "subscribe:<x>" is for data domains only (e.g. subscribe:tasks.items), never for ports. Input ports need no permission.
- Receive input-port values with nerve.onIn("<port>", fn); send with nerve.emit("<port>", value)
- Do not use <form> elements
- Read permissions MUST use exact domain names: read:mood.entries, read:tasks.items, read:habits.checkins, read:calendar.events
- Every output port requires a matching "emit:<portName>" permission
- indexHtml must be a complete self-contained HTML document that only uses the Nerve API (nerve.read(), nerve.emit(), nerve.now(), nerve.random()) - never network, storage, cookies, or parent DOM

Respond with JSON: {"manifest": {"name": "...", "version": "1.0.0", "apiVersion": "${anatomy.apiVersion}", "permissions": ["..."], "ports": [{"name": "...", "direction": "in|out", "schema": {}}], "slotSize": "small|medium|large"}, "indexHtml": "...", "properties": "<optional fast-check tests>"}`;

const REPAIR_INSTRUCTION = (bundle: OrganBundle, report: RejectionReport): string =>
  `Repair this rejected organ bundle.

Bundle: ${JSON.stringify(bundle)}

Rejection report: ${JSON.stringify(report)}

Fix exactly the reported issue. If the rejection mentions a missing "emit:X" permission, add it. If it mentions an invalid read target, use the exact domain names (mood.entries, tasks.items, habits.checkins, calendar.events).

Respond with the full corrected organ bundle JSON: {"manifest": {...}, "indexHtml": "...", "properties": "..."}`;

const HEAL_INSTRUCTION = (bundle: OrganBundle, decay: DecayReport): string =>
  `Heal this decayed organ for host compatibility.

Bundle: ${JSON.stringify(bundle)}

Decay report: ${JSON.stringify(decay)}

Respond with the updated organ bundle JSON: {"manifest": {...}, "indexHtml": "...", "properties": "..."}`;

// ============================================================================
// Crew Provider
// ============================================================================

/**
 * Crew Doctor Provider
 *
 * Real HTTP client for the Kiro Crew Gateway. All four Doctor operations are
 * implemented by invoking the configured bot and parsing its reply.
 */
export class CrewDoctorProvider implements DoctorProvider {
  readonly name: string;
  readonly type = 'crew' as const;

  private gatewayUrl: string;
  private token: string | undefined;
  private botName: string;
  private timeout: number;

  constructor(config: CrewConfig = {}) {
    this.gatewayUrl = config.gatewayUrl ?? process.env.KIROCREW_GATEWAY_URL ?? 'http://localhost:5476';
    this.token = config.token ?? process.env.KIROCREW_TOKEN;
    this.botName = config.botName ?? process.env.KIROCREW_BOT ?? 'graft-doctor';
    this.timeout = config.timeout ?? 60000;

    this.name = `crew:${this.botName}@${this.gatewayUrl}`;
  }

  /**
   * Check if the Crew Gateway is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/health`, {
        method: 'GET',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        signal: AbortSignal.timeout(this.timeout),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if the provider is configured.
   */
  isConfigured(): boolean {
    return typeof this.token === 'string' && this.token.length > 0;
  }

  // ==========================================================================
  // Gateway invocation
  // ==========================================================================

  /**
   * Invoke the Crew bot with a prompt and return the raw reply text.
   * Throws with a descriptive error when the Gateway is unreachable or
   * returns a non-success response.
   */
  private async invoke(input: string, context?: Record<string, unknown>): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${this.gatewayUrl}/api/bots/${encodeURIComponent(this.botName)}/invocations`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ input, ...(context ? { context } : {}) }),
        signal: AbortSignal.timeout(this.timeout),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Crew Gateway error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = (await response.json().catch(() => null)) as CrewInvocationResponse | null;

    if (!data) {
      throw new Error('Crew Gateway returned a non-JSON response');
    }

    if (typeof data.reply === 'string') return data.reply;
    if (typeof data.output === 'string') return data.output;

    throw new Error(
      'Crew Gateway response had no reply/output field. ' +
        'Expected { reply } or { output } from POST /api/bots/{bot}/invocations.'
    );
  }

  /**
   * Parse JSON from a bot reply, handling markdown code blocks.
   */
  private parseJsonFromResponse(content: string): unknown {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
  }

  /**
   * Build a normalized error event for a failed Gateway interaction.
   */
  private gatewayError(error: unknown, code: string): DoctorEvent {
    const message = error instanceof Error ? error.message : String(error);
    const unavailable =
      message.includes('fetch failed') ||
      message.includes('ECONNREFUSED') ||
      message.includes('TIMEOUT') ||
      message.includes('timeout');

    return {
      type: 'error',
      timestamp: Date.now(),
      data: unavailable
        ? {
            message: `Crew Gateway not reachable at ${this.gatewayUrl}. Start it with \`kirocrew gateway\`.`,
            code: 'CREW_GATEWAY_UNAVAILABLE',
            hint: `Set KIROCREW_GATEWAY_URL and KIROCREW_TOKEN, or use DOCTOR_PROVIDER=llm.`,
          }
        : { message, code },
    };
  }

  // ==========================================================================
  // DoctorProvider Interface
  // ==========================================================================

  async *proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          message: 'Crew provider requires a token. Set KIROCREW_TOKEN.',
          code: 'CREW_NOT_CONFIGURED',
          hint: 'Mint a token via `kirocrew token` and set KIROCREW_GATEWAY_URL.',
          fallback: 'Use llm provider with LLM_API_KEY',
        },
      };
      return;
    }

    yield {
      type: 'assumption',
      timestamp: Date.now(),
      data: { message: `Dispatching wish to Crew bot '${this.botName}'` },
    };

    yield { type: 'spec-start', timestamp: Date.now(), data: {} };

    try {
      const reply = await this.invoke(`${CREW_SYSTEM_DIRECTIVE}\n\n${SPEC_INSTRUCTION(wish, anatomy)}`, {
        kind: 'propose-spec',
      });

      const parsed = this.parseJsonFromResponse(reply) as {
        organName?: string;
        requirements?: string;
        design?: string;
        ports?: unknown;
        permissions?: unknown;
      };

      if (typeof parsed.requirements === 'string') {
        yield {
          type: 'spec-section',
          timestamp: Date.now(),
          data: { section: 'requirements', content: parsed.requirements },
        };
      }

      yield {
        type: 'spec-complete',
        timestamp: Date.now(),
        data: {
          spec: {
            name: parsed.organName ?? 'unnamed-organ',
            requirements: parsed.requirements ?? '',
            design: parsed.design ?? '',
            ports: normalizePorts(parsed.ports),
            permissions: normalizePermissions(parsed.permissions),
          },
        },
      };
    } catch (error) {
      yield this.gatewayError(error, 'CREW_SPEC_ERROR');
    }
  }

  async *build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          message: 'Crew provider requires a token. Set KIROCREW_TOKEN.',
          code: 'CREW_NOT_CONFIGURED',
        },
      };
      return;
    }

    yield { type: 'build-start', timestamp: Date.now(), data: {} };
    yield {
      type: 'build-progress',
      timestamp: Date.now(),
      data: { step: `Invoking Crew bot '${this.botName}'`, progress: 10 },
    };

    try {
      const reply = await this.invoke(`${CREW_SYSTEM_DIRECTIVE}\n\n${BUILD_INSTRUCTION(spec, anatomy)}`, {
        kind: 'build-organ',
      });

      yield {
        type: 'build-progress',
        timestamp: Date.now(),
        data: { step: 'Parsing organ bundle...', progress: 80 },
      };

      const parsed = this.parseJsonFromResponse(reply) as {
        manifest?: OrganBundle['manifest'];
        indexHtml?: string;
        properties?: string;
      };

      const bundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? {
            name: spec.name,
            version: '1.0.0',
            apiVersion: anatomy.apiVersion,
            permissions: [],
            ports: [],
            slotSize: 'medium',
          },
          indexHtml: parsed.indexHtml ?? '',
          properties: parsed.properties,
          spec: `${spec.requirements}\n\n${spec.design}`,
        },
        spec
      );

      yield {
        type: 'build-complete',
        timestamp: Date.now(),
        data: { bundle },
      };
    } catch (error) {
      yield this.gatewayError(error, 'CREW_BUILD_ERROR');
    }
  }

  async *repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent> {
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          message: 'Crew provider requires a token. Set KIROCREW_TOKEN.',
          code: 'CREW_NOT_CONFIGURED',
        },
      };
      return;
    }

    yield { type: 'repair-start', timestamp: Date.now(), data: { report } };

    try {
      const reply = await this.invoke(
        `${CREW_SYSTEM_DIRECTIVE}\n\n${REPAIR_INSTRUCTION(bundle, report)}`,
        { kind: 'repair-organ' }
      );

      const parsed = this.parseJsonFromResponse(reply) as Partial<OrganBundle>;

      const repairedBundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? bundle.manifest,
          indexHtml: parsed.indexHtml ?? bundle.indexHtml,
          properties: parsed.properties ?? bundle.properties,
          spec: parsed.spec ?? bundle.spec,
        },
        { ports: bundle.manifest.ports }
      );

      yield {
        type: 'repair-complete',
        timestamp: Date.now(),
        data: { bundle: repairedBundle },
      };
    } catch (error) {
      yield this.gatewayError(error, 'CREW_REPAIR_ERROR');
    }
  }

  async *heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent> {
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          message: 'Crew provider requires a token. Set KIROCREW_TOKEN.',
          code: 'CREW_NOT_CONFIGURED',
        },
      };
      return;
    }

    yield {
      type: 'assumption',
      timestamp: Date.now(),
      data: { message: `Healing decayed organ: ${decay.organId}` },
    };

    try {
      const reply = await this.invoke(
        `${CREW_SYSTEM_DIRECTIVE}\n\n${HEAL_INSTRUCTION(bundle, decay)}`,
        { kind: 'heal-organ' }
      );

      const parsed = this.parseJsonFromResponse(reply) as Partial<OrganBundle>;

      const healedBundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? bundle.manifest,
          indexHtml: parsed.indexHtml ?? bundle.indexHtml,
          properties: parsed.properties ?? bundle.properties,
          spec: parsed.spec ?? bundle.spec,
        },
        { ports: bundle.manifest.ports }
      );

      yield {
        type: 'build-complete',
        timestamp: Date.now(),
        data: { bundle: healedBundle },
      };
    } catch (error) {
      yield this.gatewayError(error, 'CREW_HEAL_ERROR');
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Crew Doctor provider.
 *
 * Requires a running Crew Gateway and a token (KIROCREW_TOKEN).
 * Use the LLM provider as the live alternative.
 */
export function createCrewProvider(config: CrewConfig = {}): DoctorProvider {
  return new CrewDoctorProvider(config);
}
