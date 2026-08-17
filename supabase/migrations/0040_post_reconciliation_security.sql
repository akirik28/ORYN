-- Security-advisor findings after the reconciliation DDL, fixed where a fix is correct
-- rather than merely quieting the linter.

-- ---------------------------------------------------------------------------
-- 1. current_university_student_counts should not bypass RLS
--
-- Postgres creates views SECURITY DEFINER by default, so this one ran with the owner's
-- privileges and skipped RLS on universities and university_profile_metrics entirely.
-- Both now carry an "authenticated read" policy (migration 0039), so invoker semantics
-- give exactly the same rows to a signed-in student and nothing at all to anon — which
-- is what should have been true all along.
--
-- public.public_profiles is deliberately NOT changed. It is the mechanism by which a
-- student sees a whitelisted column set of *another* student's profile; `profiles` RLS
-- is owner-only, so switching that view to security_invoker would collapse every
-- cross-user profile read to zero rows. Its WHERE clause (migration 0024's direction-
-- aware fix) is the intended gate, and the column list is the intended projection. The
-- advisor flags it as an ERROR generically; here it is the design.
-- ---------------------------------------------------------------------------

alter view public.current_university_student_counts set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2. handle_new_user is a trigger function, not an API
--
-- It is SECURITY DEFINER and was callable by anon and authenticated over
-- /rest/v1/rpc/handle_new_user purely because functions grant EXECUTE to PUBLIC by
-- default. A trigger fires with the table owner's rights regardless of who holds
-- EXECUTE, so revoking it removes an unintended RPC endpoint and changes nothing about
-- signup.
-- ---------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public;

-- is_blocked_between is SECURITY DEFINER too, and the advisor flags it the same way —
-- but three INSERT policies (messages, recommendations, skill_endorsements) call it, and
-- policy expressions run as the querying role, so `authenticated` genuinely needs
-- EXECUTE. Only anon loses it: no policy grants anon an insert on any of those tables, so
-- it can never reach an expression that calls this.
revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Accepted, not fixed
--
-- * `pg_trgm` and `unaccent` live in the `public` schema (advisor: extension_in_public).
--   They were installed there by the out-of-repo canonical-entity work. Relocating
--   pg_trgm means dropping and recreating every gin_trgm_ops index that depends on it,
--   on a table with 1,160 live rows and a search path the product depends on. The risk
--   is real and the benefit is namespace hygiene; every function that uses them already
--   pins `search_path` explicitly, which is the actual hardening. Left in place
--   deliberately.
--
-- * Eleven tables have RLS enabled with no policy (advisor: rls_enabled_no_policy, INFO).
--   That is the intended configuration: deny-all for anon and authenticated, readable
--   only through the service-role admin client. It covers operational surfaces —
--   verification and ingestion queues, merge audit, field-policy catalogue, provider
--   health, sync jobs, product events — none of which should be student-readable. The
--   linter cannot tell "no policy by mistake" from "no policy on purpose".
--
-- * `create_or_resolve_user_submitted_entity` is executable by authenticated as a
--   SECURITY DEFINER function (advisor WARN). That is its whole purpose: it is the
--   deliberately narrow write path that exists so no broad INSERT grant on the registry
--   has to. See migration 0039.
--
-- * Leaked-password protection is disabled. That is a Supabase Auth dashboard setting,
--   not schema — it cannot be turned on from a migration. Recorded in
--   docs/founder-blocked-backlog.md.
-- ---------------------------------------------------------------------------
