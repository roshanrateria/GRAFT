# Kiro Journal Guidance

After each significant task, create a journal entry file in `docs/journal/` using the naming convention and template below.

---

## File Naming Convention

Create one markdown file per entry with the format:
```
docs/journal/YYYY-MM-DD-HHMM-title.md
```

Where:
- **YYYY-MM-DD**: The date of the work (use `date` command or equivalent)
- **HHMM**: Hour and minute in 24-hour format
- **title**: A short kebab-case title describing the task (e.g., `phase-5-complete`, `immune-system-benchmark`)

Examples:
- `docs/journal/2026-11-22-1430-phase-5-dev-corpus.md`
- `docs/journal/2026-11-10-0915-benchmark-runner.md`

---

## Template

```markdown
## Entry: <date> <task>
- Kiro surface used: IDE | CLI | Web | Crew
- Feature(s) used: spec | hook | steering | MCP | power | PBT | custom agent | vibe
- What I asked / how I structured it:
- What worked:
- What failed or surprised me:
- Evidence (commit, test name, counterexample, screenshot):
```

---

## What to Record

- **Significant tasks**: Anything that took more than 10 minutes or involved multiple files
- **What worked**: Techniques that sped up development
- **What failed**: Approaches that didn't work, so we don't repeat them
- **Evidence**: Concrete proof (commit hashes, test outputs, screenshots)

---

## Manual Entries Only

There is no automatic hook for journal entries. Create entries manually after completing significant work.

To create an entry:
1. Note the current date and time
2. Choose a short kebab-case title
3. Create the file: `docs/journal/YYYY-MM-DD-HHMM-title.md`
4. Fill in the template with your work details

---

## Summary Sections

Before submission, complete the summary sections in `KIRO_USAGE.md`:

- **Crew bot**: How it differed from IDE/CLI
- **Custom agents**: What custom agents were defined
- **Hooks**: What each hook automated
- **Spec-driven vs vibe**: The experiment comparing approaches
- **Steering**: The strategy that mattered most
- **MCP**: What became possible with MCP integration
- **PBT**: Counterexamples that unit tests would have missed
- **Powers**: Which Kiro powers were used
