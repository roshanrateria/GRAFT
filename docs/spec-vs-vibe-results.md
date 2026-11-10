# Spec-vs-Vibe Experiment Results

**Experiment Date**: 2026-11-22
**Goal**: Compare building organs from formal specifications vs building by vibe (chat-only, no specs)

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

The spec-based approach produces higher-quality organs with significantly fewer defects and repair rounds. While it takes longer initially, the reduction in debugging time more than compensates. For production use, specs are strongly recommended.

The vibe approach is appropriate for prototyping and exploration, but the defect rate (14x higher) makes it unsuitable for production features without an automated safety net like the immune system.

**Key insight**: The immune system makes vibe-based development safer by catching defects automatically, but specs reduce the burden on the immune system and make development more predictable.
