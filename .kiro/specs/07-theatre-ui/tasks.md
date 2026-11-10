# Tasks: Theatre UI

## Phase 5: Polish + Deploy

### Task 7.1: Base Layout
- [x] Create `apps/web/src/App.tsx` with main layout
- [x] Create `apps/web/src/TopBar.tsx` with logo placeholder
- [x] Create `apps/web/src/MainLayout.tsx` with 3-column grid
- [x] Set up CSS variables in `apps/web/src/index.css`
- [x] Import fonts (Cormorant Garamond, Inter, IBM Plex Mono)
- [x] Write component tests

### Task 7.2: Heartbeat Line
- [x] Create `apps/web/src/HeartbeatLine.tsx` with SVG
- [x] Implement steady/erratic/flatline states
- [x] Connect to organ state store
- [x] Add pulse animation
- [x] Implement reduced-motion alternative
- [x] Verify UI-03

### Task 7.3: Organ Cards
- [x] Create `apps/web/src/OrganCard.tsx`
- [x] Create `apps/web/src/SlotGrid.tsx` for organ layout
- [x] Implement status indicators (healthy/decayed/quarantined)
- [x] Implement port visualization
- [x] Add amputate button with confirmation
- [x] Write component tests

### Task 7.4: Doctor's Notes Panel
- [x] Create `apps/web/src/DoctorNotes.tsx`
- [x] Implement streaming spec display
- [x] Implement streaming properties display
- [x] Implement build progress display
- [x] Add assumption line
- [x] Write component tests

### Task 7.5: Chart Panel
- [x] Create `apps/web/src/ChartPanel.tsx`
- [x] Implement timeline of ledger events
- [x] Create `apps/web/src/VerifyButton.tsx`
- [x] Implement chain verification trigger
- [x] Show verification result
- [x] Write component tests

### Task 7.6: Laboratory Overlay
- [x] Create `apps/web/src/LaboratoryOverlay.tsx`
- [x] Create `apps/web/src/StageGauge.tsx` for thermometer bars
- [x] Implement sequential lighting
- [x] Create `apps/web/src/RejectedStamp.tsx` with animation
- [x] Implement reduced-motion alternative (static)
- [x] Verify UI-02
- [x] Write component tests

### Task 7.7: Consent Dialog
- [x] Create `apps/web/src/ConsentDialog.tsx`
- [x] Show organ preview
- [x] Show immune report summary
- [x] Add Transplant button
- [x] Add Reject button
- [x] Write component tests

### Task 7.8: Accessibility Audit
- [x] Run axe-core on all views
- [x] Fix contrast issues (AA minimum)
- [x] Verify all interactive elements keyboard accessible
- [x] Test with screen reader (basic smoke)
- [x] Write accessibility tests (axe-core in Vitest)
- [x] Verify UI-01

### Task 7.9: Responsive Design
- [x] Test tablet width (768px minimum)
- [x] Adjust layout for 2-column
- [x] Ensure no horizontal scroll
- [x] Test focus visibility at all sizes

## Dependencies

- Task 7.2 depends on 7.1
- Task 7.3 depends on 7.1
- Task 7.4 depends on 7.1
- Task 7.5 depends on 7.1
- Task 7.6 depends on 7.1
- Task 7.7 depends on 7.6
- Task 7.8 depends on 7.1-7.7

## Acceptance Criteria

- [x] UI-01: WCAG AA contrast, keyboard operable
- [x] UI-02: Reduced motion disables animations
- [x] UI-03: Heartbeat reflects real state
- [x] UI-04: Keyboard chimera linking
- [x] All axe-core tests pass
