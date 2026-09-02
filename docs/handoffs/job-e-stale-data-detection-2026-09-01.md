# Job E — stale data detection (Phase 30)

**Status:** built, gated, not scheduled (deliberately — see below). Extended to a third
table 2026-09-02 — see the update section right below before reading "Scope: 2 tables, not
3" as current; it describes 2026-09-01's state and is kept for the reasoning, not as today's
scope.
**Date:** 2026-09-01. **Files:** `lib/jobs/detect-stale-data.ts`, `app/api/jobs/detect-stale-data/route.ts`,
`__tests__/jobs/detect-stale-data.test.ts`, plus a one-comment fix to
`app/api/jobs/deadline-reminders/route.ts` (below).

## Update, 2026-09-02: `university_deadlines` is now a third table, not a deferred one

The "out of scope" reasoning below for `university_deadlines` rested on `list_migrations`
reporting `0074_deadline_freshness.sql` as unapplied. That tool turned out to be unreliable
relative to the live schema — confirmed independently twice the same night (this table, and
migration 0072 during a different package) — see `reference_list_migrations_unreliable_use_direct_probe`
in memory. Direct-probed before writing the extension: `university_deadlines` genuinely has
`data_status`/`last_checked_at` live, and has since before this doc's original "not yet
applied" claim was written.

`detectStaleUniversityDeadlines` now exists, same shape as `detectStaleUniversities`
(two-level `last_checked_at ?? created_at` fallback — this table has no `retrieved_at`-
equivalent column). New threshold `UNIVERSITY_DEADLINE_STALE_AFTER_DAYS = 30`, shorter than
both other tables, reasoned the same way they were: checked live data before picking a
number rather than guessing. As of 2026-09-02: 470 rows, all `data_status = 'fresh'`, all
`last_checked_at IS NULL` (migration 0074 deliberately left it unbackfilled — a timestamp
would assert a check that never happened), `created_at` ranging 2026-08-16 to 2026-08-31 (0
rows older than 30 days, 7 older than 14, 438 older than 7) — 30 days was picked as a
reasoned cadence for a field that "goes stale fastest and hurts most when it does" (migration
0074's own words), not because it happens to flag nothing on this batch; a 7-day threshold
would have flagged 438 of 470 rows simultaneously on this job's very first run, which is
honest but not a useful first signal.

**Coordinated directly with the session extending `university_deadlines`' ingest comparator
in parallel** (detecting when a deadline's *value* changes, distinct from this job's "is it
old enough to recheck") before writing any code: confirmed this extension needs no new
column and creates no migration conflict — the two features answer genuinely different
questions about the same table and don't share any write path.

Everything below this point is the 2026-09-01 original, kept for the scope reasoning that's
still correct (why `opportunities` stays out, why age-only recomputes can't detect a
same-timestamp value change) even though its `university_deadlines` section is now
superseded by the update above.

## What it does

Recomputes `data_status` (Phase 29: `fresh | stale | needs_review | unavailable`) on
`universities` and `university_requirements` from how long it has been since each row was
last substantiated, against a per-table refresh interval. Stored-data-only: no network call,
no source re-fetch, no AI call. Follows `deadline-reminders/route.ts`'s exact template —
`verifyCronRequest` → `runWithTracking` → `GET = POST` alias → `force-dynamic`. Not added to
`vercel.json`; scheduling is a deployment decision left to the founder, and the route is
safely inert without `CRON_SECRET` regardless.

Age reference, in order of preference: `last_checked_at` → (`university_requirements` only)
`retrieved_at` → `created_at`, which every row has by construction. Only ever moves a row
between `fresh` and `stale` — `needs_review` and `unavailable` are judgment calls this job
has no evidence to override, so both are read (they count toward `checked`) and never
written. Thresholds: 90 days for `universities`, 60 for `university_requirements` — reasoned
defaults (Phase 29: "Deadlines and active opportunities need more frequent refreshes than
static institution details"), not validated ones, freely adjustable.

## Scope: 2 tables, not 3, and not opportunities — each boundary is a real finding, not a shortcut

**`opportunities` is out of scope on purpose.** It has no `data_status` column — a different,
evidence-based system lives there (`verified_at` / `last_verified_at` / `verification_state`,
see `lib/opportunities/lifecycle.ts`). That table's freshness problem is already fully
designed in `docs/opportunity-reverification-job-design-2026-08-23.md`
(`opportunity_reverification`, implementing Phase 30 Job B **and** Job E for opportunities
together) — unbuilt, and a materially bigger effort than this one: it requires an actual
source re-fetch (Tavily) because, per that doc and per `lifecycle.ts`'s own comment, a closed
or changed record can leave **zero trace in any stored timestamp**. `lifecycle.ts`, verbatim:
"No date-only rule can catch the shape — it requires either a researcher reading the source
page, or a scheduled re-verification job that re-fetches source_url and checks for closure
language." This job is exactly a date-only rule. Building a shortcut version of opportunity
freshness here — inferring liveness from stored dates alone — would quietly misrepresent the
one guarantee that design doc exists to make honestly instead. Left alone.

**`university_deadlines` is also out of scope, for a narrower, more mechanical reason.**
Migration `0074_deadline_freshness.sql` already gives it the identical `data_status` /
`last_checked_at` columns as `university_requirements` ("same enum, same meanings... a reader
who knows one table now knows the other") — but that migration is written and committed,
**not yet applied to the live project.** Confirmed via `list_migrations` against
`qtcvcflzxbuagvvwahhu` today: the applied list ends at `0071_calendar_bound_fact_class`;
0072–0074 are all unapplied. I did not apply it myself — that felt like a separate decision
(three unrelated migrations, one of them schema-affecting) rather than a side effect of
building Job E, and this codebase's own recent history has more than one example of an
unapplied-migration gap being worth a deliberate look rather than a quiet fix bundled into
something else. Extending this job to `university_deadlines` once 0074 lands is small and
mechanical — the same `detectStaleRows` shape covers it — left for whoever applies that
migration, or a short follow-up after.

**What this means the job actually does today:** the only two Phase 29 freshness tables that
exist live are the only two tables it touches. Nothing is silently skipped without being
named here.

## What it cannot detect, regardless of scope

Age is a proxy for risk, never a measurement of truth. A `fresh`-aged row can be wrong the
day after it was checked; an old, `stale`-flagged row can still be completely accurate. This
job can only ever say "old enough to be worth someone looking at again" — it cannot confirm
or deny that a row's content still matches its source, because it never looks at the source.
`docs/opportunity-reverification-job-design-2026-08-23.md` names this "provenance and
liveness are orthogonal" and has the sharpest illustration in the codebase (ISSYP: the
cleanest sourced evidence in its batch, for a programme dead since 2023 — nothing in any
stored field says so). The same gap applies here, structurally identically, to a university
or a requirement: nothing about this job's output should be read as "confirmed accurate,"
only "recently substantiated" or "worth re-checking."

## What I found live, checking rather than assuming, before picking thresholds

Queried `qtcvcflzxbuagvvwahhu` directly (2026-09-01) rather than guess at whether 90/60-day
thresholds would be reasonable or would mass-flip the corpus on first run:

- `universities`: 285 `fresh` (all with `last_checked_at` set, clustered 2026-08-16 to
  2026-08-20 — one Job C sync push, nothing since) + 734 `needs_review` (**also** all carrying
  a `last_checked_at`, from the same bulk-creation pass — confirming the `needs_review` split
  is about something other than age, most likely completeness/confidence at creation, which is
  exactly why this job must never recompute that status by age alone). Zero rows currently
  `stale` or `unavailable` — this job would be the first thing to ever write `stale` here.
- `university_requirements`: 1325 rows, all currently `fresh`; 1303 of them (98%) have never
  had `last_checked_at` set at all — confirming the two research-ingest pipelines
  (`lib/requirements/ingest.ts` and its deadlines sibling) write `retrieved_at` but not
  `last_checked_at`, which is exactly why the fallback chain exists rather than treating a
  ingest-pipeline row as ageless. Average age via the fallback: ~11.5 days — most of this
  corpus was researched within the last two weeks as part of the same fleet effort this
  document is part of.

With today's actual data, a first real run of this job would change close to nothing —
everything is well inside both thresholds. That is the honest, correct answer for this
corpus right now, the same shape `lib/opportunities/lifecycle.ts`'s own
`MAX_VERIFICATION_AGE_DAYS` comment describes for a different table: "the honest predicate
therefore fires on zero rows today. That is a true statement about this corpus, not a dead
rule." Also confirmed **1019 `universities` rows and 1325 `university_requirements` rows are
both already past PostgREST's 1000-row unpaginated cap** — both scan functions paginate via
`.range()` for that reason; an unpaginated read here would have silently missed the same
"last 10-and-more alphabetically" class of bug `lib/acquisition/paginate.ts`'s own docstring
already warns about for a different table.

## Incidental fix: `deadline-reminders/route.ts`'s stale self-label

While reading every job route for the template, found `app/api/jobs/deadline-reminders/route.ts`'s
own docstring still claimed to be "Phase 30, Job B" — a claim `lib/deadlines/scan.ts`'s
`scanDeadlines()` function already explicitly disclaims in its own comment ("NOT Phase 30 Job
B... Real Job B is `docs/opportunity-reverification-job-design-2026-08-23.md`'s
`opportunity_reverification` design"), and which that design doc's own §1.3 flagged by name:
"the stale comment on the reminders route should be corrected by whoever owns it." Nobody had
yet. One-comment fix, no behavior change — corrected here since I was the next person reading
that file closely enough to notice the contradiction, and since my own Job E route sits right
next to it and cites the same design doc; leaving the contradiction standing while adding a
second route that correctly cites the same doc would have been an odd thing to knowingly walk
past.

## Testing

`recomputeDataStatus` (the pure decision function) is tested directly against fixed clocks:
threshold crossing in both directions, the exact-threshold boundary, self-healing
stale→fresh, and confirmation that `needs_review`/`unavailable` are never touched regardless
of age. `detectStaleUniversities`/`detectStaleUniversityRequirements` are tested against a
hand-rolled Supabase-client mock (same thenable-chainable-builder shape as
`__tests__/deadlines/scan-target-universities.test.ts`'s `makeQueryBuilder`, extended with
`order`/`range`/`update`/`eq`) covering: threshold crossing end-to-end, the full fallback
chain (`last_checked_at` → `retrieved_at` → `created_at`) one link at a time, and that
`needs_review` rows are read but never written. 4 gates clean: lint, typecheck, 3128 tests
(13 new), build (`/api/jobs/detect-stale-data` appears correctly in the route manifest).

## Phase 30 status after this lands

All five jobs now exist: A (`discover-opportunities`), B — mislabeled on `deadline-reminders`
until this fix, real Job B still unbuilt and separately designed — C (`sync-university-data`),
D (`generate-weekly-plans`, merged into main today by another lane, `e4eafe81`), E (this).
