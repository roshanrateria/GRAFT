/**
 * Crew Doctor Provider
 *
 * Integrates with Kiro Crew for persistent agent behavior with memory.
 *
 * BLOCKERS FOR FULL IMPLEMENTATION:
 *
 * 1. **External System Integration**: Kiro Crew runs as a separate Gateway process.
 *    This provider would need to communicate via HTTP/webhooks to the Crew Gateway.
 *    The Gateway URL and authentication token would need to be configured.
 *
 * 2. **Bot Invocation API**: Crew bots are persistent agents with their own sessions.
 *    To invoke a bot from code, we would need:
 *    - The Crew Gateway running (localhost:5476 or remote)
 *    - A valid auth token (minted via `kirocrew token`)
 *    - The bot's session ID or name
 *
 * 3. **Scheduled Jobs**: Cron jobs in Crew are configured via CLI (`kirocrew cron add`)
 *    or chat commands, not programmatically from within code.
 *    The checkup scheduling is documented in .kiro/scheduling/checkup-schedule.md.
 *
 * 4. **Memory Persistence**: Crew manages memory automatically via its semantic memory
 *    system. This provider would need to either:
 *    - Let Crew handle memory (simpler)
 *    - Sync memory files between GRAFT and Crew (more complex)
 *
 * CURRENT STATUS:
 * - LLM provider is fully functional for live organ generation
 * - Crew integration requires external Crew Gateway to be running
 * - Scheduled checkups can be configured via Crew CLI or system cron
 *
 * USAGE:
 * To use Crew integration:
 * 1. Install and start Kiro Crew Gateway: `kirocrew gateway`
 * 2. Configure the graft-doctor agent in Crew
 * 3. Set environment variables:
 *    - KIROCREW_GATEWAY_URL=http://localhost:5476
 *    - KIROCREW_TOKEN=<token from kirocrew token>
 * 4. Set DOCTOR_PROVIDER=crew
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

// ============================================================================
// Crew Provider Stub
// ============================================================================

/**
 * Crew Doctor Provider
 *
 * NOTE: This is a stub implementation. Full integration requires:
 * 1. Running Crew Gateway
 * 2. Valid authentication token
 * 3. Configured graft-doctor agent
 *
 * For now, use the LLM provider with environment variables:
 * - DOCTOR_PROVIDER=llm
 * - LLM_BASE_URL, LLM_API_KEY, DOCTOR_MODEL
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
    this.botName = config.botName ?? 'graft-doctor';
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

  // ============================================================================
  // DoctorProvider Interface (Stub Implementation)
  // ============================================================================

  async *proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    yield {
      type: 'error',
      timestamp: Date.now(),
      data: {
        message: 'Crew provider requires running Crew Gateway. Use DOCTOR_PROVIDER=llm for now.',
        code: 'CREW_NOT_CONFIGURED',
        hint: 'Install Kiro Crew and set KIROCREW_GATEWAY_URL and KIROCREW_TOKEN',
        fallback: 'Use llm provider with LLM_API_KEY',
      },
    };
  }

  async *build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    yield {
      type: 'error',
      timestamp: Date.now(),
      data: {
        message: 'Crew provider requires running Crew Gateway. Use DOCTOR_PROVIDER=llm for now.',
        code: 'CREW_NOT_CONFIGURED',
      },
    };
  }

  async *repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent> {
    yield {
      type: 'error',
      timestamp: Date.now(),
      data: {
        message: 'Crew provider requires running Crew Gateway. Use DOCTOR_PROVIDER=llm for now.',
        code: 'CREW_NOT_CONFIGURED',
      },
    };
  }

  async *heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent> {
    yield {
      type: 'error',
      timestamp: Date.now(),
      data: {
        message: 'Crew provider requires running Crew Gateway. Use DOCTOR_PROVIDER=llm for now.',
        code: 'CREW_NOT_CONFIGURED',
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Crew Doctor provider.
 *
 * NOTE: Requires running Crew Gateway. Use LLM provider as fallback.
 */
export function createCrewProvider(config: CrewConfig = {}): DoctorProvider {
  return new CrewDoctorProvider(config);
}
