# Does a student see their own progress? — audit, 2026-09-02

CEO's ask: Phases 40/41/67/68 are the emotional core of the product — the reason a student
comes back. `/profile/history` exists; 26 score snapshots exist in live data; nobody had
checked whether the two actually meet.

## Live data first

`profile_score_snapshots`: 26 rows, 8 distinct students. Reason clustering:
`onboarding_completed` (9), `profile_updated` (9), `qa_gate2_fixture` (4, synthetic QA
accounts), `cv_import` (1), and `first_score` (3, for one student — **confirmed this string
does not exist anywhere in the current codebase**; grepped `first_score` across every
`.ts`/`.tsx`/`.sql`/`.md` file, zero hits, so these 3 rows are residue from removed code,
not currently reproducible).

**A real, live bug found in this pass, not just in the historical rows**: one student
(`e9eba798...`) has 5 identical score-0 `onboarding_completed` snapshots minutes apart, and
another (`ccf2161e...`) has 7 `profile_updated` snapshots in under 11 minutes, several with
identical scores. Traced to `lib/scoring/persist.ts`'s snapshot-write condition — see below.
These specific historical rows are almost certainly residue from before this session's
earlier onboarding-idempotency fix ([[project_oryn_scheduled_weekly_plan_job]]-adjacent
work; the fix's own comment cites "5 duplicate rows" and a 2026-08-23 date, matching this
student's timestamps), but the underlying condition that produced them was still live in
the code until this pass, independent of that specific fix — a second CV import with zero
net score change would trigger it today.

## Phase 40 — is it monthly review, or a bare snapshot?

**Genuine movement, not a current value with a date.** `lib/scoring/monthly-review.ts`'s
`getMonthlyReview` compares live `profile_scores` against a snapshot from 30+ days ago and
returns real per-dimension `{before, after, delta}` triples, sorted by magnitude of
movement. `features/profile/progress-view.tsx` renders this as a genuine before→after table
with trend icons, a "N moved forward / N moved back / N held steady" summary sentence, and
— matching Phase 40's own example almost verbatim — "projects completed" / "applications
submitted" counts for the window. This was previously untested; added 5 tests
(`__tests__/scoring/monthly-review.test.ts`) pinning the no-history branch, real delta
computation, magnitude sorting, and the "dimension in baseline but not current" edge case
(dropped, not shown as a false decline to 0).

**Does anything explain why a score moved? Partially — the WHICH is explained well, the
per-dimension WHY is not.** `lib/scoring/change.ts`'s `describeProfileChange` — a genuinely
well-reasoned, deliberate piece of design (its own comment explains replacing an aggregate
"+3 this month" headline specifically because "a student cannot act on a mean of nine
dimensions") — names the single dimension that moved most, in a full sentence. That's a
real, honest answer to "what changed."

What's NOT surfaced: `profile_scores.reason_codes` — real, structured explanatory data
(confirmed the shape: `{code, detail}` pairs, e.g. `research_experience` /
"Analyzed youth unemployment across OECD countries") computed by every scoring dimension —
is fetched by `getMonthlyReview` and used ONLY as a boolean gate (`reasonCodes.length > 0`,
in `lib/scoring/signal.ts`, to distinguish "not assessed" from "assessed") — never rendered
as narrative text anywhere. A student can see THAT research moved and BY how much, never
the specific evidence behind either the before or after number. **Not fixed** — this is a
real UI/copy design decision (how to render an array of reason codes — inline, expandable,
a tooltip), not a bug with one unambiguous fix, the same scope line drawn on the
skills-language review UI and the search full-page-link earlier tonight, just smaller.

**Also confirmed, not fixed**: Phase 41 says snapshots are generated "after meaningful
change OR scheduled review." Grepped every job route and `lib/jobs/*` — nothing schedules a
recompute or writes a snapshot on a cadence; every one of the 26 live rows is edit-triggered.
A student who makes no edits for months gets no new snapshot and no monthly review content
regardless of real-world changes (test scores arriving, a program starting) that never
touched Oryn. A real, named gap — building a scheduled review job is new functionality, not
this pass's scope.

## Phase 41 — the snapshot-write condition itself: found and fixed

`lib/scoring/persist.ts`'s `recomputeCareerProfile` wrote a snapshot whenever
`changedMeaningfully || opts?.snapshotReason` — the second half meant **any** caller passing
an explicit reason (`onboarding_completed`, `cv_import`) got a snapshot on every single call,
whether the score moved or not. This is the direct, confirmed cause of the duplicate rows
in live data above, and it directly contradicts the function's own header comment ("appends
a history snapshot when the overall score... meaningfully changed... so the monthly review
has real before/after data instead of noise from every trivial edit") — the comment only
ever justified the `changedMeaningfully` half.

**Fixed**: dropped the `|| opts?.snapshotReason` bypass. Checked first whether this breaks
the genuine "very first snapshot ever" case it looked like it might exist to protect —
it doesn't: `changedMeaningfully` already covers that via `previousScore === null`
(`profiles.profile_strength_score` defaults to `null`, confirmed live), so a real baseline
snapshot is unaffected. `snapshot_reason`'s stored *value* is untouched — only the condition
for whether a snapshot gets written at all. 3 new source-pin tests added to the existing
`__tests__/scoring/profile-update-wiring.test.ts` (this exact function is already tested via
source-text pinning elsewhere in that file, for the same documented reason:
`recomputeCareerProfile` calls the request-scoped `createClient()` internally rather than
accepting a client parameter, so it can't be driven with a mocked client the way most of
tonight's other fixes were).

## Phases 67/68 — completeness vs. strength, and confidence

**A second real, confirmed bug: `/profile`'s completeness section was titled "Profile
Strength."** `app/(app)/profile/page.tsx`'s overview tab has a section whose only content is
`completeness_percent` (a progress bar, "{percent}% complete," a checklist of what's
missing) — but its `SectionHeader` title read `t("page.strength.title")` = **"Profile
Strength."** The section's own description directly contradicts its own title: "How much
Oryn knows about you — **separate from how strong your profile is**." Same mislabeling in
Turkish ("Profil Gücü" / "Profile Power[/Strength]," description translated the same
self-contradiction). This is exactly Phase 67's warning, not a near-miss of it — a student
reads "Profile Strength: 72%" as an assessment of how good their profile is, when it is a
checklist-completion percentage that has nothing to do with quality.

**Fixed**: renamed the section (title, i18n keys `page.strength.*` → `page.completeness.*`,
both locales) to "Profile Completeness" / "Profil Tamamlanma Durumu." The description (which
was already correct) is unchanged. Confirmed this was the section's only consumer before
renaming — no other surface reads `page.strength.*`.

Worth naming: the actual `profile_strength_score` (real "strength," as opposed to
completeness) is never shown as a raw number anywhere in the app — both this page and
Progress deliberately hide the raw aggregate (`change.ts`'s own comment: a mean of nine
dimensions "is not interpretable... and not actionable"). So the bug wasn't two numbers
sitting side by side confusing a student — it was the one number that IS shown, mislabeled
with the other concept's name. Arguably worse: nothing contradicted it in the same view
until now.

**Confidence (Phase 68) — thoroughly, carefully implemented, no changes needed.**
`lib/scoring/signal.ts`'s `EvidenceState` is a genuine 5-state system
(`not_assessed`/`limited_evidence`/`emerging`/`developing`/`strong`), with `isAssessed()`
explicitly excluding the first two from anything counted as an assessed strength or a
nameable gap. The module's own header comment names the exact failure this prevents: "Oryn
should know when it does not know enough" (Phase 68, quoted directly), and a second comment
describes the specific historical bug this design closed — a 90%-complete profile reporting
six simultaneous "Limited evidence" rows because low-confidence and no-evidence were once
collapsed into one state. `hasConfidentSignal()`/`canClaimGap()` exist specifically so a
surface can't name a gap in data it doesn't have — the exact contradiction CEO's own message
referenced from earlier tonight. Progress correctly filters `nextToStrengthen` to assessed
dimensions only. This is not a gap; it's some of the most careful reasoning in the codebase.

## Summary of what changed

**Fixed** (`lib/scoring/persist.ts`, `messages/{en,tr}.json`, `app/(app)/profile/page.tsx`):
the redundant-snapshot bug and the strength/completeness mislabeling. 8 new tests total (3
source-pin + 5 behavioral).

**Reported, not fixed**: no scheduled/monthly review trigger exists (Phase 41's "or
scheduled review" half is entirely unbuilt); `reason_codes`' actual content never reaches a
student as narrative text (the WHICH is explained, the WHY per-dimension is not) — both real
UI/product-design decisions, not one-line fixes.
