# Nerve API v1 Documentation

The Nerve API is the exclusive communication channel between organs and the Creature (host app).

## Overview

- **Version**: 1.0.0
- **Transport**: `window.postMessage` between organ iframe and host
- **Format**: JSON messages with type discriminator

## Protocol

### Host → Organ Messages

#### `init`
Initial handshake after organ loads.

```typescript
{
  type: 'init',
  apiVersion: '1.0.0',
  theme: 'light' | 'dark',
  reducedMotion: boolean,
  granted: string[]  // Granted permissions
}
```

#### `data`
Deliver requested data to organ.

```typescript
{
  type: 'data',
  id: string,       // Request ID from read message
  value: unknown    // Data value
}
```

#### `in`
Input from a linked organ (chimera).

```typescript
{
  type: 'in',
  port: string,     // Input port name
  payload: unknown  // Data from linked organ
}
```

#### `tick`
Time tick with injected clock.

```typescript
{
  type: 'tick',
  now: number  // Current timestamp (injected, not Date.now())
}
```

### Organ → Host Messages

#### `hello`
Handshake response from organ.

```typescript
{
  type: 'hello',
  apiVersion: string  // Organ's supported API version
}
```

#### `read`
Request data from a domain.

```typescript
{
  type: 'read',
  id: string,     // Request ID (for correlation)
  path: string    // Data path, e.g., 'mood.entries'
}
```

#### Receiving on input ports: `nerve.onIn`

The sandbox shim wraps the `in` message: `nerve.onIn('open-count', fn)` calls
`fn(payload)` for every `in` message addressed to that port (it returns an
unsubscribe function). It is sugar over the existing `in` message, not a new
channel. The port name must match a declared `in` port in `manifest.ports`.

Port contract rules enforced by the Doctor and the immune system:

- `manifest.ports` is always an array (defaults to `[]`).
- Every `out` port needs a matching `emit:<port>` permission; `nerve.emit('x', …)`
  must name a declared `out` port, and `nerve.onIn('x', …)` a declared `in` port.
- `subscribe:<x>` is for data domains (e.g. `subscribe:tasks.items`), never ports.
- Links require the output schema to satisfy the input schema (an `integer` may
  feed a `number`, not the reverse).

#### `emit`
Emit data to an output port (for chimera linking).

```typescript
{
  type: 'emit',
  port: string,     // Output port name
  payload: unknown  // Data to emit
}
```

#### `resize`
Request iframe resize.

```typescript
{
  type: 'resize',
  height: number  // Desired height in pixels
}
```

## Permissions

Organs must declare required permissions in `manifest.json`:

```json
{
  "permissions": [
    "read:mood.entries",
    "read:tasks.items",
    "emit:moodScore",
    "subscribe:updates"
  ]
}
```

Permission format: `<action>:<target>`

### Actions
- `read` - Read data from a domain
- `emit` - Emit to an output port
- `subscribe` - Subscribe to updates

## Constraints

### Rate Limit
- **Maximum**: 20 messages per second per organ (`RATE_LIMIT_PER_SECOND` in `packages/nerve/src/protocol.ts`)
- **Violation**: Organ is quarantined (hidden and flagged). The protocol constant `QUARANTINE_TIMEOUT_MS` is 1000.

### Payload Size
- **Maximum**: 16 KB per message (`MAX_PAYLOAD_BYTES`)
- **Violation**: Message rejected with reason `payload_too_large`

### Resize
- `height` must be a positive integer. The host clamps it to 40 to 4000 pixels.

### Tick
- `now` is a non-negative integer. The protocol defines a 100 ms tick interval (`TICK_INTERVAL_MS`).

### API Version
- Organ's `apiVersion` must match host's version
- **Mismatch**: Organ marked as decayed

## Injected Time and Randomness

Organs must not use `Date.now()` or `Math.random()`. Instead, use:

```javascript
// Get current time (synchronous; injected by the host when available)
const now = nerve.now();

// Get a random number in [0, 1) (injected by the host when available)
const random = nerve.random();
```

This supports:
- Deterministic behavior under test
- Reproducible property-based tests

Note: the sandbox shim (`apps/web/src/components/SandboxHost.tsx`) falls back to `Date.now()` and `Math.random()` when the host has not injected a value. That fallback is in the host-injected shim, not in organ code. Organ code that calls them directly is flagged by static analysis.

## Data Domains

The Creature provides seeded data domains (read-only to organs). Valid paths are `mood.entries`, `tasks.items`, `habits.checkins` and `calendar.events` (`VALID_DATA_DOMAINS`). The shapes below follow `apps/web/src/host/dataProvider.ts` and the types in `apps/web/src/stores/creatureStore.ts`.

### `mood.entries`
```typescript
{
  entries: Array<{
    id: string;
    date: string;
    mood: number;      // 1-10
    notes?: string;
  }>
}
```

### `tasks.items`
```typescript
{
  items: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>
}
```

### `habits.checkins`
```typescript
{
  checkins: Array<{
    id: string;
    habitId: string;
    date: string;
    completed: boolean;
  }>
}
```

### `calendar.events`
```typescript
{
  events: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    duration?: number;
  }>
}
```

## Example Usage

Organs do not call `window.parent.postMessage` themselves. The static analyzer rejects `window.parent` (`IMM_BANNED_WINDOW_PARENT`). The Creature injects a shim that exposes `window.nerve` and speaks the protocol above.

```javascript
// In the organ's index.html <script>

// Read declared data (needs the read:mood.entries permission)
nerve.read('mood.entries').then((data) => {
  renderMoodGraph(data.entries);
});

// Subscribe to changes (needs the subscribe:mood.entries permission)
nerve.subscribe('mood.entries', (data) => renderMoodGraph(data.entries));

// Emit to a declared output port (needs emit:moodScore and an out port named moodScore)
nerve.emit('moodScore', { score: 7 });

// Receive on a declared input port
nerve.onIn('open-count', (payload) => showCount(payload));

// Injected time and randomness
const now = nerve.now();
```

The shim also sends the `hello` handshake and handles `init`, `data`, `in` and `tick` for you. Exact permission and port rules are enforced by the manifest validator in `packages/immune/src/manifest/`.
## Sandbox

Organs run in a sandboxed iframe:

```html
<iframe 
  sandbox="allow-scripts" 
  srcdoc="..."
/>
```

**Never** use:
- `allow-same-origin` - Would break sandbox
- `allow-forms` - Not needed
- `allow-top-navigation` - Security risk

## Content Security Policy

Each organ's HTML includes a strict CSP:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline';
  style-src 'unsafe-inline';
  img-src data:;
">
```

This prevents:
- External network requests
- External scripts/styles
- Most XSS vectors
