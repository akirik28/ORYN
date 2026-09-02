-- Aligns canonical_entity_merges.merged_by with the message_reports.reviewed_by
-- precedent: an old admin/operator action must not block that admin's own future
-- account deletion. docs/account-deletion-audit-2026-09-02.md found this live on
-- oryn-qa-scratch as ON DELETE NO ACTION -- not a decision anyone made, just what a
-- bare foreign key defaults to when nobody specifies a delete rule. NO ACTION would
-- have made admin.auth.admin.deleteUser() fail outright (safe -- a blocked deletion the
-- student sees as an error, not a silent corruption) the moment a real user id was ever
-- recorded here; all 37 existing rows are NULL today, so this has never actually fired,
-- but "inert because the feature happens not to populate this column yet" is an
-- accident, not a posture. This migration makes the posture explicit: SET NULL, so a
-- merge record survives (both entities and the merge itself stay auditable) but loses
-- its "who did this" attribution when that person's account is later deleted -- the
-- same tradeoff message_reports.reviewed_by already makes for the identical shape of
-- problem (migration 0065_close_insert_forgery_six_tables.sql).
--
-- A genuine, separate finding sits underneath this fix and is worth recording here
-- since no migration file mentions it anywhere else: this FK constraint exists live on
-- oryn-qa-scratch (confirmed via pg_constraint) but supabase/migrations/0038_canonical_
-- entity_registry.sql -- the only migration that ever mentions merged_by -- declares it
-- as a bare `merged_by uuid` with no `references` clause at all. No other migration
-- adds it either (grepped every file for "merged_by" and for "references auth.users").
-- The constraint was added directly against the live database, outside the migration
-- history, at some point after 0038 ran. A fresh install following only the tracked
-- migrations would therefore have merged_by as a completely unconstrained column today
-- -- not even the NO ACTION default this migration is replacing. Re-run safe by
-- construction (drop-if-exists, then add under the same name Postgres would have
-- auto-generated), this migration closes that tracking gap at the same time it fixes
-- the delete rule: after it runs, the migration history is the actual source of truth
-- for this FK for the first time, on every environment, not just the ones that already
-- had the untracked version.
alter table public.canonical_entity_merges
  drop constraint if exists canonical_entity_merges_merged_by_fkey;

alter table public.canonical_entity_merges
  add constraint canonical_entity_merges_merged_by_fkey
  foreign key (merged_by) references auth.users(id) on delete set null;
