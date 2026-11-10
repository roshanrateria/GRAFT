/**
 * @graft/doctor - Doctor Provider Package
 *
 * Defines the interface for Doctor agents that build organs from wishes.
 * Three adapters: crew, llm, replay.
 *
 * @packageDocumentation
 */
export type { DoctorEventType, DoctorEvent, OrganManifest, OrganPort, OrganBundle, Anatomy, Spec, RejectionReport, DecayReport, DoctorProvider, } from './types.js';
export { ReplayDoctorProvider, createReplayProvider, createReplayProviderFromFixture, } from './providers/index.js';
export type { ReplayConfig, ReplayFixture } from './providers/index.js';
//# sourceMappingURL=index.d.ts.map