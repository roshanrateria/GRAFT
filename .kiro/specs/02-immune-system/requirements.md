# 02: Immune System

## Overview

The immune system is a 4-stage verification pipeline that rejects unsafe or broken organs with visible, specific reasons.

---

## Requirements

### IMM-01: Banned Construct Rejection [PBT]
THE SYSTEM SHALL reject any organ containing a banned construct, including computed access to `window`.

### IMM-02: Permission Violation Rejection [PBT]
THE SYSTEM SHALL reject any organ whose actual reads/emits exceed its declared permissions.

### IMM-03: Fail Closed [EX]
WHEN any stage errors internally, THE SYSTEM SHALL reject (fail closed).

### IMM-04: Universal Properties [PBT]
THE SYSTEM SHALL run universal properties U1 to U7 on every organ and log the seed on failure.

### IMM-05: Rejection Report [EX]
WHEN an organ is rejected, THE SYSTEM SHALL show a reason code, a human sentence, and the source location where available.

### IMM-06: Hostile Organ Suite [EX]
THE SYSTEM SHALL reject all six hostile organs at their expected stages.

---

## Immune Stages

### Stage 1: Static Scan
AST-based detection of banned constructs:
- `eval`, `new Function`, `import()`, `importScripts`
- `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`
- `Worker`, `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`
- `window.parent/top/opener/frames`, `location` writes
- `<iframe>`, `<script src>`, external URLs
- `setTimeout`/`setInterval` with string argument
- Direct `Date`/`Math.random` (must use `nerve.now()`/`nerve.random()`)
- **Computed member access on `window`/`globalThis`/`self`**

### Stage 2: Manifest Check
- Zod-validate manifest schema
- Permissions subset of allowed set
- Ports have valid JSON schemas
- Actual reads/emits (from AST) subset of declared permissions

### Stage 3: Behavioral Run
In browser sandbox, measure:
- Load time < 1.5s
- No uncaught errors
- DOM nodes ≤ 2000
- No CSP violations (network attempts)
- Message behavior compliance

### Stage 4: Property Fuzz
Run U1-U7 plus organ-specific properties (≥3):
- U1: Totality (no unhandled throws)
- U2: Boundedness (rate limit, payload size)
- U3: Declaration fidelity
- U4: Determinism
- U5: Idempotent render
- U6: Theme robustness
- U7: No trap (keyboard accessibility)
