# Design: Theatre UI

## Component Tree

```
App
├── TopBar
│   ├── Logo
│   └── HeartbeatLine
├── MainLayout
│   ├── DoctorNotes (left)
│   │   ├── WishInput
│   │   └── CaseFile
│   ├── Specimen (center)
│   │   └── SlotGrid
│   │       └── OrganCard[]
│   │           ├── OrganTitle
│   │           ├── OrganStatus
│   │           ├── PortList
│   │           └── AmputateButton
│   └── ChartPanel (right)
│       ├── Timeline
│       └── VerifyButton
├── LaboratoryOverlay
│   ├── StageGauges[4]
│   ├── RejectedStamp (conditional)
│   └── ConsentDialog (conditional)
└── DemoControls
    ├── HostileInjection
    ├── FastForwardButton
    ├── DecayToggle
    └── ResetButton
```

## Design Tokens

```css
:root {
  --color-background: #0e0b0b;
  --color-surface: #17120f;
  --color-bone: #e9e1d0;
  --color-brass: #b08d57;
  --color-oxblood: #7a1f1f;
  --color-vein-green: #6f9a7d;
  --color-alert: #c4472f;
  
  --font-heading: 'Cormorant Garamond', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

## Heartbeat Line

### SVG Implementation
- Animated path with stroke-dasharray
- Data-driven: queries organ states from store
- States:
  - **Steady**: Regular sine wave, 60bpm
  - **Erratic**: Irregular rhythm, spikes
  - **Flatline**: Flat with alert badge

### Animation
```css
@keyframes pulse {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -100; }
}

.heartbeat-line {
  animation: pulse 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .heartbeat-line {
    animation: none;
  }
}
```

## REJECTED Stamp

### Animation
1. Stamp swings in from top-right
2. Lands with impact
3. Red ink splatter
4. Text shows reason

### Reduced Motion
Static stamp, no animation.

## Stage Gauges

### Design
Thermometer-style vertical bars:
- Empty: gray
- In progress: brass, animated fill
- Pass: vein-green, checkmark
- Fail: alert red, X mark

### Sequence
1. Gauge 1 fills (static scan)
2. Gauge 1 settles, Gauge 2 fills (manifest)
3. Gauge 2 settles, Gauge 3 fills (behavioral)
4. Gauge 3 settles, Gauge 4 fills (property fuzz)
5. All pass → success
   OR any fail → rejection at that gauge

## Keyboard Navigation

### Focus Management
- Tab moves between major sections
- Arrow keys within grids
- Escape closes overlays
- Enter activates buttons

### Chimera Keyboard Flow
1. Tab to an output port
2. Enter to select
3. Arrow keys to navigate to compatible input ports
4. Enter to link
5. Escape to cancel

## Responsive Breakpoints

- Desktop: 3-column layout (DoctorNotes, Specimen, Chart)
- Tablet: 2-column (Specimen full width, notes/chart stack)
- Mobile: Single column (not required, tablet minimum)
