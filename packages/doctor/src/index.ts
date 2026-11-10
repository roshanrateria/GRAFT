/**
 * @graft/doctor - Doctor Provider Package
 *
 * Defines the interface for Doctor agents that build organs from wishes.
 * Three adapters: crew, llm, replay.
 *
 * @packageDocumentation
 */

// Types
export type {
  DoctorEventType,
  DoctorEvent,
  OrganManifest,
  OrganPort,
  OrganBundle,
  Anatomy,
  Spec,
  RejectionReport,
  DecayReport,
  DoctorProvider,
} from './types.js';

// Providers
export {
  ReplayDoctorProvider,
  createReplayProvider,
  createReplayProviderFromFixture,
} from './providers/index.js';

export type { ReplayConfig, ReplayFixture } from './providers/index.js';
