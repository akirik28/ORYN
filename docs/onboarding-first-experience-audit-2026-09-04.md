# C5 — the onboarding first experience, walked as a 14-18 year old would see it

Look-and-report only, per the brief — no account created, no live data touched, no code
changed. Method: a prior, thorough source-and-live audit already exists
([docs/onboarding-audit-2026-09-02.md](./onboarding-audit-2026-09-02.md), 2 days old) covering
the five screens' structure, validation, and the CV-review-gates-save chain in English. Rather
than redo that, this pass (1) re-verifies its three findings are still accurate after two days
of active development, and (2) covers the two dimensions it didn't: Turkish copy tone and
mobile. Live-verified via `/design-preview/onboarding` (unauthenticated, mounts the real
`OnboardingWizard` directly — same safe pattern the prior audit used), attached to an
already-running shared dev server.

## The prior audit's three findings, re-checked today, not assumed current

**1. `linkedToVerified` mislabeling — fixed since 2026-09-02.** The prior audit found a
self-added, unverified school shown as "Linked to a verified entry" regardless of its real
status. Checked the current source directly: `entity-combobox.tsx:262-263` now branches on
`linkedEntity.isCustom` (`false` → "linkedToVerified", `true` → a new "linkedToUnverified"
label), and `isCustom` is correctly derived from `verification_state === "user_submitted"`
(`lib/entities/resolve.ts:58`). This is real, not a stale claim — someone fixed it since the
prior audit. Good to confirm rather than either re-report it as broken or silently assume it's
still fine.

**2. "Enter manually" and "Skip for now" still converge on the same screen — unchanged.** Both
buttons still call `setMethod("manual")` (`import-step.tsx:184,193`, confirmed today), landing
on the identical reassurance copy regardless of which one a student picked. Still a real,
minor copy/expectation mismatch, not fixed, not urgent — carried forward as the prior audit
described it.

**3. `onboarding_step` still can't answer "where did a student stop" — unchanged.** Still
written to the literal string `"completed"` in exactly one place
(`app/(onboarding)/onboarding/actions.ts:224`), still never set to an intermediate value.
Carried forward unchanged.

## What this pass adds: Turkish tone

**Consistently "sen" (informal), zero "siz" instances found, across the entire onboarding
message catalog** (`messages/tr.json`'s `onboarding.wizard`/`onboarding.interests`/
`onboarding.import` sections — every string checked, not sampled). A few representative
examples, live-rendered and confirmed matching the source:

- *"Neye doğru çalışıyorsun?"* (goals title) — "sen" possessive throughout.
- *"Doğduğun yılı gir — Proxola, programlardaki yaş sınırlarını kontrol etmek için buna ihtiyaç
  duyar."* (birth-year requirement, live-verified rendering) — the Turkish version of the exact
  reasoning the prior audit praised in English ("stops every opportunity card saying 'can't
  check this'"), translated faithfully, not just literally, same informal register.
- *"Sorun değil — faaliyetlerini, ödüllerini, projelerini ve daha fazlasını istediğin zaman
  Profilinden ekleyebilirsin."* (the shared Enter-manually/Skip reassurance) — same honest,
  non-dead-end tone as the English version, same register.
- Validation errors (*"Devam etmek için ülkeni, okulunu ve müfredatını doldur."*, live-verified
  by actually triggering the block) are direct and calm, not alarming, not bureaucratic.

Nothing childish, nothing overly formal. This matches the app's own stated bar ("student
friendly without feeling childish") and shows no sign of the mixed-register problem other parts
of the app have had this same night (a "sen→siz" pass was needed elsewhere — onboarding didn't
need one).

## What this pass adds: mobile

**The real product is clean on mobile.** Screen 2 (the densest screen — five fields) at a
375x812 viewport: generous touch targets, clear spacing, no clipped or unreachable content,
readable at default zoom.

**One real finding, correctly scoped to the test harness, not the product:** at first look,
`/design-preview/onboarding`'s own floating "Standard/Ultra" preview-tier toggle
(`PreviewToolbar`, `position: fixed; bottom: 16px`) visually overlapped the wizard's own
Continue/Back buttons at this viewport size — confirmed by measuring both elements'
`getBoundingClientRect()` directly, not by eyeballing a screenshot. Hiding that dev-only
toolbar element (a one-off inspection, not a code change) showed the real layout underneath:
fully clean, no overlap, both buttons clearly visible and tappable. **This toolbar does not
exist outside dev-preview mode** — a real student on the real `/onboarding` route never sees
it, so this is not a product bug. Recording it anyway because it's a real trap for whoever next
tests this route's mobile layout via this same harness and might misdiagnose the same overlap
as a product issue.

The two screens not live-walked this pass (interests, geography — reached via required fields
on screen 2 that this pass didn't fill, see the environment note below) were checked at the
source level instead: neither `interests-step.tsx` nor `geography-step.tsx` has any hard-coded
width or horizontal-only layout pattern. `import-step.tsx`'s three-way choice screen uses
`grid gap-3 sm:grid-cols-3` — single column by default, three-across only at the `sm` breakpoint
and up, correct mobile-first structure consistent with what screens 1-2 showed live.

## A methodology note, not a product finding

Mid-walkthrough, an interaction on the shared dev server this pass was attached to (reused, not
one this session started) navigated unexpectedly to the real `/login` page rather than the
intended school-search field. Checked immediately: no text landed in any form field (confirmed
via direct DOM read), nothing was submitted, no further interaction attempted — navigated
straight back to the safe design-preview route and stopped live-clicking through the remaining
screens in favor of the source-level check above. Given this same shared-server unpredictability
has been a named risk tonight already, flagging it as a reason this pass didn't do a full live
click-through of every remaining screen, not silently downgrading the claim.

## Answering the brief's specific questions

- **Do the five screens match the spec, in order?** Yes — confirmed by the prior audit and
  re-confirmed live today for screens 1-2.
- **Does "skip for now" lead somewhere useful, not an empty product?** Yes — it's the identical,
  honest "you can add this anytime from your Profile" reassurance as "Enter manually", not a
  dead end. (The copy mismatch between the two paths' own hint text is the one real, minor
  finding here — see the prior audit's finding #2 above.)
- **Does a real review screen gate the CV-extraction save (non-negotiable #10)?** Yes, traced
  end to end by the prior audit; unchanged today.
- **Is the Turkish copy "sen" or "siz", and understandable for a 14 year old?** "Sen",
  consistently, throughout. Clear, direct, not childish.
- **Does it work on mobile?** Yes, on what was checked live and in source. One dev-tooling-only
  overlap correctly identified and ruled out as a real bug.

## Nothing fixed here

Per the brief: this is a look-and-report pass. Three items carried forward or newly found for a
product/priority decision, none touched: the Enter-manually/Skip-for-now copy convergence,
`onboarding_step`'s inability to show real drop-off, and (informational, not a bug) the
design-preview harness's own mobile-viewport overlap trap for future testers.

---

## ✅ 2026-09-05 audit — one finding closed, one still open

`onboarding_step` cannot show real drop-off → **Closed** — commit `06d02ab2` (2026-09-04),
"Record onboarding step transitions for drop-off analysis" (landed the day after this audit).
Verified via `git merge-base --is-ancestor 06d02ab2 origin/main`.

Still open, re-confirmed 2026-09-05: Enter-manually/Skip-for-now copy convergence — both still
call `setMethod("manual")`.
