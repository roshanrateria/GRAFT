# GRAFT Demo Guide

The demo video is **`demo-take/final/graft-demo.mp4` — 1:47, 1280×720, 30 fps, H.264 + AAC** — and on YouTube: <https://youtu.be/oqbuqR6nlxw>. It was recorded from the running app with Playwright (`scripts/record-demo.mjs`) and narrated with the Gemini TTS API (`gemini-2.5-flash-preview-tts`, voice Kore, via `scripts/tts-narration.mjs`). Every beat is labeled on screen; the two app beats that use the live LLM are labeled LIVE (Law L9).

## The 12 beats (final take, as placed in the video)

| Start | Scene | On screen | Narration |
|-------|-------|-----------|-----------|
| 0:00 | Title card | "Kiroween 2026" badge, GRAFT letter-stagger, organ tiles, ECG line | "GRAFT. Software that grows, accountably. Watch one codebase grow two features, live, under immune consent gates." |
| 0:11 | Built by Kiro | Rotating "Built by Kiro" cards: EARS specs, immune gates, hooks, MCP, property-based tests | "Every pixel was built by Kiro: specs, hooks, MCP, and property-based tests. Not hand-written code — reviewed intent." |
| 0:23 | LIVE | Passcode login → LIVE badge | "We go live: the passcode unlocks a real LLM." |
| 0:29 | Wish 1 | Typed verbatim: *"Create a counter widget with a + and - button and with a output port"* — spec streams live in EARS format | "A wish: a counter widget, plus and minus, an output port. The Doctor writes the spec." |
| 0:38 | Transplant | Immune gates pass → consent → ledger entry written first | "Four gates pass. Consent transplants it, ledger first." |
| 0:44 | Interact | +/− clicks inside the sandbox iframe; port pill pulses on every emit | "Alive in its sandbox — every click emits on its output port." |
| 0:51 | Wish 2 | Typed verbatim: *"Create a celebrate widget that will take input from output of the counter widget and confetti on getting 10 as input"* — spec streams, second consent, second transplant | "Second wish, verbatim: a celebrate widget that takes input from the counter's output and celebrates on ten. The spec streams, gates pass, second consent, transplanted." |
| 1:07 | Chimera link | Counter's `value ▶` out-port snaps to the celebrate `◀ value` in-port (compatible port highlighted) | "Chimera link: the counter's output snaps into the celebrate input." |
| 1:13 | Confetti | Clicking to 10 — celebrate fires 🎉 CELEBRATION | "Click the counter to ten — celebrate fires. Confetti! Two organs, one creature, composed live." |
| 1:24 | The Chart | Full ledger timeline (wish / spec / build / immune / transplant events) → Verify chain → ✓ Chain valid | "Every event is hash-chained. Verify it live." |
| 1:29 | Amputation | Amputate → Remove? confirm → slot empty, links gone | "A bad organ? Amputate — links and all." |
| 1:35 | Outro card | 6 benefit rows: sandbox, immune system, consent-first, auditable ledger, composable chimeras, amputation = rollback | "Sandboxed organs. An immune system for AI code. An auditable ledger. GRAFT — software that grows, accountably. Happy Kiroween!" |

Total: 1:47. Narration starts at each scene boundary; every clip was generated to end inside its own beat (dead-air trim, pause cap, gentle fit) — the voice never overlaps the next scene and never relies on captions to finish its sentence.

## Reproduce the video

```bash
# 1. Record (starts its own stable stack + card deck; --fresh wipes the ledger
#    for a clean chain and forces the dark theme):
$env:DOCTOR_PROVIDER='llm'; $env:LLM_API_KEY='<key>'; $env:LLM_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai/'; $env:DOCTOR_MODEL='gemini-3.5-flash-lite'; $env:LIVE_PASSCODE='test'
node scripts/record-demo.mjs --fresh --out demo-take/final

# 2. Narrate (one WAV per scene; --reuse keeps existing clips; free-tier TTS
#    quota needs ~65 s between calls, the script waits that out):
$env:GEMINI_KEY='<key>'; node scripts/tts-narration.mjs --out demo-take/narration --reuse

# 3. Assemble (cuts app scenes from the continuous recording by logged
#    offsets, concats, mixes narration, muxes H.264 + AAC faststart):
node scripts/assemble-demo.mjs demo-take/final
```

Outputs: `<take>/<scene>.webm` + `scenes.json` (measured timings), `demo-take/narration/*.wav` + `narration.json`, final `<take>/graft-demo.mp4`. The card deck lives in `presentation/` (`?card=title|kiro|outro`, vite on :5174). `demo-take/` is git-ignored. Note: the video production scripts (`record-demo.mjs`, `tts-narration.mjs`, `assemble-demo.mjs`, `shot-cards.mjs`, `dev-e2e.mjs`) and `presentation/` are git-ignored in this repository — the product is the app; the recording rig stays out of it.

## Judge setup (run it yourself)

```bash
pnpm install
cp apps/server/.env.example apps/server/.env    # edit values locally, never commit
pnpm dev                                        # web: http://localhost:3000, API: http://localhost:3001
```

- **Live path** (what the video shows): `LLM_API_KEY` + `LLM_BASE_URL` + `DOCTOR_MODEL` in `apps/server/.env`, passcode in `LIVE_PASSCODE` (defaults to `test` — set your own before sharing a URL). Verified end-to-end with Gemini (`gemini-3.5-flash-lite`, ~5 s wish → consent).
- **Replay path** (no key needed): without a live session, `POST /api/doctor/wish` streams canned benchmark wishes, events carry `_replay: true`. The web UI shows a LIVE badge only after passcode login — caption every replay beat if you present one.
- The ledger panel polls `/api/ledger/history` every 5 s and falls back to clearly-mock entries if the server is down.

## What to say about limits

- The iframe sandbox plus CSP is the real security boundary. The immune system is defense in depth. GRAFT reduces risk; it does not guarantee safety (Law L8).
- The benchmark caught 56 of 76 attacks (73.7%). See `fixtures/corpus/SUMMARY.md` and the false-rejection note in the README.
- Three chimera-linking tests fail today (see README Known Limitations). Avoid linking an `integer` port to a `number` port on camera, and avoid multi-field objects feeding a primitive input.
- Not implemented (do not show): hostile-organ injection button, "fast-forward the night", decay simulator / healing approval UI, reset to seeded state (specs 06 UI and 08).

## Run the checks from the command line

```bash
pnpm immune ../../organs/hostile/01-direct-fetch   # REJECTED at static, exit code 1
pnpm benchmark                                     # tsx scripts/benchmark-immune.ts
pnpm benchmark:corpus                              # tsx scripts/benchmark-corpus.ts
pnpm checkup:dry                                   # tsx scripts/nightly-checkup.ts --dry-run
npx tsx scripts/demo-judges.ts                     # REPLAY: plays fixtures/replays/*.json
npx tsx scripts/demo-repair-loop.ts                # LIVE if LLM_API_KEY is set
```

`pnpm immune` runs from `packages/immune-cli`, so use `../../` or an absolute path. Do not paste real keys into commands in a recording — set them in `apps/server/.env`.

## Tests

```bash
pnpm test                          # root vitest: 3 failed, 458 passed, 1 skipped (23 files)
cd apps/web && npx vitest run      # web suite incl. *.test.tsx: 3 failed, 165 passed (11 files)
```

All 3 failures are the known `schemasCompatible` cases in `apps/web/src/__tests__/chimera-linking.test.ts` (documented in the README). The root config does not run `*.test.tsx`.

## Further reading

- [README.md](README.md) for setup, environment variables, benchmark and THREAT_MODEL
- [docs/STATUS.md](docs/STATUS.md) for requirement status
- [docs/NERVE_API.md](docs/NERVE_API.md) and [docs/LAWS_OF_ANATOMY.md](docs/LAWS_OF_ANATOMY.md)
- [docs/wish-trial-results.md](docs/wish-trial-results.md) and [docs/spec-vs-vibe-results.md](docs/spec-vs-vibe-results.md)
- [KIRO_USAGE.md](KIRO_USAGE.md) and [SUBMISSION.md](SUBMISSION.md)
