# Tasks: Creature and Nerve API

## Phase 1: Core Infrastructure

### Task 1.1: Nerve API Types and Schemas
- [x] Create `packages/nerve/src/types.ts` with message type definitions
- [x] Create `packages/nerve/src/schemas.ts` with zod schemas for all messages
- [x] Create `packages/nerve/src/protocol.ts` with protocol constants
- [x] Write unit tests for schema validation

### Task 1.2: Tissue Kit
- [x] Create `packages/nerve/src/tissue.ts` with CSS tokens and chart helpers
- [x] Create `packages/nerve/src/tissue.css` with base styles
- [x] Write tests for tissue helpers

### Task 1.3: Data Seed Generator
- [x] Create `apps/server/src/seed.ts` with deterministic data generator
- [x] Generate 90 days of plausible mood, tasks, habits, calendar data
- [x] Use seeded RNG for reproducibility
- [x] Write tests verifying determinism

### Task 1.4: Creature Core
- [x] Create `apps/web/src/Creature.tsx` with slot grid component
- [x] Create `apps/web/src/DataStore.ts` with Zustand store
- [x] Create `apps/web/src/SandboxHost.tsx` for iframe management
- [x] Write component tests

### Task 1.5: Nerve API Host
- [x] Create `apps/web/src/NerveHost.ts` with message router
- [x] Implement permission checking
- [x] Implement rate limiting (20 msg/sec)
- [x] Implement payload size check (16 KB max)
- [x] Write unit tests

### Task 1.6: Mood Weather Reference Organ
- [x] Create `organs/handwritten/mood-weather/manifest.json`
- [x] Create `organs/handwritten/mood-weather/index.html`
- [x] Create `organs/handwritten/mood-weather/spec.md`
- [x] Create `organs/handwritten/mood-weather/properties.js`
- [x] Verify it renders in sandbox and reads seeded data

## Dependencies

- Task 1.5 depends on 1.1 and 1.4
- Task 1.6 depends on 1.1, 1.2, 1.3, 1.4, 1.5

## Acceptance Criteria

- [x] Mood Weather organ renders in sandbox
- [x] Organ can read seeded mood data via Nerve API
- [x] Rate limiting works (quarantine after 20 msg/sec)
- [x] API version mismatch marks organ as decayed
