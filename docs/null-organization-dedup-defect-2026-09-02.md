# Nearly half the catalogue can't be deduplicated against — diagnosis and fix

Follow-on to [[opportunity-research-staging-2026-09-02.md]]: that task found 197 of 421 live
`opportunities` rows (47%) have `organization: null`, and `lib/opportunities/dedup.ts`'s rule
requires organization **and** title similarity to match — so any candidate whose title alone
matches one of those 197 rows currently passes dedup as "new" regardless. Assigned: establish
how the 197 got there, decide between loosening dedup or backfilling organization, and land a
fix. **No writes.** The code fix below is a real, gate-checked commit; the backfill is staged
SQL, not run.

## How the 197 got there — a bulk import, not a live code path

```sql
select date_trunc('day', created_at), count(*) from opportunities
where organization is null group by 1 order by 1;
-- 2026-08-18: 196
-- 2026-08-23: 1
```

**196 of 197 (99.5%) share one exact `source` string** — *"Founder school-counselor Drive
corpus, cross-checked against official/provider pages 2026-08-15"* — and were inserted within a
90-second window (`23:56:41` to `23:58:11` on 2026-08-18). One bulk-loading script, one run, not
an ongoing pattern from that path.

**This could not have come through `decideIngestion()`** (`lib/opportunities/ingest.ts`) — its
very first check is `if (!record.title?.trim() || !record.organization?.trim() ||
!record.official_url?.trim()) return { outcome: "rejected", ... }`. Every one of the 196 rows
would have been rejected outright by the function that governs the batch-research ingest path
today. They were written by something else — a direct import script or SQL insert against the
founder's own Drive-corpus document, predating (or bypassing) that guard.

**The 1 outlier** (`source: "official_primary"`, 2026-08-23) is a single row and not investigated
further here — one anomaly from a different date doesn't change the diagnosis or the fix, and
chasing it wouldn't change either.

## Does a backfill hold? Checked per-row, not assumed

Cross-referenced all 197 null-organization rows' `official_url`/`source_url` against **every**
`organization`/`organizer` field already committed anywhere in `data/research/opportunities/`
(3,106 jsonl lines across 190 files — the full corpus, not just files dated 2026-08-18):

- **109 of 197 (55%) have a real, already-committed organization value**, sitting in a jsonl
  file the Drive-corpus import never read from (mostly the later `s5a_batch*` opportunity-
  research files, since those research passes independently re-verified many of the same
  programs and correctly captured the organizer). Checked for conflicting values across sources
  before trusting this: 6 of the 109 have more than one phrasing on file for the same URL (e.g.
  "Boğaziçi University Lifelong Learning Center (BÜYEM)" vs the Turkish original) — every one of
  the 6 is the same real organization under a different translation or suffix, not a genuine
  disagreement, so none were excluded.
- **88 of 197 (45%) have no organization anywhere in the committed corpus.** Characterized rather
  than left as one bucket: **9 of the 88 show real signs of bad source data** — an `official_url`
  pointing at a PDF or CV rather than a program page, or a "title" that's actually a course code
  (`ECON 1 - 01 Introductory Microeconomics...`) or a webinar time string (*"Time: 4:30pm –
  5:30pm (Hong Kong time)..."*, filed as a title). The remaining **79 look like legitimate
  program names** — Duke TIP, Girls Who Code, Fordham, Purdue's summer courses — that simply
  need new research to identify an organizer, not a git-only fix.

**Answer to "would a backfill hold": partially, and precisely quantified rather than guessed.**
109 rows can be fixed today from data already in the repository, at zero research cost and zero
risk of inventing a fact. The other 88 cannot — 9 of those are arguably not clean opportunity
records at all regardless of the organization question, and the remaining 79 are a real research
backlog, not a code or data-entry fix.

## The fix: close the code gap, don't loosen the dedup rule

**Not loosening `isDuplicateOpportunity()` to fall back on title-only similarity when
organization is null.** The corpus's own [[opportunity-research-staging-2026-09-02.md]] found 7
candidates clustered around generic titles ("Journal of Student Research," "Journal of High
School Science," "National High School Journal of Science") that are plausibly several distinct
real publications, not one program under different names. A title-only fallback would be exactly
the mechanism that merges two of those into one — **and a false duplicate is worse than a false
new row**: a wrongly-new row shows up twice and looks sloppy; a wrongly-merged duplicate silently
discards a real, distinct opportunity a student could have applied to, with nothing in the UI to
reveal the loss. Tuning dedup toward more false-merges to clean up a bounded historical import is
trading a visible, correctable problem for an invisible, uncorrectable one.

**Instead: stop the pipeline that can still produce more of these.**
`lib/opportunities/discover.ts`'s `discoverOpportunitiesForQuery` — the live AI-discovery
pipeline, scheduled daily via the `discover-opportunities` cron, per the prior audit **never yet
run in production** — had no organization guard at all. Unlike `decideIngestion()`, it builds
its insert row directly from the AI-extracted `candidate.organization`
(`OpportunityCandidateSchema`'s `organization: z.string().nullable()` — correctly nullable at
extraction, since the AI genuinely can't always find an organizer on a page, and inventing one
would violate this codebase's own no-fabrication rule) with **no check before writing it**. The
day this job actually runs, it can both (a) fail to dedupe against the 197 already-null rows, and
(b) mint new null-organization rows of its own from AI extractions that come back without an
identifiable organizer — the exact compounding risk named going into this task, now confirmed at
the code rather than assumed.

**Fix applied**: `lib/opportunities/discover.ts` now skips (rather than stores) any candidate
missing organization, mirroring `decideIngestion()`'s own requirement exactly — same field, same
non-empty check, same reasoning, now enforced on both ingest paths instead of one.
`DiscoveryRunResult` gained `skippedMissingOrganization: number` so a skip is visible in the job's
own return value rather than silently dropped (this codebase's established convention — see
`stoppedForBudget` on the same type). Four new tests in
`__tests__/opportunities/discover-organization-guard.test.ts`, verified against pre-fix code via
`git stash`: all 4 genuinely fail without the fix (one asserts zero inserts and gets one; one
asserts a defined skip count and gets `undefined`; one asserts a real-organization candidate
still inserts, confirming the guard doesn't touch the happy path; one asserts a mixed batch skips
exactly the missing-organization candidates without halting the rest of the run, unlike a budget
stop) — restored and passing after `git stash pop`. The 4 pre-existing budget tests in the same
directory (`discover-budget.test.ts`) are unaffected — their candidates all carry a real
organization already, so the new guard never triggers for them.

## What's staged, not applied

`data/research/opportunities/organization_backfill_2026-09-02.sql` — 109 `UPDATE
opportunities SET organization = '...' WHERE id = '...'` statements, one per recoverable row,
each commented with the exact source file the organization value came from for review. **Not
run.** No database was written to at any point in this task — every Supabase call was a
read-only `SELECT`.

## Recommendation

1. **Land the code fix** (already built, tested, gate-checked below) — this is the part that
   actually stops the defect from growing, independent of anything else here.
2. **Backfill the 109**, at the founder's discretion — same "staged, founder decides" gate as the
   97 candidates from the prior task. Zero new research, zero fabrication risk; the SQL is ready.
3. **The 88 that can't be backfilled from committed data are a separate, smaller finding**: 9 are
   plausibly not real opportunity records regardless of organization (bad source URL or a
   non-title string standing in for a title) and worth a disable-or-review pass on their own
   merits; the other 79 are a genuine research backlog, not something this task's method can
   close.
4. **Do not loosen the dedup rule's organization requirement.** If the null-organization count
   ever needs to shrink further after the backfill, the lower-risk lever is more backfill
   research on the 79, not a fuzzier match rule — for the reason stated above: false merges are
   the failure mode this product cannot detect or recover from once it happens.

## What this did not do

No live AI calls. No re-research of the 79 unbackfillable-but-legitimate rows. No individual
review of the 9 suspected-bad-source rows beyond flagging them — disabling or correcting them is
a data decision, not a code fix, and out of this task's scope. No change to
`lib/opportunities/ingest.ts` (`decideIngestion()` already had the correct guard; only
`discover.ts` was missing it). No backfill applied — the SQL is staged for review, same as the
prior task's candidate batch.
