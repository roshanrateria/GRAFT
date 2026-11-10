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
- **Maximum**: 20 messages per second per organ
- **Violation**: Organ is quarantined (hidden and flagged)

### Payload Size
- **Maximum**: 16 KB per message
- **Violation**: Message dropped, warning logged

### API Version
- Organ's `apiVersion` must match host's version
- **Mismatch**: Organ marked as decayed

## Injected Time and Randomness

Organs must not use `Date.now()` or `Math.random()`. Instead, use:

```javascript
// Get current time (injected by host)
const now = await nerve.now();

// Get deterministic random number (seeded by host)
const random = nerve.random();
```

This ensures:
- Deterministic behavior under test
- Reproducible property-based tests
- Control over time in demo mode

## Data Domains

The Creature provides seeded data domains (read-only to organs):

### `mood.entries`
```typescript
{
  entries: Array<{
    date: string;      // ISO date
    score: number;     // 1-10
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
    created: string;
  }>
}
```

### `habits.checkins`
```typescript
{
  habits: Array<{
    id: string;
    name: string;
    checkins: Array<{
      date: string;
      completed: boolean;
    }>
  }>
}
```

### `calendar.events`
```typescript
{
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: string;
  }>
}
```

## Example Usage

```javascript
// In organ's index.html <script>

// 1. Send handshake
window.parent.postMessage({
  type: 'hello',
  apiVersion: '1.0.0'
}, '*');

// 2. Listen for messages
window.addEventListener('message', (event) => {
  const msg = event.data;
  
  switch (msg.type) {
    case 'init':
      console.log('Granted:', msg.granted);
      // Request data
      window.parent.postMessage({
        type: 'read',
        id: 'req-1',
        path: 'mood.entries'
      }, '*');
      break;
      
    case 'data':
      if (msg.id === 'req-1') {
        // Render mood data
        renderMoodGraph(msg.value);
      }
      break;
  }
});

// 3. Emit to port (for chimera)
window.parent.postMessage({
  type: 'emit',
  port: 'moodScore',
  payload: { score: currentScore }
}, '*');
```

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
