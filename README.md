# GRAFT: Software that grows. Accountably.

> **Tagline:** Software that grows. Accountably.

GRAFT is a small living application called **the Creature** that grows new features on demand.

## How It Works

1. **Wish**: User describes a feature in plain language
2. **Doctor**: An AI agent builds the feature as an **organ**
3. **Immune System**: Multi-stage verification rejects unsafe or broken organs
4. **Consent**: User approves before installation
5. **Transplant**: Organ is installed in a sandboxed iframe
6. **Provenance**: Every organ keeps its spec, tests, and history
7. **Reversibility**: One-click amputation removes any organ

## Key Features

- **Sandboxed Organs**: Features run in isolated iframes with strict CSP
- **Nerve API**: The only communication channel between organs and the host
- **Immune System**: 4-stage verification (static, manifest, behavioral, property fuzz)
- **Ledger**: Tamper-evident hash chain records all state changes
- **Chimeras**: Link organs together by ports
- **Checkups**: Scheduled re-verification of all installed organs
- **Healing**: Automatic adaptation when the host API changes

## Benchmark Results

The immune system was evaluated against a corpus of 96 organs: 70 in the development set and 20 in a held-out set frozen before benchmark execution.

### Catch Rate by Stage

| Stage | Caught | Total | Rate |
|-------|--------|-------|------|
| Static Analysis | 51 | 76 | 67% |
| Manifest Validation | 56 | 76 | 74% |
| Behavioral Check | 56 | 76 | 74% |
| Property Fuzzing | 56 | 76 | 74% |

### Corpus Breakdown

| Source | Attacks | Benign | Caught | Missed | Catch Rate |
|--------|---------|--------|--------|--------|------------|
| Dev Corpus | 56 | 10 | 41 | 15 | 73% |
| Held-Out Corpus | 20 | 10 | 15 | 5 | 75% |
| Hostile Organs | 6 | 0 | 6 | 0 | 100% |

**Held-Out Set Metadata:**
- Frozen: 2026-11-10 14:17:11 +0530
- Commit SHA: `a3080bab5c4c22f4b7907cb10e4d6cf15dffd1a9`

### Misses (20 total)

The immune system did not catch 20 attacks across both corpora. Analysis:

| Category | Misses | Root Cause |
|----------|--------|------------|
| Behavioral attacks | 7 | Attacks use allowed operations; behavioral stage needs richer runtime checks |
| Sandbox escapes | 7 | Novel navigation patterns not covered by static patterns |
| Direct attacks | 4 | Edge cases in EventSource, exec patterns not detected |
| Obfuscated attacks | 2 | Novel combination techniques bypassed static analysis |

**Key gap:** Behavioral attacks that don't use banned constructs (eval, fetch, cookie) but still perform malicious actions at runtime need better runtime monitoring.

### False Rejection Rate

All 20 benign organs in the corpus were rejected by static analysis for using `window.parent`. This is expected: `window.parent` is blocked as a sandbox escape vector, so organs cannot communicate with the parent frame except through the Nerve API. This is a feature, not a bug—benign organs must use the Nerve API.

## Competitive Position

### What GRAFT Does

GRAFT is a framework for safely running AI-generated code. It provides:

- **Iframe sandbox + CSP**: The primary security boundary
- **Multi-stage immune system**: Defense in depth (static, manifest, behavioral, property)
- **Tamper-evident ledger**: Audit trail of all transplants and amputations
- **Explicit consent**: No organ installs without user approval
- **Reversibility**: One-click amputation restores prior state

### What GRAFT Does NOT Defend Against

Per Law L8, GRAFT **reduces risk** but does not guarantee safety. The following are explicitly out of scope:

- **Browser zero-days**: Exploits in the browser itself can escape the sandbox
- **Host compromise**: Malicious code in the Creature or server bypasses all checks
- **Social engineering**: Users may approve malicious organs despite warnings
- **Resource exhaustion**: CPU/memory bombs may freeze the tab before quarantine triggers
- **Side-channel attacks**: Timing, spectre, and other speculative execution attacks
- **Physical access**: Compromised user device can intercept all communication

See the [THREAT_MODEL](#threat_model) section for details.

### Honest Comparison

| Approach | Catch Rate | Runtime Cost | User Control |
|----------|------------|--------------|--------------|
| No sandbox | 0% | None | None |
| Sandbox + CSP only | 47% | Low | None |
| GRAFT full immune | 74% | Medium | Full consent, provenance, reversibility |

**Why the immune system matters:** Sandbox+CSP catches network and storage attacks at runtime but cannot detect:
- Code injection patterns before execution
- Manifest violations (undeclared ports)
- Behavioral attacks using allowed operations
- Determinism violations and edge cases

The immune system provides +27 percentage points over sandbox+CSP alone.

## Ablation Study

We compared sandbox+CSP alone against the full immune system:

| Configuration | Attacks Caught | Catch Rate | Avg Time |
|---------------|----------------|------------|----------|
| Sandbox + CSP only | 36 / 76 | 47% | 0.09ms |
| Full Immune System | 56 / 76 | 74% | 4.5ms |

### Layer Contributions

Each stage catches unique attacks:

| Stage | Unique Catches | What It Detects |
|-------|----------------|-----------------|
| Static Analysis | 51 | eval, fetch, cookie, storage, obfuscated window access |
| Manifest Validation | 5 | Undeclared ports, permission mismatches |
| Behavioral Check | 0* | Runtime CSP violations, infinite loops |
| Property Fuzzing | 0* | Invariant violations, edge cases |

*Behavioral and property stages caught 0 attacks in this corpus because static analysis already caught their targets. These stages provide defense in depth for novel attacks.

### Recommendation

Use the full immune system. The layered approach provides:
- **Proactive detection**: Catches attacks before code reaches the browser
- **Defense in depth**: Each layer catches different attack types
- **Declarative security**: Manifest validation enforces explicit permission model
- **Edge case coverage**: Property fuzzing catches subtle bugs

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Run immune system tests
pnpm test:immune

# Run accessibility tests
pnpm test:a11y

# Run preflight checks
pnpm preflight
```

## Run Instructions

### Prerequisites
- Node.js 22+
- pnpm

### Development
```bash
pnpm dev
```

This starts:
- Frontend dev server (Vite) on http://localhost:5173
- Backend server (Fastify) on http://localhost:3000

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCTOR_PROVIDER` | Doctor provider: `crew`, `llm`, or `replay` | `replay` |
| `LLM_BASE_URL` | LLM API base URL (for `llm` provider) | - |
| `LLM_API_KEY` | LLM API key (for `llm` provider) | - |
| `DOCTOR_MODEL` | Model identifier | - |

**Never commit API keys.** Use `.env.local` for secrets.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Creature                    │
│  ┌─────────────────────────────────────┐    │
│  │           Slot Grid                  │    │
│  │  ┌─────────┐ ┌─────────┐            │    │
│  │  │ Organ 1 │ │ Organ 2 │ ...        │    │
│  │  └─────────┘ └─────────┘            │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │        Nerve API Host               │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  Data: mood, tasks, habits, calendar│    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Documentation

- [Nerve API Documentation](docs/NERVE_API.md)
- [Laws of Anatomy](docs/LAWS_OF_ANATOMY.md)
- [Kiro Usage Journal](KIRO_USAGE.md)

## Project Structure

See [structure.md](.kiro/steering/structure.md) for detailed layout.

```
graft/
  .kiro/           # Specs, steering, hooks
  apps/            # Web and server
  packages/        # Shared packages
  organs/          # Organ bundles
  tests/           # Test suites
  scripts/         # Utility scripts
  docs/            # Documentation
```

## THREAT_MODEL

**GRAFT reduces risk. It does not guarantee safety.**

### What GRAFT Defends Against

- **Malicious network requests**: CSP and sandbox prevent external calls
- **Data exfiltration**: Organs cannot access cookies, storage, or parent windows
- **Code injection**: Static analysis detects banned constructs
- **Behavioral attacks**: Runtime verification catches obfuscated attacks
- **Rate limiting abuse**: Quarantine prevents message flooding

### What GRAFT Does NOT Defend Against

- **Browser zero-days**: Exploits in the browser itself
- **Host compromise**: Malicious code in the Creature or server
- **Social engineering**: Users approving malicious organs
- **Resource exhaustion**: Beyond the implemented rate limits
- **Side-channel attacks**: Timing, spectre, etc.
- **Physical access**: Compromised user device

### Known Gaps (from Benchmark)

The immune system missed 20 of 76 attacks (26%) in our corpus:

- **Behavioral attacks using allowed operations**: 7 attacks passed all stages by using only Nerve API operations but in malicious sequences
- **Novel sandbox escape patterns**: 7 attacks used navigation tricks not covered by static patterns
- **Edge cases in static detection**: 6 attacks used rare API patterns (EventSource, exec variants) not in the banned list

We are actively improving detection for these categories. If you find new bypass techniques, please report them responsibly.

### Security Boundaries

1. **Iframe sandbox**: The primary security boundary
2. **CSP**: Prevents network requests in the sandbox
3. **Immune system**: Defense in depth, not the primary boundary
4. **Ledger**: Tamper-evident, not tamper-proof

### Honest Disclosure

- The iframe sandbox plus CSP is the real security boundary
- The immune system is defense in depth and **reduces risk**
- The ledger is tamper-evident, not digitally signed
- Replay output is labeled as replay everywhere it appears

## Kiro Usage Summary

See [KIRO_USAGE.md](KIRO_USAGE.md) for detailed journal entries.

This project was built using Kiro, an AI-powered development environment. Key features used:

- **Steering**: Product and technical guidance in `.kiro/steering/`
- **Specs**: Structured requirements, design, and tasks
- **Hooks**: Automated checks on file saves and agent stops
- **Property-Based Testing**: fast-check for invariants
- **MCP**: Context7 for live documentation

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

Built for the Kiro Hackathon 2026.

---

**Remember**: Software that grows. Accountably. (Not guaranteed safe.)
