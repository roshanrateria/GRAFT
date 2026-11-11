/**
 * @graft/doctor - Doctor Provider Package
 *
 * Defines the interface for Doctor agents that build organs from wishes.
 * Three adapters: crew, llm, replay.
 *
 * @packageDocumentation
 */
export type { DoctorEventType, DoctorEvent, OrganManifest, OrganPort, OrganBundle, Anatomy, Spec, RejectionReport, DecayReport, DoctorProvider, } from './types.js';
export { ReplayDoctorProvider, createReplayProvider, createReplayProviderFromFixture, LLMDdoctorProvider, createLLMProvider, CrewDoctorProvider, createCrewProvider, } from './providers/index.js';
export type { ReplayConfig, ReplayFixture, LLMConfig, CrewConfig } from './providers/index.js';
export { runRepairLoop, buildWithRepairLoop, MAX_REPAIR_ROUNDS, } from './repair-loop.js';
export type { RepairLoopResult, RepairAttempt, } from './repair-loop.js';
//# sourceMappingURL=index.d.ts.map