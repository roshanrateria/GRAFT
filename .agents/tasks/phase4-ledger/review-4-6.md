# Review: Task 4.6 Ledger UI

## Files Reviewed
- `apps/web/src/components/ChartPanel.tsx` (320 lines)
- `apps/web/src/components/ChartPanel.css` (230 lines)
- `apps/web/src/components/__tests__/ChartPanel.test.tsx` (350 lines)

## Task Requirements (from `.kiro/specs/04-ledger-and-reversibility/tasks.md`)

### Task 4.6: Ledger UI
- [x] Create `apps/web/src/ChartPanel.tsx` for ledger timeline
- [x] Implement "Verify chain" button
- [x] Show verification result
- [x] Display event history
- [x] Write component tests

## Checklist Items

### 1. Timeline displays ledger entries correctly ✅

**Evidence:**
- `LedgerEntry` interface defines entry structure (id, ts, organ_id, event, payload_json, prev_hash, hash)
- `formatTimestamp()` formats timestamps to human-readable format
- `getPayloadSummary()` extracts displayable payload information
- `getEventColor()` maps event types to CSS variable colors (brass, vein-green, alert, oxblood)
- Timeline rendered with `role="list"` and entries with `role="listitem"`
- Each entry shows timestamp, event type, organ ID (when present), payload summary, and hash

**Entry Types Supported:**
- WISH, SPEC, BUILD (brass color)
- IMMUNE_PASS, TRANSPLANT_APPROVED, CHECKUP_PASS, HEAL_APPROVED (vein-green)
- IMMUNE_FAIL, CHECKUP_FAIL (alert)
- AMPUTATED (oxblood)
- CHIMERA_LINKED, HEAL_PROPOSED (brass)

### 2. "Verify chain" button works ✅

**Evidence:**
- Button rendered in header with text "Verify chain"
- `handleVerify` callback calls `/api/ledger/verify` endpoint
- Falls back to local `verifyLocalChain()` when API unavailable
- Button shows "Verifying..." state while request in progress
- Button disabled during verification and when no entries exist

### 3. Verification result displays (valid/invalid) ✅

**Evidence:**
- `VerificationResult` interface with `valid` and optional `errorIndex`
- Result displayed in `chart-panel__verification` div with `role="status"` and `aria-live="polite"`
- Valid result: green background with checkmark and "Chain valid" text
- Invalid result: red background with X and "Chain invalid at entry N" text
- CSS classes: `chart-panel__verification--valid` and `chart-panel__verification--invalid`

### 4. Follows design-theatre.md styling ✅

**CSS Variables Used (matching design-theatre.md):**
- `--color-surface` for panel background
- `--color-bone` for title text
- `--color-brass` for button and accents
- `--color-vein-green` for valid/success states
- `--color-alert` for invalid/error states
- `--color-oxblood` for amputated events

**Typography (matching design-theatre.md):**
- `--font-heading` (Cormorant Garamond/IM Fell English) for title
- `--font-ledger` (IBM Plex Mono) for timestamps, events, hashes
- `--font-body` for organ ID text

**Victorian Anatomical Theme:**
- Dark surface background
- Brass-colored verify button
- Monospace ledger font for entries
- Subtle borders and hover states

### 5. Uses correct CSS variables and fonts ✅

All CSS variables reference the tokens defined in `globals.css`:
- Color tokens: `--color-background`, `--color-surface`, `--color-bone`, `--color-brass`, `--color-oxblood`, `--color-vein-green`, `--color-alert`
- Semantic colors: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-border`
- Font tokens: `--font-heading`, `--font-body`, `--font-ledger`
- Spacing: `--space-*` tokens used throughout
- Border radius: `--radius-md`, `--radius-full`
- Transitions: `--transition-fast`

### 6. Keyboard accessible (Tab, Enter, Space) ✅

**Evidence:**
- Verify button has `tabIndex` (default 0 for buttons)
- `handleKeyDown` handles Enter and Space keys: `if (event.key === 'Enter' || event.key === ' ')`
- `focus-visible` styles applied for keyboard focus indicators
- Entries have `tabIndex={0}` for keyboard navigation
- Button correctly prevents default on Space to avoid page scroll

**Note:** Escape key is not handled because there's no modal or dismissible state to close. This is appropriate - Escape is for closing/canceling, not for triggering actions.

### 7. Proper ARIA labels ✅

**Evidence:**
- Main panel: `aria-label="The Chart - Ledger timeline"`
- Verify button: `aria-label="Verify chain integrity"` and `aria-busy={isVerifying}`
- Timeline: `role="list"` with `aria-label="Ledger entries"`
- Entries: `role="listitem"` with `aria-label` describing entry number, event, and timestamp
- Verification result: `role="status"` with `aria-live="polite"` for screen reader announcements
- Error state: `role="alert"`
- Time elements use semantic `<time>` with `dateTime` attribute

### 8. Tests cover rendering and interaction ✅

**Test File:** `apps/web/src/components/__tests__/ChartPanel.test.tsx` (14 tests)

**Test Categories:**
1. **Timeline rendering (5 tests)**
   - Renders loading state initially
   - Renders empty state when no entries
   - Renders timeline with entries from API
   - Displays organ ID when present
   - Uses mock data when API fails

2. **Verify button (3 tests)**
   - Triggers verification on click
   - Shows verifying state during verification
   - Is keyboard operable with Enter key

3. **Verification result display (3 tests)**
   - Displays valid result
   - Displays invalid result with error index
   - Uses local verification when API fails

4. **Accessibility (3 tests)**
   - Has correct ARIA labels
   - Announces verification result to screen readers
   - Has visible focus indicators

**Test Execution Results:**
- 14/14 tests passing (verified via `pnpm vitest run` from apps/web directory)

## Additional Quality Checks

### Reduced Motion Support ✅
- CSS includes `@media (prefers-reduced-motion: reduce)` that disables transitions

### Responsive Design ✅
- CSS includes `@media (max-width: 768px)` for tablet layout
- Panel becomes full-width on smaller screens

### Error Handling ✅
- Network failures fall back to mock data
- Loading, error, and empty states all handled

### Loading States ✅
- Initial loading shows "Loading ledger..." message
- Verification shows "Verifying..." button text

## Notes (Non-blocking)

1. **Mock data in production path**: When API fails, component falls back to mock data. This is intentional for demo purposes but should be documented clearly. The local `verifyLocalChain()` only checks chain links (prev_hash to hash connections) but does not recompute hashes - this is acceptable as it's a fallback for demo purposes only.

2. **Local verification is simplified**: The `verifyLocalChain()` function checks `prev_hash` links but does not verify hash computation. The primary verification happens server-side via `/api/ledger/verify` which uses the full `verifyChain` from `@graft/ledger` that recomputes hashes.

3. **Integration pending**: ChartPanel is not yet integrated into the main Creature layout. This is expected since Task 7.5 in the Theatre UI spec covers layout integration.

## Verdict

**APPROVED**

The implementation fully satisfies all Task 4.6 requirements:
1. ✅ Timeline displays ledger entries correctly
2. ✅ "Verify chain" button works (API + local fallback)
3. ✅ Verification result displays (valid/invalid with error index)
4. ✅ Follows design-theatre.md Victorian anatomical theme
5. ✅ Uses correct CSS variables and fonts from globals.css
6. ✅ Keyboard accessible (Tab, Enter, Space)
7. ✅ Proper ARIA labels throughout
8. ✅ 14 tests covering rendering and interaction

No blockers found. The component is well-implemented with comprehensive accessibility support, proper test coverage, and adherence to the design system.
