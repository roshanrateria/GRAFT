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
  InstalledOrganInfo,
  RejectionReport,
  DecayReport,
  DoctorProvider,
} from './types.js';

// Port contract helpers
export { applyContract, normalizePorts, normalizePermissions } from './contract.js';
export type { Contract } from './contract.js';

// Providers
export {
  ReplayDoctorProvider,
  createReplayProvider,
  createReplayProviderFromFixture,
  LLMDoctorProvider,
  createLLMProvider,
  CrewDoctorProvider,
  createCrewProvider,
} from './providers/index.js';

export type { ReplayConfig, ReplayFixture, LLMConfig, CrewConfig } from './providers/index.js';

// Repair Loop
export {
  runRepairLoop,
  buildWithRepairLoop,
  MAX_REPAIR_ROUNDS,
} from './repair-loop.js';

export type {
  RepairLoopResult,
  RepairAttempt,
} from './repair-loop.js';
