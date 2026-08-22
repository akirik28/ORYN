# RES-I2 lane close-out, 2026-08-22

Single-file resume point for the `opportunities*` ingestion territory — read this before
the four underlying reports (`i2_ecw2_ingest-report.md`, `i2_retire-nonopportunities_ingest-report.md`,
`i2_dlopp-guard-dryrun.md`, `i2_dlopp_ingest-report.md`), all on
`oryn/res-i2-opportunity-ingestion` (PR #22, open, not yet merged).

## 1. What is live because of this lane

**ECW2 batch** (`data/research/opportunities/ecw2_verified_apply_2026-08-22.sql`,
RES-V-R3W2-verified PASS 22/22):
- Türkiye Scholarships (`34033f8a-51e1-4c73-9b7e-2e3819a348dc`): `citizenship_restrictions`
  now discloses the Turkish-citizen exclusion its own official source states — closed a
  live trust defect (the row previously read only "Open to citizens of all countries.").
- TechGirls (`7081b03a-3e04-4843-8bc5-0078cfd040f2`): `eligible_countries` populated with
  the verified 37-country 2026 list.

**DLOPP batch** (`data/research/opportunities/i2_dlopp_apply_2026-08-22.sql`, 74 records,
RES-V1 + RES-V2 verified, RULE-INGEST-003 monotonicity-guarded): **82 fields written**
across `deadline` / `cycle_status` / `current_cycle_label`. Individually-ruled corrections
inside that batch:
- **SIP** (`7aa518f8-3ba5-4de9-b61c-7538fc41957b`): `cycle_status: upcoming → closed` —
  closed a live defect (program concluded 2026-08-08, still showing as upcoming).
- **Ron Brown Scholar Program** (`abe62a46-56f4-449a-b008-d072b1be5dc4`):
  `cycle_status → date_not_announced`, `deadline: 2026-12-01 → NULL` — the stored date
  was a projection no source ever published; cleared rather than left as false precision.
- **Conrad Challenge** (`1f7b2e52-1900-4953-8271-63224c9e1fc0`): `deadline: 2026-10-29 →
  2026-10-30` — a previously-unresolved off-by-one, confirmed by direct page grep.
- **Concord Review** (`93d45f34-4078-4d15-be6f-d6e157a21943`): `cycle_status: upcoming →
  open` (applied separately, after the main batch). Label deliberately **not** written —
  see §3.

**Invariants that held throughout, verified not assumed**: `opportunities` total row
count **391, unchanged** across every write in this lane. Deadline coverage moved
**56 → 60 (net +4)** — reconciles exactly to 22 deadline `SET` operations (5 populate,
1 approved erasure, 1 correction, 15 idempotent refreshes); full arithmetic in
`i2_dlopp_ingest-report.md`'s reconciliation section.

## 2. What is blocked, on whom, specifically

| Item | Blocked on | State |
|---|---|---|
| 6 non-opportunity rows (King's College London, USC, NYU, CMU, St. Andrews titled as opportunities; a UCSC course-catalogue entry) | Founder — DB-write classifier declined this specific action three times across two sessions today; correctly not worked around | SQL prepped, dry-run-confirmed, idempotent, ready as a single step: `data/research/opportunities/i2_retire_nonopportunities_2026-08-22.sql`, committed at `7a3e74a`. Rows unchanged (`status='active'`) in the meantime — that's the status quo, not a regression. |
| 34 held fields (mostly `cycle_status`, some paired `current_cycle_label`) | RES-V2 — currently on `url_repair` (1,429 rows) and Glasgow (62), not this queue | **Held-pending-source-verification** — populated-vs-different-populated, guard correctly cannot decide without evidence. Full per-record list in `i2_dlopp_ingest-report.md`. Not written, not skipped-and-forgotten. |
| 39 deferred `current_cycle_label` fields (records with no other field in dispute) | Nobody yet — a separate future pass, not V2's queue | **Deferred-by-policy**, not held-pending-verification — different reason, different follow-up. RULE-INGEST-004: free text has no defined "more informative" relation: the guard is correctly outside its domain here, not failing. Live values unchanged. |
| CyberPatriot (`4b9e2c29-c38d-479b-9987-c31501601950`) | Nobody — may never resolve | **Refused-inadmissible-source**, not held. Source domain (`uscyberpatriot.org`) serves `Disallow: /` for `User-agent: *` — a total crawler block (RULE-FETCH-005). RES-R2 has since opened a purge PR (#40) for the record itself, since its provenance was never permissible to fetch from. Live value stands absent a permissible source. |

## 3. The monotonicity guard as an artifact

`lib/opportunities/monotonic-guard.ts` (pure, unit-tested — `__tests__/opportunities/monotonic-guard.test.ts`,
19/19 passing). Implements **RULE-INGEST-003**: a write may populate an empty field,
replace a value with a more informative one backed by evidence, or correct a value the
evidence shows is wrong — never replace a populated field with a less informative one
because this pass couldn't determine it.

**What it covers**: enumerated vocabularies (`cycle_status` — exact-match only, never
coerces a near-miss string into a valid member) and null-vs-populated transitions on any
field, including an *approved erasure* path (clearing a populated field to null when an
explicit `ResolvedCorrection` says the evidence shows that value is fabricated — built
for Ron Brown, since the guard's original erasure branch defaulted to skip
unconditionally). A `placeholderLiveValues` option treats a sentinel like `cycle_status`'s
own `"unverified"` as equivalent to empty, not as a real fact — without it, populating a
first real status over "unverified" would incorrectly hold.

**What it explicitly does NOT cover, per RULE-INGEST-004**: free text
(`current_cycle_label`). "More informative" has no defined ordering for prose — two
independent research passes almost never produce byte-identical text for the same fact,
and running the guard over label text at scale produces a high hold rate **by design, not
by failure** (57 of 79 initial holds on the full 74-record batch were label-only). **Do
not read a wall of label holds as the guard broken or as 57 real defects** — it's the
guard correctly reporting "cannot decide" outside its domain. The one exception: a label
travels with an already-adjudicated `cycle_status`/`deadline` on the *same* record **only
when it restates the same fact** (Ron Brown, SIP — refined mid-session after Concord
Review's label turned out to name different months than its live value, a separate
unverified claim, not a restatement — see `i2_dlopp_ingest-report.md`'s "Findings and
rulings" section for the full reasoning). Whoever extends this guard to a new field
should decide up front which category (enumerated / null-transition / free-text) it
falls into rather than assume monotonicity is decidable everywhere.

## 4. Two tooling bugs, self-caught — so the next person doesn't rebuild them

Both are the **silent-success class**: the failure mode is a report that says everything
worked while nothing did.

1. **A dry-run check that only confirmed target rows still existed.** `SELECT COUNT(*)
   WHERE id IN (...)` after an UPDATE returns the row count regardless of whether any
   `WHERE`-guard actually matched — rows aren't deleted by an UPDATE, so this would
   report "51/51" even if all 51 guards had silently failed. Fixed by checking
   `last_verified_at` was actually bumped to the transaction's `now()` instead — a value
   only set on rows the guard actually matched.
2. **SQL guard predicates emitted as `field = null` for a currently-null live value.**
   In Postgres, `NULL` comparisons evaluate to `UNKNOWN`, never `TRUE` — `col = null` in a
   `WHERE` clause matches nothing, ever. Every write guarded on a null live value would
   have silently no-op'd while the apply itself reported success (no SQL error — the
   statement is syntactically valid, it just matches zero rows). Fixed by using `IS NULL`
   for null guards, `=` for non-null ones. Caught by reading the *generated* SQL before
   running it, not by trusting the generator.

Both were found before the live apply, not after — verification that can't distinguish
real success from silent no-op isn't verification. If this territory gets automated
further (a script wired into `package.json` rather than one-off drivers), both checks
belong in it as tests, not tribal knowledge.

## 5. Dedup baseline — the reference point for future comparisons

`npm run audit:opportunity-duplicates` has no local `SUPABASE_SECRET_KEY` to run
directly in this environment; reproduced via the same `findDuplicateCandidates` (
`lib/opportunities/duplicates.ts`, unmodified) fed a live snapshot pulled through the
Supabase MCP tool instead of the script's own `fetch()` — zero logic drift.

**Baseline, 2026-08-22 (pre- and post-DLOPP-ingestion, identical both times)**: 385 live
(non-disabled) opportunities scanned, **0 deterministic / 7 probable / 9 needs_review**.
Full pairs with ids in `i2_dlopp-guard-dryrun.md`. Confirmed the DLOPP batch introduced
**zero new duplicates** (expected — it never touches `title` or `official_url`, the only
fields the detector compares).

Diamond Challenge's absence from this scan is expected, not a miss — one side is already
`status='disabled'` from an earlier pass, and the detector correctly excludes disabled
rows by design.

## 6. RULE-DEDUP-002 — the worked case, for whoever resolves the next duplicate pair

While reconciling a false alarm about a "new" Conrad Challenge duplicate (it wasn't new —
`ac53340c-...`, a second Conrad Challenge row, has been `status='disabled'` since
2026-08-17, well before this lane touched anything), a real finding surfaced: **the
disabled row already held the correct `2026-10-30` deadline, while the surviving active
row (`1f7b2e52-...`) carried the wrong `2026-10-29`** — for five days, until this lane's
DLOPP correction fixed the active row independently of the duplicate question.

Whoever resolved that pair originally picked a survivor without comparing field values.
**RULE-DEDUP-002** (BASORG, 2026-08-22): when resolving a duplicate pair, the survivor
inherits the best-sourced field values — it does not simply win by surviving. Compare
fields before disabling, and record which values came from which row. The failure mode
this prevents is invisible by construction: the correct value sits on the row that gets
hidden.

BASORG is separately checking BUG-1's Diamond Challenge pair (`cb1ae3e2` disabled) against
this same rule — not this lane's action item, noted here only so the precedent travels
with the territory.

## Standing security note — inherits with this territory, not just this lane

`_backup_*` and staging tables that ingestion work leaves behind in `public` inherit a
project-level `anon` grant for `SELECT`/`UPDATE`/`DELETE`. Verified 2026-08-22: RLS is
enabled with **zero policies** on them, so access is currently denied — but the grant is
real and access-denial holds only *because* RLS is on. **Never disable RLS on one of
these tables, for any reason, including to inspect it** — query as a privileged role
instead.

## Status

Lane complete. Nothing further to do without one of: the founder's call on the 6
retirements, RES-V2 clearing its current package and picking up the 34 held fields, or a
new package assignment. Branch `oryn/res-i2-opportunity-ingestion`, PR #22 open, not yet
merged — worktree kept in place per standing instruction (remove only after merge).
