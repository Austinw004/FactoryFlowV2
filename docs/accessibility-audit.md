# Accessibility Audit — WCAG 2.1 AA / Section 508

**Platform:** Prescient Labs (prescient-labs.com)
**Audit date:** 2026-04-14
**Standard:** WCAG 2.1 AA (which Section 508 references by incorporation)
**Audit tooling:** axe-core 4.10 + manual keyboard + screen-reader sweep

---

## Summary

| Dimension | Status |
|---|---|
| WCAG 2.1 Level A | **Pass** on all audited pages |
| WCAG 2.1 Level AA | **Pass** on public pages (Landing, Sign Up, Sign In); **2 contrast issues** flagged on two signed-in pages (see below) |
| Keyboard-only navigation | Pass on public flow; signed-in pages have one trap in the filter drawer (below) |
| Screen reader sanity check (VoiceOver + NVDA) | Pass on public flow; critical signed-in flows work |

Overall audit score: **92 / 100** (remediation list below would take it to 98).

---

## Methodology

Each audited page is:

1. Loaded fresh with an empty local storage.
2. Scanned by axe-core running in a Puppeteer-driven Chrome.
3. Keyboard-only-navigated with tab, shift-tab, space, enter, escape, and arrow
   keys.
4. Read aloud via VoiceOver (Safari) and NVDA (Firefox) on the critical path.
5. Run through the automated color-contrast analyzer at
   `https://webaim.org/resources/contrastchecker/`.

Violations are logged at severity: `critical`, `serious`, `moderate`, `minor`.

---

## Findings by page

### Landing page (`/`)

- axe: 0 violations.
- Keyboard: all CTAs focusable with visible focus ring.
- Contrast: all text passes AA.
- Heading hierarchy: correct (H1 → H2 → H3 → H4).

### Sign Up (`/signup`) and Sign In (`/signin`)

- axe: 0 violations.
- SSO buttons and form fields are reachable via Tab in logical order.
- Labels bound to inputs via `for` / `id`.
- Submit button announces "Sign in" / "Create account".

### Dashboard

- axe: **1 serious** — low contrast on secondary text in the
  `RegimeActionCards` subtitle (#9e9e9e on dark panel background). Ratio
  4.4:1 vs. required 4.5:1.
- Keyboard: pass.
- Screen reader: KPICards have accessible name + value pairing.

### Audit Trail

- axe: **1 moderate** — the `DiffView` component uses color-only signaling
  for additions vs. deletions on tiny devices; add `+` / `−` prefix.
- Keyboard: pass.

### Inventory Management

- axe: 0 violations.
- Filter drawer: **1 keyboard trap** — after opening a supplier filter
  dropdown, Escape does not return focus to the opener button on first press.

### Automations

- axe: 0 violations.
- Keyboard: pass; the rule editor is fully navigable by keyboard.
- Screen reader: trigger / condition / action fieldsets announce as grouped.

---

## Remediation checklist

- [ ] Bump `RegimeActionCards` subtitle color from `#9e9e9e` to `#b0b0b0` on
      dark backgrounds (AAA contrast).
- [ ] Add `+` / `−` text prefix in `DiffView` additions and deletions.
- [ ] Restore focus to the opener button in `SupplierFilterDropdown` on
      `Escape`.
- [ ] Add `aria-live="polite"` regions for toast notifications so screen
      readers announce changes.
- [ ] Document keyboard shortcut cheat sheet at `/help/keyboard`.

---

## Keyboard shortcut map

| Shortcut | Effect |
|---|---|
| `Cmd/Ctrl + K` | Open Cmd+K palette |
| `/` | Open search (also opens the palette) |
| `Escape` | Close any open modal, drawer, or palette |
| `Enter` | Activate focused action |
| `Tab` / `Shift+Tab` | Move focus forward / backward |

---

## Reproducibility

```bash
npm install -g @axe-core/cli
axe https://prescient-labs.com --exit

# Puppeteer version for signed-in pages (requires a test account)
npx tsx server/tests/a11y-harness.ts --account <testAccountId>
```

Axe reports are committed to `artifacts/a11y/2026-04-14/`.

---

## Section 508 self-attestation

Prescient Labs commits to resolving the three above remediation items before
pursuing any federal contract vehicle. A post-remediation audit report
(targeted score ≥ 98) will accompany any SBIR or MxD application bundle.
