# Fresh-install audit — 2026-08-31

Two passes, per instruction: what a genuinely unconfigured install shows, and a static
trace of the surfaces CEO named as highest-risk — things that *compute* from rows rather
than merely list them. The live signup→onboarding→dashboard click-through stays queued
(needs either Docker, unavailable on this machine, or a founder-approved new Supabase
project — see the earlier message in this thread for why neither is mine to provision).
Nothing in this document has been fixed. Read-only source review plus one local dev
server with no `.env.local` — no database, live or otherwise, was touched.

## Pass 1: zero configuration at all

No `.env.local`. Walked landing, `/signup`, `/login`, `/onboarding`, `/dashboard`,
`/opportunities`, `/universities` directly in a browser against a real dev server.

**Clean across every route.** Every one renders the documented `NotConfiguredNotice`
("Supabase isn't configured yet... see API_SETUP.md") consistently, with zero console
errors anywhere. This matches `docs/environment-variables.md`'s own documented behavior
exactly — a genuine positive result, not an unchecked assumption.

## Pass 2: static trace of compute-from-rows surfaces, empty input

### Dashboard hero + profile signal — verified safe, full chain traced

This is the exact surface with two real, already-fixed historical bugs, both on the
founder's own account (2026-08-24: an empty profile produced a confident "Your clearest
gap is academics" headline; 2026-08-31, today: a rich profile showed "Areas assessed 6 ·
No evidence yet 3" against a true count of "3 and 6"). Traced the full chain for a
genuinely brand-new user (`profile_scores`: zero rows, not just zero `reason_codes`) to
confirm both fixes generalize to true-empty, not just "populated but all-unassessed":

- `app/(app)/dashboard/page.tsx`: `scores = scoresRes.data ?? []`, every downstream array
  access already defaults safely (`?? []`, `?? null`, `[0] ?? null`).
- `lib/counselor/gaps.ts` `rankDimensionGaps`: explicit `if (scores.length === 0) return
  [];` before the `Math.max(...scores.map(...))` that would otherwise return `-Infinity`
  on empty input.
- `lib/scoring/signal.ts`: `hasConfidentSignal([])` → `false` (bare `.some()`, correctly
  vacuous). `canClaimGap`/`signalCoverage` both safe on `[]`.
- `lib/scoring/dashboard-hero.ts` `computeDashboardHeroState([], null, ...)`: both
  `claimableGap` and `hasRichSignal` correctly resolve falsy, landing on `kind: "empty"` —
  the "Tell Oryn what you've done..." copy, not either of the two claim-shaped states.
- `lib/scoring/change.ts` `buildProfileChange`: `previousDimensionScores === null` (no
  prior snapshot for a new user) → returns `NO_PROFILE_CHANGE` immediately;
  `describeProfileChange` returns `null` for `hasHistory: false`, so the "improved this
  month" line doesn't render at all rather than asserting nothing changed.
- `features/dashboard/profile-signal.tsx`: `signal.length === 0` has its own explicit
  empty-state branch (honest copy + CTA, no fabricated spectrum bars).

**No bug found here.** Both prior fixes correctly generalize to the true-zero case.

### Counselor priorities + weekly plan — verified safe, full chain traced

- `lib/counselor/scoring.ts` `rankCandidates([], [], ...)`: every internal step (`.map`,
  `.filter`, `.sort`, the redundancy-decay pass, the avoid/deprioritize slot logic) stays
  correct on empty input — confirmed by reading each step, not just the final `[]` return.
- `lib/counselor/dashboard-contract.ts`: pure filtering over `rankCandidates`' output —
  empty stays empty, `avoidForNow` correctly resolves `null` via `.find() ?? null`.
- `features/dashboard/counselor-week-fallback.tsx`: its own additional `actions.length ===
  0 → return null` guard, redundant with (not relied on instead of) the page-level
  `usingCounselorFallback` check — belt and suspenders, correctly wired both ways.
- `lib/counselor/pipeline.ts`: `sufficientForJudgment: completenessPercent >=
  MIN_COMPLETENESS_FOR_JUDGMENT` — `completenessPercent` defaults `?? 0`, so this
  correctly evaluates `false` for a new user rather than defaulting open.

**No bug found here either.**

### Percentage/count/comparison sweep, app-wide

Grepped every `/ x.length` and `* 100` computation outside test files. Two were already
explicitly guarded before this pass (`lib/opportunities/matching.ts`'s field-overlap
score: `if (opportunity.fields.length === 0 || student.interests.length === 0) return
clampScore(40 + ...)` before the division; `lib/applications/readiness.ts`: `if
(applicable.length === 0) return 0`). Two divide by a compile-time-fixed-length array
(`lib/scoring/index.ts`'s 9 hardcoded `DIMENSION_SCORERS`, `lib/scoring/completeness.ts`'s
fixed checklist), safe by construction regardless of user data. Peer benchmarking
(`lib/benchmarking/compute.ts`) has a double guard — `computePercentileRank` itself
returns 50 on empty input, and its only caller additionally refuses to call it at all
below `MIN_COHORT_SIZE`, matching [[project_opportunity_engine_priorities]]-adjacent
memory of this feature's "not enough comparable students yet" design.

**One of these led to a real finding, not a guard:**

### Admission outlook for an unscored profile — real bug, precisely traced

`lib/admissions/persist.ts` `refreshAdmissionOutlook` — described in its own comment as
"safe to call whenever a target university page is viewed" — runs unconditionally the
first time a student adds *any* target university, with no gate on whether Oryn has
scored their profile yet:

```
const profileStrength = profileRes.data?.profile_strength_score ?? 0;
const dataConfidence = profileRes.data && profileRes.data.completeness_percent >= 60 ? "high" : "medium";
```

Both lines conflate "never computed" with "computed and genuinely zero/low," exactly the
distinction `lib/scoring/signal.ts`'s `hasConfidentSignal`/`isAssessed` machinery exists
to make correctly for the dashboard — but this file has no equivalent gate:

- `profileStrength` for a brand-new user is `0` (never scored), not because Oryn has
  assessed them as weak.
- `dataConfidence` is a two-way ternary with no "low"/"unknown" branch — a completely
  empty profile (`completeness_percent = 0` or `null`) resolves to the *same* `"medium"`
  as a 59%-complete one.

Fed into `lib/admissions/outlook.ts` `computeAdmissionOutlook`:

- `compositeScore = max(0, min(100, 0 - SELECTIVITY_PENALTY[tier]))` floors at `0` for any
  selective-enough tier → `classifyOutlook(0)` → `"extreme_reach"`, the single most
  alarming label, rendered by `OutlookBadge` in **red, "error" tone**.
- If the target has a real `admission_rate` on file (common — most researched
  universities do): `nudge = (0 - 50) * 0.4 = -20`, shifting the numeric estimate a full
  20 points more pessimistic than the institution's own base rate, then rendered as a
  specific range — e.g. a real 5%-admission-rate school renders **"Oryn estimate: 1–11%
  (medium confidence)"** — for a student Oryn has zero actual information about.

Confirmed end to end, not stopped at the computation: this is what gets **persisted**
(`app/(app)/universities/[id]/page.tsx` writes `outlook`/`estimate_range_low`/
`estimate_range_high`/`outlook_confidence` straight from this result) and then
**rendered** — the exact red badge and percentage text a real student would see on their
very first target university, the moment they add it, before they've entered a single
course or activity.

`OutlookBadge` already has a `!outlook → "Not yet assessed"` fallback — it just never
fires, because `refreshAdmissionOutlook` always computes and writes a real, non-null
value on first view rather than leaving it null until there's something to base it on.

**Not fixed on this pass, per instruction — the shape of a fix worth naming:** the
existing `hasConfidentSignal`-style pattern (distinguish "no evidence" from "confidently
low") is already established elsewhere in this codebase and could gate this the same way
— e.g. don't call `refreshAdmissionOutlook` (or don't classify past `"not yet assessed"`)
until the profile has *some* confident signal, the same predicate the dashboard already
uses. A product decision either way (what exactly should show instead), not one to
presume here.

## What wasn't reached this pass

Generic list surfaces (opportunities catalogue, universities catalogue) were explicitly
deprioritized per instruction — real empty states already exist there from development.
The live click-through (real signup, onboarding form behavior, actual rendered dashboard
against a truly fresh account) is a different instrument from this trace and still finds
things a static read can't — queued, not done here.
