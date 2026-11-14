# Spec-vs-Vibe Experiment Results

**Experiment Date**: 2026-11-22 (as written by the author; this is later than the last git commit, 2026-11-11, so treat the date as unverified)
**Goal**: Compare building organs from formal specifications vs building by vibe (chat-only, no specs)

## Read this first: limits of this experiment

- Sample size is 5 organs per approach. Who built them and under what conditions is not recorded. The figures below are not statistically meaningful.
- Times, defect counts and repair rounds are self-reported. No raw logs for them are stored in the repo (checked `docs/journal/` and `fixtures/`), so they could not be re-verified.
- "Defects" was defined as immune-system rejections, but the table also lists defects such as a missing `aria-live` region, which the immune system does not check. The definition was applied loosely.
- Re-check on the current tree with `pnpm immune <absolute-path>`: the spec-based organs `timer-widget` and `expense-tracker` are rejected for `window.parent`, so "0 defects" for spec-based organs does not hold under today's checker. The other organs in `organs/handwritten/` have no `manifest.json` and cannot be checked by the CLI. `quick-note` carries a deliberate `Date.now()` defect used as a test fixture, so it is not a clean sample of vibe-built output.
- The "14x fewer defects", "80% first-try" and "42% time saved" figures follow from these tables only. Quote them as anecdotal.
## Methodology

### Spec-based Approach
1. Create a formal spec first (requirements, design)
2. Build the organ from the spec
3. Run through immune system
4. Record metrics

### Vibe-based Approach
1. Build the organ directly from the wish description
2. Iterate with chat feedback only
3. Run through immune system
4. Record metrics

### Metrics Collected
- **Time to completion**: Start to shipped (minutes)
- **Defects**: Number of immune rejections
- **Repair rounds**: How many fix cycles needed
- **Final outcome**: Success or failure

---

## Results

### Spec-Based Organs

| Organ | Time (min) | Defects | Repair Rounds | Outcome |
|-------|------------|---------|---------------|---------|
| Timer widget with countdown and alarm | 12 | 1 | 1 | Success |
| Expense tracker with categories | 15 | 0 | 0 | Success |
| Habit tracker with streaks | 14 | 0 | 0 | Success |
| Mood tracker with weekly chart | 13 | 0 | 0 | Success |
| Note widget with search | 11 | 0 | 0 | Success |

**Average Time**: 13.0 min
**Average Defects**: 0.2
**Total Repair Rounds**: 1

### Vibe-Based Organs

| Organ | Time (min) | Defects | Repair Rounds | Outcome |
|-------|------------|---------|---------------|---------|
| Quick note taker | 8 | 2 | 2 | Success |
| Daily water intake tracker | 9 | 3 | 2 | Success |
| Simple Pomodoro timer | 10 | 4 | 3 | Success |
| Gratitude journal entry | 7 | 2 | 2 | Success |
| Reading progress tracker | 11 | 3 | 2 | Success |

**Average Time**: 9.0 min
**Average Defects**: 2.8
**Total Repair Rounds**: 11

---

## Statistical Comparison

| Metric | Spec-Based | Vibe-Based | Difference |
|--------|------------|------------|------------|
| Average time (min) | 13.0 | 9.0 | Spec takes 44% longer |
| Average defects | 0.2 | 2.8 | Vibe has 14x more defects |
| Total repair rounds | 1 | 11 | Vibe has 11x more repairs |
| First-try success rate | 80% | 0% | Spec 80% vs Vibe 0% |

---

## Qualitative Observations

### Spec-Based Approach

**Advantages:**
1. **Clear contract upfront**: The spec defines exactly what the organ must do before any code is written
2. **Fewer defects**: Only 1 defect across all 5 organs (an accessibility issue in the timer widget)
3. **Better separation of concerns**: Design decisions are made before implementation, reducing scope creep
4. **Self-documenting**: The spec serves as documentation for future maintainers
5. **Testable requirements**: Each requirement in the spec maps directly to test cases

**Disadvantages:**
1. **Longer initial time**: Creating the spec adds ~3-5 minutes before coding begins
2. **Perceived overhead**: For simple organs, the spec can feel like unnecessary ceremony

**Pattern observed**: The spec acts as a design review. By the time implementation begins, edge cases are already considered. The timer widget's spec caught that the organ needs to handle the tick message for time, preventing a common mistake.

### Vibe-Based Approach

**Advantages:**
1. **Faster initial velocity**: Code starts immediately, feels more fluid
2. **Iterative discovery**: Features emerge organically through conversation
3. **Good for exploration**: When requirements are genuinely unknown, vibe allows experimentation

**Disadvantages:**
1. **High defect rate**: Average of 2.8 defects per organ
2. **Repair fatigue**: Multiple rounds of "fix this, now fix that" erode confidence
3. **Scope drift**: Without a spec, features get added or forgotten mid-implementation
4. **No documentation**: Future maintainers have no reference for design decisions
5. **Inconsistent quality**: Some organs worked first-try after repairs, others needed multiple iterations

**Pattern observed**: The vibe approach consistently missed edge cases that the spec approach caught upfront:
- Water tracker forgot to handle empty data state
- Pomodoro timer didn't emit completion events
- Note widget didn't declare required permissions

---

## Detailed Defect Analysis

### Spec-Based Defects (1 total)

1. **Timer Widget**: Missing `aria-live` region for countdown updates (caught by accessibility audit)

### Vibe-Based Defects (14 total)

1. **Quick Note Taker**:
   - Missing permission declaration for `emit:noteContent`
   - Used `Math.random()` instead of `nerve.random()`

2. **Water Intake Tracker**:
   - Missing permission for `read:water.entries`
   - Empty state not handled
   - Didn't emit daily total

3. **Pomodoro Timer**:
   - Missing `emit:sessionComplete` permission
   - Used `Date.now()` instead of injected time
   - Missing `resize` message
   - Didn't handle pause/resume state

4. **Gratitude Journal**:
   - Missing `read:gratitude.entries` permission
   - Used `localStorage` (banned)

5. **Reading Progress Tracker**:
   - Missing `emit:progress` permission
   - Used `Date.now()`
   - Didn't handle page count overflow

---

## Recommendations

### When to Use Spec-Based

1. **Production features**: Any organ that will ship to users
2. **Complex logic**: Organs with multiple states or edge cases
3. **Team collaboration**: When multiple people will review/maintain the code
4. **Compliance requirements**: When documentation and audit trails matter
5. **New domain areas**: When learning a new feature type, the spec forces understanding

### When to Use Vibe-Based

1. **Prototyping**: Quick experiments to validate a concept
2. **Learning/exploration**: When requirements are genuinely unknown
3. **Throwaway code**: One-time scripts that won't be maintained
4. **Simple one-shot**: Trivial organs where the cost of a defect is near-zero

### Recommended Workflow

**Hybrid approach for optimal results:**

1. **Start with a mini-spec**: Just 2-3 minutes to write requirements and design
2. **Build from the spec**: Implementation guided by the contract
3. **Let the immune system validate**: Defects are caught automatically
4. **Iterate quickly**: Repair rounds are focused because the spec narrows the problem space

**Estimated time savings:**
- Pure vibe: 9 min build + 11 repair rounds × 2 min = 31 min total
- Hybrid: 3 min spec + 13 min build + 1 repair × 2 min = 18 min total
- **Net savings: 42% reduction in total time**

---

## Conclusion

In this small, self-reported sample the spec-based approach had fewer defects and repair rounds. It took longer initially, and the reported repair counts suggest less debugging time afterward. Specs are the approach used for the rest of this project; this experiment alone does not prove they are better.

The vibe approach is appropriate for prototyping and exploration, but the defect rate in this sample (14x higher) argues for an automated check such as the immune system. The immune system reduces risk and does not guarantee safety.

**Takeaway (author opinion, not measured here)**: an automated check catches some defects in vibe-built organs, and specs may reduce how many it has to catch.
