# Timer Widget Organ Specification

## Overview

A countdown timer widget with alarm functionality. Users can set a duration and receive visual and audio feedback when the timer completes.

## Requirements

### Functional Requirements

- **REQ-1**: The organ SHALL display a countdown timer with hours, minutes, and seconds
- **REQ-2**: The organ SHALL allow users to set custom duration (up to 24 hours)
- **REQ-3**: The organ SHALL provide start, pause, and reset controls
- **REQ-4**: The organ SHALL emit an alarm when the countdown reaches zero
- **REQ-5**: The organ SHALL emit the remaining time to an output port

### Non-Functional Requirements

- **NFR-1**: Timer accuracy SHALL be within 100ms of actual time
- **NFR-2**: The organ SHALL use injected time via Nerve API (not Date.now())
- **NFR-3**: The organ SHALL respect prefers-reduced-motion for animations

## Design

### UI Components

1. **Timer Display**: Large digital display showing HH:MM:SS
2. **Duration Input**: Fields for hours, minutes, seconds
3. **Control Buttons**: Start, Pause, Reset
4. **Alarm Indicator**: Visual flash when timer completes

### Permissions Required

- `read:timer.state` - Read persisted timer state (optional)
- `emit:timerComplete` - Emit when timer reaches zero
- `emit:timerTick` - Emit current remaining time every second

### Output Ports

- **timerComplete** (object): Emitted when timer reaches zero
  - `{ duration: number, completedAt: timestamp }`
- **timerTick** (object): Emitted every second while running
  - `{ remaining: number, total: number }`

### Nerve API Usage

- Use `tick` messages for time updates (injected time)
- Use `emit` for output ports
- Handle `init` for initial configuration

## Styling

Uses Tissue Kit design tokens:
- `--color-background`: Deep black (#0e0b0b)
- `--color-surface`: Warm dark (#17120f)
- `--color-bone`: Cream text (#e9e1d0)
- `--color-brass`: Metallic accent (#b08d57)
- `--color-vein-green`: Running indicator (#6f9a7d)
- `--color-alert`: Alarm indicator (#c4472f)

## Accessibility

- All controls keyboard accessible
- Visual indicators not solely color-dependent
- ARIA labels for timer state
- Focus management for alarm notification
