# The Surgical Theatre: UI Design

**Mood:** Victorian anatomical theatre, candlelit and dark, but clean and modern in layout. Every spooky element must carry information—it is never decoration only.

---

## Design Tokens (CSS Variables)

```css
:root {
  --color-background: #0e0b0b;
  --color-surface: #17120f;
  --color-bone: #e9e1d0;
  --color-brass: #b08d57;
  --color-oxblood: #7a1f1f;
  --color-vein-green: #6f9a7d;  /* healthy */
  --color-alert: #c4472f;
}
```

---

## Typography

- **Headings**: Victorian serif (Cormorant Garamond or IM Fell English)
- **Body**: Readable humanist sans
- **Ledger**: Monospace (IBM Plex Mono)

Self-host fonts or use Google Fonts with solid fallbacks.

---

## Layout

### Top Bar
- Logo
- Live **ECG heartbeat line** (SVG)
  - Steady: all organs pass checkup
  - Erratic: any organ fails checkup
  - Flatline with alert: quarantined organ

### Center: "The Specimen"
- Slot grid with organs
- Stitched seams between slots

### Left: "Doctor's Notes"
- Wish input
- Live case file (assumptions, spec, properties, build stream)

### Right: "The Chart"
- Ledger timeline
- "Verify chain" button

### Laboratory Overlay
When the immune system runs:
- Four stage gauges light up in sequence
- Failure: **REJECTED stamp** animation with reason and source line
- Success: **"Awaiting consent"** with Transplant button

### Chimera Mode
- Drag a thread between ports
- Keyboard alternative: select port, press Enter, select target port

### Amputate
- Button with confirm step
- Short animation

---

## Quality Bar

- **Keyboard operable**: All interactions possible without mouse
- **Visible focus**: Clear focus indicators
- **Contrast**: WCAG AA or better
- **prefers-reduced-motion**: Disable pulse and stamp animations
- **Responsive**: Down to tablet width
- **No layout shift**: During streaming or dynamic updates
- **Sound**: Optional, off by default
