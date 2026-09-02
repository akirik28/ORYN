# Dashboard grid overflow fix — 2026-09-02

Follow-up to `docs/mobile-responsiveness-audit-2026-09-02.md`, which found and diagnosed
but deliberately didn't fix (read-only audit) the one real bug: the dashboard's "University
Outlook" and "Opportunities" cards overflowing off-screen below 768px. CEO's instruction
this pass: apply the fix, verify live at every width including the ones that were already
correct, check whether any sibling section needs the same fix, and be honest about what a
test can and can't prove for a layout property.

## The fix

`features/dashboard/dashboard-view.tsx` — the grid wrapper gets an explicit single-column
base instead of relying on implicit auto-sizing, and both sections get `min-w-0`, matching
the pattern this exact file already uses correctly two sections up:

```diff
- <div className="grid gap-10 md:grid-cols-2 md:gap-8">
-   <section style={glassCard} className="glass-card-offset2 p-6">
+ <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8">
+   <section style={glassCard} className="glass-card-offset2 min-w-0 p-6">
    ...
-   <section style={glassCard} className="glass-card p-6">
+   <section style={glassCard} className="glass-card min-w-0 p-6">
```

## Checked whether other sections on this page need it too — they don't

CEO's instruction was explicit: establish whether the two broken sections were the whole
set, not assume it. Read the full grid structure again, not just the two lines already
diagnosed:

- The *other* grid on this page (`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]`, line 347)
  has two children: a `<section>` with `min-w-0` (line 348) and an `<aside
  className="min-w-0 space-y-8">` (line 388) — the aside itself carries `min-w-0` directly.
  The two sections nested *inside* that aside (`glass-card-offset`, `glass-card-fast`) are
  not grid items themselves — they're normal block children of an already-protected
  container, so they don't need the class individually. **Both real grid children of this
  wrapper were already correct**, confirmed by reading the JSX structure, not assumed from
  the wrapper rendering fine.
- The broken grid (line 437, now 453) has exactly two children, both fixed above. No third
  section shares this wrapper.

**The two sections this audit found are the complete set** — not a partial fix.

## Live verification, not a source read

Read-only diagnosis and read-only verification are different claims, and CEO's own framing
was specific: don't let a `min-width` fix that happens to reflow the desktop grid become a
worse bug than the one it replaced. Verified against a **production build** (`next start`
on a scratch port, not `next dev`) — no HMR in the way of the reading, unlike the audit
pass, which hit exactly that noise. Logged into `oryn.qa.b` (cookies aren't port-scoped on
`localhost` in this browser profile, confirmed again), `getBoundingClientRect()` on the
live DOM at each width:

| Viewport | `glass-card-offset2` | `glass-card` | vs. before |
|---|---|---|---|
| 320px | 288px | 288px | was 473px/473px — now matches its 288px container exactly |
| 375px | 343px | 343px | was 473px/473px — now matches its 343px container exactly |
| 768px | 336px | 336px | unchanged — still two explicit columns |
| 1280px (desktop) | 414px | 414px | unchanged — still two explicit columns |

Full-DOM overflow sweep (every element's `getBoundingClientRect`, not just
`document.body.scrollWidth`) at 320px and 375px both came back with zero elements wider
than the viewport, on the whole page, not just the two fixed sections — the same
methodology the original audit used, re-run after the change rather than trusted from the
diff alone. Screenshots at both widths show the cards stacking cleanly with no overlap,
replacing the hazy, clipped rendering the audit doc's own screenshot showed.

## What the new test does and doesn't prove

Added `__tests__/dashboard/dashboard-view-grid-overflow.test.ts` — three assertions
pinning the exact className strings this fix depends on. Said so directly in the test's own
header rather than letting a green run imply more than it does: **a source-text assertion
is not a layout measurement.** It can't see whether Tailwind actually generates the
expected CSS for these classes, whether the cascade resolves `grid-cols-1` against
`md:grid-cols-2` the intended way, or what the real rendered width is — only that the
specific characters this fix relies on are still present in the file. Its honest job is
catching an accidental revert (someone touches this section later for an unrelated reason
and drops `min-w-0` without noticing) with a fast, specific failure — not standing in for
having measured the real page. **The table above is the actual proof**; the test is a
tripwire for one specific way this fix could quietly come undone.

## Summary

- Fixed: explicit `grid-cols-1` base + `min-w-0` on both sections, matching this file's own
  already-correct sibling pattern exactly.
- Checked and confirmed there's no third section needing the same fix on this page.
- Verified live, against a production build, at all four widths tested tonight — the two
  that were broken now match their container exactly, the two that were already correct
  are unchanged.
- Added a source-pin test as a regression tripwire, with its own header stating plainly
  that it cannot substitute for the live measurement above.
