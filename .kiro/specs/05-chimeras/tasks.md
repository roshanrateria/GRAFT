# Tasks: Chimeras

## Phase 4: Accountability

### Task 5.1: Chimera Types
- [ ] Create `packages/nerve/src/chimera/types.ts` with Link, LinkRegistry types (packages/nerve/src/chimera/ does not exist; link types live in apps/web/src/stores/creatureStore.ts)
- [ ] Create `packages/nerve/src/chimera/schema-check.ts` for compatibility checking (implemented as schemasCompatible in apps/web/src/ChimeraLinking.ts; 3 tests still fail)
- [ ] Write unit tests for schema compatibility (apps/web/src/__tests__/chimera-linking.test.ts exists but 3 tests fail)

### Task 5.2: Cycle Detection
- [ ] Create `packages/nerve/src/chimera/cycle-detect.ts` (not created; wouldCreateCycle is in apps/web/src/ChimeraLinking.ts)
- [x] Implement cycle detection algorithm (wouldCreateCycle, hasPath in ChimeraLinking.ts)
- [ ] Write PBT for CHI-02 (cycle prevention) (example tests only, no fast-check property)
- [ ] Include adversarial cases (long chains, multiple branches) (direct, multi-hop and self-link examples only)

### Task 5.3: Link Registry
- [ ] Create `apps/web/src/LinkRegistry.ts` (not created; links are stored in creatureStore.chimeraLinks)
- [x] Implement add/remove/query operations (creatureStore and createChimeraLink)
- [x] Integrate cycle detection (validateLink uses wouldCreateCycle)
- [x] Write tests (chimera-linking.test.ts)

### Task 5.4: Chimera Router
- [ ] Create `apps/web/src/ChimeraRouter.ts` (not created; routing is routeEmit in apps/web/src/host/OrganRuntime.ts)
- [x] Route emit() to linked organ's in() (routeEmit in host/OrganRuntime.ts)
- [ ] Implement per-link rate limiting (only the per-organ NerveHost rate limit exists)
- [ ] Write tests

### Task 5.5: Link Cleanup on Amputation
- [x] Update `apps/web/src/AmputationService.ts` from Task 4.5
- [x] Remove all links involving amputated organ
- [ ] Write CHIMERA_LINKED ledger entries for removal (not verified)
- [x] Verify CHI-03

### Task 5.6: Chimera UI - Mouse
- [ ] Create `apps/web/src/ChimeraThread.tsx` for drag interaction
- [ ] Implement port highlighting
- [ ] Implement drag-to-link
- [ ] Show incompatible ports dimmed
- [ ] Write component tests

### Task 5.7: Chimera UI - Keyboard
- [ ] Add keyboard interaction to `apps/web/src/ChimeraThread.tsx`
- [x] Tab navigation between ports (OrganSlot.tsx)
- [x] Enter to select, Escape to cancel (OrganSlot.tsx)
- [x] Verify UI-04 (keyboard chimera linking)

### Task 5.8: Thread Visualization
- [ ] Create `apps/web/src/ThreadSVG.tsx` for rendering threads
- [ ] Animate pulse in data flow direction
- [ ] Color-code health status
- [ ] Write tests

## Dependencies

- Task 5.3 depends on 5.1, 5.2
- Task 5.4 depends on 5.3
- Task 5.5 depends on 5.3
- Task 5.6 depends on 5.3
- Task 5.7 depends on 5.6

## Acceptance Criteria

- [ ] PBT CHI-01 passes: schema compatibility enforced (3 CHI-01 tests fail; no fast-check property)
- [ ] PBT CHI-02 passes: cycles rejected (implemented with example tests only)
- [x] CHI-03: links removed on amputation (creatureStore.removeOrgan)
- [x] UI-04: keyboard-only chimera linking works
