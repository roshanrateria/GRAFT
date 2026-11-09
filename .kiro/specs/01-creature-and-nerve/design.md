# Design: Creature and Nerve API

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Creature                    │
│  ┌─────────────────────────────────────┐    │
│  │           Slot Grid                  │    │
│  │  ┌─────────┐ ┌─────────┐            │    │
│  │  │ Organ 1 │ │ Organ 2 │ ...        │    │
│  │  └────┬────┘ └────┬────┘            │    │
│  └───────┼───────────┼─────────────────┘    │
│          │           │                      │
│     ┌────▼───────────▼────┐                 │
│     │    Nerve API Host   │                 │
│     │  (message router)   │                 │
│     └──────────┬──────────┘                 │
│                │                            │
│     ┌──────────▼──────────┐                 │
│     │   Data Domains      │                 │
│     │  mood, tasks, etc.  │                 │
│     └─────────────────────┘                 │
└─────────────────────────────────────────────┘
```

## Components

### Creature (Host App)
- Small personal dashboard with seeded data
- Empty organ slots in a grid
- Built-in data domains (read-only to organs):
  - `mood.entries`
  - `tasks.items`
  - `habits.checkins`
  - `calendar.events`
- 90 days of seeded data with deterministic RNG

### Nerve API Host
- Message router between organs and data
- Permission enforcement
- Rate limiting and payload size checks
- Quarantine management

### Sandbox
- Each organ runs in `<iframe sandbox="allow-scripts">`
- Loaded via `srcdoc` with strict CSP
- CSP: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;`

## Data Flow

1. Organ sends `hello` with `apiVersion`
2. Host validates version, sends `init` with theme, permissions
3. Organ requests data via `read`
4. Host delivers data via `data`
5. Organ may `emit` to ports for chimera linking
6. Host enforces rate limits and quarantines violators

## Tissue Kit

Host injects tiny helpers into every organ:
- CSS tokens (theme colors)
- `Tissue.line()` - Line chart helper
- `Tissue.bar()` - Bar chart helper
- `Tissue.list()` - List rendering helper
