/**
 * Replay Doctor Provider
 *
 * Plays back recorded Doctor outputs from fixtures/replays/*.json
 * with realistic streaming delays. Used for deterministic tests and demos.
 *
 * Implements DOC-05: Labels replay output.
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
// Replay Configuration
// ============================================================================

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

// ============================================================================
// Replay Provider
// ============================================================================

/**
 * Replay Doctor Provider
 *
 * Plays back pre-recorded Doctor sessions for deterministic testing.
 */
export class ReplayDoctorProvider implements DoctorProvider {
  readonly name: string;
  readonly type = 'replay' as const;

  private fixture: ReplayFixture;
  private eventDelayMs: number;
  private labelReplay: boolean;

  constructor(config: ReplayConfig = {}) {
    this.name = `replay:${config.fixturePath || 'inline'}`;
    this.eventDelayMs = config.eventDelayMs ?? 100;
    this.labelReplay = config.labelReplay ?? true;

    // Use provided fixture or create empty one
    if (config.fixture) {
      this.fixture = config.fixture;
    } else {
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
  setFixture(fixture: ReplayFixture): void {
    this.fixture = fixture;
  }

  /**
   * Get current fixture.
   */
  getFixture(): ReplayFixture {
    return this.fixture;
  }

  /**
   * Play back events with delay.
   */
  private async *playbackEvents(): AsyncGenerator<DoctorEvent> {
    for (const event of this.fixture.events) {
      // Add realistic delay
      await this.delay(this.eventDelayMs);

      // Add REPLAY label if configured
      if (this.labelReplay) {
        yield this.labelEvent(event);
      } else {
        yield event;
      }
    }
  }

  /**
   * Add REPLAY label to an event.
   */
  private labelEvent(event: DoctorEvent): DoctorEvent {
    const data = event.data as Record<string, unknown> | undefined;
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
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // DoctorProvider Interface
  // ============================================================================

  async *proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
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

  async *build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
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

  async *repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent> {
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

  async *heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent> {
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
export function createReplayProvider(config: ReplayConfig = {}): DoctorProvider {
  return new ReplayDoctorProvider(config);
}

/**
 * Create a replay provider from fixture data (for testing).
 */
export function createReplayProviderFromFixture(fixture: ReplayFixture): DoctorProvider {
  return new ReplayDoctorProvider({
    eventDelayMs: 0, // No delay for tests
    labelReplay: true,
    fixture,
  });
}
