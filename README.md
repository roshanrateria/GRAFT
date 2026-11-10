# GRAFT: Software that grows. Safely.

> **Tagline:** Software that grows. Safely.

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

**Remember**: Software that grows. Safely. (But not guaranteed safe.)
