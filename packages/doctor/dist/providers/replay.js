/**
 * Replay Doctor Provider
 *
 * Plays back recorded Doctor outputs from fixtures/replays/*.json
 * with realistic streaming delays. Used for deterministic tests and demos.
 *
 * Implements DOC-05: Labels replay output.
 */
// ============================================================================
// Replay Provider
// ============================================================================
/**
 * Replay Doctor Provider
 *
 * Plays back pre-recorded Doctor sessions for deterministic testing.
 */
export class ReplayDoctorProvider {
    name;
    type = 'replay';
    fixture;
    eventDelayMs;
    labelReplay;
    constructor(config = {}) {
        this.name = `replay:${config.fixturePath || 'inline'}`;
        this.eventDelayMs = config.eventDelayMs ?? 100;
        this.labelReplay = config.labelReplay ?? true;
        // Use provided fixture or create empty one
        if (config.fixture) {
            this.fixture = config.fixture;
        }
        else {
            // Create empty fixture (will need to be set later)
            this.fixture = {
                wish: '',
                events: [],
                passed: false,
            };
        }
    }
    /**
     * Set fixture data directly (for testing or deferred loading).
     */
    setFixture(fixture) {
        this.fixture = fixture;
    }
    /**
     * Get current fixture.
     */
    getFixture() {
        return this.fixture;
    }
    /**
     * Play back events with delay.
     */
    async *playbackEvents() {
        for (const event of this.fixture.events) {
            // Add realistic delay
            await this.delay(this.eventDelayMs);
            // Add REPLAY label if configured
            if (this.labelReplay) {
                yield this.labelEvent(event);
            }
            else {
                yield event;
            }
        }
    }
    /**
     * Add REPLAY label to an event.
     */
    labelEvent(event) {
        const data = event.data;
        return {
            ...event,
            data: {
                ...(data || {}),
                _replay: true,
            },
        };
    }
    /**
     * Delay helper.
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // ============================================================================
    // DoctorProvider Interface
    // ============================================================================
    async *proposeSpec(wish, anatomy) {
        // Yield a replay label event first
        yield {
            type: 'assumption',
            timestamp: Date.now(),
            data: {
                message: '📋 REPLAY MODE - Using recorded Doctor output',
                _replay: true,
            },
        };
        // Play back recorded events
        yield* this.playbackEvents();
    }
    async *build(spec, anatomy) {
        yield {
            type: 'build-start',
            timestamp: Date.now(),
            data: { _replay: true },
        };
        yield* this.playbackEvents();
        // Yield final bundle if available
        if (this.fixture.bundle) {
            yield {
                type: 'build-complete',
                timestamp: Date.now(),
                data: { bundle: this.fixture.bundle, _replay: true },
            };
        }
    }
    async *repair(bundle, report) {
        yield {
            type: 'repair-start',
            timestamp: Date.now(),
            data: { report, _replay: true },
        };
        yield* this.playbackEvents();
        yield {
            type: 'repair-complete',
            timestamp: Date.now(),
            data: { _replay: true },
        };
    }
    async *heal(bundle, decay) {
        yield {
            type: 'assumption',
            timestamp: Date.now(),
            data: {
                message: `Healing decayed organ: ${decay.organId}`,
                _replay: true,
            },
        };
        yield* this.playbackEvents();
    }
}
// ============================================================================
// Factory Function
// ============================================================================
/**
 * Create a replay Doctor provider.
 */
export function createReplayProvider(config = {}) {
    return new ReplayDoctorProvider(config);
}
/**
 * Create a replay provider from fixture data (for testing).
 */
export function createReplayProviderFromFixture(fixture) {
    return new ReplayDoctorProvider({
        eventDelayMs: 0, // No delay for tests
        labelReplay: true,
        fixture,
    });
}
//# sourceMappingURL=replay.js.map