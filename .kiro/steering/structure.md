# GRAFT Repo Structure

```
graft/
  PROJECT_BRIEF.md        # This file (source of truth)
  KIRO_USAGE.md           # Journal of Kiro usage
  README.md               # Includes THREAT_MODEL section
  LICENSE                 # MIT
  .kiro/
    steering/             # Product, tech, and process guidance
    specs/                # Feature specs (requirements, design, tasks)
    hooks/                # Automation hooks
    settings/mcp.json     # MCP server configuration
  apps/
    web/                  # Vite + React: Creature, Theatre UI, sandbox host
    server/               # Fastify: static analysis, ledger, doctor gateway
  packages/
    nerve/                # Nerve API types, protocol, zod schemas, tissue kit
    immune/               # Static + manifest + behavioral + property harness
    doctor/               # DoctorProvider interface + crew/llm/replay adapters
    ledger/               # Hash-chain ledger logic
  organs/
    handwritten/          # 2 reference organs used as test fixtures
    hostile/              # 6 deliberately hostile organs for tests and demo
  fixtures/replays/       # Recorded Doctor outputs for deterministic demo
  tests/
    properties/           # fast-check suites
    e2e/                  # Playwright end-to-end tests
  scripts/
    check-kiro-dir.sh     # Verify .kiro is tracked and not ignored
    preflight.sh          # Run all pre-submission checks
    checkup.ts            # Re-verify all installed organs (no LLM calls)
  docs/
    NERVE_API.md          # Nerve API documentation
    LAWS_OF_ANATOMY.md    # Invariants that must never be violated
```

---

## Where New Code Belongs

- **New feature**: Create a spec in `.kiro/specs/<name>/`, then implement
- **Organ code**: `organs/handwritten/` for references, `organs/hostile/` for adversarial tests
- **Shared types**: `packages/nerve/` for Nerve-related, appropriate package for others
- **Tests**: `tests/properties/` for PBT, `tests/e2e/` for Playwright
- **Scripts**: `scripts/` for build/deploy utilities
