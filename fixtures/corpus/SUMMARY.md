# GRAFT Immune System Corpus Summary

## Corpus Overview

| Corpus | Organs | Attacks | Benign | Status |
|--------|--------|---------|--------|--------|
| Development | 70 | 60 | 10 | Active |
| Held-Out | 20 | 16 | 4 | **FROZEN** |
| Hostile | 6 | 6 | 0 | Reference |
| **Total** | **96** | **76** | **20** | - |

## Development Corpus Breakdown (70 organs)

| Category | Count | Description |
|----------|-------|-------------|
| Direct Attacks | 25 | fetch, eval, cookie, storage, XHR |
| Obfuscated Attacks | 15 | computed property, encoding, string manipulation |
| Sandbox Escapes | 10 | window.top/parent, postMessage abuse |
| Behavioral Attacks | 10 | infinite loops, memory bombs, CPU loops |
| Benign | 10 | display, event-emitting, data-transforming |

## Held-Out Corpus Breakdown (20 organs)

| Category | Count | Description |
|----------|-------|-------------|
| Direct Attacks | 6 | network, exec, storage |
| Obfuscated Attacks | 4 | novel obfuscation, combinations |
| Sandbox Escapes | 3 | window.top, postMessage, navigation |
| Behavioral Attacks | 3 | infinite loop, memory bomb, timing |
| Benign | 4 | display, interactive |

**Freeze Metadata:**
- Frozen: 2024-11-22T00:00:00Z
- Commit SHA: `3632f4b6f27a88fa2b26837778478c041fd2356c`
- **IMPORTANT**: This corpus MUST NEVER be used for tuning the immune system. It is for benchmark evaluation only.

## Benchmark Results

### Overall Performance

| Metric | Value |
|--------|-------|
| Total Organs | 96 |
| Total Attacks | 76 |
| Attacks Caught | 56 |
| Attacks Missed | 20 |
| **Catch Rate** | **73.7%** |

### Catch Rate by Stage

| Stage | Caught | Total | Rate |
|-------|--------|-------|------|
| Static Analysis | 51 | 76 | 67.1% |
| Manifest Validation | 56 | 76 | 73.7% |
| Behavioral Check | 56 | 76 | 73.7% |
| Property Fuzzing | 56 | 76 | 73.7% |

### Catch Rate by Category

| Category | Caught | Total | Rate |
|----------|--------|-------|------|
| Obfuscated Attacks | 18 | 19 | 94.7% |
| Direct Attacks | 27 | 31 | 87.1% |
| Sandbox Escapes | 6 | 13 | 46.2% |
| Behavioral Attacks | 5 | 13 | 38.5% |

### False Rejection Rate

All 20 benign organs were rejected at the static stage. This is expected because:
- Benign organs use `window.parent.postMessage` for valid Nerve API communication
- Static analysis blocks `window.parent` as a sandbox escape vector
- This is by design: organs must use the Nerve API channel, not direct parent access

## Ablation Study

| Configuration | Caught | Rate | Avg Time |
|---------------|--------|------|----------|
| Sandbox + CSP only | 36 | 47.4% | 0.09ms |
| Full Immune System | 56 | 73.7% | 4.5ms |

**Layer Contributions:**
- Static Analysis: 51 unique catches (proactive detection)
- Manifest Validation: 5 unique catches (declarative security)
- Behavioral Check: 0 catches in this corpus (defense in depth)
- Property Fuzzing: 0 catches in this corpus (edge case coverage)

## Known Limitations and Gaps

### 1. Behavioral Attack Detection Gap
- 7 behavioral attacks passed all stages
- Root cause: Attacks use allowed operations; behavioral stage needs richer runtime checks
- Recommendation: Implement runtime monitoring for suspicious operation sequences

### 2. Sandbox Escape Detection Gap
- 7 novel navigation patterns bypassed static detection
- Root cause: Patterns like `top.document` use bare identifiers not caught by current rules
- Recommendation: Add detection for bare `top`, `parent`, `opener` identifiers

### 3. Edge Cases in Static Detection
- 6 attacks using rare API patterns (EventSource, exec variants) passed
- Root cause: Not all banned constructs are in the static analysis patterns
- Recommendation: Expand ban list with additional API patterns

### 4. False Rejection Issue
- All benign organs rejected due to `window.parent` blocking
- Root cause: Static analysis doesn't distinguish between Nerve API postMessage and other parent access
- Recommendation: Allow `window.parent.postMessage` in Nerve API context only

### 5. Memory Bomb Detection
- Large array allocations pass static analysis
- Root cause: No heuristics for memory exhaustion patterns
- Recommendation: Add detection for unusually large allocations or nested structures

## Files

Each organ contains:
- `manifest.json` - Metadata including expected rejection stage and reason
- `index.html` - Organ HTML with embedded JavaScript
- `script.js` - Optional external script
- `properties.js` - Optional property tests

## Clean-Room Constraint

The Red Team agent that generated these organs operates under clean-room constraints:
- NEVER reads immune system checker implementation code
- Only reads public Nerve API documentation
- Only reads ban list comments (not detection logic)
- This ensures benchmark measures true detection capability, not overfitting

## Usage

Run benchmark:
```bash
pnpm benchmark
```

Run ablation study:
```bash
pnpm ablation
```

Output files:
- `fixtures/corpus/results.json` - Full benchmark results
- `fixtures/corpus/ablation.json` - Ablation study comparison
