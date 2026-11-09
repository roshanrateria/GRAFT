# Design: Doctor Pipeline

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    User                           │
│                   Wish                            │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│              Doctor Gateway (server)              │
│  - Provider selection (crew/llm/replay)          │
│  - Streaming events to frontend                   │
└───────────────────┬──────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  Crew   │ │   LLM   │ │ Replay  │
   │Provider │ │ Provider│ │ Provider│
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  AsyncIterable<       │
        │    DoctorEvent        │
        │  >                    │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │     Immune System     │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Rejection Report    │──► Repair (max 2)
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Consent Request     │
        └───────────────────────┘
```

## Provider Details

### Crew Provider
- Persistent bot with memory file
- Memory structure:
  ```json
  {
    "anatomy": { ... },
    "preferences": { ... },
    "rejectionHistory": [
      { "wish": "...", "rejection": "...", "fix": "..." }
    ]
  }
  ```
- Learns from past rejections
- Scheduling for checkups

### LLM Provider
- HTTP client to LLM API
- Prompt includes:
  - Anatomy (data domains, Nerve API)
  - Tissue kit docs
  - Previous rejection reports (for repair)
- Response streamed as events

### Replay Provider
- JSON files in `fixtures/replays/`
- Structure:
  ```json
  {
    "wish": "Show a graph of my mood",
    "events": [
      { "type": "assumption", "content": "..." },
      { "type": "spec_progress", "content": "..." },
      ...
    ],
    "delays": { "min": 50, "max": 200 }
  }
  ```
- Events played back with random delays

## Streaming to Frontend

- WebSocket or SSE from server to frontend
- Events rendered in "Doctor's Notes" panel
- Case file updates in real-time:
  - Assumptions appear
  - Spec lines stream in
  - Properties appear
  - Build progress shows
  - Immune gauges light up
