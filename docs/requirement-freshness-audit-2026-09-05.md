# Requirement freshness audit — 2026-09-05

CEO (oryn-5b) follow-up to the C3-adjacent measurement of the 12 institutions real students
actually target (`docs/... target-university content audit`, same session): all 12 already have
substantial program/requirement data, so CEO asked whether that data is *current*, not just
*present* — the same class of gap another lane found the same day on the cost side (a
university's 2025 tuition figure being read as if it were 2026's, because nothing on screen
distinguished "checked recently" from "the figure itself covers an old period").

Three findings below. **Only #1 was fixed** (CEO's explicit instruction: "1'i yap, 2'yi ölç,
3 ve 4'ü yaz" — build 1, measure 2, write up 3 and 4). #2/#3/#4 are measured and documented,
not corrected — the decision on whether/who fixes them belongs to CEO/founder.

## 1. Fixed: requirements had no visible "checked" date at all

`features/universities/requirement-group.tsx` rendered every requirement's source as a bare,
dateless "Source ↗" link. The same detail page's tuition/statistics/individual-source rows
already use `components/proxola/source-badge.tsx`'s `SourceBadge` — a component that already
solves exactly this, cleanly separating `checkedAt` (when we last confirmed the source still
agrees) from `asOf` (what period the figure itself covers) — wired onto the page's *other*
facts as recently as this same session (`fca96582`/`06a3f1f6`, the compare-page tuition badge).
Requirements had never been connected to it.

Fixed by reusing `SourceBadge` as-is: `checkedAt` = `last_checked_at ?? retrieved_at` (a genuine
re-check wins when one exists; `retrieved_at`, always populated at ingestion per every D1-style
insert this session has read, is the floor). Extracted as `resolveRequirementCheckedAt` (a pure
function) specifically so the precedence is unit-testable without going through
`formatRelativeTime`'s own non-deterministic-against-a-fixed-test-date formatting. No `asOf`
wired — see #2.

CEO's own reasoning for prioritizing this over the tuition fix it mirrors: a student *dreams*
off a tuition figure; a student *picks courses* off a requirement. A stale requirement costs a
year, not a wrong expectation.

Proven red-to-green (reversed the precedence order, exactly the one test asserting
`last_checked_at` wins failed, reverted, all green — no `git stash`, per CEO's explicit
instruction). Full suite clean, 0 regressions (numbers in the commit).

## 2. Measured: how often does free text actually carry cycle information?

CEO's framing: don't add a schema field on spec (`university_requirements` has no
`application_cycle` column, unlike `university_deadlines`, which does) — that repeats the exact
"schema exists, nobody fills it" trap this same session named for `data_status` (see #3) and
that another lane named the same day for ~53 unread columns elsewhere. Measure the actual need
first.

Regex-scanned `title`/`requirement_detail` across all 1,550 `university_requirements` rows,
live:

```
Total requirements:                    1550
Mentions any 4-digit year (2020-2039):   204  (13.2%)
Named season + year ("Fall 2026"):        21  (1.4%)
Academic-year range ("2026/27"):          13  (0.8%)
Explicit "20XX entry/intake/cycle":       28  (1.8%)
```

Reading: the overwhelming majority (~87%) of requirement rows describe cycle-independent facts
("IELTS 6.5" doesn't need a year). Genuinely cycle-scoped language — the kind that could
actually go stale the way the D1 batch's own "elapsed 2026-cycle deadline" cases did — appears
in under 2% of rows by any of the three narrower patterns. This is a low-prevalence result, not
a null one: real instances exist (the D1 doc's own Yonsei/HKUST entries embed exactly this kind
of cycle language in free text already), just not at a volume that obviously justifies a new
structured column today. Not a recommendation either way — a measurement CEO asked for before
deciding, per the header above.

Caveat on method: regex over free text, not manually verified row-by-row for false positives
(e.g., a year appearing in an unrelated context). Directionally reliable at this sample size,
not a hand-audited number.

## 3. Documented, not fixed: `university_requirements.data_status` never varies

```
universities.data_status:              fresh 285 / needs_review 734   (real split)
university_requirements.data_status:   fresh 1550 / (nothing else)    (uniform)
```

Same column name, same four-value enum (`fresh`/`stale`/`needs_review`/`unavailable`,
`types/database.ts` `DataStatus`), live on both tables — genuinely consumed on `universities`
(734 of 1019 rows sit at `needs_review`, a real distinction something is making), and never
once set to anything but its own default on `university_requirements`, across all 1,550 rows,
system-wide, not just the 12 sampled here.

CEO's own framing, verbatim reasoning worth preserving: this is a different, worse class of gap
than an unread column. A field nobody reads is inert. A freshness field that always says "fresh"
is not neutral — it's a check that always passes, the same shape as the "green test that
verifies nothing" pattern this session independently found three separate times the same day on
the code side. Reading `data_status = 'fresh'` today tells you nothing about whether a
requirement was actually re-verified; it only tells you the row was inserted after this column
existed.

`university_requirements.last_checked_at` (a distinct, per-row re-check timestamp, not the
insert-time `retrieved_at`) is the same story at smaller scale: populated on only ~4 of the 12
sampled institutions' 300+ combined requirement rows — present in schema, essentially unused in
practice.

No fix proposed here. Who (if anyone) should build the actual staleness-detection job that would
give this column a real signal to report (Phase 30's own "Job E: Stale data detection," designed
in earlier docs but — per this session's own read of `lib/jobs/schedule.ts` — never armed for
this table) is a separate decision, deliberately left to CEO/founder rather than decided here.

## 4. Documented, not fixed: a university's own `last_checked_at` lags its children's data

Live, all 12 sampled institutions:

```
                                university.last_checked_at    latest requirement.retrieved_at
Carnegie Mellon                 2026-08-17                    2026-08-21
Stanford                        2026-08-17                    2026-08-21
Yale                            2026-08-20                    2026-08-21
LSE                             2026-08-17                    2026-08-31
Amsterdam                       2026-08-20                    2026-09-01
Erasmus Rotterdam               2026-08-17                    2026-09-01
Oxford                          2026-08-20                    2026-09-03
Warwick                         2026-08-16                    2026-09-03
Boğaziçi                        2026-08-17                    2026-09-03
Bocconi                         2026-08-17                    2026-09-03
Caltech                         2026-08-20                    2026-09-03
MIT                             2026-08-17                    2026-09-03
```

Every single one of the 12: the university-level "when did we last check this institution"
timestamp predates the most recent research actually done on it, by anywhere from 1 to 18 days.
Requirement research clearly kept happening after each university row's own `last_checked_at`
was set — and nothing re-touched the parent row when it did. A surface that answers "how
current is Oxford's data" by reading `universities.last_checked_at` alone would report a date
that is, right now, provably wrong — up to two weeks staler than reality.

Not fixed here — noted per CEO's instruction ("Not düş") as a real product-correctness gap: the
answer to "when did we last look at this" is currently wrong for 12 of 12 sampled institutions,
not merely unmeasured.

## 5. Correction to #3: the staleness logic already exists — it has simply never run

Follow-up pass, same day. #3 above characterized `university_requirements.data_status` as a
column nobody computes. That was incomplete. `lib/jobs/detect-stale-data.ts` (Phase 30 Job E)
already contains the exact fix CEO asked whether was possible: `detectStaleUniversityRequirements`
recomputes `data_status` from `last_checked_at ?? retrieved_at ?? created_at` against a
**60-day** threshold (`UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS`) — deliberately shorter than
`universities`' own 90-day threshold and longer than `university_deadlines`' 30-day one, with
the reasoning already written into the file: an admissions requirement changes more often than
an institution's name/country/type, and a deadline goes stale faster still. This is precisely
Phase 29's own "set reasonable refresh intervals by information type" instruction, already
implemented, per-table, correctly differentiated. Nothing new needed to be written for this.

Two separate reasons the live data still shows 1550/1550 `fresh`, both measured directly rather
than assumed:

1. **The job has never actually executed.** `external_sync_jobs` has zero rows for
   `job_name = 'detect_stale_data'`, even though the route (`app/api/jobs/detect-stale-data/
   route.ts`) is real, registered in `lib/jobs/schedule.ts`'s `JOB_DEFINITIONS`, and present in
   `vercel.json`'s cron list (`0 10 * * *`). Fully built and wired, never triggered — this is the
   line for the founder's own cron-enabling checklist: **turning the cron on is what starts this
   job running for the first time ever**, not re-enabling something that already ran.
2. **Even if it had run every day since the data was created, today's result would be
   identical.** The oldest `university_requirements` row's age reference is 20 days
   (2026-08-16). Measured directly against every threshold from 30 to 365 days: **0 rows would
   show `stale` under any of them.** The corpus is simply too young for this column to have had
   anything to differentiate yet, independent of whether the job runs.

Practical consequence for CEO's follow-up question (should a `stale` requirement look different
to the student, now that `checkedAt` is visible per item #1): building that today would be
invisible on every current row, for a benign reason (nothing has aged past any candidate
threshold) rather than a broken one. The mechanism is sound and will start producing a real
signal on its own, without further code, once (a) the cron actually fires and (b) real time
passes. No code changed for this correction either — same read-only, no-live-write pass as
#2/#3/#4.

## Verification

tsc/eslint clean. Full suite passed with 0 regressions (exact numbers in the commit message for
item #1's code change). #2/#3/#4/#5 are read-only findings — no code changed for them, no live
writes made anywhere in this pass, per standing rule.
