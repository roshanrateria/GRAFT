# Property-Based Testing in GRAFT

We use **fast-check** for property-based testing. This is mandatory for requirements tagged `[PBT]` in specs.

---

## When to Use PBT

- **Invariants**: Properties that must hold for all inputs
- **Round-trips**: Parse → serialize → parse should equal original
- **"For any input" requirements**: When the spec says "for any X, the system shall..."

---

## How to Write Properties

1. **Name the property after the requirement ID**: e.g., `IMM-01` becomes `imm-01-property.ts`
2. **Log the seed on failure**: Fast-check provides the seed; log it for reproducibility
3. **Shrink to minimal counterexample**: Let fast-check find the smallest failing case
4. **Add as regression test**: After fixing, add the counterexample as a unit test

---

## Universal Properties (U1-U7)

Every organ must pass these properties. They live in `tests/properties/universal/`.

| ID | Property |
|---|---|
| U1 | Totality: For any arbitrary host message, the organ never throws unhandled |
| U2 | Boundedness: Under fuzz, emitted messages stay under rate limit and payload size |
| U3 | Declaration fidelity: Organ only reads declared paths and emits on declared ports |
| U4 | Determinism: Same init + data sequence yields same emitted sequence |
| U5 | Idempotent render: Same data twice yields identical DOM snapshot |
| U6 | Theme robustness: Light, dark, reduced-motion all render without errors |
| U7 | No trap: No input sequence leaves keyboard focus trapped |

---

## Host-Level Properties (H1-H5)

These test the Creature, not individual organs. They live in `tests/properties/host/`.

| ID | Property |
|---|---|
| H1 | Chain integrity: Any ledger mutation is detected |
| H2 | Acyclicity: Any sequence of links never creates a cycle |
| H3 | Reversibility: Transplant + amputation restores prior state |
| H4 | Atomicity: Failure during transplant leaves no partial state |
| H5 | Quarantine: Rate-limit violation hides organ within 1 second |
