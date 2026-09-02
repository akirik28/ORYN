# University data-depth honesty on the detail page — 2026-09-02

## Assignment

CEO measured, via SQL, that 734 of 1,019 universities share one identical-microsecond
`created_at` (a single bulk INSERT, 88 countries, 2026-08-16), all marked
`data_status = 'needs_review'`. They are not empty shells — 724 of 734 have been updated
since insert, all have `last_checked_at`, only 16 lack a website, none lack a city — but
of the 734: only 4 have any `university_sources` row, 25 have programs, 18 have
requirements (statistics run the other way, 83 of 734 vs 46 of the other 285). CEO could
not answer from queries alone: does the detail page tell a student this data is thin, or
does it just render empty sections? That's what this task establishes and fixes.

## What actually renders today (confirmed by reading the code, not inferred)

Pulled 15 real rows from the 734 with zero rows across all four depth tables
(`university_sources`, `university_programs`, `university_requirements`,
`university_statistics`) — e.g. `2263bb6d-0dce-458e-ba0b-10ba9cac7fe9` (Universidad
Nacional de Córdoba, Argentina), `c9b08644-929b-4040-bf3d-14c3c6b4d4e8` (James Cook
University, Australia). Tracing `app/(app)/universities/[id]/page.tsx`'s render path for
one of these:

- Header (name, city, country) — renders, from the `universities` row itself.
- `institution_type` badge — renders if set.
- Description, rankings, "Your outlook", research topics, programs, requirement check,
  calendar-bound facts, important dates, sources — **every one of these sections is
  independently gated on its own table having rows**, so all of them silently disappear.
- The one section that is NOT conditional on data existing: the 4-5 `StatCard` stat grid
  (student size, admission rate, cost/tuition, test scores, graduation rate). Each card
  falls back to `t("unavailable")` per field when the underlying `university_statistics`
  row is null — so a university with **zero** statistics renders the exact same "stat
  grid full of Unavailable" as a university that merely has one or two unpublished
  figures. `SourceBadge` (`stats?.source`), the one thing that could have explained why,
  is also silently absent in the same case.
- Website/admissions links still render when `website_url`/`admissions_url` are set
  (true for ~718 of 734, per CEO's count of 16 without a website).

**Net effect for one of these 734, confirmed from source: header, a stat grid reading
"Unavailable" 4-5 times with no explanation, and (usually) a website link. Nothing on the
page distinguishes "Oryn hasn't researched this institution" from "this institution
merely doesn't publish a couple of figures."** That is the exact ambiguity CEO's question
was asking about, now confirmed rather than inferred.

## What already existed to reuse (per CEO's explicit instruction not to invent a third vocabulary)

- `components/oryn/empty-state.tsx` — the spec-mandated (Phase 43) shared component for
  every meaningful empty screen: icon, title, description, optional action. Already used
  in 15+ places across the app (saved-universities list, region explorer, search, etc.)
  but **not once on this page** before this change — confirms the gap directly rather
  than by absence-of-evidence.
- `lib/scoring/signal.ts`'s `EvidenceState` — semantically scoped to student profile
  *dimensions* (its `not_assessed` variant's own doc comment: "Nothing recorded at all.
  Oryn is not making a judgement, because it cannot.") — not directly reusable as a type
  here (it's typed over `ProfileDimension`, a student concept), but its **tone** is
  exactly right and is what the new copy below borrows.
- `components/oryn/confidence-indicator.tsx` — scoped to confidence in one already-present
  fact (used by `SourceBadge`). Considered and set aside: per CEO's own framing, "a page
  with no facts has nothing for SourceBadge to badge" — there is no fact to attach a
  confidence level to when the underlying table has zero rows, so this component doesn't
  fit the institution-wide-absence case the way `EmptyState` does.

## The fix

### 1. `lib/universities/data-depth.ts` (new) — `lacksResearchDepth()`

A small pure predicate, extracted specifically so the branching logic is unit-testable
(this page has no existing test file — none of its several other extracted pure helpers
at the bottom of `page.tsx` do either — so this is new coverage, not a gap in an existing
convention):

```ts
lacksResearchDepth({ hasStatistics, programCount, requirementCount, sourceCount }): boolean
```

True only when **all four** signals are empty. Deliberately not gated on `data_status`
itself — that column is written by `detect-stale-data` and never reflects program/
requirement/source coverage; a university could be freshly re-checked and still have zero
programs acquired. Measured directly from what the page already fetches, not from a
column that was never meant to answer this question.

6 tests in `__tests__/universities/data-depth.test.ts`: all-empty (true), all-full
(false), and one test per signal confirming that any single non-empty signal alone
suppresses the notice (four cases).

### 2. `app/(app)/universities/[id]/page.tsx`

One new conditional block, positioned after the description paragraph and before
rankings — i.e., right after the identity block, before any data-derived section:

```tsx
{lacksDepth ? <EmptyState icon={FileSearch} title={t("notResearchedTitle")} description={t("notResearchedDescription")} /> : null}
```

Additive only — nothing existing was removed, reordered, or suppressed. In particular,
the stat grid still renders underneath exactly as before: `university.student_size` (a
column on `universities` itself, independent of `university_statistics`) could plausibly
carry real data even when the stats row is absent, so I did not risk hiding it by
special-casing the stat grid's own rendering. The notice adds context; it does not gate
anything off.

No `action` prop: there's no student action to offer for a research gap that's Oryn's to
close, not the student's — consistent with Phase 43's "almost always" a way out, not
"always." When `website_url` exists it still renders in its own section further down,
unchanged.

### 3. `messages/en.json` / `messages/tr.json` — `universities.detail.notResearchedTitle` / `notResearchedDescription`

> **EN** — "Oryn hasn't researched this university in depth yet" / "Program, requirement,
> and admissions details aren't in Oryn's records yet — that's a gap in our research, not
> a reflection of the university."
>
> **TR** — "Oryn bu üniversiteyi henüz derinlemesine araştırmadı" / "Program, gereklilik
> ve kabul bilgileri henüz Oryn'ın kayıtlarında yok — bu, üniversitenin değil, bizim
> araştırmamızdaki bir eksiklik."

Deliberately does not name a specific missing table or say "empty" — the point (per
CEO's explicit steer) is that absence of Oryn's data is not absence of the institution,
so the copy locates the gap in Oryn's research, not in the university.

## What this deliberately does NOT do

- **Does not hide or filter these 734 universities from search, browse, or any listing.**
  `lib/universities/browse-page.ts`'s own precedent (`sort === "ranking"`: the ~10
  universities QS doesn't rank are appended after the ranked ones, never dropped) was the
  guide here — a student searching for their own country's institution must still find
  it. Nothing in `browse-page.ts` was touched.
- **Does not touch the browse/list page** (`app/(app)/universities/page.tsx`) — CEO's
  question was specifically about the *detail* page ("a student opens the detail page for
  one of the 734... does it say... or does it just render empty sections?"). Whether the
  list view should surface a lighter-weight version of the same signal (e.g. a small
  badge on the card) is a real, separate question I did not have scope to also answer
  today; `lacksResearchDepth()` is written as a small, reusable, pure function specifically
  so that decision doesn't require re-deriving this logic if it's made later.
- **Does not touch `data_status`** or the `detect-stale-data` job that writes it — this
  fix is purely presentational, reusing data the page already fetches for other reasons.

## Verification

All 4 gates green in this worktree (`node_modules` symlinked from the primary checkout
for typecheck/lint/test per the established worktree pattern, swapped for a real
`npm ci` before `build` — Turbopack hard-fails on a symlink pointing outside the project
root):

```
typecheck    clean
lint         clean
check:i18n   en.json 1310 keys · tr.json 1310 keys — in sync, no key missing on either side
test         3601 passed (256 files) — up from 3595/255 before this branch
build        succeeded (Next.js 16.3.1, Turbopack)
```

**Not independently browser-verified.** This page requires an authenticated session
(`requireUser()`) and a real university id in the URL; the Browser pane had no open tab
and no persisted session this run, and no test credentials were available in this
worktree to sign in fresh. Consistent with this session's established pattern for
auth-gated app pages (no prior phase this session did live browser verification of one
either), the three things a live check would have confirmed — the predicate's branching
correctness, the JSX/component wiring, and catalog-key resolution — are covered instead
by the new unit tests, `tsc`'s full compile (which builds the actual render tree and
would fail on a prop-type or missing-import error), and `check:i18n` respectively. Real
example ids for a follow-up live check, if one becomes practical: `2263bb6d-0dce-458e-
ba0b-10ba9cac7fe9`, `c9b08644-929b-4040-bf3d-14c3c6b4d4e8` (both currently in the
zero-depth cohort as of this writing).
