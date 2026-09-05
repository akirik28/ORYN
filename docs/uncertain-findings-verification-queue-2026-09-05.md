# The 93 UNCERTAIN findings — verification queue for a live DB pass

CEO offered to run these directly (Supabase read tool loaded). Grouped by the SINGLE query that
can resolve several findings at once, per CEO's own "toplu sorgularla çıkarır" plan. Every group
names the exact table/column/row and the pass/fail read.

## Group A — one query resolves 14+ findings: which migrations are actually applied?

```sql
select version from supabase_migrations.schema_migrations
where version in (
  '0029','0058','0069','0072','0080','0093','0094','0095','0096','0097','0098','0099',
  '0100','0101','0102','0103','0104','0105','0106','0108','0109','0112','0121','0123'
)
order by version;
```
Resolves: migration-transition-audit's 14-migration block (0093-0106); `ai_model_pricing`
(0100)/`weekly_plan_budget_settings` (0102); `story_notes` (0029); 9 `_backup_*` drop (0069);
deadline change-detection (0080); admin dead-feature-flags (0101, already suspected applied);
`payment_events` (0123, code confirms the interface exists — does the table?).

## Group B — staged-SQL-applied questions, one COUNT per row-id list

```sql
-- Austria/Finland/Germany/Ireland sector fills (already re-confirmed unchanged tonight, low
-- priority to re-run, included for completeness):
select country, count(*) from universities where country in ('Austria','Finland','Germany','Ireland') group by country;

-- QS top-100 fill (already re-confirmed 0 tonight via a separate check, skip unless you want a
-- third confirmation)

-- Netherlands HBO (36 rows) / WO gaps (2 rows) — staged file: data/research/sql-dry-runs/universities/netherlands-*-2026-09-03.sql
select count(*) from universities where country = 'Netherlands';

-- Caltech's 37-row reconciled requirements batch
select count(*) from university_requirements where university_id = (select id from universities where name ilike '%California Institute of Technology%' limit 1);

-- Duplicate canonical university entities (live-db-reconciliation.md's "43 duplicates, 78
-- zero-evidence official_verified")
select count(*) from entity_verification_queue where entity_type = 'university' and status = 'pending_review';
select count(*) from canonical_entities where entity_type = 'university' and verification_state = 'official_verified'
  and id not in (select distinct entity_id from entity_evidence);
```

## Group C — small, one-off row checks

- `docs/opportunity-catalog-closeout-2026-09-02.md`: 3 "bad source data" rows + Google CS
  Institute row — are they `status='disabled'` yet? (ids in that doc)
- `docs/opportunity-category-audit-2026-09-03.md` / `-balance-2026-09-03.md`: were the 2-record
  category-relabel/balance jsonl batches ever ingested? `select id, category from opportunities where title ilike '%CS50x%' or title ilike '%Zooniverse%' or title ilike '%Breakthrough Junior Challenge%';`
- `docs/opportunity-deadline-coverage-measurement-2026-09-03.md`: `select count(*) from opportunities where status='active' and deadline is not null and deadline < current_date;` (the "40/77 past-due, uncleaned" addendum)
- `docs/null-organization-dedup-defect-2026-09-02.md`: `select count(*) from opportunities where organization is null;` (was it 197-109=88 after the backfill, or still ~197?)
- `docs/rerun-safety-audit-2026-09-04.md`: `select ultra_gift_granted_at from profiles limit 5;` — does the column exist at all yet?
- `docs/rename-db-render-check-2026-09-04.md`: `select count(*) from student_requirement_evaluations where reasoning ilike '%Proxola''ın%';` (the 10-row bad-Turkish-grammar batch — already found 0 for one variant tonight, worth a final confirm)
- `docs/opportunity-hidden-live-records-measurement-2026-09-03.md`: the 3 solid + 5 uncertain named rows' current `cycle_status` — ids are in that doc.

## Group D — account-state facts only a founder-authorized read can settle

- `docs/admin-access-and-0062-divergence-2026-09-02.md`: `select is_admin from profiles where id = <founder's real user id>;` (email `akirik28@my.uaa.k12.tr` per prior sessions' own finding — confirm this is still the right id before running)
- `docs/age-gate-mechanism-verification-2026-09-02.md`: `select birth_year from profiles where id = <same founder id>;`

## Group E — needs a real triggered event, not a read (flagging, not a query)

Not resolvable by any SELECT: `advisor_chat` conciseness after 3 prompt-tuning rounds (needs a
fresh eval run); the reflection→next-plan loop closing with genuinely-timed data (needs a real
plan-generation event); a live keyboard pass for dialog focus-trap/`aria-modal`; parent-
commentary's over-claim criterion against real model output (needs a real, costly AI call).

## Group F — everything else (lower-value singletons, batch only if time allows)

`admin-panel`'s "last 500 calls" aggregation design question · `ActionStatus`'s latent
expired-vs-progress conflict (code-only, not a DB question) · `auth_rls_initplan` performance
pattern (needs an `EXPLAIN`, not a value read) · 6 QA-scratch rows with stale bogus outlook
(`docs/admission-outlook-fix-2026-09-01.md` names them) · hardcoded-color sweep's smaller UI
items (not a DB question) · `MonthlyUsageMeter`'s color thresholds (code-only) · the ~57
branch-specific findings from `docs/unmerged-branch-audit-2026-09-02.md` (each needs its own
`git log`/live check, likely deserves a dedicated pass rather than folding into this queue).

Full source-doc citations for every one of these are in `docs/still-open-findings-2026-09-05.md`'s
own "Uncertain" section if a query result needs the original finding's full context before acting.
