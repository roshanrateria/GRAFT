# 07: Theatre UI

## Overview

The Surgical Theatre is the user interface for GRAFT. Victorian anatomical theatre aesthetic with modern, accessible design.

---

## Requirements

### UI-01: Accessibility [EX]
THE SYSTEM SHALL meet WCAG AA contrast and be fully keyboard operable.

### UI-02: Reduced Motion [EX]
WHILE `prefers-reduced-motion` is set, THE SYSTEM SHALL disable pulse and stamp animations.

### UI-03: Heartbeat Line [EX]
The heartbeat line SHALL reflect real checkup and quarantine state.

### UI-04: Keyboard Chimera [EX]
Chimera linking SHALL be possible by keyboard alone.

---

## Layout

### Top Bar
- Logo (GRAFT)
- Live ECG heartbeat line (SVG)
  - Steady rhythm: all organs pass checkup
  - Erratic: any organ fails checkup
  - Flatline with alert: quarantined organ

### Center: "The Specimen"
- Slot grid with organs
- Stitched seams between slots (visual)
- Organ cards with:
  - Title
  - Status (healthy/decayed/quarantined)
  - Ports (input/output)
  - Amputate button

### Left: "Doctor's Notes"
- Wish input field
- Live case file display:
  - Assumptions
  - Spec lines (streaming)
  - Properties (streaming)
  - Build progress (streaming)

### Right: "The Chart"
- Ledger timeline (scrollable)
- Event entries with timestamps
- "Verify chain" button
- Verification result indicator

### Laboratory Overlay
Appears when immune system runs:
- Four stage gauges (thermometer-style):
  1. Static Scan
  2. Manifest Check
  3. Behavioral Run
  4. Property Fuzz
- Gauges light up in sequence
- Failure: REJECTED stamp animation
  - Reason code
  - Human sentence
  - Source line
- Success: "Awaiting consent" with Transplant button

### Demo Controls
- "Hostile organ" injection button
- "Fast-forward the night" button
- Decay simulator toggle
- Reset to seeded state button
