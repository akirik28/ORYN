# Does every important claim on the university detail page cite a reachable source? — traceability audit

**Status: measurement only, nothing built beyond the one already-merged mechanism/sources fix.**
Written 2026-09-03, continuation of
[`surfacing-audit-2026-09-03.md`](./surfacing-audit-2026-09-03.md), which found the admission
registry's own research was computed and discarded on most branches — since fixed
(`oryn/admission-mechanism-surfacing-2026-09-03`, merged). This audit asks the next question:
across the whole page, not just the outlook panel, does every important claim (Phase 36: "high-
impact claim... a deadline, a requirement, an admission outlook input") show a source, and can a
student actually reach it. Checked against `origin/main` post-merge of the mechanism fix
(`053f52aa` on this branch, rebased clean, no drift) — re-verify line numbers if `main` has moved.

## Method

Walked `app/(app)/universities/[id]/page.tsx` top to bottom, claim by claim, and for each one that
cites a source, opened the component it renders through (`SourceBadge`, `RequirementGroup`,
`DeadlineGroup`) and the database type behind it (`types/database.ts`) to check three things
separately, per the two shapes flagged as the ones to be precise about: **is a source shown**,
**can the student actually reach it** (a real `url`, not just a name), and **does the source
shown actually correspond to the claim it sits next to**.

## What's genuinely correct — for calibration, this audit isn't only bad news

- **Requirements** (`features/universities/requirement-group.tsx:65-69`): each item with a
  `req.source_url` renders a real, clickable "Source" link, per-requirement, not shared.
- **Deadlines** (`page.tsx:881-885`, `DeadlineGroup`): identical pattern — per-item
  `d.source_url`, real link.
- **Programme official pages** (`page.tsx:617-627`): each programme with an
  `official_program_url` links directly to it — arguably stronger than a citation, since it's the
  primary page itself, not Oryn's summary of it.
- **Research strengths / OpenAlex** (`page.tsx:648-658`): `researchTopicsMetric.source_url`,
  correctly labeled "OpenAlex," real link.
- **General sources section** (`page.tsx:743-758`, the page's own footer): each
  `university_sources` row renders with its real `source_url`.
- **Admission-system mechanism** (this session's own fix): name-only citation
  ("Oryn's admissions-system research"), deliberately no `url` — `outlook.sources` holds
  repo-relative research-doc paths, not public URLs, so a name-only citation is the honest form,
  not a gap. Confirmed already correct, not re-litigated here.

Five of six checked surfaces cite properly, with real per-item links a student can actually
follow. The sixth is where this audit's finding is.

## The finding: the stat grid's single densest cluster of numeric claims has no reachable source at all

**Admission rate, SAT/ACT range, and graduation rate** — three of the five StatCards, arguably the
most decision-relevant numbers on the page — all come from one `university_statistics` row
(confirmed by the page's own comment, `page.tsx:585-587`: *"admission rate, test scores, and
graduation rate above all come from this one `university_statistics` row"*). The one `SourceBadge`
rendered for them (`page.tsx:594-604`) passes `sourceName={stats.source}` — a plain string like
"College Scorecard" — but **no `url` prop at all**. Checked the schema directly: `UniversityStatistic`
(`types/database.ts:1247-1271`) has a `source: string | null` column and **no `source_url` column
of any kind**. This is not a wiring bug — there is no field to wire. A student sees "Source:
College Scorecard" with no way to click through and check it, for exactly the numbers most likely
to inform a real decision.

## A second, related finding: a real source exists for tuition and is never shown

The **cost/tuition StatCard**, when populated from `university_profile_metrics` (the branch that
fires for the corridor's non-US universities, per this session's own earlier corridor-scope
research — the majority of the catalogue), draws its value from
`internationalTuitionMetric`/`domesticTuitionMetric` (`page.tsx:291-292`, via `metricByCode`).
That row's type, `UniversityProfileMetric` (`types/database.ts:1481-1501`), has a **required,
non-nullable `source_url: string`**, plus `verified_at` and `source_type` — a complete, always-
present source record. **None of it is ever rendered for the tuition card.** This is provably a
missing wire, not a schema gap, because the identical field on the identical table is already
correctly wired one section down: `researchTopicsMetric.source_url` (same
`university_profile_metrics` table) renders correctly for the "Research strengths" section
(`page.tsx:648-658`). The same fix that already exists for one metric_code on this table was not
applied to the metric_codes backing tuition (`tuition_international_annual`/
`tuition_domestic_annual`) or the QS size-band fallback (`qs_size_category`, used at
`page.tsx:518` when `university.student_size` is null) — both drawn from the same table, both
missing the same already-proven fix.

## The scope-ambiguity risk — the shape CEO named as worse than no badge

The one `SourceBadge` at `page.tsx:594-604` is placed directly beneath the **entire** five-card
stat grid, including the tuition card. Its own text never claims to cover tuition — the badge just
says "Source: [stats.source]" with no scope qualifier — but its **position**, sitting under all
five cards with nothing visually separating the tuition card from the three it actually covers,
invites a reasonable reader to assume it covers all five. It does not: per the code's own comment,
it covers only admission rate, test scores, and graduation rate. This is not the same failure as a
badge asserting a specific wrong source — nothing here names College Scorecard as the source *of*
the tuition figure — but it is the softer version of the same risk: a citation that reads as
broader than what it actually backs. Distinguishing this precisely from an outright mislabel
because the fix is different in kind: an outright mislabel needs correcting text; this needs either
a second, tuition-specific badge (closing finding two above would do this automatically) or a
visual separation making the existing badge's narrower scope legible.

## What was not found

No case of a `SourceBadge` or source link citing a source that actively contradicts or misrepresents
what produced the claim next to it — the risk CEO named as worse than no badge at all. Every source
that *is* shown correctly names what it's citing. The findings here are both under-citation (a real
source exists and isn't shown, or no source field exists to show) rather than mis-citation.

## What this document is not

Not a fix, per the "report before fixing anything beyond a contained mislabel" instruction — and
neither finding here is a contained mislabel. The tuition/QS-size-band gap is a real code change
(thread `source_url`/`verified_at` through two more StatCard branches, following the exact pattern
`researchTopicsMetric` already uses). The admission-rate/test-score/graduation-rate gap is a schema
question (whether `university_statistics` should grow a `source_url` column, and if so, whether
existing rows can be backfilled or only new ones would carry it) — sized differently and not a
rendering fix at all. Both named here for the founder/CEO to prioritize, not sized or built.

## Sources

- Direct reading of `app/(app)/universities/[id]/page.tsx`,
  `features/universities/requirement-group.tsx`, and the relevant interfaces in
  `types/database.ts` (`UniversityStatistic`, `UniversityProfileMetric`).
- No live database query run for this audit — the finding is about what the *code* renders and
  what the *schema* supports, not about which specific rows currently have `source_url` populated
  or null.

## Unresolved questions

Whether `university_statistics.source` values (currently free-text names like "College
Scorecard") could be mapped to a small set of known-provider URLs (e.g., a College-Scorecard-name
match resolving to the live NCES/CollegeScorecard.ed.gov search result for that institution)
without needing a schema change, versus whether a real `source_url` column populated at ingestion
time is the more honest fix — not decided here. Whether every `university_profile_metrics` row
actually has a populated `source_url` in practice (the column is `NOT NULL` in the type, but this
audit did not verify live data completeness the way earlier sessions this week measured
`university_statistics.source` coverage at 129/129).
