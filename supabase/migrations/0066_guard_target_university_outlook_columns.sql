-- Security Gate 1 (2026-08-29 audit). Closes a self-forgery gap on `target_universities`'
-- cached admission_model_v1 output — the same class of gap migrations 0062/0063/0065 closed
-- elsewhere, found by source-code analysis during this audit rather than BUG-1's original
-- live-verification package, and not covered by any of 0061-0065. Full finding:
-- docs/cleanup/ORYN-CLEANUP-REPORT-2026-08-29.md and the 2026-08-29 engineering-readiness
-- audit ("§3.11 Universities" / "§2.1 cross-cutting"). No live exploit against
-- `oryn-qa-scratch` was attempted for this specific gap (out of scope for a read-only audit);
-- this migration is written from the same reasoning BUG-1 already established, applied to a
-- table that package's own column list did not include.
--
-- THE GAP: `target_universities` (migration 0007) carries one bundled policy from the
-- `owner_tables` loop in migration 0014 — `for all using (user_id = auth.uid()) with check
-- (user_id = auth.uid())`. That policy correctly scopes every operation to the caller's own
-- rows, but constrains no column. 0007's own comment already states the intent for 8 of this
-- table's columns: "Cached admission_model_v1 output (Phase 16/17) ... these columns are a
-- cache, never hand-edited": `academic_fit_score`, `profile_fit_score`, `outlook`,
-- `estimate_range_low`, `estimate_range_high`, `outlook_confidence`, `outlook_model_version`,
-- `outlook_calculated_at`. That intent was never enforced at the database level — verified
-- directly against `lib/admissions/persist.ts::refreshAdmissionOutlook`, the only writer of
-- these columns, which uses `createClient()` (the caller's own RLS-scoped session, Postgres
-- role `authenticated`), not `service_role` — so today, a direct client call (bypassing the
-- Next.js app entirely) can set any of these 8 columns to an arbitrary value on the caller's
-- own row, including the exact no-fake-precision `outlook`/`estimate_range_low`/
-- `estimate_range_high` figures AGENTS.md's Non-Negotiable #5 and `lib/admissions/outlook.ts`
-- are built specifically to prevent a student from ever seeing fabricated. `status` and
-- `notes` are the two genuinely student-authored columns on this table (see
-- `app/(app)/universities/actions.ts`'s `addTargetUniversity`/`updateTargetUniversityStatus`)
-- and are deliberately left alone — same discipline as 0062's "everything else... is
-- genuinely meant to be student-writable... deliberately left alone."
--
-- MECHANISM, matching 0062/0063 exactly for the UPDATE case and extending the same
-- reset-not-raise philosophy to INSERT, which none of 0061-0065 needed for this table's
-- shape (their six tables either had no legitimate INSERT at all, post-0065, or — for
-- `profiles` — exactly one row per user already exists from signup with no INSERT path to a
-- duplicate). `target_universities` is different: a student legitimately INSERTs a new row
-- every time they target a university (`addTargetUniversity`), so removing INSERT capability
-- outright (0065's mechanism) would break that feature. Verified directly:
-- `addTargetUniversity`'s own insert payload is `{ user_id, university_id, program_id,
-- status: "exploring", notes: null }` — it never sets any of the 8 cache columns, which
-- therefore start at their natural SQL NULL (no column default was ever declared for them in
-- 0007). A single combined `BEFORE INSERT OR UPDATE OF <the 8 columns>` trigger handles both
-- vectors with one function: on INSERT, force all 8 to NULL regardless of what a raw request
-- supplied (harmless to the real insert path, which already sends nothing for them; closes
-- the freshly-INSERTed-fabricated-row vector 0063's own header names as the residual risk of
-- an UPDATE-only guard); on UPDATE, reset to OLD exactly as 0062/0063 do. `set search_path =
-- ''` and qualified `pg_catalog.pg_trigger_depth() <= 1`, identical to every guard function in
-- 0062/0063 and for the identical reason (the unqualified form is Supabase's own
-- `function_search_path_mutable` lint, and `authenticated`/`anon` still lack `CREATE` on
-- `public` in this project, checked the same way 0062 checked it — not assumed carried
-- forward). `current_user <> 'service_role'` — same detection as every other guard in this
-- package; not a claim a client can set inside its own request.
--
-- `BEFORE INSERT OR UPDATE OF column_list ON table` is valid, standard PostgreSQL: the `OF
-- column_list` qualifier restricts only the UPDATE event (fires only when one of those
-- columns is a target of the UPDATE's SET clause); INSERT fires unconditionally, as it must
-- (every column is "being set" on a fresh row, so there is no column-list concept for INSERT
-- to restrict). This was verified against a local Postgres instance as part of this same
-- change (`supabase test db`), not assumed from the manual.
--
-- PAIRED CODE CHANGE, in the same commit as this migration, same discipline as 0063/0065:
-- `lib/admissions/persist.ts::refreshAdmissionOutlook`'s one `.update({...8 columns...})`
-- call now goes through `createAdminClient()` instead of the caller's `createClient()`.
-- Every read in that function, and the ownership-scoped initial `select`, stays on the
-- RLS-scoped client, unchanged — a student reading their own target-university row is
-- unaffected, and gains no visibility into anyone else's. Landing this migration without that
-- code change would silently freeze every student's outlook at NULL (or its
-- last-computed value) forever the moment this trigger is applied — the identical failure
-- class 0062's own header warned about almost committing with `profile_strength_score`/
-- `completeness_percent`, not a new risk being introduced here.
--
-- WHAT THIS DOES NOT CLOSE, named rather than left implicit (matching 0063/0065's own
-- disclosure convention): `lib/universities/counseling-adapter.ts`'s in-memory
-- `notApplicableReason`/`notApplicableKind`/`admissionSystemMechanism` fields are never
-- persisted to this table at all (per `refreshAdmissionOutlook`'s own comment — no column
-- exists for them), so there is nothing on this table to guard for that explanatory text;
-- it is recomputed fresh on every read from `outlook.ts`'s deterministic logic, not stored,
-- so it cannot be forged via this table regardless. No other confidence/explanation columns
-- exist on `target_universities` beyond the 8 guarded here — verified directly against
-- `types/database.ts`'s `TargetUniversity`/`TargetUniversityInsert` and migrations 0007/0049
-- (the only two migrations that ever touch this table's column set), not assumed from the
-- audit's own prior recollection.
--
-- LOCAL-ONLY, PART OF SECURITY GATE 1'S REVIEWABLE PACKAGE: not applied to any remote
-- project by this change. Requires Codex's review and separate explicit authorization before
-- `supabase db push` against `oryn-qa-scratch` or any other environment.

create or replace function public.target_universities_guard_outlook_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    if TG_OP = 'UPDATE' then
      new.academic_fit_score := old.academic_fit_score;
      new.profile_fit_score := old.profile_fit_score;
      new.outlook := old.outlook;
      new.estimate_range_low := old.estimate_range_low;
      new.estimate_range_high := old.estimate_range_high;
      new.outlook_confidence := old.outlook_confidence;
      new.outlook_model_version := old.outlook_model_version;
      new.outlook_calculated_at := old.outlook_calculated_at;
    else
      new.academic_fit_score := null;
      new.profile_fit_score := null;
      new.outlook := null;
      new.estimate_range_low := null;
      new.estimate_range_high := null;
      new.outlook_confidence := null;
      new.outlook_model_version := null;
      new.outlook_calculated_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists target_universities_00_guard_outlook_columns on public.target_universities;
create trigger target_universities_00_guard_outlook_columns
  before insert or update of
    academic_fit_score, profile_fit_score, outlook, estimate_range_low, estimate_range_high,
    outlook_confidence, outlook_model_version, outlook_calculated_at
  on public.target_universities
  for each row execute function public.target_universities_guard_outlook_columns();
