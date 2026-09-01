-- Lets a student read their own analytics rows, so the data export can actually carry them.
--
-- THE GAP: `product_events` has RLS enabled and, uniquely among the `user_id`-bearing
-- tables, no SELECT policy at all. That is correct as a default -- analytics is written by
-- the service-role client and nothing in the product reads it back per-user -- but it makes
-- the table unexportable in a way that fails silently rather than loudly.
--
-- Supabase-js resolves an RLS-blocked read as an empty result, not an error, and
-- `app/api/export-data/route.ts` coalesces every result with `?? []`. So adding
-- `product_events` to EXPORT_TABLES without this policy would emit a section that is
-- permanently empty while the export reports success -- a data-subject access request
-- answered with a confident, complete-looking file that silently omits a category. That is
-- worse than the documented omission it currently carries in EXPORT_EXCLUDED_TABLES.
--
-- WHY IT BELONGS IN THE EXPORT: see DATA_RIGHTS_AUDIT.md Part 3. `product_events` carries a
-- `user_id` and records this student's own actions, so it plausibly falls under the access
-- right (GDPR Art. 15 / KVKK Art. 11) more or less regardless of content -- access is not
-- limited to data the subject supplied. Whether it belongs under the *portability* right
-- (Art. 20) is genuinely contestable and is one of the questions that document hands to
-- counsel. This migration only makes the choice available; it does not make it.
--
-- SCOPE: read-only, own rows, `authenticated` only. No INSERT/UPDATE/DELETE policy is added
-- -- writes stay service-role-only exactly as today, so a student can see what was recorded
-- about them and cannot alter or forge it. `anon` gets nothing: `auth.uid()` is null for an
-- anonymous request, and the policy is scoped to `authenticated` regardless.
--
-- AFTER APPLYING: move `product_events` from EXPORT_EXCLUDED_TABLES into EXPORT_TABLES in
-- lib/export/tables.ts. The derived guard in __tests__/export/tables.test.ts passes either
-- way -- it checks that every user_id table is covered *or* documented -- so this is a
-- deliberate follow-up, not something a test will nag about.

create policy "select own product_events"
  on public.product_events
  for select
  to authenticated
  using (user_id = auth.uid());
