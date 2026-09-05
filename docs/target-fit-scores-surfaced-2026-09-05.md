# Phase 16's Academic Fit / Profile Fit — computed, saved, never shown, 2026-09-05

CEO's dead-column audit, second item: `target_universities.academic_fit_score` and
`.profile_fit_score` are exactly the two fields AGENTS.md Phase 16 names ("Academic Fit 0–100 ·
Profile Fit 0–100"). Both are computed every time a target university's page is viewed
(`lib/admissions/persist.ts`'s `refreshAdmissionOutlook`, cheap deterministic math, no AI/network
call), both are written to the row, and the parent-facing RPC even selects both — but neither
ever reached a screen, student or parent.

## Where it dropped — found, not assumed, and no comment defended it

**Parent side** (`lib/parent/university-detail.ts`): `TargetUniversityRpcRow` (the RPC's raw
shape) already declared `academic_fit_score`/`profile_fit_score` — the RPC genuinely returns
them. The mapping block building `ParentSafeChildOutlook` from that row copied `status`,
`outlook`, `estimateRangeLow/High`, `estimateConfidence` — five fields — and stopped, with no
comment anywhere nearby explaining the omission. Checked specifically because CEO named "five
comments turned out wrong today" as a live pattern: there wasn't a comment to be wrong here at
all, which settles the "intentional or forgotten" question the audit asked — nothing intentional
was ever recorded, so this reads as unintentional.

**Student side** (`app/(app)/universities/[id]/page.tsx`): `refreshAdmissionOutlook` returns
`AdmissionOutlookResult`, which already had `compositeScore` (the source of `academic_fit_score`)
but never had a field for `profileStrength` (the source of `profile_fit_score`) at all —
`computeAdmissionOutlook` (`lib/admissions/outlook.ts`) took `profileStrength` as an input,
used it to derive `compositeScore`, and never echoed it back. The `target_universities` row
itself was fetched with `select("*")` on the same page, so both raw columns were one property
access away the whole time — the gap was purely that the JSX never rendered either one, no
`StatCard`, no line of copy, nothing.

## Measured before deciding to build anything

```
target_universities total:               20
academic_fit_score populated:              5
profile_fit_score populated:               5
both populated:                            5
```

5 of 20 (25%) already carry real values — the same 5 that have a real `outlook`, since all three
are written together in one `UPDATE`. Not zero (showing would be pointless) and not universal
(hiding would be absurd) — and since `refreshAdmissionOutlook` runs on every view of a target's
own page, the other 15 fill in as those pages get visited, not stuck at 5. Real enough to build.

## What shipped — numbers with context, not bare digits

CEO's instruction was explicit: Phase 16 wants these two scores *with explanation*, and a raw
"72" says nothing. Two different treatments for two different pages, matched to what each
already has available:

- **Student page**: the two scores are placed directly above the existing strengths/gaps/
  unknowns explanation panel (`explainOutlook`, already computed and already rendered on this
  page) — matching Phase 16's own spec ordering (the named scores, then the qualitative "why").
  The explanation immediately below IS the context; a bare number sitting right next to a
  strengths/gaps breakdown reads differently than one floating alone. Values come from
  `outlook?.compositeScore`/`outlook?.profileStrength` (freshly recomputed this request) falling
  back to `targetRes.data.academic_fit_score`/`.profile_fit_score` (one render stale) only when
  `outlook` itself is null — the identical pattern already used for the outlook badge/estimate
  just above it, for the identical reason.
- **Parent page**: this page deliberately has no per-dimension breakdown (it reads the child's
  cached outlook only, by design — never recomputes, never touches the child's raw activity
  data). Building a second explanation engine just for this page was out of scope for wiring up
  two already-computed numbers, so each score gets a one-line caption naming what it measures
  ("Academic profile weighed against this university's selectivity" / "Overall Career Profile
  strength") — real context, proportionate to a page whose whole design is minimal.

`AdmissionOutlookResult` gained a `profileStrength: number` field (echoing `inputs.profileStrength`
verbatim, the same value `persist.ts` writes to `profile_fit_score`) so the student page has both
scores fresh from one function call, matching how `compositeScore` already worked.
`ParentSafeChildOutlook` gained `academicFitScore`/`profileFitScore`, copied from the RPC row
that was already fetching them.

## Proven red-to-green — without `git stash`, per CEO's standing correction

Used `git diff -- lib/admissions/outlook.ts lib/parent/university-detail.ts > /tmp/fit-scores-fix.patch`,
then `git checkout -- <those two files>` to revert to pre-fix content (leaving the updated test
files in place), ran the affected tests: **3 failures** — `result.profileStrength` undefined
(twice) and the parent mapping test's own `toEqual` missing the two new keys entirely. Restored
with `git apply /tmp/fit-scores-fix.patch`, reran: all pass. No shared stash stack touched at any
point, per the environment-quirks note this session's own earlier `git stash` use (safe in
outcome, still flagged as a live multi-lane risk) prompted.

One of the three failures is worth naming on its own: the parent-mapping test's own fixture data
(`RPC_WITH_MATCH`) already had realistic `academic_fit_score: 70`/`profile_fit_score: 65` values
before today — the test was already exercising the exact drop this whole time, its assertion was
just narrower than the data flowing through it. An under-matching verifier reporting a false
pass, the same shape this session has already named more than once tonight.

## Verification

`npx tsc --noEmit`: clean. Full suite: 431 files, 6470 passed (+2 new in `outlook.test.ts`, the
parent test's existing count unchanged since it updates rather than adds), 2 pre-existing
expected-fails (unrelated). `check:i18n`: 1875/1875 keys in sync — neither page's new copy used
the next-intl catalog, matching each file's own existing convention (`[id]/page.tsx`'s outlook
section already mixes `t()` with inline `locale === "tr" ? ... : ...` throughout; the parent page
uses inline ternaries exclusively, no `t()` import at all). `npx eslint` on all four changed
source files: clean.
