-- Captures three indexes that exist live on `oryn-qa-scratch` with no migration file
-- anywhere in this repo — found by docs/would-a-fresh-deploy-match-live-2026-09-02.md's
-- full replay-vs-live diff, the "live but not in migrations" direction of that check (as
-- dangerous as the reverse, per that package's own brief). Both tables are defined in
-- migration 0038; these three were added directly to live afterward, most plausibly by a
-- research/acquisition-pipeline session tuning queue-scan performance, without a migration
-- ever being written to capture the change.
--
-- Purely additive, performance-only DDL: no new table, no new column, no changed
-- constraint, nothing that could behave differently for a single row. `if not exists`
-- throughout so this is a genuine no-op wherever the index already exists (including, once
-- applied, on `oryn-qa-scratch` itself) and a genuine fix on a fresh deploy, which would
-- otherwise be missing all three and run these two tables' queue scans unindexed until
-- someone noticed.
--
-- Definitions taken directly from live via `pg_get_indexdef` — not reconstructed from the
-- tables' own migration-0038 column list — so this file is a transcript of what exists,
-- not a guess at what should.
--
-- WRITTEN BUT NOT APPLIED. Same founder-gated discipline every migration in this repo's
-- history follows — write and leave unapplied.

create index if not exists idx_global_university_discovery_order
  on public.global_university_discovery_queue (ranking_edition, discovery_order);

create index if not exists idx_global_university_discovery_queue_state
  on public.global_university_discovery_queue (ranking_edition, queue_state, rank_numeric);

create index if not exists idx_university_profile_queue_state_priority
  on public.university_profile_verification_queue (queue_state, priority);
