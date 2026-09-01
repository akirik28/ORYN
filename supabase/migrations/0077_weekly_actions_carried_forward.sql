-- NOT APPLIED. Founder-gated like every migration in this repo's history — write and leave
-- unapplied. CEO decision (docs/founder-blocked-backlog.md item 39, 2026-09-02, under the
-- founder's overnight product-authority grant): "Regenerate" used to hard-delete every
-- weekly_actions row for the plan, including completed ones and the reflections written
-- about them -- the act -> reflect -> advisor-adjusts loop AGENTS.md names as the product's
-- own center, destroyed by the exact click meant to feed it. Confirmed live before this was
-- decided: 4 completed actions across two accounts, zero reflections left in the table.
--
-- The fix (lib/plan/persist.ts) now deletes only rows the student never acted on
-- (not_started, in_progress) and leaves everything else untouched. This column exists
-- because "untouched" isn't the same as "indistinguishable from fresh": a completed action
-- that survives a regeneration and a completed action from the current, still-fresh batch
-- both read status = 'completed', but only one of them predates this regeneration. Without
-- this column a reader has no way to tell which is which short of comparing priority values
-- across two numbering systems that were never meant to be compared -- see the discussion in
-- lib/plan/persist.ts's own comment on the update-then-delete split.
alter table public.weekly_actions
  add column carried_forward boolean not null default false;

comment on column public.weekly_actions.carried_forward is
  'True when this row survived at least one "Regenerate" click after being completed (or, once skipped/expired are ever actually produced -- no code path sets them today -- those too). Set explicitly by lib/plan/persist.ts at the moment a regeneration chooses not to delete a row, not inferred from status: a completed action from the plan''s current, still-fresh batch and one carried through from a previous batch both read status = completed, and this column is what tells them apart without comparing priority numbers across two unrelated numbering passes. Always false on insert (the column default) -- a freshly generated action has never survived a regeneration by definition.';
