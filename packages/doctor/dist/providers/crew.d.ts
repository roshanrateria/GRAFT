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
 *    The checkup scheduling is implemented via scripts/schedule-checkup.ts.
 *
 * 4. **Memory Persistence**: Crew manages memory automatically via its semantic memory
 *    system. This provider would need to either:
 *    - Let Crew handle memory (simpler)
 *    - Sync memory files between GRAFT and Crew (more complex)
 *
 * CURRENT STATUS:
 * - LLM provider is fully functional for live organ generation
 * - Crew integration requires external Crew Gateway to be running
 * - Scheduled checkups are implemented via scripts/nightly-checkup.ts
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
 * NIGHT DOCTOR (Scheduled Checkup):
 * The Night Doctor runs scheduled checkups on all installed organs.
 * It is implemented as a standalone script (scripts/nightly-checkup.ts)
 * that can be scheduled via:
 * - Node-based interval scheduler: `pnpm tsx scripts/schedule-checkup.ts --method node`
 * - System cron (Unix): `pnpm tsx scripts/schedule-checkup.ts --method cron`
 * - Windows Task Scheduler: `pnpm tsx scripts/schedule-checkup.ts --method windows`
 *
 * The checkup script makes no LLM calls and costs no credits.
 *
 * @packageDocumentation
 */
import type { DoctorProvider, DoctorEvent, OrganBundle, Anatomy, Spec, RejectionReport, DecayReport } from '../types.js';
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
export declare class CrewDoctorProvider implements DoctorProvider {
    readonly name: string;
    readonly type: "crew";
    private gatewayUrl;
    private token;
    private botName;
    private timeout;
    constructor(config?: CrewConfig);
    /**
     * Check if the Crew Gateway is available.
     */
    isAvailable(): Promise<boolean>;
    /**
     * Check if the provider is configured.
     */
    isConfigured(): boolean;
    proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;
    heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
/**
 * Create a Crew Doctor provider.
 *
 * NOTE: Requires running Crew Gateway. Use LLM provider as fallback.
 */
export declare function createCrewProvider(config?: CrewConfig): DoctorProvider;
//# sourceMappingURL=crew.d.ts.map