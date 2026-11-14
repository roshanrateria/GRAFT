# GRAFT Immune System Corpus Summary

Numbers below were checked against `results.json`, `results-held-out.json`, `results-held-out-v2.json` and `ablation.json` in this folder. This benchmark measures a static and behavioral checker against organs written by a red-team agent. It reduces risk and is not evidence of safety against real attackers.

## Corpus Overview

| Corpus | Organs | Attacks | Benign | Status |
|--------|--------|---------|--------|--------|
| Development (`dev/`) | 70 | 60 | 10 | Active |
| Held-out (`held-out/`) | 20 | 16 | 4 | Frozen (see below) |
| Hostile (`organs/hostile/`) | 6 | 6 reference organs | 0 | Reference, scored separately |
| **Total in `results.json`** | **96** | **76 scored** | **14 real benign** | - |

The 76 scored attacks are the 60 development and 16 held-out attacks. The 6 hostile organs are loaded as a third source, but the runner labels them `isAttack: false`, so `results.json` counts them as "benign" (it reports `totalBenign: 20` and `falseRejections: 20`). The real benign count is 14 (10 development, 4 held-out). The 6 hostile organs are rejected as intended by `packages/immune/src/__tests__/hostile.test.ts`.

Additional corpora:

| Corpus | Organs | Attacks | Benign | Result file |
|--------|--------|---------|--------|-------------|
| `held-out-v2/` | 30 | 24 | 6 | `results-held-out-v2.json` |
| `benign-v2/` | 11 | 0 | 11 | no result file checked |

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

**Freeze metadata (corrected):**
- Git commit that added the corpus: `a3080bab5c4c22f4b7907cb10e4d6cf15dffd1a9`, dated 2026-11-10 14:17:11 +0530.
- `held-out/manifest.json` says `freezeDate: 2024-11-22T00:00:00Z` and `commitSHA: 3632f4b6f27a88fa2b26837778478c041fd2356c`. The date is wrong for this project. That SHA is the commit before the corpus was added (2026-11-10 13:50:37 +0530). The manifest was not edited.
- Other files in this folder carry inconsistent dates too (`payload-research.md` says 2025-01-20, `held-out-v2/manifest.json` says 2026-01-20). Git history is the reliable record for the Kiroween submission period.
- The corpus must not be used for tuning. This was not independently verified: the immune code may have changed after the freeze, and `git log` for `packages/immune` was not audited for this document.

## Benchmark Results

`pnpm benchmark:corpus` (`scripts/benchmark-corpus.ts`) writes `results-<corpus>.json`. Which command produced the combined `results.json` (timestamp 2026-11-11T04:40Z) was not determined, so it may not be reproducible with one command.

### Overall Performance (dev + held-out, 76 attacks)

| Metric | Value |
|--------|-------|
| Attacks | 76 |
| Attacks Caught | 56 |
| Attacks Missed | 20 |
| **Catch Rate** | **73.7%** |

| Source | Attacks | Caught | Missed | Rate |
|--------|---------|--------|--------|------|
| Development | 60 | 46 | 14 | 76.7% |
| Held-out | 16 | 10 | 6 | 62.5% |
| Held-out v2 | 24 | 19 | 5 | 79.2% |

The held-out-v2 corpus is a separate set of 24 attacks (`results-held-out-v2.json`). Its higher rate cannot be read as improvement on held-out v1: it is a different corpus, and the code under test may have changed between runs.

### Catch Rate by Stage (cumulative, 76 attacks)

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

All 14 real benign organs (10 development, 4 held-out) were rejected at the static stage with "window.parent is not allowed". That is a 100% false rejection rate on this corpus. The benign corpus organs post to `window.parent` directly. The checker bans `window.parent`, and the sandbox shim is what normally provides the Nerve channel. Whether a benign organ written against `window.nerve` would pass is not measured here: `benign-v2/` (11 organs) contains samples written against `nerve.read`, but no result file for it was checked.

Related check run for this update: 4 of the handwritten reference organs (`expense-tracker`, `mood-weather`, `quick-note`, `timer-widget`) are also rejected for `window.parent` by `pnpm immune`.

## Ablation Study

From `ablation.json` (dev + held-out v1, 76 attacks), produced by `scripts/ablation-study.ts` (run with `npx tsx scripts/ablation-study.ts`; there is no `pnpm ablation` script):

| Configuration | Caught | Rate | Avg Time |
|---------------|--------|------|----------|
| Sandbox + CSP only (modeled) | 36 | 47.4% | 0.09ms |
| Full Immune System | 56 | 73.7% | 4.5ms |

The sandbox-only baseline is computed by the script, not measured in a real browser, so treat it as an estimate.

Layer contributions on this corpus:
- Static Analysis: 51 catches
- Manifest Validation: 5 additional catches
- Behavioral Check: 0 additional catches
- Property Fuzzing: 0 additional catches

## Known Limitations and Gaps

Misses by category (from `results.json`): behavioral 8, sandbox escape 7, direct 4, obfuscated 1 (total 20).

### 1. Behavioral attack detection
- 8 of 13 behavioral attacks passed all stages.
- They use allowed operations, and the behavioral stage has no rule for them.

### 2. Sandbox escape detection
- 7 of 13 sandbox-escape attacks passed.
- Patterns such as `top.document` use bare identifiers that the current rules do not catch. Detecting bare `top`, `parent` and `opener` identifiers is not implemented.

### 3. Direct attacks
- 4 of 31 passed, including rare API patterns (`EventSource`, `exec` variants) that are not in the ban list.

### 4. False rejections
- Every benign organ in the corpus was rejected (see above).

### 5. Memory bombs
- Large allocations pass static analysis. No heuristic for memory exhaustion exists.

## Files

Each organ folder contains:
- `manifest.json` with metadata, including expected rejection stage and reason
- `index.html` with the organ HTML and embedded JavaScript
- `script.js` (optional)
- `properties.js` (optional property tests)

Result and research files in this folder: `results.json`, `results-held-out.json`, `results-held-out-v2.json`, `ablation.json`, `v1-v2-comparison.md`, `payload-research.md`, `benchmark-matrix.json` (not checked for this update).

## Clean-Room Constraint

The Red Team agent (`.kiro/agents/red-team.md`) is instructed to work under a clean-room rule: it must not read the immune system checker code or the result files. Compliance was not audited here, and the agent definition is the only evidence checked.

## Usage

```bash
pnpm benchmark:corpus                      # tsx scripts/benchmark-corpus.ts, writes results-<corpus>.json
npx tsx scripts/ablation-study.ts          # writes ablation.json
pnpm benchmark                             # tsx scripts/benchmark-immune.ts (a separate benchmark)
```

Output files: `fixtures/corpus/results.json` and `fixtures/corpus/ablation.json`.
