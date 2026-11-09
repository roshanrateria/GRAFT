# 08: Demo Mode

## Overview

Demo features for the hackathon presentation. One-click controls to showcase key moments.

---

## Requirements

### DEM-01: Hostile Organ Injection [EX]
THE SYSTEM SHALL provide a one-click "Hostile organ" injection for the adversarial demo.

### DEM-02: Fast-forward the Night [EX]
THE SYSTEM SHALL provide "Fast-forward the night" to run a checkup immediately.

### DEM-03: Reset to Seeded State [EX]
THE SYSTEM SHALL reset to the seeded state with one click.

---

## Demo Controls Panel

### Location
Bottom-right corner, collapsible

### Buttons

#### 1. Hostile Organ Injection
- Injects one of the 6 hostile organs randomly
- Or select specific hostile organ from dropdown
- Shows full rejection flow:
  - Doctor builds (or replay)
  - Immune system rejects
  - REJECTED stamp with reason

#### 2. Fast-forward the Night
- Triggers `scripts/checkup.ts`
- Shows progress indicator
- Displays results:
  - X organs passed
  - Y organs failed (if any)
- If any failed, shows healing proposal

#### 3. Decay Simulator Toggle
- Switches API version: v1 ↔ v2
- Causes v1 organs to fail next checkup
- Shows decay + heal flow

#### 4. Reset to Seeded State
- Removes all transplanted organs
- Clears ledger (keeps genesis entry)
- Resets data to seeded state
- Confirmation dialog before reset

---

## Replay Mode

### Purpose
Deterministic demos without LLM calls or costs

### Activation
- Select "Use replay mode" toggle
- Shows "REPLAY" badge in UI

### Behavior
- All Doctor output comes from recorded replays
- Timing is realistic (streaming delays)
- Same output every time

### Labeling
DOC-05 requires replay mode to be labeled:
- Badge in Doctor's Notes header
- Footer note: "Running in replay mode for demonstration"

---

## Demo Script

### Wish 1: Mood Graph (35s)
1. Enter wish: "Show a graph of how my mood changed this month"
2. Watch case file stream
3. Four immune gauges light
4. Consent dialog appears
5. Click Transplant
6. Mood Weather organ appears in slot

### Adversarial: Hostile Organ (25s)
1. Click "Hostile organ" injection
2. Select obfuscated fetch organ
3. Watch immune system run
4. REJECTED stamp shows
5. Reason: "Banned construct: computed window access at line 47"

### Chimera: Link Organs (25s)
1. Drag thread from Mood organ output
2. Drop on new Habits organ input
3. Thread animates with pulse
4. Data flows between organs

### Decay Demo (35s)
1. Enable Decay Simulator
2. Click "Fast-forward the night"
3. Organs fail checkup
4. Doctor proposes healing
5. Review and approve
6. Organs work again

### Amputation (10s)
1. Click Amputate on an organ
2. Confirm
3. Organ disappears
4. Click "Verify chain" - shows green
