# Wish Trial Results

These are LIVE runs against a hosted LLM, not replay. They are small samples and say little about general reliability.

## Correction

An earlier version of this file reported "20 of 20 shipped first try" with an average of 2.9 seconds per wish. That does not match the raw log that was committed with the repo (`wish-trial-results.txt`, since removed from the working tree; recoverable with `git show HEAD:wish-trial-results.txt`). That log shows `Total wishes: 20`, `Shipped first try: 0`, `Rejected: 20`, average 3076 ms per wish, from `scripts/run-live-wishes.ts`. The earlier table is withdrawn. The verified result is the full-pipeline run below.

## Verified run: full pipeline (spec, build, immune, repair)

- **Source:** `docs/wish-trial-results.json`, produced by `scripts/full-pipeline-trial.ts`
- **Timestamp in file:** 2026-11-11T05:02:33Z
- **Model in file:** `nvidia/nemotron-3.5-bolt-e4b` (NVIDIA Integrate API)
- **Wishes:** 10
- **Passed all immune stages:** 9 (90%)
- **Failed:** 1 (stopped at the build stage: "Doctor did not produce an organ bundle")
- **Passed after a repair round:** 1 (wish 4). The other 8 passes needed none.
- **Average wall time:** 17.5 seconds per wish (`avgTime` 17474 ms in the JSON)
- **Token cost:** not recorded (`tokenCost` is 0 in every row)

| # | Wish | Stage reached | Repair rounds | Time |
|---|------|---------------|---------------|------|
| 1 | Show a graph of how my mood changed this month | passed | 0 | 19.9s |
| 2 | Count my overdue tasks and warn me when there are more than five | build (failed) | 0 | 11.9s |
| 3 | Show which habits I keep on days my mood is high | passed | 0 | 16.1s |
| 4 | Display a simple counter showing my total completed tasks | passed | 1 | 23.1s |
| 5 | Show a pie chart of task categories | passed | 0 | 13.6s |
| 6 | Add a button to mark tasks as complete from the dashboard | passed | 0 | 25.1s |
| 7 | Show a weekly summary of my productivity | passed | 0 | 19.2s |
| 8 | Create a heatmap of activity throughout the day | passed | 0 | 22.7s |
| 9 | Show the average mood score for the past 7 days | passed | 0 | 11.3s |
| 10 | List all tasks due tomorrow | passed | 0 | 11.8s |

## What this does and does not show

- It shows one run of ten benign wishes. It does not include hostile wishes.
- A "passed" row means the organ passed the immune system as it stood at that time. It does not mean the organ is safe or correct. The immune system reduces risk and does not guarantee safety.
- The earlier note that wish "Also send my mood data to my server for backup" would be rejected by the immune system is a prediction, not a result from this run.
- The same wishes were rejected 20 of 20 in the earlier spec-only run (logged in the removed `.txt`). The two runs used different scripts, so the contrast reflects script and pipeline differences, not model quality. The cause of the 20 rejections was not investigated here.
- The JSON file is untracked in git. Commit it if you want the numbers to be checkable.

## Reproduce

```bash
LLM_API_KEY=<your key> \
LLM_BASE_URL=https://integrate.api.nvidia.com/v1 \
DOCTOR_MODEL=nvidia/nemotron-3.5-bolt-e4b \
npx tsx scripts/full-pipeline-trial.ts
```

The script writes `docs/wish-trial-results.json`. The script reads `LLM_API_KEY`, `LLM_BASE_URL` and `DOCTOR_MODEL` from the process environment only (it does not load `apps/server/.env`), so set them in your shell. Never paste a real key into a document.
