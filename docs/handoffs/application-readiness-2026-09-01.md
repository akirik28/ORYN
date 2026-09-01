# Application readiness (Phase 70) — the naive version already existed; this fixes what it got wrong

CEO-assigned: design and implement Phase 70 (a percentage measuring how much of a known
application is assembled — explicitly not admission probability), distinct from career
profile score and profile completeness, neither of which exists as this. **Found while
starting: it already exists.** `lib/applications/readiness.ts`'s `computeReadiness` is wired
into both `/applications` and `/applications/[id]`, with tests. It just doesn't hold to the
two boundaries CEO named — this is a fix to an existing rough implementation, not new
ground-up work.

## What was already there, and what was actually wrong with it

```ts
export function computeReadiness(requirements: { status: RequirementStatus }[]): number {
  const applicable = requirements.filter((r) => r.status !== "not_applicable");
  if (applicable.length === 0) return 0;
  const completed = applicable.filter((r) => r.status === "completed").length;
  return Math.round((completed / applicable.length) * 100);
}
```

Correctly excludes `not_applicable` from the denominator. Two real defects:

1. **Zero applicable requirements returns `0`, not "unknown."** The existing tests even name
   this explicitly — `"every requirement not_applicable is 0%, not NaN"` — solving the crash,
   never asking whether 0% is honest. It isn't: an absent denominator is not a zero numerator.
2. **No awareness of `application.status` at all.** The function always returns a number, and
   both pages always render it. Live data confirms exactly the failure this produces: a real
   `submitted` application (`1256918b-...`) sits at **1 of 8** requirements marked
   `completed` — the checklist is self-reported and submitting doesn't tick its boxes — so the
   product was showing "13% ready" next to a "Submitted" badge on an application the student
   had already sent. That reads as something being wrong with an application that cannot be
   un-sent, which is the exact failure CEO's brief named by name.

## The design decision CEO asked for directly

*"Does it disappear? Say 'submitted'? Keep showing 12%?"* — disappear. Once
`application.status` leaves `not_started`/`in_progress`, the percentage is not shown at all,
anywhere. The status badge already visible on both pages (`StatusBadge` in the list,
`ApplicationStatusControl` on the detail page) already says the one fact that matters at that
point — repeating a stale completion percentage next to it adds nothing true and risks
everything CEO warned about. The requirement checklist itself stays visible and editable on
the detail page (a student may still want it as a personal record — did the recommender
confirm they sent the letter — independent of whether Oryn shows a percentage for it), just
without a readiness score attached.

Considered and rejected: keeping the number with a caveat ("13% — but you've already
submitted!") — this still centers a number that no longer means what it claims to mean, and
adding a caveat to an already-fraught number is patching, not fixing. Considered and rejected:
a "Submitted" *label in place of* the percentage (e.g., replacing "13%" with the word
"Submitted") — this duplicates the status badge already on-screen and still implies the
readiness slot has *something* to say about a submitted application, when the honest position
is that it doesn't.

## Implementation

`lib/applications/readiness.ts`'s `computeReadiness` now takes `applicationStatus` as well as
the requirement list and returns a discriminated union instead of a bare number:

```ts
export type ApplicationReadiness =
  | { kind: "unmeasured" }                                       // empty denominator
  | { kind: "not_tracked"; applicationStatus: ApplicationStatus } // past the assembling phase
  | { kind: "measured"; percent: number };                        // the honest, real number
```

A caller cannot render a bare percentage without first branching on `kind` — the type itself
makes "don't put a number on screen without saying what it is" the only path through the
compiler, not a convention someone has to remember. Both call sites
(`app/(app)/applications/page.tsx`, `app/(app)/applications/[id]/page.tsx`) updated to pass
`application.status`; both `ApplicationsView` (list) and the detail page updated to render
only the `measured` branch as a percentage + progress bar, and to show calm, factual copy for
the other two (`applications.readiness.notTracked` / `.unmeasured`, added to both `en.json`
and `tr.json`) instead of nothing on the detail page, or nothing at all in the tighter list
view where the status badge already carries the information.

**Copy, checked against both hard boundaries**: `notTracked` — *"Readiness stops being tracked
once you submit. It has no bearing on your decision — the checklist below stays here for your
own reference."* Explicitly disclaims decision-relevance (the admission-probability boundary)
and frames the behavior as by-design rather than an error (the not-implying-wrongdoing
boundary) by naming the trigger ("once you submit") as expected, not exceptional.

## Verified

- `__tests__/applications/readiness.test.ts` rewritten for the new return shape: every
  original scenario preserved (not_applicable exclusion, rounding, the live-pinned 1-of-8→13%
  case), plus new coverage for `unmeasured` (empty and fully-not-applicable checklists) and
  `not_tracked` across all six non-assembling statuses (`submitted`, `under_review`,
  `accepted`, `waitlisted`, `rejected`, `withdrawn`), including that the status gate runs
  *before* the empty-denominator check (a submitted application with zero requirements is
  `not_tracked`, not `unmeasured`).
- Visually verified in the browser (`/design-preview`, a Pennsylvania/in_progress/33%,
  Cambridge/not_started/0%, and Yale/submitted fixture row added there): Pennsylvania and
  Cambridge show their percentage and progress bar as before; **Yale (submitted) shows
  neither** — confirmed directly, not assumed from the code reading alone. The detail page's
  equivalent branch was not separately browser-verified (this worktree has no configured
  Supabase credentials, so the authenticated detail route can't be reached here) — same
  logic shape as the list view, covered by the test suite, typecheck-clean.
- All 4 gates green: lint, typecheck, `__tests__` (212 files / 3,123 tests), production build.

No live writes — the three real applications in the database are untouched; this changes only
how their existing, already-live data is computed and displayed.
