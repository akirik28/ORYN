# Dry-run ingestion staging — night1 batch (51 records)

Requested by the ORYN multi-agent coordination session, 2026-08-21 ~10:55 local. Ran this
session's 51 records through the **real** `decideIngestion()` from `lib/opportunities/ingest.ts`
(not reimplemented), via a temporary script (`_dry_run_ingest.ts`, deleted before this commit,
not part of the repo). `existing` dedup pool = a **fresh** live `opportunities` read (369 rows,
re-queried immediately before this run, not the earlier scratch snapshot) **plus** the sibling
`programs-pipeline-reconciled` lane's 10 pending `wave4`/`wave5` records (not yet live, read via
`git show origin/oryn/programs-pipeline-reconciled:<path>` — read-only, no checkout), per the
coordination session's explicit instruction to include them in the pool.

**No production writes.** This is classification + a generated SQL file only; the SQL was never
executed (see `night1_2026-08-21_dry-run-insert.sql`, wrapped in `BEGIN`/`ROLLBACK`).

## Classification counts

| Classification | Count |
|---|---|
| READY_TO_INSERT | 48 |
| DUPLICATE_OF_EXISTING | 1 |
| NEEDS_REVIEW | 2 |
| DROP | 0 |
| **Total** | **51** |

Of the 48 `READY_TO_INSERT` (i.e. `decideIngestion()` itself accepts them), a **second-layer
schema check this dry run also ran** found **23 insert cleanly as-is** and **25 will hard-fail
at actual execution** — see "New finding" below. `decideIngestion()` doesn't validate `cost`'s
type, so it doesn't catch this; the dry run's own SQL generation step did.

## DUPLICATE_OF_EXISTING (1)

- **NIGHT1-SELF-03** ("Hack Club: Stardance") matches **NIGHT1-SELF-02** ("Hack Club") — both
  carry the identical `official_url` (`https://hackclub.com/`, Stardance has no distinct page),
  so the dedup rule's exact-URL match fires between my own two records. This was a genuine
  judgment call at research time (I treated "join the ongoing community" and "this specific
  time-boxed build event" as conceptually distinct) that the automated rule correctly doesn't
  honor without a distinct URL. **Recommend**: keep NIGHT1-SELF-02 (the umbrella org, evergreen),
  drop NIGHT1-SELF-03 (the time-boxed Stardance event) rather than insert both — it was already
  flagged in NIGHT1-SELF-03's own `research_notes` as ending 2026-09-30 and needing refresh/
  retirement soon regardless.

## NEEDS_REVIEW (2) — both are `source_url`/`official_url` domain mismatches

`decideIngestion()`'s `sourceAuthority()` check requires `source_url` to resolve to the same
domain as `official_url`, or a recognized academic/government domain. Two records fail this:

- **NIGHT1-CAN-TR-EU-06** (Canada-Wide Science Fair): `official_url` = `youthscience.ca/cwsf/`,
  `source_url` = `cwsf-espc.ca/about/`. These are very likely the same real organization (Youth
  Science Canada operates the Canada-Wide Science Fair under a `cwsf-espc.ca` contest-specific
  domain) but the ingest gate has no registered-alias mechanism to know that automatically.
  **Recommend**: either register `cwsf-espc.ca` as a known alias domain for Youth Science Canada,
  or re-verify and cite a `youthscience.ca`-domain source page directly.
- **NIGHT1-SELF-01** (JSHS): `official_url` = `jshs.org`, `source_url` = `usaeop.com/program/
  jshs-2026-2/`. Already flagged transparently in this record's own `research_notes` at research
  time — `jshs.org` itself could not be directly fetched by the research tool (a tool-level
  domain-safety block, not a content problem), so verification relied on the Army Educational
  Outreach Program's own page instead. **Recommend**: a session with unblocked access to
  `jshs.org` re-fetches it directly, or a human confirms `usaeop.com` should count as an accepted
  government-program authority for DoD-sponsored programs like this one.

Neither is a fabrication risk — both are honest records where the *citation* domain doesn't
match the *program's own* domain, exactly the class of problem this gate exists to catch.

## New finding this dry run: `opportunities.cost` is `numeric`, but 25 of the 48 accepted records carry non-numeric cost text

Checked live schema directly (`information_schema.columns`): `cost` is `numeric`. Many
opportunities researched tonight have genuinely multi-tier, multi-currency, or conditional
pricing that cannot be losslessly reduced to one number without discarding real information —
e.g. NIGHT1-MEA-SASIA-06 (KAUST HSSP): `"SAR 35,000 (Oxford track) or SAR 40,000 (Cambridge
track), plus a SAR 200 non-refundable application fee"`; NIGHT1-CAN-TR-EU-01 (Shad Canada):
four different prices by format and domestic/international status. `decideIngestion()` itself
doesn't type-check `cost` (it passes the value through unchanged), so these 25 pass
classification but **would throw a Postgres type error if inserted as literally researched**.

**Not fixed here** — guessing a single representative number under deadline pressure would be
exactly the kind of data-quality compromise this campaign has spent all night avoiding. This is
a product/schema decision, not a research error:
- (a) widen `opportunities.cost` to `text` or `numeric` + a new `cost_notes text` column, or
- (b) keep `numeric` and have a human/AI pass extract one representative "starting from" figure
  per record, moving the full pricing detail into `description` or a notes field.

The 25 affected records (all in `data/research/opportunities/night1_2026-08-21_*.jsonl`, full
text there) are commented out in `night1_2026-08-21_dry-run-insert.sql` rather than inserted
with a guessed number, listed there with their exact `cost` string for whoever makes this call.

## The 23 that insert cleanly right now

All other required/enum validations pass (category, source authority, selectivity evidence,
verification-status wording) and `cost` is either `null` or already numeric. Full `INSERT`
statements in `night1_2026-08-21_dry-run-insert.sql` (`BEGIN`/`ROLLBACK`-wrapped, never
executed) — ready for the actual ingestion owner to review and run for real once satisfied.

## Cross-check against the sibling lane's 10 pending records

Included in the `existing` pool per instruction — **zero collisions** at the `decideIngestion()`
level either (confirms the earlier manual keyword-grep check: the two "hits" then were false
positives — "Toronto" as an interview city, "Princeton Review" as a test-prep brand, not real
program-name matches).
