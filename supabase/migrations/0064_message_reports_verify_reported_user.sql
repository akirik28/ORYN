-- Fixes a real INSERT-forgery gap found during BUG-1's RLS verification package
-- (2026-08-22, surfaces 3+4 -- sendMessage/block/report). Full evidence:
-- docs/research/verification/rls-live-verification-2026-08-22.md,
-- docs/research/verification/insert-forgery-inventory-2026-08-22.md.
--
-- THE GAP: `message_reports`' own INSERT policy (migration 0027) only ever checked
-- `reporter_id = auth.uid()` -- nothing tied `reported_user_id` to the thing actually
-- being reported. Verified live against `oryn-qa-scratch`: QA account B filed a report
-- on a message genuinely sent by QA account A, but named an entirely unrelated user as
-- `reported_user_id`, and the row was accepted with no error. `reportMessage()`
-- (app/(app)/messages/actions.ts) never cross-checks this either -- it trusts the
-- client-supplied `reportedUserId` completely.
--
-- AMENDED before this migration was ever applied (ORYN-CEO caught it, holding PR #94
-- rather than merging a fix that documents itself as complete while leaving half the
-- surface open): the first version of this migration only closed the `message_id`
-- branch, on the stated premise that "there is no current legitimate path that inserts
-- a null-message_id row" and "reportMessage() today always supplies a real message_id."
-- **That premise was wrong.** `message_reports` has a SECOND, equally real reference
-- column, `recommendation_id` (migration 0035, `alter table ... add column
-- recommendation_id uuid references public.recommendations(id) on delete set null`) --
-- added specifically so this same table could double as the moderation queue for
-- reported recommendations, not messages, deliberately reusing this table rather than
-- building a second one (see 0035's own comment). `reportRecommendation()`
-- (app/(app)/u/[id]/recommendation-actions.ts) inserts with `recommendation_id` set and
-- `message_id` left null -- exactly the shape the first version's `message_id is null`
-- branch let through unconstrained. The forgery this migration set out to close was
-- therefore still fully open via the second branch: a raw insert with `message_id:
-- null, recommendation_id: <any real id>` (or both null) satisfied the old WITH CHECK
-- outright, because `message_id is null` short-circuited the entire cross-check. Same
-- false accusation against an innocent third party, same moderation queue, one field
-- different -- and the attacker was never going through `reportRecommendation()`
-- either, same as the original finding never went through `reportMessage()`.
--
-- One thing the wrong premise got right by necessity, not insight: the `message_id is
-- null` escape hatch itself was load-bearing, not a mistake -- without it, this
-- migration would have broken recommendation reporting outright (every real
-- `reportRecommendation()` call has `message_id` null). The fix below keeps that
-- structure and adds the missing second branch, rather than removing the escape hatch.
--
-- MECHANISM: DB-level `WITH CHECK`, not an app-layer check, for the same reason this
-- pass's own live testing already established for `messages`' own INSERT policy: a
-- Server Action is directly callable with any argument, so an app-layer check is a
-- friendly-error nicety, never the actual security boundary, in this codebase's own
-- established convention. `messages`' `"send message to accepted unblocked connection"`
-- policy already uses exactly this shape (a subquery cross-check inside WITH CHECK) --
-- this migration follows that precedent for both branches rather than inventing a new
-- one. `recommendations.author_id` is `not null` (migration 0035), giving the second
-- branch the same shape as the first.
--
-- The reasoning for why the subquery is safe to trust WITHOUT security-definer must
-- hold independently for EACH branch, not by analogy -- checked, not assumed, for the
-- recommendation branch specifically: `recommendations`' own SELECT policy ("select
-- involved recommendations", migration 0035) is `author_id = auth.uid() or recipient_id
-- = auth.uid()` -- the same party-scoped shape as `messages`' SELECT policy. A caller
-- reporting a recommendation they were never a party to (neither author nor recipient)
-- gets zero rows back from the subquery under their own RLS, `reported_user_id = NULL`
-- is never true, and the insert is rejected too -- the same deliberate side effect the
-- message branch already relies on, now independently verified for this branch rather
-- than inherited by assumption.
--
-- The two branches are OR'd, not AND'd: a report references a message OR a
-- recommendation (reportMessage/reportRecommendation never supply both), and requiring
-- at least one non-null, correctly-attributed reference also closes the "both null"
-- case for free -- a report with neither column set now has no branch to satisfy and is
-- rejected, where the previous (even the first, message-only) version would have passed
-- it through the `message_id is null` escape hatch with zero attribution check at all.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint and because this is a
-- security-critical, founder-gated change.
--
-- STATUS, corrected 2026-09-02 (docs/migration-audit-applied-vs-written-2026-09-02.md):
-- APPLIED. This security fix is enforced on the live database right now -- confirmed via
-- `pg_get_expr(polwithcheck, polrelid)` on the `"create own report"` policy against
-- `qtcvcflzxbuagvvwahhu`, which contains the `recommendation_id` branch below, not
-- assumed. The line above was true when written and is not true today -- both the
-- message and recommendation forgery paths this migration closes are closed.

drop policy if exists "create own report" on public.message_reports;
create policy "create own report" on public.message_reports
  for insert with check (
    reporter_id = auth.uid()
    and (
      (message_id is not null
        and reported_user_id = (select sender_id from public.messages where id = message_id))
      or
      (recommendation_id is not null
        and reported_user_id = (select author_id from public.recommendations where id = recommendation_id))
    )
  );
