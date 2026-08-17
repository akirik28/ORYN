-- Forward reconciliation between the repo and the live oryn-qa-scratch schema.
--
-- Migration 0038 transcribes what the live database already had. This file carries the
-- deltas the reconciliation actually found: the one linkage the superseded
-- `institutions` design contributed that the live registry lacked, the missing grant
-- path that made the custom-fallback flow unreachable from a normal session, the
-- reference tables the app could not read because RLS was enabled with no policy, and
-- the duplicate entities the Phase 6 audit surfaced (queued for human review, never
-- auto-merged).

-- ---------------------------------------------------------------------------
-- 1. Activity -> catalogue opportunity linkage
--
-- The only genuinely new thing in the superseded 0038_canonical_institutions.sql. It is
-- not a canonical-entity concern: it records which catalogue opportunity a participation
-- entry corresponds to, so "applied to X" and "did X" become the same tracked object.
-- ---------------------------------------------------------------------------

alter table public.activities
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;
create index if not exists activities_opportunity_id_idx on public.activities (opportunity_id);

comment on column public.activities.opportunity_id is
  'Optional link from a participation entry to the catalogue opportunity it came from. on delete set null: retiring an opportunity must never delete a student''s record of having done it.';

-- ---------------------------------------------------------------------------
-- 2. Custom fallback: make the one student write path actually reachable
--
-- create_or_resolve_user_submitted_entity was invoker-rights, and canonical_entities /
-- entity_aliases grant no INSERT policy to anyone. A signed-in student calling it
-- therefore always failed on RLS -- the custom fallback was unreachable outside the
-- service-role client.
--
-- SECURITY DEFINER rather than an INSERT policy, deliberately: the function is a far
-- narrower grant than a policy would be. It can only ever produce
-- verification_state='user_submitted' on an allow-listed entity type, it writes the
-- matching alias row, and it resolves against existing entities first. A broad INSERT
-- policy would additionally have to be trusted not to let a client fabricate an
-- 'official_verified' row, and would still need a second policy on entity_aliases.
--
-- Also enqueues the new entity for verification. Without this the registry accumulated
-- user-submitted rows that nothing ever reviewed, while an entity_verification_queue
-- sat next to it unused.
-- ---------------------------------------------------------------------------

create or replace function public.create_or_resolve_user_submitted_entity(
  p_entity_type text, p_display_name text, p_country_code text default null, p_city text default null
)
returns table(entity_id uuid, created_new boolean, verification_state text)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_name text := trim(p_display_name);
  v_norm text;
  v_id uuid;
  v_state text;
begin
  if v_name is null or v_name = '' then
    raise exception 'display name is required';
  end if;
  if char_length(v_name) > 300 then
    raise exception 'display name is too long';
  end if;
  if p_entity_type not in ('employer','organization','research_institution','lab','ngo','club','opportunity_provider','sports_team','school','university','program','competition','scholarship') then
    raise exception 'entity type % does not allow user-submitted fallback', p_entity_type;
  end if;
  v_norm := lower(unaccent(v_name));

  perform pg_advisory_xact_lock(hashtext(p_entity_type || '|' || coalesce(p_country_code,'') || '|' || coalesce(p_city,'') || '|' || v_norm));

  select ce.id, ce.verification_state into v_id, v_state
  from public.canonical_entities ce
  where ce.entity_type = p_entity_type
    and ce.verification_state <> 'merged'
    and (
      lower(unaccent(ce.canonical_name)) = v_norm
      or lower(unaccent(ce.display_name)) = v_norm
      or exists(select 1 from public.entity_aliases ea where ea.entity_id = ce.id and lower(unaccent(ea.alias)) = v_norm)
    )
    and (p_country_code is null or ce.country_code is null or ce.country_code = p_country_code)
    and (p_city is null or ce.city is null or lower(unaccent(ce.city)) = lower(unaccent(p_city)))
  order by case ce.verification_state when 'official_verified' then 1 when 'source_verified' then 2 when 'user_submitted' then 3 else 4 end,
           ce.last_verified_at desc nulls last
  limit 1;

  if v_id is not null then
    return query select v_id, false, v_state;
    return;
  end if;

  insert into public.canonical_entities(
    entity_type, canonical_name, display_name, normalized_name, country_code, city,
    canonicality_rule, verification_state, data_status, source_priority, metadata
  ) values (
    p_entity_type, v_name, v_name, v_norm, p_country_code, p_city,
    'preferred_custom_fallback', 'user_submitted', 'needs_review', 100,
    jsonb_build_object('created_via','custom_fallback','requires_verification',true)
  ) returning id, canonical_entities.verification_state into v_id, v_state;

  insert into public.entity_aliases(entity_id, alias, normalized_alias, alias_type, verified)
  values (v_id, v_name, v_norm, 'user_submitted', false)
  on conflict do nothing;

  -- Deliberately records no submitting user: the queue only needs the proposed identity
  -- to be checked against an official source, and this product minimises data collected
  -- about minors. Abuse control is the per-user rate limit at the call site, not a
  -- stored author.
  insert into public.entity_verification_queue(entity_type, proposed_name, country_code, city, source_hint, priority, queue_state, canonical_entity_id, notes)
  values (p_entity_type, v_name, p_country_code, p_city, 'custom_fallback', 'P2', 'queued', v_id,
          'Created by a student through the entity autocomplete custom fallback. Confirm against an official source before promoting past user_submitted.');

  return query select v_id, true, v_state;
end;
$$;

-- Revoking from PUBLIC removes the implicit EXECUTE every role gets, including anon;
-- the grants below then re-add it only where it is wanted. service_role is granted
-- explicitly rather than relied on, since its access to these functions came from the
-- same PUBLIC grant being revoked.
revoke all on function public.create_or_resolve_user_submitted_entity(text, text, text, text) from public;
grant execute on function public.create_or_resolve_user_submitted_entity(text, text, text, text) to authenticated, service_role;

-- search_canonical_entities stays invoker-rights (it only reads rows the caller could
-- already select) but should not be reachable without a session.
revoke all on function public.search_canonical_entities(text, text[], integer) from public;
grant execute on function public.search_canonical_entities(text, text[], integer) to authenticated, service_role;

-- merge_canonical_entities is an administrative operation. Never granted to
-- authenticated, so no student session can call it.
revoke all on function public.merge_canonical_entities(uuid, uuid, text, text) from public;
grant execute on function public.merge_canonical_entities(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Reference tables the application could not read
--
-- university_rankings (1,009 rows) and university_profile_metrics both had RLS enabled
-- with no policy at all, which is deny-all for anon AND authenticated. Any page trying
-- to show a ranking through the normal client got an empty result rather than an error.
-- They are global reference data of exactly the same class as `universities`, so they
-- get the same "authenticated read" policy it already has.
--
-- The ingestion/verification queues deliberately keep no policy: they are operational
-- staging (unverified secondary-mirror data that must not reach students), read only
-- through the service-role admin client.
-- ---------------------------------------------------------------------------

drop policy if exists "authenticated read" on public.university_rankings;
create policy "authenticated read" on public.university_rankings for select to authenticated using (true);

drop policy if exists "authenticated read" on public.university_profile_metrics;
create policy "authenticated read" on public.university_profile_metrics for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Narrow registry reads from anon to authenticated
--
-- These were created as `for select using (true)` with no role restriction, so the anon
-- key could enumerate the whole registry -- including user_submitted rows, which are
-- named by students. `universities` has always been authenticated-only, and every read
-- path in the app runs behind requireUser(), so this closes an inconsistency without
-- changing any working flow.
-- ---------------------------------------------------------------------------

drop policy if exists public_read_canonical_entities on public.canonical_entities;
create policy public_read_canonical_entities on public.canonical_entities for select to authenticated using (true);
drop policy if exists public_read_entity_aliases on public.entity_aliases;
create policy public_read_entity_aliases on public.entity_aliases for select to authenticated using (true);
drop policy if exists public_read_entity_external_ids on public.entity_external_ids;
create policy public_read_entity_external_ids on public.entity_external_ids for select to authenticated using (true);
drop policy if exists public_read_entity_evidence on public.entity_evidence;
create policy public_read_entity_evidence on public.entity_evidence for select to authenticated using (true);
drop policy if exists public_read_entity_record_links on public.entity_record_links;
create policy public_read_entity_record_links on public.entity_record_links for select to authenticated using (true);
drop policy if exists public_read_school_profiles on public.school_profiles;
create policy public_read_school_profiles on public.school_profiles for select to authenticated using (true);
drop policy if exists public_read_school_credentials on public.school_credentials;
create policy public_read_school_credentials on public.school_credentials for select to authenticated using (true);
drop policy if exists public_read_school_outcome_metrics on public.school_outcome_metrics;
create policy public_read_school_outcome_metrics on public.school_outcome_metrics for select to authenticated using (true);
drop policy if exists public_read_school_university_outcomes on public.school_university_outcomes;
create policy public_read_school_university_outcomes on public.school_university_outcomes for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 5. Missing index
-- ---------------------------------------------------------------------------

create index if not exists idx_education_country_entity on public.education_records (country_entity_id);

-- ---------------------------------------------------------------------------
-- 6. Queue the duplicate canonical entities the Phase 6 audit found
--
-- 43 university identities exist twice: the curated set and the QS-2027 expansion each
-- created a row, differing only in how the city was written ("Boston" vs "Boston, MA",
-- "Pasadena" vs "Pasadena, CA"). canonical_entities_identity_uq could not catch them
-- because it keys on the city string, and every university row has a null country_code.
--
-- These are NOT merged here. Merging real entities is a reviewed decision
-- (merge_canonical_entities requires a reason and is service-role only); a name+city
-- heuristic is exactly the kind of fuzzy match that must not run unattended. Each pair
-- is enqueued instead, so the finding is actionable rather than living only in a report.
-- ---------------------------------------------------------------------------

insert into public.entity_verification_queue (entity_type, proposed_name, country_code, city, source_hint, priority, queue_state, canonical_entity_id, blocker, notes)
select
  d.entity_type,
  d.display_name,
  d.country_code,
  d.city,
  'phase6_duplicate_audit',
  'P1',
  'queued',
  d.id,
  'possible_duplicate',
  'Shares a normalized name with canonical entity ' || d.other_id || ' (' || coalesce(d.other_city,'no city') || '). Confirm against an official source, then merge with merge_canonical_entities() or set distinct city/country values. Do not merge on name similarity alone.'
from (
  select
    a.id, a.entity_type, a.display_name, a.country_code, a.city,
    b.id as other_id, b.city as other_city
  from public.canonical_entities a
  join public.canonical_entities b
    on b.entity_type = a.entity_type
   and b.normalized_name = a.normalized_name
   and b.id <> a.id
   and b.verification_state <> 'merged'
  where a.verification_state <> 'merged'
    and a.id < b.id
) d
where not exists (
  select 1 from public.entity_verification_queue q
  where q.canonical_entity_id = d.id and q.source_hint = 'phase6_duplicate_audit'
);
