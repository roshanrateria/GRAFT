# Tasks: Theatre UI

## Phase 5: Polish + Deploy

### Task 7.1: Base Layout
- [ ] Create `apps/web/src/App.tsx` with main layout
- [ ] Create `apps/web/src/TopBar.tsx` with logo placeholder
- [ ] Create `apps/web/src/MainLayout.tsx` with 3-column grid
- [ ] Set up CSS variables in `apps/web/src/index.css`
- [ ] Import fonts (Cormorant Garamond, Inter, IBM Plex Mono)
- [ ] Write component tests

### Task 7.2: Heartbeat Line
- [ ] Create `apps/web/src/HeartbeatLine.tsx` with SVG
- [ ] Implement steady/erratic/flatline states
- [ ] Connect to organ state store
- [ ] Add pulse animation
- [ ] Implement reduced-motion alternative
- [ ] Verify UI-03

### Task 7.3: Organ Cards
- [ ] Create `apps/web/src/OrganCard.tsx`
- [ ] Create `apps/web/src/SlotGrid.tsx` for organ layout
- [ ] Implement status indicators (healthy/decayed/quarantined)
- [ ] Implement port visualization
- [ ] Add amputate button with confirmation
- [ ] Write component tests

### Task 7.4: Doctor's Notes Panel
- [ ] Create `apps/web/src/DoctorNotes.tsx`
- [ ] Implement streaming spec display
- [ ] Implement streaming properties display
- [ ] Implement build progress display
- [ ] Add assumption line
- [ ] Write component tests

### Task 7.5: Chart Panel
- [ ] Create `apps/web/src/ChartPanel.tsx`
- [ ] Implement timeline of ledger events
- [ ] Create `apps/web/src/VerifyButton.tsx`
- [ ] Implement chain verification trigger
- [ ] Show verification result
- [ ] Write component tests

### Task 7.6: Laboratory Overlay
- [ ] Create `apps/web/src/LaboratoryOverlay.tsx`
- [ ] Create `apps/web/src/StageGauge.tsx` for thermometer bars
- [ ] Implement sequential lighting
- [ ] Create `apps/web/src/RejectedStamp.tsx` with animation
- [ ] Implement reduced-motion alternative (static)
- [ ] Verify UI-02
- [ ] Write component tests

### Task 7.7: Consent Dialog
- [ ] Create `apps/web/src/ConsentDialog.tsx`
- [ ] Show organ preview
- [ ] Show immune report summary
- [ ] Add Transplant button
- [ ] Add Reject button
- [ ] Write component tests

### Task 7.8: Accessibility Audit
- [ ] Run axe-core on all views
- [ ] Fix contrast issues (AA minimum)
- [ ] Verify all interactive elements keyboard accessible
- [ ] Test with screen reader (basic smoke)
- [ ] Write accessibility tests (axe-core in Vitest)
- [ ] Verify UI-01

### Task 7.9: Responsive Design
- [ ] Test tablet width (768px minimum)
- [ ] Adjust layout for 2-column
- [ ] Ensure no horizontal scroll
- [ ] Test focus visibility at all sizes

## Dependencies

- Task 7.2 depends on 7.1
- Task 7.3 depends on 7.1
- Task 7.4 depends on 7.1
- Task 7.5 depends on 7.1
- Task 7.6 depends on 7.1
- Task 7.7 depends on 7.6
- Task 7.8 depends on 7.1-7.7

## Acceptance Criteria

- [ ] UI-01: WCAG AA contrast, keyboard operable
- [ ] UI-02: Reduced motion disables animations
- [ ] UI-03: Heartbeat reflects real state
- [ ] UI-04: Keyboard chimera linking
- [ ] All axe-core tests pass
