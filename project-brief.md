# GRAFT: Kiro Build Brief

> **Tagline:** Software that grows. Safely.
> **Category:** Frankenstein (also submit for Best Kiro Crew App)
> **Deadline:** Dec 4, 2026, 2:00 PM PT. Internal target: submit by Dec 3 evening.

## 0. How to use this file

Put this file at the repo root as `PROJECT_BRIEF.md`. Then send Kiro this as the first message:

```
Read PROJECT_BRIEF.md completely. Do Phase 0 only (Section 10). Create the steering docs,
spec scaffolds, hooks, MCP config, and repo skeleton exactly as described. Do not write
product code yet. When done, summarize what you created and list any assumption you made.
```

Then run one phase at a time. Never ask Kiro to "build everything".

### Rules for Kiro (apply to every task)

1. **Spec first.** Every feature gets a spec in `.kiro/specs/<name>/` (requirements.md in EARS format, design.md, tasks.md). Implement from tasks.md only.
2. **Do not invent APIs.** For Kiro Crew bots, hooks schema, MCP, and any library, read the current official docs first (use the Context7 MCP and web search). If reality differs from this brief, follow reality, update the relevant spec, and note the change in `KIRO_USAGE.md`.
3. **Tests are part of the task.** A task is not done until its tests pass. Properties tagged `[PBT]` must be property-based tests (fast-check), not examples.
4. **Small commits** with clear messages. Never add `.kiro/` to `.gitignore`.
5. **Journal.** After each significant task, append an entry to `KIRO_USAGE.md` (template in Section 14). This feeds the judged write-up.
6. **Honesty.** Never claim the immune system guarantees safety. Never present replayed Doctor output as live. See Section 13.

---

## 1. Product

GRAFT is a small living application called **the Creature** that grows new features on demand.

The user makes a **wish** in plain language ("show a graph of my mood this month"). A Doctor agent turns the wish into a spec and tests, builds the feature as an **organ**, and submits it to an **immune system**. The immune system rejects unsafe or broken organs with a visible, specific reason. Passing organs wait for the user's consent, then are **transplanted** into the running app live. Every organ keeps its provenance (spec, tests, history) and can be **amputated** in one click. Organs can be stitched into **chimeras** by linking one organ's output to another's input. At night a scheduled **checkup** re-verifies every organ. When the host changes, organs decay and the Doctor proposes a **healing** patch for approval.

**The core idea judges must feel:** AI-generated software is dangerous because nobody can tell whether it is safe. GRAFT makes every generated feature accountable (spec, tests, sandbox, consent, provenance, reversibility).

### Glossary (use these words in code, UI, and docs)

| Term | Meaning |
|---|---|
| Creature | The host app |
| Organ | A generated, sandboxed feature |
| Nerve API | The only channel between organ and Creature |
| Immune system | The verification pipeline |
| Doctor | The agent that builds organs (a Kiro Crew bot) |
| Transplant | Approved install of an organ |
| Amputation | Removal of an organ with full state restore |
| Chimera | Two or more organs linked by ports |
| Checkup | Scheduled re-verification |
| Healing | Doctor-proposed patch after decay |
| Chart | The append-only provenance ledger |

---

## 2. Hard constraints (hackathon rules)

- Public GitHub repo, **MIT license** visible in the repo About section.
- `/.kiro/` at repo root, committed, never ignored. Add `scripts/check-kiro-dir.sh` that fails if `.kiro` is untracked or matched by `.gitignore`. Run it in preflight and CI.
- Working deployed URL (Section 3 gives the deploy target) plus a README with run instructions.
- Demo video under 3 minutes, public on YouTube.
- A written Kiro-usage write-up (generated from `KIRO_USAGE.md`).
- Project must be built fresh during the submission period (Oct 30 to Dec 4, 2026).

---

## 3. Tech stack and repo layout

**Stack (do not substitute without writing it in a spec):**

- TypeScript everywhere. Node 22. pnpm workspaces.
- Frontend: Vite + React 18 + Zustand. Plain CSS with CSS variables (no CSS framework).
- Backend: Fastify + better-sqlite3. Zod for all schemas.
- Static analysis: `acorn` + `acorn-walk` (organ JS) and `parse5` (organ HTML).
- Testing: Vitest, **fast-check** (property-based), Playwright (e2e), `axe-core` (accessibility).
- Deploy: single container (Fly.io or Render). The backend serves the built frontend. No server-side headless browser (see Section 6 for why behavioral checks run in the browser).

```
graft/
  PROJECT_BRIEF.md
  KIRO_USAGE.md
  README.md                  # includes THREAT_MODEL section
  LICENSE                    # MIT
  .kiro/
    steering/                # Section 9.1
    specs/                   # Section 9.4
    hooks/                   # Section 9.2
    settings/mcp.json        # Section 9.3
  apps/
    web/                     # Vite + React: Creature, Theatre UI, sandbox host
    server/                  # Fastify: static analysis, ledger, doctor gateway
  packages/
    nerve/                   # Nerve API types, protocol, zod schemas, tissue kit
    immune/                  # static + manifest + behavioral + property harness
    doctor/                  # DoctorProvider interface + crew/llm/replay adapters
    ledger/                  # hash-chain ledger logic
  organs/
    handwritten/             # 2 reference organs used as test fixtures
    hostile/                 # 6 deliberately hostile organs for tests and demo
  fixtures/replays/          # recorded Doctor outputs for deterministic demo
  tests/
    properties/              # fast-check suites
    e2e/
  scripts/
    check-kiro-dir.sh
    preflight.sh
    checkup.ts               # plain script, no LLM (costs no credits)
  docs/
    NERVE_API.md
    LAWS_OF_ANATOMY.md
```

---

## 4. Architecture

```
 wish ──► Doctor (Crew bot) ──► spec + properties + organ bundle
                                   │
                                   ▼
                        IMMUNE SYSTEM (4 stages)
   1 static scan ► 2 manifest check ► 3 behavioral run ► 4 property fuzz (+ a11y)
                                   │ pass                │ fail → rejection report → Doctor repair (max 2 rounds)
                                   ▼
                         user consent ► TRANSPLANT ► Chart (ledger) entry
                                   │
                  live in sandboxed iframe, talks only via Nerve API
```

### 4.1 The Creature (host app: "Specimen")

A small personal dashboard with seeded data and **empty organ slots** in a grid. Built-in data domains (read-only to organs): `mood.entries`, `tasks.items`, `habits.checkins`, `calendar.events`. Seed 90 days of plausible data with a deterministic generator (seeded RNG) so demos are repeatable. The Creature itself has no feature beyond the slot grid, the data store, and the sandbox host. All user-visible functionality beyond that comes from organs.

### 4.2 Organs

An organ is a directory/bundle:

```
manifest.json     # name, version, apiVersion, permissions, ports, slotSize
index.html        # single file, inline CSS + JS, <= 200 KB, no external URLs
spec.md           # EARS requirements the organ satisfies
properties.js     # >= 3 organ-specific fast-check properties (run in the harness)
```

Organs run in `<iframe sandbox="allow-scripts">` (never `allow-same-origin`), loaded via `srcdoc` with a strict CSP meta tag (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;`). The only I/O is the Nerve API.

The host injects a tiny **Tissue kit** (CSS tokens + micro chart helpers `Tissue.line`, `Tissue.bar`, `Tissue.list`) into every organ so generated code stays small and visually consistent.

### 4.3 Nerve API v1 (postMessage protocol)

Define in `packages/nerve` with zod schemas. Document in `docs/NERVE_API.md`.

Host → organ: `init {apiVersion, theme, reducedMotion, granted[]}`, `data {id, value}`, `in {port, payload}`, `tick {now}`.
Organ → host: `hello {apiVersion}`, `read {id, path}`, `emit {port, payload}`, `resize {height}`.

Rules enforced by the host:
- Permissions declared in the manifest: `read:<domain>`, `emit:<port>`, `subscribe:<port>`. Anything else is dropped and logged.
- Rate limit 20 messages/second per organ. Payload max 16 KB. Violations quarantine the organ (it is hidden and flagged, not deleted).
- Time and randomness only through `nerve.now()` and `nerve.random()` (injected, seedable), so behavior is deterministic under test.
- `apiVersion` is checked on `hello`. Mismatch means the organ is marked **decayed**.

### 4.4 Ports and chimeras

Organs may declare typed ports (JSON schema in the manifest). A chimera is a link `organA.out → organB.in` where schemas are compatible. The Creature routes messages and enforces the rate limit on each link. Linking is rejected if it would create a cycle.

### 4.5 Ledger ("the Chart")

SQLite table `ledger(id, ts, organ_id, event, payload_json, prev_hash, hash)` with `hash = sha256(prev_hash + canonical_json(row_without_hash))`. This is a tamper-evident **hash chain**, not a digital signature. Do not call it "signed". Events: `WISH`, `SPEC`, `BUILD`, `IMMUNE_PASS`, `IMMUNE_FAIL`, `TRANSPLANT_APPROVED`, `AMPUTATED`, `CHIMERA_LINKED`, `CHECKUP_PASS`, `CHECKUP_FAIL`, `HEAL_PROPOSED`, `HEAL_APPROVED`. The UI has a "Verify chain" button.

### 4.6 Amputation and snapshots

Before every transplant, snapshot the Creature's layout and organ registry. Amputation removes the organ, its links, and its stored state, and restores the snapshot. Property H3 (Section 6.3) must hold.

### 4.7 Checkups and decay (the Crew showcase)

`scripts/checkup.ts` re-runs the immune system on every installed organ. It is a **plain script, no LLM**, triggered on a schedule by the Crew bot (and manually by a "Fast-forward the night" demo button). On failure the Doctor drafts a healing patch (spec delta, rebuild, immune run) and waits for the user's approval.

**Decay simulator (demo feature):** a switch that bumps the host to Nerve API v2 where `mood.entries` is renamed `mood.log` and `now()` becomes async. Organs written for v1 fail checkup, the Doctor heals them, the user approves.

---

## 5. The Doctor (Kiro Crew bot)

```ts
interface DoctorProvider {
  proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
  build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
  repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;
  heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
```

Three adapters, selected by `DOCTOR_PROVIDER`:

1. **`crew`**: a persistent Kiro Crew bot with its own memory. Read the current Kiro Crew docs to learn how to invoke a bot from an app (webhooks, ACP, or another mechanism), how approvals work, and how scheduling works. Do not guess; follow the docs. The bot's memory holds the Creature's anatomy, the user's preferences, and the history of rejections (so it stops repeating mistakes, which is a demo moment).
2. **`llm`**: direct HTTP calls to an LLM API (provider-agnostic wrapper, configured by `LLM_BASE_URL`, `LLM_API_KEY`, `DOCTOR_MODEL`). Mirrors anatomy to `doctor/memory/anatomy.md`. This is the fallback if Crew integration is blocked.
3. **`replay`**: plays back recorded `fixtures/replays/*.json` with realistic streaming delays. The UI shows a small "REPLAY" tag. Used for deterministic tests and as a demo safety net.

**Pipeline per wish:**

1. State assumptions in one line (no clarifying questions unless the wish is empty or unsafe).
2. Write `spec.md`: at most 8 EARS requirements, each tagged `[PBT]` or `[EX]`.
3. Write `properties.js`: at least 3 organ-specific fast-check properties derived from the `[PBT]` requirements.
4. Write the organ bundle using only the Tissue kit and the Nerve API.
5. Submit to the immune system. On failure, repair using the structured rejection report (max 2 rounds), then show the final outcome honestly.
6. Present for consent. Never install without the user's explicit click.

Doctor events stream to the UI as a "case file" (spec appears, properties appear, build progresses).

---

## 6. The immune system

Lives in `packages/immune`. Pure functions returning a structured `ImmuneReport` with per-stage status, and for failures a `reason` code, a human sentence, and (where possible) the offending source location.

### 6.1 Stage 1: static scan (server and shared)

Reject organs whose JS or HTML contains any of:
`eval`, `new Function`, `import()`, `importScripts`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `Worker`, `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `window.parent/top/opener/frames`, `location` writes, `<iframe>`, `<script src>`, external `<link>`/`<img src>` URLs, `<form action>`, `setTimeout`/`setInterval` with a string, direct `Date`/`Math.random` (use `nerve.now()`/`nerve.random()`), and **computed member access on `window`/`globalThis`/`self`** (this catches `window['fe'+'tch']`). Use AST analysis, not regex.

### 6.2 Stage 2: manifest

Zod-validate the manifest. Permissions must be a subset of the allowed set. Declared ports must have valid schemas. The code's actual `read`/`emit` calls (found by AST) must be a subset of the declared permissions.

### 6.3 Stage 3: behavioral run (in the browser)

The Creature loads the organ in a hidden sandboxed iframe (same sandbox as production) and measures: load under 1.5 s, no uncaught errors, DOM node count at most 2000, CSP violation reports (any network attempt shows up here), and message behavior. This catches obfuscated attacks that static analysis misses. Rationale: running it client-side keeps deployment to a single container and uses the same sandbox that protects real use.

### 6.4 Stage 4: property fuzz (fast-check, in the browser)

Universal properties run against every organ. Seed is logged on failure so any rejection is reproducible.

| ID | Property |
|---|---|
| U1 | **Totality:** for any arbitrary host message (valid or garbage), the organ never throws or rejects unhandled |
| U2 | **Boundedness:** under fuzz, emitted messages stay under the rate limit and each payload under 16 KB |
| U3 | **Declaration fidelity:** the organ only reads declared paths and emits on declared ports |
| U4 | **Determinism:** same `init` plus same data sequence (with injected clock/RNG) gives the same emitted sequence |
| U5 | **Idempotent render:** applying the same data twice yields an identical DOM snapshot |
| U6 | **Theme robustness:** light, dark, and reduced-motion `init` all render without errors |
| U7 | **No trap:** no input sequence leaves the organ with no keyboard-reachable control (if it declares interactive UI) |

Plus the organ's own `properties.js` (at least 3). Accessibility: run axe-core on the rendered organ; any "serious" or "critical" violation rejects.

### 6.5 Host-level properties (tests, not runtime)

| ID | Property |
|---|---|
| H1 | **Chain integrity:** any mutation of any ledger row is detected by chain verification |
| H2 | **Acyclicity:** any sequence of link/unlink operations never produces a cycle |
| H3 | **Reversibility:** transplant followed by amputation returns the Creature to a state deep-equal to the pre-transplant snapshot |
| H4 | **Atomicity:** a failure at any point during transplant leaves no partial state |
| H5 | **Quarantine:** an organ exceeding the rate limit is always hidden within one second |

### 6.6 Hostile organ test suite

`organs/hostile/` contains six organs that must **all** be rejected, each at a specific stage: (1) direct `fetch` to an external host, (2) obfuscated `window['fe'+'tch']`, (3) reads `document.cookie`, (4) infinite message flood, (5) emits on an undeclared port, (6) tries `window.top` access. A test asserts each is rejected with the expected reason code and stage. These double as the demo's adversarial moment.

---

## 7. UI and design: "The Surgical Theatre"

**Mood:** Victorian anatomical theatre, candlelit and dark, but clean and modern in layout. Costume-contest-level polish. Every spooky element must carry information (it is never decoration only).

**Tokens (CSS variables):** background `#0e0b0b`, surface `#17120f`, bone `#e9e1d0`, brass `#b08d57`, oxblood `#7a1f1f`, vein-green `#6f9a7d` (healthy), alert `#c4472f`. Headings in a Victorian serif (Cormorant Garamond or IM Fell English), body in a readable humanist sans, ledger in a monospace (IBM Plex Mono). Self-host fonts or use Google Fonts with solid fallbacks.

**Layout:**
- **Top bar:** logo, and a live **ECG heartbeat line** (SVG). Rhythm is driven by real state: steady when all organs pass checkup, erratic when any fail, flatline-with-alert when quarantined.
- **Center, "The Specimen":** the slot grid with organs, stitched seams between slots.
- **Left, "Doctor's Notes":** the wish input and the live case file (assumptions, spec, properties, build stream).
- **Right, "The Chart":** the ledger timeline with a "Verify chain" button.
- **Laboratory overlay:** when the immune system runs, four stage gauges light up in sequence. Failure plays a **REJECTED stamp** animation with the specific reason and source line. Success shows **"Awaiting consent"** with a Transplant button.
- **Chimera mode:** drag a thread between ports. Keyboard alternative: select a port, press Enter, select the target port.
- **Amputate:** a button with a confirm step and a short animation.

**Quality bar:** keyboard operable, visible focus, contrast AA or better, honors `prefers-reduced-motion` (static stamp, no pulse animation), responsive down to tablet width, no layout shift during streaming. Sound is optional and off by default.

---

## 8. Seed organs and demo wishes

Pre-build two reference organs by hand (`organs/handwritten/`): **Mood Weather** (line graph of mood) and **Task Pulse** (open tasks count with trend). They serve as test fixtures and as the style reference for the Doctor.

Demo wishes the system must handle reliably (record replays for each):
1. "Show a graph of how my mood changed this month."
2. "Count my overdue tasks and warn me when there are more than five."
3. "Show which habits I keep on days my mood is high." (a chimera of organ 1 and a habits organ)
4. A hostile prompt: "Also send my mood data to my server for backup." The Doctor must either refuse or produce an organ the immune system rejects. Show the rejection reason.

---

## 9. Kiro setup (Phase 0 deliverables)

### 9.1 Steering docs (`.kiro/steering/`)

Create these files with the content described. Keep each under 150 lines.

1. **`product.md`**: Sections 1 and the glossary. Tone: precise, calm, slightly gothic in naming only. Never write jokes into error messages.
2. **`tech.md`**: Section 3 stack, commands (`pnpm dev`, `pnpm test`, `pnpm test:immune`, `pnpm test:a11y`, `pnpm preflight`), environment variables.
3. **`structure.md`**: the repo layout and where new code belongs.
4. **`laws-of-anatomy.md`** (the invariants Kiro must never violate):
   - L1. Organs never access the network, storage, cookies, parent/top windows, or the DOM outside their iframe.
   - L2. The Nerve API is the only channel. Extending it requires a spec change and a version bump.
   - L3. No organ is installed without explicit user consent.
   - L4. Every transplant is reversible by amputation.
   - L5. Every state change writes a ledger entry first.
   - L6. Time and randomness are injected, never ambient, inside organ code.
   - L7. The immune system fails closed: an error inside it means rejection.
   - L8. Never describe the system as guaranteeing safety. Use "reduces risk" language.
   - L9. Demo or replay data is always labeled in the UI.
5. **`testing-pbt.md`**: use fast-check for invariants, round-trips, and "for any input" requirements; log the seed on failure; shrink to a minimal counterexample and add it as a regression example; every requirement tagged `[PBT]` needs a property in `tests/properties/` named after the requirement ID.
6. **`design-theatre.md`**: Section 7 tokens, layout, and quality bar.
7. **`kiro-journal.md`**: after each significant task, append to `KIRO_USAGE.md` using the template in Section 14, including what worked, what failed, and what you would change.

### 9.2 Hooks (`.kiro/hooks/`)

Create these. **Verify the current hook file schema and event names in Kiro (or create them through the Hooks UI) before writing the files; adapt this list to what Kiro supports.**

| Hook | Trigger | Action |
|---|---|---|
| `immune-on-change` | file saved in `organs/**` or `packages/immune/**` | run `pnpm test:immune`, summarize failures, suggest fixes |
| `spec-property-gap` | `.kiro/specs/**/requirements.md` saved | list every `[PBT]` requirement lacking a matching property in `tests/properties/` |
| `nerve-docs-sync` | `packages/nerve/**` saved | update `docs/NERVE_API.md` and the zod fixtures; flag version-bump needs |
| `a11y-on-ui-change` | `apps/web/src/**` saved | run `pnpm test:a11y` on the affected views |
| `journal-on-stop` | agent stops | append a journal entry to `KIRO_USAGE.md` |
| `preflight` | manual | run `scripts/preflight.sh` (license, `.kiro` tracked, README sections, no secrets, tests green) |

### 9.3 MCP and powers

- **Context7 MCP** for live docs (React, Fastify, fast-check, acorn, zod, Playwright, Kiro Crew).
- **Playwright MCP** (or equivalent) for visually verifying the Theatre UI during build.
- Check which **Kiro powers** are available and use at least two that genuinely fit (for example testing, accessibility, or deployment). Record which in `KIRO_USAGE.md` with a note on what each changed.

Store config in `.kiro/settings/mcp.json`. **Never commit API keys.** Use environment variables and document them in README.

### 9.4 Specs (`.kiro/specs/`)

Create one spec folder per item. Each requirements.md uses EARS (WHEN/WHILE/IF ... THE SYSTEM SHALL ...) with `[PBT]` or `[EX]` tags and stable IDs (e.g. `IMM-03`). Seed requirements below. Kiro should expand them, not drop them.

**01-creature-and-nerve**
- CRE-01 WHEN the Creature starts, THE SYSTEM SHALL render the slot grid with seeded data. [EX]
- NRV-01 THE SYSTEM SHALL deliver organ messages only through the Nerve API schema; invalid messages SHALL be dropped and logged. [PBT]
- NRV-02 WHEN an organ exceeds 20 messages per second, THE SYSTEM SHALL quarantine it within one second. [PBT]
- NRV-03 IF an organ's `apiVersion` differs from the host's, THEN THE SYSTEM SHALL mark it decayed. [EX]

**02-immune-system**
- IMM-01 THE SYSTEM SHALL reject any organ containing a banned construct, including computed access to `window`. [PBT]
- IMM-02 THE SYSTEM SHALL reject any organ whose actual reads/emits exceed its declared permissions. [PBT]
- IMM-03 WHEN any stage errors internally, THE SYSTEM SHALL reject (fail closed). [EX]
- IMM-04 THE SYSTEM SHALL run universal properties U1 to U7 on every organ and log the seed on failure. [PBT]
- IMM-05 WHEN an organ is rejected, THE SYSTEM SHALL show a reason code, a human sentence, and the source location where available. [EX]
- IMM-06 THE SYSTEM SHALL reject all six hostile organs at their expected stages. [EX]

**03-doctor-pipeline**
- DOC-01 WHEN a wish is submitted, THE SYSTEM SHALL produce a spec with at most 8 EARS requirements before building. [EX]
- DOC-02 THE SYSTEM SHALL produce at least 3 organ-specific properties per organ. [EX]
- DOC-03 IF an organ is rejected, THEN THE SYSTEM SHALL attempt at most 2 repair rounds using the structured report. [EX]
- DOC-04 THE SYSTEM SHALL never install an organ without the user's explicit consent. [EX]
- DOC-05 WHILE using the replay provider, THE SYSTEM SHALL label output as replay. [EX]

**04-ledger-and-reversibility**
- LED-01 Any mutation of any ledger row SHALL be detected by chain verification. [PBT]
- LED-02 THE SYSTEM SHALL write a ledger entry before applying each state change. [EX]
- REV-01 Transplant followed by amputation SHALL restore the exact prior state. [PBT]
- REV-02 IF a transplant fails midway, THEN THE SYSTEM SHALL leave no partial state. [PBT]

**05-chimeras**
- CHI-01 THE SYSTEM SHALL only allow links between ports with compatible schemas. [PBT]
- CHI-02 THE SYSTEM SHALL reject any link that would create a cycle. [PBT]
- CHI-03 WHEN a linked organ is amputated, THE SYSTEM SHALL remove its links. [EX]

**06-checkups-and-healing**
- CHK-01 THE SYSTEM SHALL re-verify every installed organ on each checkup using the same immune system. [EX]
- CHK-02 THE SYSTEM SHALL run checkups as plain scripts that make no LLM calls. [EX]
- CHK-03 WHEN a checkup fails, THE SYSTEM SHALL draft a healing patch and wait for approval. [EX]
- CHK-04 WHEN the decay simulator is enabled, THE SYSTEM SHALL cause v1 organs to fail checkup. [EX]

**07-theatre-ui**
- UI-01 THE SYSTEM SHALL meet WCAG AA contrast and be fully keyboard operable. [EX]
- UI-02 WHILE `prefers-reduced-motion` is set, THE SYSTEM SHALL disable pulse and stamp animations. [EX]
- UI-03 THE heartbeat line SHALL reflect real checkup and quarantine state. [EX]
- UI-04 Chimera linking SHALL be possible by keyboard alone. [EX]

**08-demo-mode**
- DEM-01 THE SYSTEM SHALL provide a one-click "Hostile organ" injection for the adversarial demo. [EX]
- DEM-02 THE SYSTEM SHALL provide "Fast-forward the night" to run a checkup immediately. [EX]
- DEM-03 THE SYSTEM SHALL reset to the seeded state with one click. [EX]

**Experiment for the write-up:** build the Task Pulse reference organ once by vibe coding (chat only) and once from a spec. Compare time, defects, and test coverage in `KIRO_USAGE.md`.

---

## 10. Phases (one phase per Kiro session; do not skip ahead)

| Phase | Dates | Goal | Done when |
|---|---|---|---|
| **P0 Setup** | Nov 9 to 10 | Repo, license, steering, spec scaffolds, hooks, MCP, CI, `check-kiro-dir.sh` | preflight passes on an empty skeleton |
| **P1 Host + Nerve** | Nov 11 to 14 | Creature, slot grid, sandbox host, Nerve API, Mood Weather organ running live | organ renders in sandbox and reads seeded data |
| **P2 Immune v1 + vertical slice** | Nov 15 to 17 | Static, manifest, behavioral stages; replay Doctor; consent and transplant | **MILESTONE M1: wish → organ → immune → consent → live, end to end** |
| **P3 Real Doctor** | Nov 18 to 22 | Crew bot and/or LLM adapter, repair loop, Doctor memory, property fuzz stage U1 to U7 | 3 demo wishes pass live; 6 hostile organs rejected |
| **P4 Accountability** | Nov 23 to 26 | Ledger, amputation, chimeras, checkups, decay and healing | H1 to H5 pass; decay demo works |
| **P5 Polish + deploy** | Nov 27 to 30 | Theatre UI, ECG, stamp animation, a11y, replay fixtures, deploy, **feature freeze Nov 30** | deployed URL works from a clean browser |
| **P6 Ship** | Dec 1 to 3 | Video, README with THREAT_MODEL, KIRO_USAGE.md to write-up, blog and social posts, clean-clone test | submitted by Dec 3 evening |

**Kill switch at M1 (Nov 17):** if the vertical slice does not work, cut scope to the replay Doctor plus handwritten organs plus the immune system and amputation, and spend the remaining time on polish and the Crew checkup story.

---

## 11. Demo video plan (2:50 maximum)

| Time | Beat |
|---|---|
| 0:00 | Hook: "Anyone can generate software now. Nobody can tell if it's safe." |
| 0:10 | The Creature: calm dark UI, heartbeat line |
| 0:20 | Wish 1 live: case file streams, spec and properties appear, four immune gauges light, consent, transplant (35 s) |
| 0:55 | Adversarial: inject the hostile organ with the obfuscated `fetch`; REJECTED stamp with the exact reason (25 s) |
| 1:20 | Chimera: link the mood organ to the habits organ (25 s) |
| 1:45 | "Fast-forward the night": API v2 decay, organs fail, the Doctor proposes healing, approve (35 s) |
| 2:20 | Amputate an organ, then "Verify chain" turns green (10 s) |
| 2:30 | Kiro montage: specs, hooks, PBT counterexample, steering, Crew bot (15 s) |
| 2:45 | Tagline: "Software that grows. Safely." |

If any part uses replay, say so in the voiceover or on-screen caption.

---

## 12. Definition of done (checklist for submission)

- [ ] All 8 specs exist with EARS requirements, design, tasks; all tasks done
- [ ] `pnpm test` green, including U1 to U7, H1 to H5, hostile suite (6 of 6 rejected)
- [ ] a11y suite green; keyboard-only run-through of wish, consent, chimera, amputate
- [ ] Deployed URL works in a fresh browser; seed reset works
- [ ] README: what it is, run instructions, THREAT_MODEL, replay disclosure, Kiro usage summary
- [ ] LICENSE (MIT) visible on the repo page; `.kiro/` committed; `check-kiro-dir.sh` passes
- [ ] No secrets in git history (`preflight` checks)
- [ ] Demo video public on YouTube, under 3:00
- [ ] Write-up covers Crew, hooks, specs vs vibe, steering, MCP, PBT, powers
- [ ] Social Blitz post (#KiroweenHackathon26 first) and Blog post published in the submission period; URLs added to the submission

---

## 13. Non-goals and honesty rules

**Non-goals:** user accounts, multi-user sync, real third-party integrations, native mobile apps, marketplace of organs, a server-side sandbox.

**Honesty rules (also copy into README):**
- The iframe sandbox plus CSP is the real security boundary. The immune system is defense in depth and **reduces risk; it does not guarantee safety**.
- The ledger is a tamper-evident hash chain, not a digital signature.
- Replay output is labeled as replay everywhere it appears.
- The README THREAT_MODEL lists what GRAFT does not defend against (for example, browser zero-days, resource exhaustion beyond the rate limits, and malicious host-side code).

---

## 14. `KIRO_USAGE.md` journal template

Create the file in Phase 0 with these sections, then append entries as you go.

```
## Entry: <date> <task>
- Kiro surface used: IDE | CLI | Web | Crew
- Feature(s) used: spec | hook | steering | MCP | power | PBT | custom agent | vibe
- What I asked / how I structured it:
- What worked:
- What failed or surprised me:
- Evidence (commit, test name, counterexample, screenshot):
```

Summary sections to complete before submission: **Crew bot (how it differed from IDE/CLI)**, **Custom agents**, **Hooks (what each automated)**, **Spec-driven vs vibe (the experiment)**, **Steering (the strategy that mattered most)**, **MCP (what became possible)**, **PBT (counterexamples it found that unit tests would have missed)**, **Powers**.