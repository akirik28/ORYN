# Absence-as-known-value inventory — 2026-09-03

Territory from oryn-a7 after the catalog-health package: sweep for the shape behind
tonight's three accidental finds (admin_actions' `head:true` masking, opportunities' silent
age-bound gap, universities' unguarded admission-rate label) — a null, an empty array, a
missing row, or a failed read, treated as a real answer instead of "we don't know." Two
sub-shapes: **(1)** a check that cannot express failure, **(2)** a value whose absence looks
identical to a real reading.

Inventory first, per instruction. One contained fix is included in this same branch
(below); everything else here is reported, not built.

## Independently found, already fixed by another lane while this was in progress

`lib/opportunities/matching.ts`'s `computeEligibility` and `lib/counselor/eligibility.ts`'s
`evaluateOpportunityEligibility` had exactly this shape: an opportunity with no recorded
age bound (`minimumAge`/`maximumAge` both null — ~67% of the live catalogue) fell through
to `eligible: true` with zero caveat, identical to a row a researcher had actually
confirmed has no age restriction. Found independently during this sweep — and then found
already fixed on `origin/main` (`7822639e`, merged mid-investigation) by the time this
branch tried to rebase. Their fix is a strict superset of what this pass found: it also
catches `eligible_grades` carrying the identical shape (empty allow-list silently read as
"no grade restriction"), which this sweep's own read of the same function saw
(`eligibleGrades.length > 0` gating the check, same pattern) but did not call out as its
own instance before the rebase overtook it — worth naming plainly rather than claiming
credit for ground someone else covered more completely. Their commit also traced the
write path (`persist-matches.ts` → `opportunity_matches.eligible` → dashboard/advisor/
resurfacing) and wrote `docs/eligibility-boolean-refactor-notes-2026-09-03.md`, a
considered treatment of the deeper question this shape keeps raising — see below. Dropped
from this branch entirely rather than merged alongside theirs; nothing here duplicates it.

## Fixed in this package

### `assembleScoringFacts` — partial DB failure was invisible, now logged

`lib/scoring/assemble-facts.ts` runs 13 parallel queries (every table Career Profile
scoring reads — activities, awards, research, projects, the rest of Phase 6's inputs) and
returned `x.data ?? []` for every one of them, with **no `.error` check anywhere**. A failed
read (RLS misconfig, a transient error, a table briefly unreachable) was indistinguishable
from "this student genuinely has zero rows here." Every downstream dimension scorer already
produces `confidence: "low"` for a genuine zero (`lib/scoring/dimensions/research.ts` etc.)
— the right label for "not much to go on," the wrong one for "we couldn't check" — and this
was the one place that could have told the two apart before that label gets attached.

Same pattern confirmed in `lib/ai/student-context.ts` (feeds the AI advisor's context
directly — interests, sports, recent recommendations) and, per the census below, 13 more
files.

**Fix (contained)**: `assembleScoringFacts` now checks `.error` on all 13 results and
`console.error`s a single consolidated, named list of which categories failed, if any did.
Return shape and success-path behavior are byte-identical — no caller changes required.
3 new tests pin it: all-succeed logs nothing, one failure is named and still returns `[]`,
multiple simultaneous failures are all named together.

**Not done, flagged rather than decided**: whether a degraded read should make scoring
*refuse* to present the resulting score (a banner, a "some data unavailable" state, or
excluding that dimension from "Biggest Gap") is the same shape of question the age/grade
fix above already wrote up in full (`eligibility-boolean-refactor-notes-2026-09-03.md`) —
a type/value that can only say "confirmed" or "confirmed-absent" with no room for
"unverified," and every reader trusting it equally. That doc's reasoning (three-state vs.
boolean, who should filter unverified vs. who should still show it with a caveat) applies
here basically unchanged, just for confidence instead of eligibility. Not re-derived, cited
instead — a second write-up of the same shape wouldn't tell the founder anything new.
`student-context.ts` and the other 13 files below got the same "log, don't fix silently"
treatment considered but not applied — see Recommended next.

## Checked and confirmed NOT bugs

Listed because the shape pattern-matches and a blind sweep would flag them; each was read
far enough to rule out, not just grepped.

- **University admission-rate → confident selectivity badge.** Already fixed, already
  merged (`e29ece44`, `oryn/admission-rate-disclosure-2026-09-03`): `explainOutlook` now
  requires `admissionRateKnown` and adds an Unknowns-panel line when the rate is missing.
  That commit explicitly deferred the wider "suppress the label entirely" question to the
  founder — same fork as the age/grade fix above and this package's own fix, already
  reported twice over now, not re-flagged a third time.
- **University cost-of-attendance.** `lib/universities/counseling-adapter.ts`'s tuition
  branch checks `tuition.costOfAttendance != null` before using it and has an explicit
  `"unavailable"` state in its own return-kind union. Correctly handled.
- **Rate limiting** (`lib/security/rate-limit.ts`, `lib/ai/rate-limit.ts`,
  `rate-limit-core.ts`). Both undercounting-on-read-error and failing an event write are
  fail-open — but by explicit, documented design (`checkRateLimit`'s own docstring: "Fail-
  open by design on both sides... never blocks a legitimate action because the limiter
  itself is unhealthy"), not an unexamined accident like the finds that opened this
  territory. Real tradeoff, already reasoned through, already named in the code. Not
  re-litigated here.
- **`requireAdmin`.** Delegates to `getCurrentProfile`/`isAdminProfile`; a failed or missing
  profile read defaults to *not admin* → `notFound()`. Absence here already fails closed
  (safe direction), not open — the shape doesn't produce the harm this territory is about.

## The systemic version — a census, not a fix list

`grep -rn "\.data ?? \[\]\|\.data ?? null\|\.data ?? {}"` across `lib/`, `app/`, `features/`
(excluding tests): **73 occurrences across 15 files**, none with an adjacent `.error` check:

```
app/(app)/profile/story-bank/actions.ts
app/(app)/universities/actions.ts
app/api/export-data/route.ts
lib/admin/queries.ts
lib/admissions/persist.ts
lib/ai/student-context.ts            <- feeds the AI advisor's context directly
lib/counselor/state.ts
lib/opportunities/persist-matches.ts
lib/portfolio/build.ts
lib/requirements/facts.ts
lib/scoring/assemble-facts.ts        <- fixed above (visibility only)
lib/scoring/monthly-review.ts
lib/search/index.ts
lib/social/people-you-may-know-query.ts
lib/social/posts.ts
```

This is the real finding underneath the accidents: there is no established convention
anywhere in this codebase for "the read itself failed" as distinct from "the read
succeeded with nothing." `.data ?? []` is the default house style, and it has been since
before tonight — not a mistake introduced recently, a gap that was never closed. Fixing all
73 (decide what each caller should *do* on partial failure — degrade visibly, log only, or
something in between; different callers plausibly want different answers) is a wide,
cross-cutting change, not a contained one. Reporting it, not building it.

This is a different mechanism from the age/grade fix above (that one is a value with no
"unverified" state; this one is a read whose failure mode was never checked at all) but the
same underlying habit: a null/error/empty gets treated as the same known thing a real,
confirmed answer would produce, and nothing downstream can tell the difference.

## Recommended next, if this territory continues

Ranked by who gets hurt, per instruction — a wrong answer shown to a student outranks an
admin-only surface:

1. **`lib/ai/student-context.ts`.** Same shape as assembleScoringFacts, same fix would
   apply (log, don't silently zero), but the blast radius is the Advisor's own direct
   answers to a student's own questions — arguably higher-stakes than the dashboard score,
   not lower.
2. **`lib/opportunities/persist-matches.ts` / `lib/requirements/facts.ts`.** Both sit
   upstream of what a student is told is a match or a met requirement. Note:
   `persist-matches.ts` was independently read closely by the age/grade fix above for an
   unrelated defect (the eligible-boolean write path) — the `.data ?? []` gap this doc
   tracks there is a different, still-open issue in the same file.
3. **The remaining 11 files** — lower first-pass severity (export/portfolio/search/social
   surfaces where a silent empty result degrades UX but doesn't fabricate false confidence
   the way a score or an eligibility badge does), worth a second pass once the pattern for
   #1/#2 is agreed.
4. **The wider design question**, now written up twice from two different angles
   (`eligibility-boolean-refactor-notes-2026-09-03.md` for eligibility, this doc's fix #1
   for scoring confidence): what should a partial data-read failure actually *look like* to
   the student — nothing (current state, minus what's fixed here and by the other lane), a
   quiet log (what's fixed here), or a visible "some of your data couldn't be loaded" state?
   One convention, applied consistently, would close most of the 73 at once instead of 73
   individual judgment calls. That's a decision for CEO/founder, not something to infer from
   silence — two independent passes tonight reaching the same fork is itself a signal it's
   worth deciding once, centrally.

## Not investigated

Areas the shape could plausibly hide in but weren't checked this pass, for a fair inventory
rather than an implied "everything else is clean": `lib/requirements/` program-linkage
confidence tiers, evidence/verification_status transitions (Phase 11/68), the university
`data_status` freshness fields beyond the admin panel's own read of them, and anything
behind an RPC/edge function this session's tools don't reach directly.
