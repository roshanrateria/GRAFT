/**
 * Nerve API Host Implementation
 *
 * Routes messages between organs and the Creature, enforcing permissions,
 * rate limits, and payload size constraints.
 *
 * @see docs/NERVE_API.md
 * @see packages/nerve/src/schemas.ts
 */

import {
  NERVE_API_VERSION,
  safeValidateOrganToHostMessage,
  type HostToOrganMessage,
  type OrganToHostMessage,
  type InitMessage,
  type Theme,
  type Permission,
  RATE_LIMIT_PER_SECOND,
  MAX_PAYLOAD_BYTES,
} from '@graft/nerve';

// ============================================================================
// Types
// ============================================================================

/**
 * Function to get data from a domain.
 */
export type DataProvider = (path: string) => unknown;

/**
 * Function to update organ status in the store.
 */
export type StatusUpdater = (organId: string, status: 'active' | 'quarantined' | 'decayed') => void;

/**
 * Function to send a message to the organ iframe.
 */
export type MessageSender = (message: HostToOrganMessage) => void;

/**
 * Configuration for creating a NerveHost.
 */
export interface NerveHostConfig {
  /** Unique identifier for the organ */
  organId: string;
  /** Permissions granted to this organ */
  granted: Permission[];
  /** Current theme */
  theme: Theme;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Function to get data from domains */
  dataProvider: DataProvider;
  /** Function to update organ status */
  statusUpdater: StatusUpdater;
  /** Function to send messages to the organ */
  messageSender: MessageSender;
  /** Optional time provider (defaults to Date.now) */
  timeProvider?: () => number;
}

/**
 * Internal state for tracking an organ's message rate.
 */
interface RateLimitState {
  /** Timestamps of recent messages */
  timestamps: number[];
}

/**
 * Result of handling an incoming message.
 */
export type MessageResult =
  | { success: true }
  | { success: false; reason: 'invalid_schema' | 'rate_limited' | 'payload_too_large' | 'permission_denied' };

// ============================================================================
// NerveHost Class
// ============================================================================

/**
 * Nerve API Host for a single organ.
 *
 * Handles:
 * - Message validation (NRV-01)
 * - Rate limiting (NRV-02)
 * - API version checking (NRV-03)
 * - Permission enforcement
 * - Payload size checking
 */
export class NerveHost {
  private readonly organId: string;
  private readonly granted: Set<string>;
  private readonly theme: Theme;
  private readonly reducedMotion: boolean;
  private readonly dataProvider: DataProvider;
  private readonly statusUpdater: StatusUpdater;
  private readonly messageSender: MessageSender;
  private readonly timeProvider: () => number;

  private state: 'loading' | 'handshake' | 'active' | 'quarantined' | 'decayed' = 'loading';
  private rateLimitState: RateLimitState = { timestamps: [] };
  // Reserved for future use in pending read tracking
  private _pendingReads: Map<string, { path: string; timestamp: number }> = new Map();

  constructor(config: NerveHostConfig) {
    this.organId = config.organId;
    this.granted = new Set(config.granted);
    this.theme = config.theme;
    this.reducedMotion = config.reducedMotion;
    this.dataProvider = config.dataProvider;
    this.statusUpdater = config.statusUpdater;
    this.messageSender = config.messageSender;
    this.timeProvider = config.timeProvider ?? (() => Date.now());
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Start the handshake by sending init message.
   */
  startHandshake(): void {
    const initMessage: InitMessage = {
      type: 'init',
      apiVersion: NERVE_API_VERSION,
      theme: this.theme,
      reducedMotion: this.reducedMotion,
      granted: Array.from(this.granted) as Permission[],
    };
    this.state = 'handshake';
    this.messageSender(initMessage);
  }

  /**
   * Handle an incoming message from the organ.
   *
   * @param rawMessage - The raw message data from postMessage
   * @returns Result indicating success or failure with reason
   */
  handleMessage(rawMessage: unknown): MessageResult {
    // Check payload size first
    const payloadSize = this.calculatePayloadSize(rawMessage);
    if (payloadSize > MAX_PAYLOAD_BYTES) {
      return { success: false, reason: 'payload_too_large' };
    }

    // Validate message schema (NRV-01)
    const parseResult = safeValidateOrganToHostMessage(rawMessage);
    if (!parseResult.success) {
      return { success: false, reason: 'invalid_schema' };
    }

    const message = parseResult.data;

    // Check rate limit (NRV-02)
    if (!this.checkRateLimit()) {
      this.quarantine();
      return { success: false, reason: 'rate_limited' };
    }

    // Handle message based on type
    this.processMessage(message as OrganToHostMessage);

    return { success: true };
  }

  /**
   * Send a tick message with the current time.
   */
  sendTick(): void {
    if (this.state !== 'active') return;

    this.messageSender({
      type: 'tick',
      now: this.timeProvider(),
    });
  }

  /**
   * Send data to a linked organ (chimera).
   */
  sendIn(port: string, payload: unknown): void {
    if (this.state !== 'active') return;

    this.messageSender({
      type: 'in',
      port,
      payload,
    });
  }

  /**
   * Get current state of the organ.
   */
  getState(): 'loading' | 'handshake' | 'active' | 'quarantined' | 'decayed' {
    return this.state;
  }

  /**
   * Check if organ is healthy (active or in handshake).
   */
  isHealthy(): boolean {
    return this.state === 'active' || this.state === 'handshake' || this.state === 'loading';
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Process a validated message.
   */
  private processMessage(message: OrganToHostMessage): void {
    switch (message.type) {
      case 'hello':
        this.handleHello(message.apiVersion);
        break;
      case 'read':
        this.handleRead(message.id, message.path);
        break;
      case 'emit':
        this.handleEmit(message.port, message.payload as unknown | undefined);
        break;
      case 'resize':
        this.handleResize(message.height);
        break;
    }
  }

  /**
   * Handle hello message - complete handshake.
   * NRV-03: Mark organ decayed if API version mismatches.
   */
  private handleHello(apiVersion: string): void {
    if (apiVersion !== NERVE_API_VERSION) {
      this.decay();
      return;
    }

    this.state = 'active';
    this.statusUpdater(this.organId, 'active');
  }

  /**
   * Handle read message - return data if permitted.
   */
  private handleRead(id: string, path: string): void {
    if (this.state !== 'active') return;

    // Check permission
    const permission: Permission = `read:${path}` as Permission;
    if (!this.granted.has(permission)) {
      // Permission denied - don't send data
      return;
    }

    // Get data from provider
    const value = this.dataProvider(path);

    // Send response
    this.messageSender({
      type: 'data',
      id,
      value,
    });
  }

  /**
   * Handle emit message - output to port if permitted.
   */
  private handleEmit(port: string, _payload: unknown): void {
    if (this.state !== 'active') return;

    // Check permission
    const permission: Permission = `emit:${port}` as Permission;
    if (!this.granted.has(permission)) {
      return;
    }

    // In a full implementation, this would route to linked organs
    // For now, we just validate and acknowledge
    // TODO: Implement chimera routing
  }

  /**
   * Handle resize message.
   */
  private handleResize(_height: number): void {
    if (this.state !== 'active') return;

    // In a full implementation, this would resize the iframe
    // For now, we just acknowledge the message
    // TODO: Implement iframe resize
  }

  /**
   * Check and update rate limit.
   * Returns true if within limit, false if exceeded.
   */
  private checkRateLimit(): boolean {
    const now = this.timeProvider();
    const windowStart = now - 1000; // 1 second window

    // Remove old timestamps
    this.rateLimitState.timestamps = this.rateLimitState.timestamps.filter(
      ts => ts > windowStart
    );

    // Check if within limit
    if (this.rateLimitState.timestamps.length >= RATE_LIMIT_PER_SECOND) {
      return false;
    }

    // Add current timestamp
    this.rateLimitState.timestamps.push(now);
    return true;
  }

  /**
   * Calculate the size of a payload in bytes.
   */
  private calculatePayloadSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // If serialization fails, estimate based on string length
      return String(data).length * 2; // UTF-16 characters
    }
  }

  /**
   * Quarantine the organ (NRV-02).
   */
  private quarantine(): void {
    this.state = 'quarantined';
    this.statusUpdater(this.organId, 'quarantined');
  }

  /**
   * Mark organ as decayed (NRV-03).
   */
  private decay(): void {
    this.state = 'decayed';
    this.statusUpdater(this.organId, 'decayed');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a NerveHost for an organ iframe.
 *
 * @param config - Host configuration
 * @returns Configured NerveHost instance
 */
export function createNerveHost(config: NerveHostConfig): NerveHost {
  return new NerveHost(config);
}
