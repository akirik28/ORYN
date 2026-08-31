# Schema hygiene audit — 2026-08-31

Evidence for `supabase/migrations/0069_drop_ad_hoc_backup_tables.sql`. Queried directly
against `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`) — the project the app's own
schema, data volume (1019 universities, 17045 programs, 421 opportunities, etc.) and
`list_migrations` ledger all confirm is the real working ORYN database, not a project
named literally "oryn"; the other two Supabase projects visible to this session
(`stem & buds`, `menter-chatbot`) are unrelated products and were not touched.

**Nothing in this document has been applied.** Read-only queries only
(`execute_sql`/`list_tables`/`get_advisors`/`list_migrations`) — no `apply_migration` call
was made. The migration itself is written, gated behind the standard four checks, and
pushed; applying it is explicitly left to whoever reviews this evidence.

## The nine `_backup_*` tables

None of the nine appear in any of the 68 migrations that predate this one — confirmed by
diffing every `create table public.*` statement across `supabase/migrations/*.sql`
against the live table list; the only other gap that diff found
(`requirement_source_conflicts`) turned out to be a grep-pattern miss, not a real one —
migration `0056` creates it schema-unqualified. Repo-wide grep for each of the nine table
names (code, scripts, tests, SQL) returns zero hits, except two docs that already flagged
this exact cleanup as outstanding: `docs/current-state.md` (2026-08-22) and
`docs/cleanup/ORYN-CLEANUP-REPORT-2026-08-29.md` (2026-08-29). All nine carry RLS-enabled/
zero-policy in Supabase's security advisors — meaning no PostgREST role can read them
regardless, so this was never an active data-exposure risk, just untracked residue that a
fresh production project would silently inherit.

For each: does its data still exist, recoverably, in the table it's a snapshot of? Method
was a full-column comparison by `id` against the live source table, not a spot check.

| Table | Rows | Source table | Every id still live? | Comparison result |
|---|---|---|---|---|
| `_backup_university_requirements_2026_08_21` | 84 | `university_requirements` | Yes, 84/84 | **Identical.** 0 of 84 rows differ across all 13 compared columns. |
| `_backup_university_deadlines_2026_08_21` | 26 | `university_deadlines` | Yes, 26/26 | **Identical.** 0 of 26 rows differ. |
| `_backup_eligible_countries_2026_08_21` | 10 | `opportunities` | Yes, 10/10 | Diverges (10/10) — see below. |
| `_backup_eligible_countries_2026_08_22b` | 3 | `opportunities` | Yes, 3/3 | Diverges (3/3) — same pattern as above. |
| `_backup_language_of_instruction_2026_08_21` | 353 | `university_programs` | Yes, 353/353 | Diverges (353/353) — see below. |
| `_backup_language_metu_2026_08_21` | 53 | `university_programs` | Yes, 53/53 | Diverges (53/53) — same pattern, METU subset. |
| `_backup_opportunity_fixes_2026_08_22` | 4 | `opportunities` | Yes, 4/4 | Diverges (4/4) — see below. |
| `_backup_edinburgh_osr_2026_08_22` | 1 | `university_requirements` | Yes, 1/1 | Diverges — see below (clearest case). |
| `_backup_yokatlas_confidence_2026_08_22` | 391 | `university_programs` | Yes, 391/391 | Diverges (391/391) — see below. |

**"Diverges" is not "would lose data if dropped."** In every one of the seven diverging
tables, the divergence is a specific, identifiable, already-completed correction, and the
*live* value is the better one:

- **`eligible_countries` × 2**: the backup holds a paragraph-length description crammed
  into the `eligible_countries` array field (e.g. `["Global — participating schools span
  countries as far apart as Norway, Australia, China and Ecuador"]`); live correctly holds
  that same sentence in the free-text `citizenship_restrictions` column instead, with
  `eligible_countries` properly emptied or holding actual country names. A field-shape fix,
  not data loss — same fact, correct column.
- **`language_of_instruction` × 2**: the backup holds a raw research-handoff annotation —
  `"Turkish (source page does not mark this specific program as English-medium; Hacettepe
  is known to offer English-medium tracks for some programs not distinguished here)"`; live
  holds the same underlying fact, normalized to `"Turkish"`. Every one of a random 10-row
  sample followed this exact pattern: same fact, prose stripped.
- **`opportunity_fixes`**: deadlines and `cycle_status` corrected since the backup — e.g.
  one row's status advanced from `"upcoming"` to `"closed"` as its actual cycle closed, a
  deadline moved from a past date to a real future one.
- **`edinburgh_osr`** (the clearest of all nine): live's own `requirement_detail` text
  *narrates its own repair* — `"...Restored 2026-08-22 after live verification found the
  corpus had dropped this sentence during a supersession rewrite"` — and now carries
  `evaluation_gate`/`excluded_provenances` values the backup never had at all. The backup
  is provably the pre-fix, buggy state; restoring it would silently reintroduce a bug the
  live row's own content documents fixing.
- **`yokatlas_confidence`**: every one of a random 8-row sample showed exactly one change —
  `data_confidence` recalibrated from `'high'` to `'medium'`, with `verification_state`,
  `source_type` and the source URL all unchanged. A deliberate, uniform, conservative
  recalibration (consistent with the product's own confidence-tiering rule — an unverified,
  non-program-specific URL shouldn't carry `'high'`), not corruption.

**Conclusion: all nine are safe to drop.** Every row's `id` still exists in its source
table today, with data that is either byte-identical or a confirmed improvement over what
the backup holds. `0069_drop_ad_hoc_backup_tables.sql` drops all nine; nothing was excluded.

## The rest of the public schema: other residue, named per your ask (not acted on)

- **`qs2027_import_staging`** (1000 rows) and **`global_university_discovery_queue`**
  (1000 rows) — both literally staging-shaped and named for a specific ranking cycle
  ("2027"), both flagged as such in their own context. **Different category from the nine
  above, deliberately not touched here**: both are created by tracked migrations and both
  have live code depending on them (`scripts/acquire-qs-institution-profile.ts`,
  `lib/acquisition/paginate.ts` for the first; three separate migrations reference the
  second, and `global_university_discovery_queue`'s own DB comment describes it as active,
  ongoing discovery infrastructure — "records must be independently verified against
  official QS before promotion to universities/university_rankings"). These look like
  intentional, still-in-use pipeline infrastructure for an ongoing QS Top1000 expansion,
  not abandoned residue — worth revisiting once that expansion is *complete*, not now.
- No other candidate matched "staging/scratch/temp/draft/old/dated" naming, and the
  rigorous check (every live table diffed against every migration's `create table`) found
  nothing else untracked beyond the nine above.

## One unrelated finding, flagged for completeness, not in scope here

The same table diff surfaced `posts`, `post_likes`, `post_revisions` — created by
migration `0058_social_posts.sql`, referenced by real application code (4 files), but
**absent from `oryn-qa-scratch` entirely.** This is the opposite problem from everything
above (a migration never applied, not leftover residue) — the same shape as the
already-known 0061-0067 lag this session's memory already tracks, for a different
migration. Not touched, not part of this migration, flagged only so it isn't rediscovered
cold later.
