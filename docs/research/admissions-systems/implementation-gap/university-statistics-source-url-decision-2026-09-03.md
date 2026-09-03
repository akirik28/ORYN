# Decision item: `university_statistics` has no `source_url` column

**Not a rendering fix — a migration, and a founder decision.** Written 2026-09-03, the second
finding from [`source-traceability-audit-2026-09-03.md`](./source-traceability-audit-2026-09-03.md).
The first finding (the tuition figure's already-populated `source_url` never being rendered) was
a contained code fix and has been built (`oryn/tuition-source-url-fix-2026-09-03`). This one is
not contained: there is no column to read from, so nothing can be wired without first deciding
whether to add one.

## The current state, precisely

`admission rate`, `SAT/ACT range`, and `graduation rate` — the three most decision-relevant
numbers on the university detail page — all come from one `university_statistics` row.
`UniversityStatistic` (`types/database.ts:1247-1271`) has:

```ts
source: string | null;        // a plain name, e.g. "College Scorecard"
data_confidence: DataConfidence;
retrieved_at: string | null;
```

**No `source_url` column exists.** The page's own `SourceBadge` for this row
(`app/(app)/universities/[id]/page.tsx:602-612`) already passes everything the schema has —
`sourceName`, `checkedAt`, `confidence` — and correctly omits `url`, because there is nothing to
pass. A student sees "Source: College Scorecard" with no way to click through and verify the
number next to it, for exactly the numbers most likely to inform a real decision. This is not a
missing wire (compare the tuition fix, where the wire existed and simply wasn't connected) — the
column itself does not exist.

## What produces this data today, and why a stable citation looks realistic

`lib/universities/sync-us-universities.ts` (name inferred from its own header comment, cited in
`page.tsx`'s existing tuition-qualifier comment — not independently re-read line-by-line for this
doc) is the US acquisition pipeline this table is populated from, and `stats.source` values on
file are consistent with the College Scorecard API (the U.S. Department of Education's own
dataset — AGENTS.md §7 names it as ORYN's primary source for US institution statistics). College
Scorecard publishes a stable, institution-keyed public web presence
(`collegescorecard.ed.gov/school/?<unit-id>`) that could plausibly serve as a real, reachable
citation for exactly the three fields this table backs — not independently verified against a
live College Scorecard page for a specific ORYN institution this pass, so offered as a plausible
backfill path, not a confirmed one.

## What this would cost

A real fix has two parts, not one:

1. **Schema**: add `source_url: string | null` to `university_statistics` (a migration,
   `types/database.ts` update, and — this codebase's own established discipline all session —
   left unapplied for founder review, never applied unilaterally).
2. **Data**: existing rows would need the column populated, either by construction (if the
   acquisition pipeline can derive a College-Scorecard-style URL from data it already holds, e.g.
   an institution's own IPEDS/OPEID identifier) or by a backfill pass — a data task, not a code
   task, and one whose size depends on how many of the presumably 129 US rows on file (the
   figure `page.tsx`'s own existing comment cites for `source` coverage) can be derived
   mechanically versus need individual research.

Neither part was attempted here — this is a decision write-up, not a build, per the "measure
first" discipline this line of research has followed all session.

## The honest interim, if the column isn't prioritized soon

Right now the page states a source name with no way to reach it, without saying so — a citation
that reads as complete but isn't reachable. Two honest alternatives exist without touching the
schema at all: (a) add a short qualifier to the existing badge's text — something like "not
independently linkable" — so the page stops implying a click-through exists where none does, or
(b) leave the current text as-is, on the reasoning that a named, unlinked source is still more
informative than no source at all and the badge's own "Source:" label doesn't itself claim a link
exists (`SourceBadge`'s `url` prop is already optional, and a name-only citation is the same
honest form this session's own admission-mechanism fix already uses for
`docs/research/admissions-systems/*.md` paths — which also can't be a public URL). Which of these
two — or the schema fix itself — is the right call is exactly the kind of decision AGENTS.md
Non-Negotiable #6 ("university requirements and deadlines must have traceable sources") puts in
the founder's hands, not something to default on unilaterally.

## Sources

- Direct reading of `types/database.ts:1247-1271` (`UniversityStatistic`) and
  `app/(app)/universities/[id]/page.tsx`'s existing `SourceBadge` call for this row.
- AGENTS.md §7 (College Scorecard as the named primary US-institution-statistics source) and
  Non-Negotiable #6 (traceable sources for high-impact facts) — cited for the standard this gap
  is measured against, not re-verified against the live document this pass.

## Unresolved questions

Whether `stats.source` values on file are consistently College Scorecard (this pass inferred it
from the existing tuition-qualifier comment's citation of the US acquisition pipeline, not from
a live query of every distinct `source` value on file). Whether a stable, institution-keyed
College Scorecard URL can be constructed from data ORYN already holds (an IPEDS/OPEID identifier)
without a fresh lookup per institution. The actual size of the backfill task for existing rows —
not measured this pass, since the answer depends on the previous question.
