-- Fixes a real INSERT-forgery gap found during BUG-1's RLS verification package
-- (2026-08-22, surfaces 3+4 -- sendMessage/block/report). Full evidence:
-- docs/research/verification/rls-live-verification-2026-08-22.md,
-- docs/research/verification/insert-forgery-inventory-2026-08-22.md.
--
-- THE GAP: `message_reports`' own INSERT policy (migration 0027) only ever checked
-- `reporter_id = auth.uid()` -- nothing tied `reported_user_id` to `message_id`'s actual
-- `sender_id`. Verified live against `oryn-qa-scratch`: QA account B filed a report on a
-- message genuinely sent by QA account A, but named an entirely unrelated user as
-- `reported_user_id`, and the row was accepted with no error. `reportMessage()`
-- (app/(app)/messages/actions.ts) never cross-checks this either -- it trusts the
-- client-supplied `reportedUserId` completely.
--
-- WHY THIS IS MORE THAN A DATA-QUALITY ISSUE (ORYN-CEO, raising this pass's own initial
-- "moderate" severity call): `message_reports` feeds the admin moderation queue
-- (app/(app)/admin/page.tsx), reviewed by an adult. A reviewer has no reason to suspect
-- the accused doesn't match the message shown -- the row presents as validated input,
-- not a claim requiring independent verification. On a product for 14-18-year-olds
-- (AGENTS.md Section 12), this means a student could currently get an innocent minor
-- named as the author of a message they never wrote, in a queue built to be acted on
-- quickly. Still not critical (needs a deliberate raw insert, not reachable through the
-- UI; still catchable by a reviewer who happens to check) -- but real, and the cleanest
-- instance of the INSERT-forgery class this pass found.
--
-- MECHANISM: DB-level `WITH CHECK`, not an app-layer check, for the same reason this
-- pass's own live testing already established for `messages`' own INSERT policy: a
-- Server Action is directly callable with any argument, so an app-layer check is a
-- friendly-error nicety, never the actual security boundary, in this codebase's own
-- established convention. `messages`' `"send message to accepted unblocked connection"`
-- policy already uses exactly this shape (a subquery cross-check inside WITH CHECK) --
-- this migration follows that precedent rather than inventing a new one.
--
-- A deliberate, correct side effect of a plain (non-security-definer) subquery here: the
-- subquery `select sender_id from messages where id = message_id` itself runs under the
-- caller's own RLS. `messages`' SELECT policy is sender_id/recipient_id = auth.uid(), so
-- a caller reporting a message they were never a party to (neither sender nor recipient)
-- gets zero rows back from the subquery, `reported_user_id = NULL` is never true, and the
-- insert is rejected too -- correctly: there is no legitimate reason to report a message
-- you cannot even see.
--
-- `message_id is null` is left unconstrained on purpose, not an oversight: the column is
-- nullable (`on delete set null`, migration 0027) so an existing report can survive its
-- referenced message being deleted, and reportMessage() today always supplies a real
-- message_id -- there is no current legitimate path that inserts a null-message_id row,
-- so this migration does not invent a new restriction for a case nothing exercises. If a
-- "report a user directly, no specific message" feature is ever built, this WITH CHECK
-- will need its own explicit rule for that case at that time.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint and because this is a
-- security-critical, founder-gated change.

drop policy if exists "create own report" on public.message_reports;
create policy "create own report" on public.message_reports
  for insert with check (
    reporter_id = auth.uid()
    and (
      message_id is null
      or reported_user_id = (select sender_id from public.messages where id = message_id)
    )
  );
