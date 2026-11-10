# Mood Weather Organ Specification

## Overview

The Mood Weather organ is a reference organ that visualizes mood data as weather conditions. It demonstrates the Nerve API protocol and serves as a fixture for immune system testing.

## Functionality

### Data Visualization

The organ reads mood entries from the `mood.entries` domain and displays them as weather icons:

| Mood Score | Weather | Icon |
|------------|---------|------|
| 8-10 | Sunny | ☀️ Clear skies, bright sun |
| 5-7 | Partly Cloudy | ⛅ Sun with clouds |
| 3-4 | Cloudy | ☁️ Overcast |
| 1-2 | Rainy | 🌧️ Rain with clouds |

### Display Components

1. **7-Day Forecast**: Shows the last 7 days of mood as weather icons in a horizontal row
2. **Average Score**: Displays the average mood score for the period
3. **Current Weather**: Large icon representing today's mood

### Permissions Required

- `read:mood.entries` - Read mood data from the Creature
- `emit:moodScore` - Emit the average mood score to output port

### Output Ports

- **moodScore** (number): The average mood score of the last 7 days, emitted whenever mood data is received or updated

## Nerve API Usage

### Messages Handled

- `init` - Handshake, triggers data request
- `data` - Receives mood.entries data
- `tick` - Time updates (not actively used, but handled)
- `in` - Input from linked organs (not used, but handled)

### Messages Sent

- `hello` - Handshake response on load
- `read` - Request mood.entries data
- `emit` - Emit moodScore to output port

## Styling

Uses the Tissue Kit design tokens via CSS custom properties:
- `--color-background`: Deep black (#0e0b0b)
- `--color-surface`: Warm dark (#17120f)
- `--color-bone`: Cream text (#e9e1d0)
- `--color-brass`: Metallic accent (#b08d57)
- `--color-vein-green`: Healthy indicator (#6f9a7d)

Fonts:
- Headings: Cormorant Garamond (Victorian serif)
- Body: System humanist sans-serif
- Ledger: IBM Plex Mono

## Accessibility

- All weather icons include `aria-label` for screen readers
- Color is not the only indicator (icons + labels)
- Keyboard focusable elements
- Respects `prefers-reduced-motion`

## Sandbox Constraints

The organ operates within the iframe sandbox:
- No network access
- No storage access
- No parent/top window access
- CSP: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;`
