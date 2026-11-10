/**
 * Doctor Provider Types
 *
 * Defines the interface for Doctor agents that build organs from wishes.
 */

// ============================================================================
// Doctor Events
// ============================================================================

/** Types of events the Doctor can emit */
export type DoctorEventType =
  | 'assumption'
  | 'spec-start'
  | 'spec-section'
  | 'spec-complete'
  | 'properties-start'
  | 'properties-section'
  | 'properties-complete'
  | 'build-start'
  | 'build-progress'
  | 'build-complete'
  | 'immune-start'
  | 'immune-stage'
  | 'immune-pass'
  | 'immune-fail'
  | 'repair-start'
  | 'repair-complete'
  | 'consent-request'
  | 'error';

/** Event emitted by the Doctor during organ creation */
export interface DoctorEvent {
  type: DoctorEventType;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Organ Bundle
// ============================================================================

/** Organ manifest structure */
export interface OrganManifest {
  name: string;
  version: string;
  apiVersion: string;
  permissions: string[];
  ports: OrganPort[];
  slotSize: 'small' | 'medium' | 'large';
}

/** Organ port definition */
export interface OrganPort {
  name: string;
  direction: 'in' | 'out';
  schema: Record<string, unknown>;
}

/** Complete organ bundle produced by Doctor */
export interface OrganBundle {
  manifest: OrganManifest;
  indexHtml: string;
  spec?: string;
  properties?: string;
}

// ============================================================================
// Doctor Context
// ============================================================================

/** Anatomy information passed to Doctor */
export interface Anatomy {
  /** Current Nerve API version */
  apiVersion: string;
  /** Available data domains */
  dataDomains: string[];
  /** Current organs installed */
  installedOrgans: string[];
  /** User preferences */
  preferences?: Record<string, unknown>;
}

/** Spec produced by Doctor */
export interface Spec {
  /** Organ name */
  name: string;
  /** Requirements in EARS format */
  requirements: string;
  /** Design document */
  design: string;
}

/** Rejection report from immune system */
export interface RejectionReport {
  stage: string;
  reasonCode: string;
  message: string;
  source?: {
    file: string;
    line: number;
  };
}

/** Decay report for healing */
export interface DecayReport {
  organId: string;
  reason: string;
  suggestions: string[];
}

// ============================================================================
// Doctor Provider Interface
// ============================================================================

/**
 * Doctor Provider Interface
 *
 * Defines the contract for Doctor implementations.
 * Three adapters: crew, llm, replay.
 */
export interface DoctorProvider {
  /** Provider name */
  readonly name: string;

  /** Provider type */
  readonly type: 'crew' | 'llm' | 'replay';

  /**
   * Propose a spec from a user wish.
   * Yields events as the spec is developed.
   */
  proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;

  /**
   * Build an organ from a spec.
   * Yields events as the organ is built.
   */
  build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;

  /**
   * Repair an organ after rejection.
   * Yields events as repairs are made.
   */
  repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;

  /**
   * Heal a decayed organ.
   * Yields events as healing is applied.
   */
  heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
