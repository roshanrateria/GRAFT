# V1 vs V2 Benchmark Comparison

## Overview

This document compares the immune system benchmark results between the original held-out corpus (v1) and the new held-out-v2 corpus.

## Corpus Sizes

| Corpus | Total Organs | Attacks | Benign |
|--------|-------------|---------|--------|
| V1 (held-out) | 20 | 16 | 4 |
| V2 (held-out-v2) | 30 | 24 | 6 |

## Catch Rate Summary

| Metric | V1 | V2 | Change |
|--------|-----|-----|--------|
| **Catch Rate** | 62.5% | 79.2% | **+16.7%** |
| Attacks Caught | 10/16 | 19/24 | - |
| Attacks Missed | 6 | 5 | - |

## Breakdown by Stage

### V1 Catch Rate by Stage (cumulative)

| Stage | Caught | Total | Rate |
|-------|--------|-------|------|
| Static | 5 | 16 | 31.3% |
| Manifest | 10 | 16 | 62.5% |
| Behavioral | 10 | 16 | 62.5% |
| Property | 10 | 16 | 62.5% |

### V2 Catch Rate by Stage (cumulative)

| Stage | Caught | Total | Rate |
|-------|--------|-------|------|
| Static | 19 | 24 | 79.2% |
| Manifest | 19 | 24 | 79.2% |
| Behavioral | 19 | 24 | 79.2% |
| Property | 19 | 24 | 79.2% |

### Analysis

V2 shows significantly better static stage detection (79.2% vs 31.3%). This improvement comes from V2 having more attacks that match patterns already caught by static analysis (direct API violations, window.parent/top access).

## Breakdown by Category

### V1 by Category

| Category | Total | Caught | Missed | Rate |
|----------|-------|--------|--------|------|
| Direct Attack | 6 | 4 | 2 | 66.7% |
| Obfuscated Attack | 4 | 3 | 1 | 75.0% |
| Sandbox Escape | 3 | 1 | 2 | 33.3% |
| Behavioral Attack | 3 | 2 | 1 | 66.7% |

### V2 by Category

| Category | Total | Caught | Missed | Rate |
|----------|-------|--------|--------|------|
| Direct | 6 | 6 | 0 | 100.0% |
| Obfuscated | 7 | 4 | 3 | 57.1% |
| Escape | 6 | 6 | 0 | 100.0% |
| Behavioral | 5 | 3 | 2 | 60.0% |

### Category Improvement

| Category | V1 Rate | V2 Rate | Change |
|----------|---------|---------|--------|
| Direct | 66.7% | 100.0% | **+33.3%** |
| Sandbox Escape | 33.3% | 100.0% | **+66.7%** |
| Behavioral | 66.7% | 60.0% | -6.7% |
| Obfuscated | 75.0% | 57.1% | -17.9% |

## Misses (Unexpected Passes)

### V1 Misses (6 organs)

1. `attack-exec-002` [direct-attack] - Expected: static
2. `attack-storage-002` [direct-attack] - Expected: static
3. `behave-mem-001` [behavioral-attack] - Expected: behavioral
4. `escape-nav-001` [sandbox-escape] - Expected: static
5. `escape-top-001` [sandbox-escape] - Expected: static
6. `obf-combo-001` [obfuscated-attack] - Expected: static

### V2 Misses (5 organs)

1. `attack-009` [obfuscated] - Expected: static
2. `attack-011` [obfuscated] - Expected: static
3. `attack-013` [obfuscated] - Expected: static
4. `attack-021` [behavioral] - Expected: behavioral
5. `attack-023` [behavioral] - Expected: behavioral

## False Rejections

Both corpora show 100% false rejection rate for benign organs. All benign organs are rejected at the static stage due to `window.parent` blocking.

### V1 False Rejections (4 organs)

- All rejected for `window.parent is not allowed`

### V2 False Rejections (6 organs)

- All rejected for `window.parent is not allowed`

## Analysis of Differences

### Improvements in V2

1. **Direct attacks caught (+33.3%)**: V2's direct attacks all use patterns already detected by static analysis (cookie, eval, localStorage, WebSocket, XMLHttpRequest). V1 had some novel execution patterns that weren't caught.

2. **Sandbox escapes caught (+66.7%)**: V2's escape attempts use standard patterns (window.parent, window.top, window.frames, window.opener) that static analysis detects. V1 had novel navigation patterns that bypassed detection.

### Areas Still Needing Work

1. **Obfuscated attacks (-17.9%)**: V2 has 3 obfuscated attacks that passed. These likely use novel obfuscation techniques not covered by the current computed property access detection.

2. **Behavioral attacks (-6.7%)**: Both corpora show weakness in behavioral detection. Memory bombs and timing attacks are not fully caught by the behavioral stage.

### Persistent Issues

1. **False rejections remain at 100%**: The `window.parent` block prevents all benign organs from passing. This is by design (organs must use the Nerve API bridge), but means the system cannot currently accept genuinely safe organs.

2. **Novel attack patterns**: Both corpora contain attacks that use patterns not in the static analysis ban list, highlighting the need for ongoing pattern expansion.

## Key Findings

1. **Overall catch rate improved** from 62.5% to 79.2% (+16.7 percentage points).

2. **Static stage detection improved significantly** due to V2's attack patterns aligning better with existing detection rules.

3. **Obfuscation detection is the main gap** - 42.9% of obfuscated attacks in V2 passed all stages.

4. **Behavioral detection remains weak** - 40% of behavioral attacks passed.

5. **False rejection issue persists** - All benign organs rejected due to `window.parent` blocking.

## Recommendations

1. Expand obfuscation detection to cover:
   - Novel encoding schemes
   - Combination obfuscation patterns
   - Alternative global object access patterns

2. Enhance behavioral stage with:
   - Memory consumption monitoring
   - Timing attack detection
   - Rate limit enforcement

3. Address false rejections by:
   - Allowing `window.parent.postMessage` in Nerve API context only
   - Implementing context-aware static analysis

---

*Generated: 2026-11-10*
*V1 Benchmark: fixtures/corpus/results-held-out.json*
*V2 Benchmark: fixtures/corpus/results-held-out-v2.json*
