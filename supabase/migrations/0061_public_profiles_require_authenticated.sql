-- Fixes a real, live gap found during BUG-1's RLS verification package (2026-08-22,
-- docs/handoffs/bug1-rls-verification-2026-08-22.md): migration 0023's own comment states
-- `public_profiles` was "granted to authenticated only (not anon) — a deliberately more
-- conservative reading of 'optionally shareable' than a fully public, unauthenticated,
-- indexable page." That intent was never actually enforced.
--
-- Verified directly against `information_schema.role_table_grants` and `pg_default_acl`:
-- this project's standing default ACL (`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT
-- ... TO anon, authenticated, service_role`, set at project bootstrap, predating this
-- migration) auto-grants `anon` full privileges on every table/view created in `public` —
-- not something 0023 did, and not something a `GRANT ... TO authenticated` statement can
-- undo, since grants are additive. `public_profiles` is a security-definer view (0023's
-- own comment: "the default -- no security_invoker"), so its own WHERE clause is the real
-- gate, not the grant statement. That WHERE clause's `is_public = true` branch never
-- references `auth.uid()` -- it is satisfied by the row's own data regardless of caller
-- identity. Combined, an anonymous, unauthenticated caller (no session, no JWT `sub`
-- claim -- verified live: this project's auth.uid() is
-- `coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
-- (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid`, which resolves
-- to NULL for the anon key) can read any `is_public = true` profile's full
-- `PUBLIC_PROFILE_SAFE_COLUMNS` set through this view. Never the private-only fields
-- (school_name/birth_year/is_admin/etc.) -- those stay correctly gated by `profiles`'
-- own "select own profile" RLS policy, verified separately and unaffected by this fix.
--
-- Mechanism chosen: an `auth.uid() is not null` guard folded into the view's own WHERE
-- clause, not a `revoke select on public_profiles from anon`. This repo's own established
-- pattern for this exact view is to hard-code its full security contract inside the view
-- definition itself (0023's comment: "This view instead hard-codes both the column
-- whitelist and the is_public = true predicate, so it can never return a private row...
-- no matter how profiles grows later") rather than depend on an external grant staying in
-- sync -- the bug this migration fixes is a grant silently drifting from that stated
-- intent. A REVOKE would fix today's symptom but leaves the same failure mode standing:
-- a future `CREATE OR REPLACE VIEW` (0024 already used that exact form once) re-creates
-- the view without re-stating the revoke, and the schema-wide default ACL silently
-- re-grants `anon` access with no migration ever saying so. Folding the check into the
-- WHERE clause means every future `create or replace view` of this same view carries the
-- guard forward by construction, the same way the column whitelist and is_public
-- predicate already do.
--
-- Also verified: this project's standing default-ACL behavior is NOT specific to this one
-- view -- it applies schema-wide to every future table/view. A second, currently-unapplied
-- instance of the identical pattern was found in migration 0058 (social_posts.sql)'s
-- "read visible posts" policy on `public.posts` and flagged separately; not addressed
-- here, since it is a different table/lane's migration, not this view.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint: read-only
-- verification is not the same session that patches a policy with no independent check on
-- it. Founder-gated. Do not run against a live project without that review.

create or replace view public.public_profiles as
  select id, display_name, country, curriculum, graduation_year, looking_for, created_at
  from public.profiles
  where auth.uid() is not null
    and (
      is_public = true
      -- Continuity carve-out: if A is connected to (or has a pending request with) the
      -- caller, the caller can still see A's basic info even if A later goes private —
      -- otherwise an existing connection would silently show as an unresolvable/blank
      -- row. This does NOT let two private users discover each other from scratch: V1's
      -- "Connect" action only ever appears on an already-public profile page (see
      -- app/(app)/u/[id]/page.tsx), so a connection can only be *initiated* via a public
      -- profile in the first place.
      or id in (
        select case when requester_id = auth.uid() then recipient_id else requester_id end
        from public.connections
        where auth.uid() in (requester_id, recipient_id)
          and status = 'accepted'
      )
      or id in (
        select requester_id
        from public.connections
        where recipient_id = auth.uid()
          and status = 'pending'
      )
    );
