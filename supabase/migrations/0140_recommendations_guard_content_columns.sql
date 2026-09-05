-- Migration number 0140, assigned by CEO (2026-09-05) after checking every remote branch
-- (0140/0141/0142 all free at assignment time).
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §4: recommendations.body/author_id/
-- relationship are unguarded -- the RLS policy "recipient toggles visibility" (migration 0035)
-- is `for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid())`, no
-- column scope. The app's own write (app/(app)/u/[id]/recommendation-actions.ts,
-- setRecommendationVisibility) only ever sends {status} -- but nothing in RLS/GRANT stops a
-- direct REST PATCH from the recipient's own session appending body/author_id/relationship to
-- that same statement, rewriting what a recommender is credited with having said or reassigning
-- authorship entirely. Reputationally the most serious of the sweep's "content smuggling" class
-- -- this is the one table where the row's real content is unambiguously a THIRD PARTY's words
-- (the author), not the person the UPDATE policy is scoped to (the recipient). Same class as
-- the target_universities finding (0136) -- misleading a third-party reader -- a parent there,
-- the recommender's own credited words here.
--
-- CHECKED, NOT ASSUMED, BEFORE DESIGNING THIS AS "THE SAME SHAPE AS 0138/0139": is there any
-- legitimate author-side edit path for body/relationship (e.g. fixing a typo)? Read migration
-- 0035's full policy set and every Server Action in recommendation-actions.ts -- INSERT sets
-- these columns once (writeRecommendation), UPDATE sends only {status}, DELETE is the author's
-- only other option. No "author edits own recommendation" policy or action exists anywhere.
-- Grepped every file referencing `recommendations` (lib/admin/queries.ts, lib/social/
-- recommendations-query.ts, app/api/export-data/route.ts, lib/export/tables.ts) for
-- .update(/.insert(/.delete( -- zero matches outside the three Server Actions above. So unlike
-- §1/§2, there is no existing UPDATE writer of these three columns to preserve at all -- the
-- guard blocks them unconditionally, the same "cheap" shape as §6/§7, just three columns
-- instead of one or two, not a structurally different design.
--
-- MECHANISM: identical to every guard since 0062/0063/0121/0122/0136/0137/0138/0139 -- reset to
-- OLD on a non-service-role UPDATE, pg_trigger_depth() <= 1 (direct top-level update only),
-- search_path pinned empty. Column-scoped (`update of body, author_id, relationship`) so the
-- real visibility-toggle UPDATE ({status} alone) never even fires this trigger.
--
-- NO PAIRED CODE CHANGE NEEDED: the one legitimate writer of {status}
-- (recommendation-actions.ts's setRecommendationVisibility) uses the caller's own
-- createClient() (RLS-scoped) session -- confirmed by reading the file, no admin/service-role
-- client involved anywhere in this table's write path. RLS therefore stays fully in force for
-- the real write; there is no RLS-bypass ownership question the way §1/§2 raised.
--
-- WHY GUARD COLUMNS NO CODE TODAY UPDATES, RATHER THAN SKIP THIS -- same reasoning as 0138/0139:
-- the guard's value isn't that the current code happens to leave body/author_id/relationship
-- alone, it's that it holds unconditionally regardless of which code path produces the UPDATE.
-- If a future writer (an author-edit feature, an admin redaction tool responding to a report)
-- ever touched these columns from a non-service-role session, this trigger would still fire and
-- still reset them. Column-scoping to exactly these three is what makes this defense-in-depth
-- rather than a description of today's behavior.
--
-- PROOF: docs/recommendations-guard-proof-2026-09-05.md -- a same-statement attack (the
-- legitimate {status} field alongside the smuggled {body, author_id, relationship} fields)
-- reproduced vulnerable pre-guard; confirmed blocked post-guard while status still updates in
-- the SAME statement; and confirmed capable of failing (dropped the trigger, re-ran, it
-- succeeded again).

create or replace function public.recommendations_guard_content_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.body := old.body;
    new.author_id := old.author_id;
    new.relationship := old.relationship;
  end if;
  return new;
end;
$$;

drop trigger if exists recommendations_00_guard_content_columns on public.recommendations;
create trigger recommendations_00_guard_content_columns
  before update of body, author_id, relationship on public.recommendations
  for each row execute function public.recommendations_guard_content_columns();

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply. Do not run against the
-- live project from here.
