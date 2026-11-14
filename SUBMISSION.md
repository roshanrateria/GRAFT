# GRAFT: Devpost submission text (Kiroween 2026)

Copy the sections below into the Devpost form. Everything marked `PLACEHOLDER` is something only the team can supply. Nothing in this file is invented: each claim was checked against the repository on 2026-11-13, and the unchecked ones are listed under [Claims not verified](#claims-not-verified).

Wording follows the project rules. GRAFT reduces risk. It does not guarantee safety (Law L8). Replayed Doctor output is always labeled as replay (Law L9).

## Submission checklist

| Item | Value |
|------|-------|
| Project name | GRAFT — The Creature That Grows |
| Tagline | Software that grows. Accountably. |
| Category | Frankenstein |
| Bonus prizes to select | Best Kiro Crew App (see the [honesty note](#bonus-best-kiro-crew-app)). Best Demo needs no extra steps. |
| Public GitHub URL | https://github.com/roshanrateria/GRAFT |
| Live app URL | Judges run it locally (see [Setup and run](#setup-and-run)); no hosted deployment — the stack is a stateful Fastify + SQLite server, which does not fit serverless hosts. |
| Demo video (YouTube, public, 1:47, no copyrighted music) | https://youtu.be/oqbuqR6nlxw — storyboard + timestamps: [DEMO_GUIDE.md](DEMO_GUIDE.md) |
| Team members (up to 3) | PLACEHOLDER: names |
| Social Blitz post URL (post must start with `#KiroweenHackathon26`) | PLACEHOLDER: post URL, only if posted during the Submission Period |
| Bonus Blog post URL (must say it was written for Kiroween 2026) | PLACEHOLDER: blog URL, only if published during the Submission Period |
| Judge credentials | Passcode for live mode: `test` (the repo default). Enter in the Devpost judge-only field. Judges also need their own `LLM_API_KEY` for the live path; the replay path needs nothing. |
| Submission window | Build period Oct 30 to Dec 4, 2026. Deadline Friday, Dec 4, 2026, 2:00 PM Pacific Time. |

Repository requirements, checked in this checkout:

- License: `LICENSE` is the MIT License and is tracked by git. GitHub detects it once the repo is public.
- `/.kiro` is tracked (`scripts/check-kiro-dir.sh` reports "properly tracked") and `.gitignore` has no `.kiro` entry.
- `.kiro/settings/mcp.json` is currently untracked. Add it before pushing (see [Known limitations](#known-limitations)).
- First commit in the local history is dated 2026-11-09, inside the Submission Period.
- The repo must be public on GitHub (not GitLab or Bitbucket). PLACEHOLDER: confirm visibility before submitting.

## Elevator pitch (Devpost tagline field, ≤200 characters)

```
Type a wish; an AI Doctor grows your app a new organ. An immune system screens it, you consent before transplant, it runs sandboxed — every change lands in a hash-chain ledger.
```

(166 characters.)

## About the project (Devpost "Project Story")

Copy the Markdown below into the **About the project** field.

```markdown
## Inspiration

The Frankenstein theme asked us to build the monster. Ours is not a monster of code — it is the monster every AI coding session already builds: features generated faster than anyone can vouch for them. Real transplants have a protocol: screen the organ, get consent, record the procedure, and be able to reverse. We asked: why doesn't AI-generated software?

## What it does

GRAFT is a small living application — the Creature. You type a wish in plain language. A Doctor agent writes an EARS spec and builds the feature as an **organ** (manifest, HTML bundle, properties). An **immune system** screens it in four stages — static analysis, manifest checks, behavioral checks, property checks — and a rejection comes back with a specific reason and source line, giving the Doctor up to two repair rounds. A passing organ still waits: nothing installs until you click **Transplant**. The organ then runs inside a sandboxed iframe with a strict CSP, talking to the Creature only through the Nerve API. Every state change is written to a hash-chained SQLite ledger **before** it happens, the chain is verifiable on demand, and any organ can be amputated in one click — restoring the prior state and removing its links. Organs can also be stitched into **chimeras** by wiring one organ's output port to another's input port.

In the demo video, two wishes are typed verbatim and grown live: a counter widget with an output port, and a celebrate widget that confettis when the counter hits 10.

## How we built it

Entirely in the Kiro IDE, spec-first: 8 specs with EARS requirements (several tagged `[PBT]`), 7 steering documents — the most important being our "Laws of Anatomy", numbered safety rules loaded by every workflow step and both custom agents — 2 custom agents (`graft-doctor`, and `red-team`, which wrote the 96-organ attack corpus under a clean-room rule), and 5 hooks that run immune tests, web tests, docs-sync and preflight checks on changes. MCP (context7 + playwright) is configured in `.kiro/settings/mcp.json`.

The code is a pnpm-workspace monorepo: `nerve` (the typed port/message contract), `doctor` (llm / crew / replay providers, streaming over SSE), `immune` (the four-stage scanner), `ledger` (canonical JSON + SHA-256 chain), `immune-cli`, a Fastify + better-sqlite3 server, and a React + Vite theatre interface. Property-based tests with fast-check pin the ledger chain and reversibility invariants. The demo was recorded from the running app with Playwright and narrated with Gemini TTS — no copyrighted music.

## Challenges we ran into

- **Tuning a fail-closed immune system.** Law L7 says an error inside the immune system means rejection — safe, but the strictness rejects *all* 14 benign corpus organs (they use `window.parent`). We published the numbers — 73.7% of attacks caught, weaknesses included — instead of hiding them.
- **Ledger-first discipline.** The browser cannot compute hashes, so the server owns the chain head; the entry must be written before the state change it describes. Getting SSE streaming, consent gates and append order all consistent was the hardest concurrency work.
- **Our own steering law caught us.** The tagline said "Software that grows. Safely." Law L8 forbids promising safety. It became "Software that grows. Accountably."
- **Honesty is a feature.** 3 tests fail today (documented), the Crew provider was never run against a live Gateway, and replayed output is labeled as replay (Law L9). The README and SUBMISSION files state all of it.

## What we learned

That numbered rules (the Laws of Anatomy) scale better than vibes: they are loadable context for every step and agent, and they measurably changed outcomes. That spec-driven organs needed fewer immune rejections than vibe-coded ones in our small experiment. And that the most valuable part of an AI-built app is not the code the AI writes — it is the machinery that decides whether that code deserves to run.

_GRAFT reduces risk. It does not guarantee safety. The sandbox is the real boundary._
```

## Built with (Devpost tags, ≤25)

```
TypeScript, React, Fastify, Node.js, Vite, SQLite, Zod, fast-check, Vitest, Playwright, pnpm, Server-Sent Events, Gemini API, Kiro, Kiro Specs, Kiro Steering, Kiro Hooks, Kiro Agents, Kiro MCP, Property-Based Testing, Hash-Chain Ledger, iframe Sandbox, Content Security Policy
```

(23 tags. Swap "Kiro *" tags for plain "Kiro" if the form deduplicates them.)

## Pre-existing code disclosure (Devpost form field)

```
GRAFT is a new project, built from scratch during the Kiroween build period (Oct 30 – Dec 4, 2026). No boilerplate, starter kit, template or prior codebase was used. Only standard frameworks and libraries: React, Vite, Fastify, better-sqlite3, Zod, fast-check, Vitest, Playwright, pnpm workspaces. The replay fixtures (fixtures/replays/) and the 96-organ benchmark corpus (fixtures/corpus/) were generated during the hackathon by this project's own red-team Kiro agent under a documented clean-room rule (KIRO_USAGE.md). Demo narration uses Gemini TTS; the video contains no copyrighted music.
```

## Project description

GRAFT is a small living application called the Creature that grows new features on demand, with every new feature held accountable.

AI-generated software is hard to trust because nobody can tell whether it is safe to run. GRAFT does not ask you to trust it. It makes each generated feature carry its own paper trail.

You type a wish in plain language. A Doctor agent turns the wish into a spec and builds the feature as an organ: a manifest, an HTML bundle and a set of properties. The organ goes to an immune system that runs four stages (static analysis, manifest checks, behavioral checks, property checks). If the organ fails, it comes back with a specific reason and a source line, and the Doctor gets up to two repair rounds. If it passes, it waits. Nothing installs until you click the Transplant button. The organ then runs inside a sandboxed iframe with a strict Content Security Policy, and it can talk to the Creature only through the Nerve API.

Every state change writes an entry to an append-only, hash-chained ledger (the Chart) before the change is applied. You can verify the chain at any time. Any organ can be amputated in one click, which restores the Creature to its prior state and removes the organ's chimera links.

GRAFT reduces risk. It does not guarantee safety. The iframe sandbox plus CSP is the real security boundary. The immune system is defense in depth, and its measured weaknesses are published in the README rather than hidden.

### Why Frankenstein

The app stitches together parts that do not normally belong together: a generative AI builder, a static-analysis security pipeline, a sandboxed micro-frontend runtime, a tamper-evident ledger, a property-based test harness and a Victorian anatomical-theatre interface. Organs can also be stitched into chimeras by linking one organ's output port to another organ's input port.

## Features

Each item below was checked against the repository. Status notes are in [Known limitations](#known-limitations).

- **Wish to organ pipeline.** The Doctor has three providers: `llm`, `crew` and `replay` (`packages/doctor/src/providers/`). It streams spec, build and repair events over server-sent events, with up to 2 repair rounds.
- **Four-stage immune system.** Static, manifest, behavioral and property stages (`packages/immune/`). It fails closed: an error inside the immune system means rejection (Law L7). Universal properties U1 to U7 run through fast-check and log the seed on failure.
- **Rejection with a reason.** The report carries a reason code, a sentence and a source location. The command line wrapper (`pnpm immune`) exits 0 for approved, 1 for rejected, 2 for error.
- **Explicit consent.** No organ installs without a user click (Law L3).
- **Sandbox plus Nerve API.** Organs run in `<iframe sandbox="allow-scripts">` with CSP. The Nerve host validates messages with Zod, rate limits to 20 messages per second per organ, drops payloads over 16 KB and quarantines violators.
- **Hash-chain ledger.** SQLite on the server, with canonical JSON and SHA-256 chaining. Tamper-evident, not digitally signed.
- **Amputation.** One click with a confirm step. Pre-transplant snapshots restore the prior state and chimera links are removed.
- **Chimeras.** Port compatibility checks, cycle prevention and keyboard linking. Three compatibility tests currently fail (see below).
- **Theatre interface.** Slot grid, ECG heartbeat line, Doctor's Notes, the Chart, Laboratory overlay with stage gauges, consent dialog. Tokens and layout follow `.kiro/steering/design-theatre.md`.
- **Checkups.** Scripts re-verify installed organs with no LLM calls (`pnpm checkup`, `pnpm checkup:dry`). There is no checkup UI.
- **Published benchmark.** A 96-organ corpus. The immune system caught 56 of 76 attacks (73.7%). A modeled sandbox-plus-CSP baseline caught 36 of 76 (47.4%). Every benign corpus organ was rejected for using `window.parent`, which is a real false-rejection weakness. Method and caveats: [fixtures/corpus/SUMMARY.md](fixtures/corpus/SUMMARY.md) and the README.

### Bonus: Best Kiro Crew App

- The Doctor is built to run as a Kiro Crew bot. `packages/doctor/src/providers/crew.ts` is a REST client for the Crew Gateway (`POST /api/bots/{botName}/invocations`, bearer token, default bot name `graft-doctor`, covered by 11 tests in `packages/doctor/src/__tests__/crew.test.ts`). `.kiro/agents/graft-doctor.md` is the bot definition. `.kiro/scheduling/checkup-schedule.md` documents nightly checkups with Crew cron.
- Honesty note: `docs/STATUS.md` and [KIRO_USAGE.md](KIRO_USAGE.md#crew-bot) both state that the `crew` provider was not exercised live, because a running Gateway and token were needed. The default demo uses `replay`, and the live path uses `llm`. Select this bonus only if the team can show a Crew run, or accept that judges may read the integration as code only.
- Crew features to describe in the form: the Doctor bot (spec, build, repair, heal), and the nightly checkup schedule. PLACEHOLDER: how the Crew bot differed from IDE and CLI, once the team confirms it.

## How it was built with Kiro

Full write-up with evidence for each claim: [KIRO_USAGE.md](KIRO_USAGE.md). Section links:

| Judging question | Short answer | Details |
|------------------|--------------|---------|
| IDE, CLI, Web, Crew | The build ran in the Kiro IDE. Most journal entries are workflow subagents (implement, then review, then fix). CLI and Web use is not recorded. Crew is integration code only. | [IDE vs CLI vs Web vs Crew](KIRO_USAGE.md#ide-vs-cli-vs-web-vs-crew) |
| Crew bot | REST provider, agent definition and checkup schedule, not run live. | [Crew bot](KIRO_USAGE.md#crew-bot) |
| Custom agents | `graft-doctor` (the builder) and `red-team` (writes attack and benign organs under a clean-room rule so the benchmark does not tune to the detector). | [Custom agents](KIRO_USAGE.md#custom-agents) |
| Hooks | 5 hooks: immune tests on organ or immune change, web tests on UI change, Nerve docs sync check, PBT gap check, and a `preflight` prompt hook. The preflight hook fired during the final documentation pass and surfaced the 3 known failing tests. | [Hooks](KIRO_USAGE.md#hooks) |
| Spec-driven vs vibe | 8 specs with `[PBT]` and `[EX]` tagged requirements. A small experiment (5 organs per arm, self-reported) found vibe coding faster to a first draft and spec-driven organs with fewer immune rejections. Results are anecdotal. | [Spec-driven vs vibe](KIRO_USAGE.md#spec-driven-vs-vibe), [docs/spec-vs-vibe-results.md](docs/spec-vs-vibe-results.md) |
| Steering | 7 files. The Laws of Anatomy file mattered most: numbered rules loaded by every workflow step and both agents. It caught the tagline "Safely" as conflicting with L8, which became "Accountably". | [Steering](KIRO_USAGE.md#steering) |
| MCP | `.kiro/settings/mcp.json` configures context7 and playwright servers. No journal evidence of MCP use during the build, so no feature is credited to it. | [MCP](KIRO_USAGE.md#mcp) |
| Property-based testing | fast-check for ledger chain integrity (LED-01), reversibility (REV-01), atomicity (REV-02) and immune universal properties U1 to U7. No shrunk counterexample from a real bug is recorded, so none is claimed. | [Property-based testing](KIRO_USAGE.md#property-based-testing) |
| Powers | None used. | [Powers](KIRO_USAGE.md#powers) |

Spec-driven outcome, from `docs/STATUS.md`: 25 of 33 tracked requirements implemented, 4 partial, 4 not started. The not-started items are listed under Known limitations.

## Replay vs live (Law L9)

| Path | What it is | How to recognize it |
|------|-----------|---------------------|
| Replay (default) | Canned Doctor output. No API key, no network. The server picks one of four built-in wishes by keyword (`apps/server/src/benchmarkWishes.ts`). | Every event carries `_replay: true`. The web UI does not show a REPLAY badge today, so the demo video must caption these beats. |
| Live | The configured provider (`llm` by default) answers the wish. Needs `LLM_API_KEY` and the passcode. | The UI shows a LIVE badge after passcode login. Recorded live wishes took about 17 seconds each on average ([docs/wish-trial-results.md](docs/wish-trial-results.md)). 9 of 10 passed the full pipeline in one recorded run. |
| Deterministic fixtures | `fixtures/replays/*.json`, played by `scripts/demo-judges.ts`. | Replay. Not live. |
| Crew | REST client only. | Not exercised live. Do not present as live. |

The DEMO_GUIDE labels every demo beat REPLAY or LIVE. Do not present a REPLAY beat as live.

## Setup and run

Prerequisites: Node.js 22 or newer and pnpm 9.12.3 (from `package.json`).

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # then edit locally; never commit .env
pnpm dev                                       # web http://localhost:3000, API http://localhost:3001
```

The replay path works with no keys. Open http://localhost:3000, type a wish such as "Show a count of open tasks on output port open-count", and watch the spec, the immune gauges and the consent dialog.

Environment variable names (set values only in `apps/server/.env`, which git ignores):

| Variable | Purpose |
|----------|---------|
| `DOCTOR_PROVIDER` | `crew`, `llm` or `replay` |
| `LLM_BASE_URL` | LLM API base URL for the `llm` provider |
| `LLM_API_KEY` | LLM API key for the `llm` provider |
| `DOCTOR_MODEL` | Model identifier |
| `LIVE_PASSCODE` | Passcode that unlocks live Doctor mode |
| `PORT`, `HOST`, `CORS_ORIGIN`, `LOG_LEVEL` | Server settings |
| `KIROCREW_GATEWAY_URL`, `KIROCREW_TOKEN`, `KIROCREW_BOT` | Read by `crew.ts`. Not listed in `.env.example`. |

Security note: if `LIVE_PASSCODE` is unset, `apps/server/src/index.ts` falls back to `test`. Live mode then has a guessable passcode and spends LLM credits. Set a strong `LIVE_PASSCODE` before any public deployment, and share it with judges only in the Devpost judge-only field.

Other commands (all exist in `package.json` or `scripts/`):

```bash
pnpm build                                          # nerve, server, web
pnpm test                                           # root vitest
pnpm immune ../../organs/hostile/01-direct-fetch    # REJECTED at static stage, exit code 1
pnpm benchmark:corpus                               # corpus benchmark
pnpm checkup:dry                                    # organ re-verification, dry run
pnpm preflight                                      # pre-submission checks
```

`pnpm immune` runs from `packages/immune-cli`, so organ paths are relative to that folder. The `bash scripts/preflight.sh` checks (`.kiro` tracked, LICENSE, README sections, secret scan, `.gitignore`) all passed on the day of writing.

## Known limitations

These are stated plainly because the project's premise is accountability.

- **3 failing tests.** `pnpm test` gives 3 failed, 458 passed, 1 skipped (462 tests, 23 files). All three are in `apps/web/src/__tests__/chimera-linking.test.ts` and exercise `apps/web/src/ChimeraLinking.ts`:
  1. `schemasCompatible (CHI-01) > primitive roots: integer feeds integer and number, but not string or the reverse`
  2. `schemasCompatible (CHI-01) > a multi-field object cannot feed a primitive input`
  3. `schemasCompatible (CHI-01) > tolerates an organ whose manifest has no ports array`

  They are not fixed. The tests define the intended contract. In practice, `number` is accepted where `integer` is required, a two-field object is accepted by a primitive input, and a manifest without a `ports` array makes `getCompatibleTargets` throw.
- **Demo mode (spec 08) is not implemented in the UI.** There is no hostile-organ injection button, no fast-forward and no reset to seeded state. Spec 08 has `requirements.md` and `design.md` but no `tasks.md`.
- **Healing and decay (spec 06) are partial.** `heal()` exists in the Doctor providers and checkup scripts exist. The UI for approving a healing patch and the decay simulator are not built.
- **Root vitest skips `*.test.tsx`.** `vitest.config.ts` includes `**/*.test.ts` only. Component and accessibility tests run with `cd apps/web && npx vitest run`.
- **No axe-core.** Accessibility tests use custom contrast and keyboard checks. This is not a full WCAG validation, which needs manual testing with assistive technology.
- **No hosted deployment.** The stack is a stateful Fastify + SQLite server with SSE and a native module; it does not fit serverless hosts. Judges run it locally (`pnpm install && pnpm build && pnpm dev`), which takes about two minutes and needs no API key for the replay path.
- **L9 gaps in the UI.** The ledger panel falls back to unlabeled mock entries if the server is down, and the replay path has no UI badge.
- **Benchmark weaknesses.** Behavioral and sandbox-escape categories catch under half of attacks. All 14 benign corpus organs are rejected for `window.parent`. The sandbox-plus-CSP baseline is modeled, not measured in a real browser.
- **Server `start` script** requires `pnpm build` first (`node dist/apps/server/src/index.js`).
- **Crew provider.** Not exercised live.
- **MCP and Powers.** MCP is configured (both package names verified on npm) with no recorded build-time use. No Kiro Power was used.

What GRAFT does not defend against (browser zero-days, host compromise, social engineering, resource exhaustion beyond the rate limits, side channels, physical access, weak credentials) is listed in the README under THREAT_MODEL.

## Judging criteria notes

Short pointers so each criterion can be answered from evidence in the repo.

- **Potential impact.** AI-generated code is shipping faster than people can review it. GRAFT shows one pattern for making each generated feature carry a spec, tests, a sandbox, a consent step, a provenance chain and an undo. It reduces risk and is honest about what it misses (README THREAT_MODEL and the published benchmark).
- **Technological implementation (depth of Kiro use).** Eight specs with tagged requirements, seven steering files, five hooks, two custom agents, fast-check properties, a Crew provider and an MCP config, all under `/.kiro` and documented in [KIRO_USAGE.md](KIRO_USAGE.md) with the gaps stated. Stack: TypeScript, Vite, React, Zustand, Fastify, better-sqlite3, Zod, acorn, parse5, Vitest, fast-check, Playwright.
- **Design.** A Victorian anatomical-theatre interface where each spooky element carries information: the ECG line shows checkup health, stage gauges show immune progress, the REJECTED stamp shows the reason and source line, and the ledger is the Chart. Keyboard operation, visible focus and reduced-motion handling are part of the quality bar in `.kiro/steering/design-theatre.md`. Full accessibility validation needs manual testing.
- **Innovation.** Consent, provenance and reversibility are treated as first-class parts of code generation. A clean-room red-team agent builds the attack corpus, and an ablation compares the immune system against a sandbox-plus-CSP baseline.
- **Presentation.** Demo video: <https://youtu.be/oqbuqR6nlxw> (1:47, every beat labeled LIVE or replayed content is called out). Storyboard with timestamps: [DEMO_GUIDE.md](DEMO_GUIDE.md). Gallery stills: `docs/images/`.

## Claims not verified

- ~~That the repo will be public~~ — the submission push creates `github.com/roshanrateria/GRAFT` as a public repo; confirm visibility in the GitHub UI.
- That GitHub shows the MIT license in the About section (needs a public push to verify).
- That the Crew provider works against a real Crew Gateway.
- ~~That the MCP package names in `.kiro/settings/mcp.json` are published names~~ — verified on npm: `@upstash/context7-mcp@4.7.0`, `@executeautomation/playwright-mcp-server@1.0.12`. The config was corrected to use the published Context7 package.
- That `pnpm test:a11y` selects only the web tests.
- That Playwright e2e specs in `tests/e2e` pass (not run for this submission).
- Judging results, user numbers or any outcome beyond what the repo files record.

## YouTube video title & description

**Title** (≤100 chars):

```
GRAFT — AI Software That Grows, Accountably | Kiroween 2026
```

**Description**:

```
GRAFT: an app that grows new features on demand — and holds every one of them accountable.

You type a wish in plain language. A Doctor agent writes an EARS spec, builds the feature as an "organ", and an immune system screens it in four stages (static, manifest, behavioral, property) with up to 2 repair rounds. Nothing installs without your explicit consent. Transplanted organs run in a sandboxed iframe with a strict CSP, talk only through the Nerve API, and every state change is written to a tamper-evident hash-chain ledger — before the change happens. Misbehave? Amputate: one click restores the prior state and removes every link.

In this video, two wishes are asked verbatim and grown LIVE (no canned scripts):
1. "Create a counter widget with a + and - button and with a output port"
2. "Create a celebrate widget that will take input from output of the counter widget and confetti on getting 10 as input"
…then chimera-linked, celebrated at 10, verified in the ledger, and amputated.

Timestamps:
0:00 GRAFT — software that grows, accountably
0:11 Built by Kiro: specs, hooks, MCP, property-based tests
0:23 Going live (passcode → real LLM)
0:29 Wish 1: counter widget (spec streams live)
0:38 Immune gates pass → consent → ledger entry first
0:44 Interact: the organ is alive in its sandbox
0:51 Wish 2: celebrate widget (verbatim, second transplant)
1:07 Chimera link: counter output feeds celebrate input
1:13 Confetti at 10 — two organs, one creature
1:24 The Chart: tamper-evident hash chain, verified live
1:29 Amputation: instant rollback
1:35 Why GRAFT?

Built for Kiroween 2026 entirely in Kiro — specs, steering, hooks, custom agents, MCP and property-based tests. Write-up: KIRO_USAGE.md in the repo.
Repo: https://github.com/roshanrateria/GRAFT

GRAFT reduces risk. It does not guarantee safety. The iframe sandbox + CSP is the real boundary; the measured immune-system weaknesses are published in the README.

#KiroweenHackathon26 #Kiro #AIcoding #GenAI #OpenSource
```

## Devpost thumbnail (AI image prompt)

3:2 ratio, for the Devpost gallery. Paste into an image generator:

```
Dark Victorian anatomical-theatre poster, 3:2 landscape. Center: a glowing dark UI wall of nine rounded "organ" tiles on a deep charcoal background, one tile lit warm white showing a simple counter widget with blue plus and minus buttons, a small ribbon-like wire ("value ▶") connecting it to a neighboring tile that erupts in colorful confetti. Above the tiles, a thin green ECG heartbeat line glows across the full width. Top-left corner: elegant serif wordmark "GRAFT" in warm off-white with the subtitle "SOFTWARE THAT GROWS. ACCOUNTABLY." in small letter-spaced caps. Subtle blueprint grid lines and faint anatomical sketch etchings in the background corners. Moody rim lighting, teal-and-amber accents, high contrast, clean vector-illustration style, no people, no text other than the wordmark and subtitle.
```

Gallery images are ready to drag into Devpost from `docs/images/` (all 1280×720 stills from the final video).
