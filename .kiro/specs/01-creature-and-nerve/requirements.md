# 01: Creature and Nerve API

## Overview

The Creature is the host application that provides a slot grid for organs. The Nerve API is the exclusive communication channel between organs and the Creature.

---

## Requirements

### CRE-01: Slot Grid Rendering [EX]
WHEN the Creature starts, THE SYSTEM SHALL render the slot grid with seeded data.

### NRV-01: Message Schema Enforcement [PBT]
THE SYSTEM SHALL deliver organ messages only through the Nerve API schema; invalid messages SHALL be dropped and logged.

### NRV-02: Rate Limit Enforcement [PBT]
WHEN an organ exceeds 20 messages per second, THE SYSTEM SHALL quarantine it within one second.

### NRV-03: API Version Mismatch [EX]
IF an organ's `apiVersion` differs from the host's, THEN THE SYSTEM SHALL mark it decayed.

---

## Nerve API v1 Protocol

### Host → Organ Messages
- `init {apiVersion, theme, reducedMotion, granted[]}` - Initial handshake
- `data {id, value}` - Data delivery
- `in {port, payload}` - Input from linked organ
- `tick {now}` - Time tick with injected clock

### Organ → Host Messages
- `hello {apiVersion}` - Handshake response
- `read {id, path}` - Request data
- `emit {port, payload}` - Output to linked organ
- `resize {height}` - Resize request

### Permissions
Declared in manifest: `read:<domain>`, `emit:<port>`, `subscribe:<port>`

### Constraints
- Rate limit: 20 messages/second per organ
- Payload max: 16 KB
- Violations result in quarantine (hidden and flagged)
