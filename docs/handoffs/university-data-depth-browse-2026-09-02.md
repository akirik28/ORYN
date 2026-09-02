# University data-depth signal on the browse page — 2026-09-02

## Assignment

Follow-through on [university-data-depth-honesty-2026-09-02.md](./university-data-depth-honesty-2026-09-02.md):
the detail page now tells a student when Oryn hasn't researched a university in depth,
but that's only visible after a click. CEO's ask: extend the same honest signal to the
browse page, where the choice actually happens, under two constraints — a marker true for
72% of rows is noise, so express it as the minority instead; and any filter must be
student-controlled and off by default, never a silent narrowing. Also asked to check
whether the `university_statistics` count asymmetry (83 of the 734 bulk-import
universities vs. 46 of the 285 fresh ones) points at a browse-level bias in the cost/size
range filters.

## Investigation: the statistics asymmetry, and a real (but already-handled) bias

Queried `university_statistics` field population split by `data_status`:

| cohort | n | admission_rate | cost | sat | act | grad_rate | distinct sources |
|---|---|---|---|---|---|---|---|
| fresh (285) | 46 | 100% | 98% | 78% | 78% | 98% | 45/46 |
| needs_review (734) | 83 | 98% | 99% | 87% | 87% | 99% | 83/83 |

**Not a shallow bulk load.** When a bulk-cohort university has a statistics row at all, it
is as complete as a fresh one — comparable or slightly better field-population rates, and
`distinct_sources ≈ n` in both cohorts, meaning each row is genuinely individually
sourced, not one generic value fanned out. The "backwards" pattern CEO flagged is simply
that raw statistics-row *count* favors the bulk cohort (83 > 46) while every other depth
signal favors fresh by a wide margin despite being the smaller cohort (153 vs 4 sources,
125 vs 25 programs, 93 vs 18 requirements) — a different, smaller-scale acquisition
pipeline touched statistics somewhat independently of the one that touched
programs/requirements/sources, not a shallow-vs-deep quality difference.

**The real, confirmed asymmetry is `universities.student_size`, not `university_statistics`:**
71.9% of fresh universities (205/285) have it vs. 24.3% of bulk ones (178/734) — a genuine
~3x disparity, and it's what the *size* range filter actually reads (`browse-page.ts`
Path 2 selects `student_size` straight off `universities`, not from
`university_statistics`).

**But it isn't silent.** `lib/universities/filters.ts`'s `applyRangeFilters` already
tracks `sizeUnknown`/`costUnknown` — rows dropped from a range filter for having no data
at all, kept separate from rows that just don't fit the chosen range — and
`app/(app)/universities/page.tsx` already renders that count (`costUnknownExcluded`/
`sizeUnknownExcluded`, lines ~403-408). The founder's own filter spec required exactly
this disclosure and it was already built and wired before this task. So: the skew is
real, but a student applying the size filter already sees an honest "N additional
universities are excluded because student population data is unavailable" — not a
disproportionate silent narrowing. No code change was needed for this half of the
assignment; recorded here so the finding doesn't need re-deriving.

## The fix

### 1. `lib/universities/queries.ts` — `getAllResearchDepthUniversityIds()`

The bulk-list counterpart to `lib/universities/data-depth.ts`'s `lacksResearchDepth`
(which answers the question for one university on its own detail page). Returns a
`Set<string>` of the **minority** with real depth (~285 ids), not the majority without —
directly satisfying CEO's "a marker true for 72% of rows is noise" constraint at the data
layer, so every caller downstream is checking "is this one of the researched ones,"
never the inverse.

Four separate paginated, exact-count-verified reads (`university_programs`,
`university_requirements`, `university_sources`, `university_statistics`), unioned in
memory — same discipline as `getAllCostOfAttendance`/`getAllQsListPositions` in the same
file, guarded by a new test in `__tests__/universities/pagination-safety.test.ts`
(the file that exists specifically to catch a regression back to an unpaginated `.select()`
past PostgREST's 1000-row cap).

### 2. `lib/universities/filters.ts` — `RangeFilters.detailedOnly`

Added as a fifth stage in `applyRangeFilters`, alongside size/cost/rank. Unlike those
three, it has no separate "unknown" count: a row is either in `depthIds` or it isn't, so
there's no unknown-vs-out-of-range distinction to track. 5 new tests in
`__tests__/universities/filters.test.ts`, including one confirming it composes with
`size` (AND, not OR) and one confirming a missing `depthIds` map excludes everything
rather than including everything (matching the existing missing-`costMap` test's
fail-closed convention).

### 3. `lib/universities/browse-page.ts`

- `UniversityBrowseParams.detailedOnly: boolean` (required, not optional — same
  discipline as every other filter field on this interface).
- `useIdIntersectionPath` now includes `|| detailedOnly`, so activating the filter routes
  through the existing in-memory-intersection path (Path 2) automatically, the same way
  cost/size/rank already do — no third code path needed.
- `UniversityCardMeta.hasResearchDepth?: boolean` — set only when true, never explicitly
  false, matching `researchTopics`/`imageUrl`'s existing "silence is the default state"
  convention on this same interface.
- `getUniversityCardMeta` takes the caller's already-fetched `depthIds` as a new
  parameter rather than re-fetching per page/scroll-batch — it's a global set that
  doesn't change page to page, same reasoning as why `costMap`/`qsRankMap` are fetched
  once by the caller and threaded down.

### 4. `app/(app)/universities/page.tsx` + `actions.ts`

- New `?detailed=1` query param, threaded through every href builder
  (`buildHref`/`buildViewHref`/`buildCountryHref`/`buildFilterHref`) the same way
  cost/size/rank already are, so switching Map/List view or clicking a country pin never
  drops the filter mid-browse (the exact bug class this page's own comments document
  fixing for the other filters previously).
- `depthIds` fetched unconditionally (not gated behind the filter being active) in both
  the page and `loadMoreUniversities` — the card badge needs it on every page regardless
  of filter state.
- New `FilterSheet` group ("Research depth" / "Detailed profiles only") — a single
  on/off option, not a `toOptions`/`toMultiOptions` list, since there's only one real
  value here. Off by default (`detailedParam === "1"` is the only way it turns on),
  student-toggled via the existing chip-link pattern, cleared by the existing "Clear all
  filters" action. Counted in `activeFilterCount`.
- `noMatchFilters` copy (EN + TR) extended to mention turning the new filter off, so a
  student who combines it with a narrow country/cost selection gets a complete, not
  partial, explanation of why results are empty.

### 5. `features/universities/university-card.tsx` + `university-browse-grid.tsx`

New `hasResearchDepth?: boolean` prop, rendered as a small `BadgeCheck` + "Detailed
profile" tag in the same icon-row as QS rank / student population — a positive,
minority-only signal, never a negative marker on the other ~72% of cards. The card
component's own doc comment on the new prop states the "never rendered as an explicit
false" rule explicitly, since that's the property that makes constraint 1 hold.

## Deliberately not built

- **No per-row badge or count for the majority.** Every mechanism here (the id set, the
  card badge, the filter) is built around the ~285-strong minority, never the 734.
- **No "excluded because of depth" count** the way `sizeUnknown`/`costUnknown` work — a
  binary toggle a student explicitly turned on doesn't carry the same "unknown vs.
  out-of-range" ambiguity a numeric bucket does, so the existing `totalInScope`/
  `resultsForQuery` count is sufficient disclosure on its own.
- **No change to `data_status`, `detect-stale-data`, or any acquisition pipeline** — this
  is presentational and filtering only, built on data the browse page already fetches or
  can cheaply fetch once per page load.
- **No fix to the `student_size` asymmetry itself** — it's real, but the existing
  `sizeUnknownExcluded` disclosure already covers it honestly; flagged here as confirmed-
  and-handled rather than left as an open question.

## Verification

All 4 gates green in this worktree (branched from local `main` at `579093f4`, which
already included both prior depth-honesty merges — confirmed via
`git merge-base --is-ancestor`; `node_modules` symlinked from the primary checkout for
typecheck/lint/test, swapped for a real `npm ci` before `build`):

```
typecheck    clean
lint         clean
check:i18n   en.json 1314 keys · tr.json 1314 keys — in sync, no key missing on either side
test         3623 passed (258 files) — up from 3601/256 before this branch
build        succeeded (Next.js 16.3.1, Turbopack)
```

**Not independently browser-verified**, same reason and same standard as the detail-page
handoff this follows: `/universities` requires an authenticated session, the Browser pane
had no open tab or persisted session this run, and no test credentials were available.
The three things a live check would confirm — the filter's narrowing correctness, the
badge's minority-only rendering, and catalog-key resolution — are covered instead by the
11 new/extended unit tests, `tsc`'s full compile of the actual page/component tree, and
`check:i18n` respectively.
