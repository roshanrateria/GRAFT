# Laws of Anatomy

These are the invariants that Kiro must never violate. Any violation is a critical bug.

---

## L1. Sandbox Boundary

Organs never access the network, storage, cookies, parent/top windows, or the DOM outside their iframe.

---

## L2. Nerve API Exclusivity

The Nerve API is the only channel between organs and the Creature. Extending it requires a spec change and a version bump.

---

## L3. Explicit Consent

No organ is installed without explicit user consent. The transplant button must be clicked by the user.

---

## L4. Reversibility

Every transplant is reversible by amputation. Amputation must restore the Creature to its exact prior state.

---

## L5. Ledger First

Every state change writes a ledger entry before applying the change. The hash chain must remain verifiable.

---

## L6. Injected Time and Randomness

Time and randomness are injected via `nerve.now()` and `nerve.random()`, never ambient `Date` or `Math.random` inside organ code.

---

## L7. Fail Closed

The immune system fails closed. An error inside the immune system means rejection, not acceptance.

---

## L8. Honest Language

Never describe the system as guaranteeing safety. Use "reduces risk" language. The README THREAT_MODEL must list what GRAFT does not defend against.

---

## L9. Labeled Replay

Demo or replay data is always labeled in the UI. Never present replayed Doctor output as live.
