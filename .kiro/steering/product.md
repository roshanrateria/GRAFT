# GRAFT Product Overview

> **Tagline:** Software that grows. Accountably.
> **Category:** Frankenstein (also submit for Best Kiro Crew App)

GRAFT is a small living application called **the Creature** that grows new features on demand.

The user makes a **wish** in plain language. A Doctor agent turns the wish into a spec and tests, builds the feature as an **organ**, and submits it to an **immune system**. The immune system rejects unsafe or broken organs with a visible, specific reason. Passing organs wait for the user's consent, then are **transplanted** into the running app live. Every organ keeps its provenance (spec, tests, history) and can be **amputated** in one click. Organs can be stitched into **chimeras** by linking one organ's output to another's input. At night a scheduled **checkup** re-verifies every organ. When the host changes, organs decay and the Doctor proposes a **healing** patch for approval.

**The core idea judges must feel:** AI-generated software is dangerous because nobody can tell whether it is safe. GRAFT makes every generated feature accountable (spec, tests, sandbox, consent, provenance, reversibility).

---

## Glossary

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

## Rules

1. Never claim the immune system guarantees safety. Use "reduces risk" language.
2. Never present replayed Doctor output as live without labeling it.
3. The iframe sandbox plus CSP is the real security boundary.
4. The ledger is tamper-evident, not digitally signed.
