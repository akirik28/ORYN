# Does the university explorer keep its traceability promises? — 1 fixed, 2 flagged, 2 clean

**Read-only against live data throughout, except one self-created test account (signed up,
confirmed via a component-render test rather than a live email, then deleted — 0 rows
remain).** Scope: Phases 14/36/71 (source traceability), 29 (freshness), 34/37 (no invented
confidence), non-negotiable #5 (no false admission precision), against
`app/(app)/universities/[id]/page.tsx`, `app/(app)/universities/compare/page.tsx`, and the
explorer list.

## Live shape, verified directly

1,019 universities. 150 have programs, 111 have requirements, 105 have deadlines, 157 have
any row in `university_sources` (168 rows total) — so roughly 84% of universities have zero
rows in the dedicated sources table. Separately: 285 universities are `data_status: fresh`,
734 are `needs_review` (no `stale`/`unavailable` rows exist yet). All 1,325 requirement rows
read `data_status: fresh` — that field has apparently never been moved off its default by
any process, worth someone checking whether Job E's freshness sweep is supposed to reach this
table and doesn't, or was never scoped to. 129 `university_statistics` rows exist, all
`data_confidence: high`, all 129 carry a populated `source` text field, 127 carry
`admission_rate`.

## Fixed: admission rate, test scores, and graduation rate had no source, despite the row already having one

**This is the one that matters most** — it's the shape oryn-a7 named specifically. The detail
page's top stat grid (`StatCard`s for admission rate, test scores, graduation rate, and
`cost_of_attendance` when that branch is used) rendered a bare percentage with zero source,
zero confidence, and zero "checked" timestamp — the only facts on the entire page with no
traceability treatment at all. Every other fact on the page already had one: programs link to
`official_program_url`, requirements and deadlines show a "Source" link, research topics carry
a full `SourceBadge`, rankings link out, even the hero image credits its source.

This was not a missing-data problem. `university_statistics.source` is populated on all 129
rows on file (`"College Scorecard (US Dept. of Education, IPEDS-derived) — most recent
available cohort per institution, not a uniform year, UNITID 100663"`, e.g.), `data_confidence`
is set, `updated_at` is set — and the row was already being fetched with `select("*")`. The
badge component (`SourceBadge`, Phase 36) already exists, already handles a missing `url`
gracefully (this table has no `source_url` column, only a text description), and is already
used twice elsewhere on this exact page. The fix was wiring three already-populated columns
into a component call, not building anything new — one `SourceBadge` placed once beneath the
whole stat grid (they share one row, so one source, not four independent ones).

**Also closes the false-precision-by-juxtaposition risk directly**, without touching the
personalized outlook panel at all: the "Your outlook" section above (lines 341-444) already
carries its own careful, explicit "not a guarantee" hedge and — per its own comments — has
clearly already been audited hard against exactly this failure mode. What it sat next to,
a few sections down, was a bare, unlabeled "12%" that a student could easily read as
continuous with their personal estimate above it. It now reads "Source: College Scorecard...,
Checked 3 days ago, High confidence" — plainly a different kind of number, institutional and
general, not a personalized one.

Verified: real render test against the actual `SourceBadge` component with a real row's exact
shape (source text, confidence, timestamp, no url) — confirms the source name, confidence
label, and relative-checked-time all render, and no dead "View source" link appears when
there's no URL to link to. `tsc --noEmit` clean. Not covered by a committed test (matches this
file's existing precedent — the identical `researchTopics` `SourceBadge` usage a few lines
above has none either); the render check was scratch-only, run and deleted, not added to the
suite.

**Not fixed in the same pass, flagged instead:** the compare table
(`app/(app)/universities/compare/page.tsx`) shows the same `admission_rate` side-by-side across
2-4 universities with no source, no confidence, and no `SourceBadge` import at all — same root
cause, different page, and arguably sharper since a table position invites direct comparison
more than a single stat card does. Left this one for a follow-up rather than bundling: a
comparison table needs a placement decision (a badge per row? one shared footnote per
university column? underneath the whole table?) that's a real UI call, not a one-line wire-up
like the detail page's version was.

## Flagged, not fixed: tuition figures cite a `source_url` that's fetched but never shown

`university_profile_metrics` rows for `tuition_international_annual` /
`tuition_domestic_annual` carry `source_url` and `verified_at`, already fetched into
`internationalTuitionMetric` / `domesticTuitionMetric` on the detail page — never rendered.
Same shape of gap as the stats fix above, but not bundled into it: the tuition `StatCard`
already uses its one `caption` slot for `tuitionQualifier`'s precision note (a range vs. an
exact figure, an income-based caveat, etc.), and that note is itself load-bearing per this
file's own comments (a hard 2026-08-18 bug about silently applying one figure's qualifier to
the other). Fitting a second, different kind of thing — attribution — into an already-doing-a-
real-job caption risks the same class of silent mix-up. This one needs a placement decision
too (a compact inline link next to the qualifier text? a `SourceBadge` grouped separately from
`StatCard` entirely, the way research topics get their own section?), not a five-minute wire-up
like the stats badge was.

## Flagged, not fixed: 72% of universities are internally `needs_review`, invisible to a student

`universities.data_status` (Phase 29's own field) is written by admin tooling
(`requirement-actions.ts`) and never read anywhere in the student-facing UI — confirmed by
grep, zero hits. 734 of 1,019 universities carry it today. This is a genuine judgement call I'm
not making unilaterally: `needs_review` sounds like it should mean something to a reader, but
it may be describing an internal triage queue rather than "this specific fact is probably
wrong" — showing it verbatim risks manufacturing doubt about universities where every
individual displayed fact is actually fine (Phase 34 cuts both ways: don't invent a value, but
also don't invent a doubt). Whether and how to surface this — a row-level freshness note near
the header, folding it into a country-level "N added over time" style note like the explorer's
existing `uncoveredCountries` line, or leaving it purely internal — is a product call, not
mine to make by editing the page.

## Checked, clean: the two most dangerous failure modes weren't found

**No invented confidence.** Every `data_confidence` value on file, across `universities` and
`university_requirements`, is `high` or `medium` — never a value's absence disguised as
certainty, and nowhere does the code synthesize a confidence level instead of reading a stored
one.

**No fabricated numbers on empty pages.** Traced what a university with none of
programs/requirements/deadlines/stats renders: every section (`programsRes.data.length > 0 ? … :
null`, same pattern throughout) simply omits itself rather than rendering a fake or zeroed
value, and every `StatCard` explicitly falls back to a translated "Unavailable" string, never a
blank or a manufactured number. The explorer's own empty state (no results) has real, specific
copy (`noMatchFilters` / `dataAddedOverTime`) rather than a bare "No universities found," and
separately lists which countries aren't covered yet (`uncoveredNote`) instead of silently
omitting them.

**The personalized outlook panel itself is not the problem.** Its own comments show it has
already been fought over specifically for false-precision (the stale-badge-vs-fresh-range
scenario, explicitly named against non-negotiable #5, with fresh-computation deliberately
overriding the persisted row on every dimension shown). Did not re-litigate that panel's
internal correctness — the gap this pass found was entirely in what sits *next to* it, not
within it.

## Summary for the five things asked about

| Question | Answer |
|---|---|
| Does `SourceBadge` exist and appear where facts appear? | Existed, but had one real gap (stats) — now fixed. One more gap flagged (compare page), one more flagged (tuition). |
| Can a student view the source for an important claim? | Yes for programs/requirements/deadlines/rankings/research topics/hero image; now yes for admission/test/graduation stats too. |
| Is freshness visible? | Per-fact "Checked X ago" now covers stats too. Row-level `needs_review` (72% of universities) is not surfaced anywhere — flagged. |
| Is confidence ever invented? | No — checked live, never found. |
| Does anything imply an individual admission probability from a general rate? | Not by asserting it, but by proximity and missing labeling — now mitigated on the detail page; not yet on compare. |
