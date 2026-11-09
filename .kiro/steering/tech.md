# GRAFT Tech Stack

## Stack

- **Language:** TypeScript everywhere
- **Runtime:** Node 22
- **Package Manager:** pnpm workspaces

### Frontend
- Vite + React 18 + Zustand
- Plain CSS with CSS variables (no CSS framework)
- Fonts: Cormorant Garamond/IM Fell English (headings), humanist sans (body), IBM Plex Mono (ledger)

### Backend
- Fastify + better-sqlite3
- Zod for all schemas

### Static Analysis
- `acorn` + `acorn-walk` (organ JS)
- `parse5` (organ HTML)

### Testing
- Vitest (unit)
- **fast-check** (property-based testing)
- Playwright (e2e)
- `axe-core` (accessibility)

### Deploy
- Single container (Fly.io or Render)
- Backend serves the built frontend
- No server-side headless browser

---

## Commands

```bash
pnpm dev              # Start development servers
pnpm test             # Run all tests
pnpm test:immune      # Run immune system tests
pnpm test:a11y        # Run accessibility tests
pnpm preflight        # Run preflight checks
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DOCTOR_PROVIDER` | `crew` \| `llm` \| `replay` |
| `LLM_BASE_URL` | LLM API base URL (for `llm` provider) |
| `LLM_API_KEY` | LLM API key (never commit) |
| `DOCTOR_MODEL` | Model identifier for Doctor |
