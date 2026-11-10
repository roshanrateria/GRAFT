/**
 * Replay Doctor Provider
 *
 * Plays back recorded Doctor outputs from fixtures/replays/*.json
 * with realistic streaming delays. Used for deterministic tests and demos.
 *
 * Implements DOC-05: Labels replay output.
 */
import type { DoctorProvider, DoctorEvent, OrganBundle, Anatomy, Spec, RejectionReport, DecayReport } from '../types.js';
/** Configuration for replay provider */
export interface ReplayConfig {
    /** Path to replay fixture file */
    fixturePath?: string;
    /** Delay between events in milliseconds */
    eventDelayMs?: number;
    /** Whether to add REPLAY tag to events */
    labelReplay?: boolean;
    /** Fixture data (for inline creation) */
    fixture?: ReplayFixture;
}
/** Recorded Doctor session */
export interface ReplayFixture {
    /** Original wish that was processed */
    wish: string;
    /** Recorded events */
    events: DoctorEvent[];
    /** Final organ bundle if successful */
    bundle?: OrganBundle;
    /** Whether organ passed immune system */
    passed?: boolean;
}
/**
 * Replay Doctor Provider
 *
 * Plays back pre-recorded Doctor sessions for deterministic testing.
 */
export declare class ReplayDoctorProvider implements DoctorProvider {
    readonly name: string;
    readonly type: "replay";
    private fixture;
    private eventDelayMs;
    private labelReplay;
    constructor(config?: ReplayConfig);
    /**
     * Set fixture data directly (for testing or deferred loading).
     */
    setFixture(fixture: ReplayFixture): void;
    /**
     * Get current fixture.
     */
    getFixture(): ReplayFixture;
    /**
     * Play back events with delay.
     */
    private playbackEvents;
    /**
     * Add REPLAY label to an event.
     */
    private labelEvent;
    /**
     * Delay helper.
     */
    private delay;
    proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;
    heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
/**
 * Create a replay Doctor provider.
 */
export declare function createReplayProvider(config?: ReplayConfig): DoctorProvider;
/**
 * Create a replay provider from fixture data (for testing).
 */
export declare function createReplayProviderFromFixture(fixture: ReplayFixture): DoctorProvider;
//# sourceMappingURL=replay.d.ts.map