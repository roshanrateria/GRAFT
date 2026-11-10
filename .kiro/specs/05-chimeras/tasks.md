# Tasks: Chimeras

## Phase 4: Accountability

### Task 5.1: Chimera Types
- [ ] Create `packages/nerve/src/chimera/types.ts` with Link, LinkRegistry types
- [ ] Create `packages/nerve/src/chimera/schema-check.ts` for compatibility checking
- [ ] Write unit tests for schema compatibility

### Task 5.2: Cycle Detection
- [ ] Create `packages/nerve/src/chimera/cycle-detect.ts`
- [ ] Implement cycle detection algorithm
- [ ] Write PBT for CHI-02 (cycle prevention)
- [ ] Include adversarial cases (long chains, multiple branches)

### Task 5.3: Link Registry
- [ ] Create `apps/web/src/LinkRegistry.ts`
- [ ] Implement add/remove/query operations
- [ ] Integrate cycle detection
- [ ] Write tests

### Task 5.4: Chimera Router
- [ ] Create `apps/web/src/ChimeraRouter.ts`
- [ ] Route emit() to linked organ's in()
- [ ] Implement per-link rate limiting
- [ ] Write tests

### Task 5.5: Link Cleanup on Amputation
- [x] Update `apps/web/src/AmputationService.ts` from Task 4.5
- [x] Remove all links involving amputated organ
- [x] Write CHIMERA_LINKED ledger entries for removal
- [x] Verify CHI-03

### Task 5.6: Chimera UI - Mouse
- [ ] Create `apps/web/src/ChimeraThread.tsx` for drag interaction
- [ ] Implement port highlighting
- [ ] Implement drag-to-link
- [ ] Show incompatible ports dimmed
- [ ] Write component tests

### Task 5.7: Chimera UI - Keyboard
- [ ] Add keyboard interaction to `apps/web/src/ChimeraThread.tsx`
- [ ] Tab navigation between ports
- [ ] Enter to select, Escape to cancel
- [ ] Verify UI-04 (keyboard chimera linking)

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

- [ ] PBT CHI-01 passes: schema compatibility enforced
- [ ] PBT CHI-02 passes: cycles rejected
- [ ] CHI-03: links removed on amputation
- [ ] UI-04: keyboard-only chimera linking works
