# GRAFT Demo Guide for Judges

## Quick Start

Run the complete demo with one command:

```bash
npx tsx scripts/demo-judges.ts
```

This shows the complete wish → organ → transplant flow using replay fixtures (deterministic, no API key needed).

## What You'll See

1. **Wish** - User makes a natural language request ("Show a graph of how my mood changed this month")
2. **Spec Generation** - Doctor generates requirements and design
3. **Organ Build** - Doctor creates HTML, manifest, and property tests
4. **Immune System** - 4-stage validation (static, manifest, behavioral, property)
5. **Consent** - Awaiting user approval for transplant

## Live Demo (with real LLM)

To run with a live Doctor (requires NVIDIA API key):

```bash
LLM_API_KEY=nvapi-xxx \
LLM_BASE_URL=https://integrate.api.nvidia.com/v1 \
DOCTOR_MODEL=nvidia/nemotron-3.5-bolt-e4b \
npx tsx scripts/demo-repair-loop.ts
```

This demonstrates:
- Real-time spec generation from NVIDIA NIM API
- Structured output enforcement with JSON schema
- Automatic repair loop when organs fail immune system
- Up to 2 repair rounds before final rejection

## Key Features Demonstrated

### 1. Accountability
- Every organ has a spec, tests, and provenance
- Ledger tracks all transplants and amputations
- Full audit trail for regulatory compliance

### 2. Safety
- 4-stage immune system catches unsafe code:
  - **Static analysis**: Banned constructs (eval, fetch, etc.)
  - **Manifest validation**: Schema and permission checks
  - **Behavioral testing**: Runtime safety checks
  - **Property fuzzing**: Fast-check property-based tests
- Fail-closed: Any error means rejection

### 3. Transparency
- All events streamed in real-time
- Clear rejection reasons with source lines
- Ledger is tamper-evident (hash chain)

### 4. Reversibility
- Every transplant can be amputated
- Amputation restores exact prior state
- No orphaned state or partial changes

## Competitive Features

### 1. Held-Out Benchmark
- V2 corpus with 30 organs (24 attacks, 6 benign)
- 79.2% catch rate (up from 62.5% baseline)
- Clean-room constraint for Red Team agent

### 2. Structured Output
- NVIDIA NIM `guided_json` for schema enforcement
- LLM generates valid manifests automatically
- Reduces repair rounds needed

### 3. Immune CLI
- Command-line tool for CI/CD integration
- GitHub Action for automated PR checks
- Can be used in pre-commit hooks

### 4. Spec vs Vibe Experiment
- 14x fewer defects with spec-driven development
- 80% first-try success rate with specs
- Documented in `docs/spec-vs-vibe-results.md`

### 5. Deployment
- Passcode-protected live mode
- Rate limiting for public demos
- Ready for Fly.io or Render deployment

## Project Stats

- **409 tests passing** (19 test files)
- **73.7% benchmark catch rate** (v1), **79.2%** (v2)
- **100% spec generation success** (20/20 wishes)
- **2.9s average response time** with bolt model
- **4 stages of immune system**
- **2 repair rounds** maximum
- **Hash-chain ledger** for audit trail

## Architecture

```
graft/
├── apps/
│   ├── web/          # React + Zustand frontend
│   └── server/       # Fastify + SQLite backend
├── packages/
│   ├── nerve/        # Nerve API types and tissue kit
│   ├── immune/       # 4-stage immune system
│   ├── doctor/       # LLM provider with structured output
│   └── ledger/       # Hash-chain ledger logic
├── organs/
│   ├── handwritten/  # 2 reference organs
│   └── hostile/      # 6 adversarial test organs
├── fixtures/
│   ├── corpus/       # Dev and held-out test organs
│   └── replays/      # Recorded Doctor outputs for demo
└── tests/
    ├── properties/   # fast-check PBT suites
    └── e2e/          # Playwright end-to-end tests
```

## Laws of Anatomy

These invariants must never be violated:

1. **Sandbox Boundary** - Organs never access network, storage, cookies, or parent DOM
2. **Nerve API Exclusivity** - The Nerve API is the only channel
3. **Explicit Consent** - No organ installed without user click
4. **Reversibility** - Every transplant is reversible
5. **Ledger First** - Every state change writes to ledger first
6. **Injected Time/Randomness** - No ambient Date or Math.random
7. **Fail Closed** - Immune system errors mean rejection
8. **Honest Language** - Never claim "guaranteed safety"
9. **Labeled Replay** - Demo data is always labeled

## Running Tests

```bash
# Unit tests
pnpm test

# Immune system tests
pnpm test:immune

# Accessibility tests
pnpm test:a11y

# Property-based tests
pnpm test properties/

# Benchmark
npx tsx scripts/benchmark-immune.ts
```

## Further Reading

- `PROJECT_BRIEF.md` - Full product overview
- `docs/NERVE_API.md` - Nerve API documentation
- `docs/LAWS_OF_ANATOMY.md` - Invariants that must never be violated
- `KIRO_USAGE.md` - Journal of Kiro usage throughout development
- `docs/wish-trial-results.md` - Live Doctor wish trial results
- `docs/spec-vs-vibe-results.md` - Spec vs vibe experiment results
