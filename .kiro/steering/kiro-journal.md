# Kiro Journal Guidance

After each significant task, append an entry to `KIRO_USAGE.md` using the template below.

---

## Template

```
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

## Summary Sections

Before submission, complete the summary sections in `KIRO_USAGE.md`:

- **Crew bot**: How it differed from IDE/CLI
- **Custom agents**: What custom agents were defined
- **Hooks**: What each hook automated
- **Spec-driven vs vibe**: The experiment comparing approaches
- **Steering**: The strategy that mattered most
- **MCP**: What became possible with MCP
- **PBT**: Counterexamples that unit tests would have missed
- **Powers**: Which Kiro powers were used
