-- Storage for the monthly parent commentary narrative (B3a's "gelişim" page, 2026-09-04).
-- NOT YET APPLIED, per this repo's own standing discipline: the founder runs this by hand.
-- Zero live writes were made producing this file.
--
-- lib/digest/parent-commentary.ts / parent-commentary-run.ts (P5, converted weekly->monthly
-- by B3b the same day) already COMPUTE this narrative, but never persisted it -- the batch
-- runner's only write is parent_links.last_commentary_sent_at, a timestamp; the generated
-- text itself was built in memory and discarded (confirmed by reading both files directly,
-- not assumed from either's own comments). CEO's own correction, same night: the instruction
-- to "show the recorded one" was ahead of what the schema actually recorded. This migration
-- closes that gap -- content storage was always the missing half, not a new feature.
--
-- A TABLE, not a column on parent_links (CEO's own framing): the page this feeds is named
-- "gelişim" (progress) specifically because a parent asking "what did it say last month" is
-- the point of the page, not an edge case a single latest-value column would serve. One row
-- per generation, append-only, same posture as admin_action_log (migration 0097) and
-- parent_links itself (no delete policy anywhere).
--
-- Migration number 0130 assigned by CEO.

create table if not exists public.parent_commentary_entries (
  id uuid primary key default gen_random_uuid(),
  parent_link_id uuid not null references public.parent_links(id) on delete cascade,
  generated_at timestamptz not null default now(),
  locale text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  narrative text not null,
  narrative_source text not null check (narrative_source in ('ai', 'no_activity', 'ai_unavailable')),
  created_at timestamptz not null default now()
);

comment on table public.parent_commentary_entries is
  'One row per monthly commentary generation for one parent_links relationship -- the
  content half of P5/B3b''s mechanism, which until this migration computed a narrative and
  discarded it. Append-only (no update/delete policy for any role below), so a parent
  revisiting "gelişim" can see prior months, not just the latest. `parent_link_id` rather
  than `student_user_id` -- the same per-relationship (not per-student) scoping migration
  0118''s last_commentary_sent_at column already uses, and for the identical reason: a
  student linked to two parents must not have one parent''s cadence/history bleed into the
  other''s.';
comment on column public.parent_commentary_entries.locale is
  'The language this specific narrative was generated in -- a parent who switches language
  mid-series keeps every prior entry exactly as written, never silently re-rendered in a
  language the model never actually used.';
comment on column public.parent_commentary_entries.narrative_source is
  'Mirrors lib/digest/parent-commentary.ts''s own NarrativeSource exactly (''ai'' |
  ''no_activity'' | ''ai_unavailable'') -- stored so a reader of this table later can tell a
  genuinely quiet month from a month the AI provider was unreachable, without re-deriving it
  from narrative text.';

create index if not exists parent_commentary_entries_link_generated_idx
  on public.parent_commentary_entries (parent_link_id, generated_at desc);

alter table public.parent_commentary_entries enable row level security;

-- No policy for `authenticated` anywhere on this table, on purpose -- same structural
-- reasoning as migration 0116's §5 (get_parent_child_profile and neighbors): this table has
-- exactly one column (narrative) that is free-text model output about a specific student, the
-- same "can't hide it via a row-level policy, the whole row is the same shape" problem that
-- moved profiles/target_universities/applications behind curated functions instead of direct
-- grants. RLS enabled with zero policies denies all direct access to every non-owning role;
-- get_parent_child_commentary below (SECURITY DEFINER) is the only read path, and the batch
-- runner's admin client (service_role, RLS-exempt by Supabase's own convention) is the only
-- write path -- neither needs a policy here.
--
-- Whether a STUDENT may read their own commentary is explicitly NOT decided by this
-- migration -- CEO, 2026-09-04: "şimdilik hayır, kapsamı dar tut" (not for now, keep scope
-- narrow). No policy or function grants student access; adding one is a deliberate, separate
-- decision for whoever the founder routes it to, not an oversight this comment is covering for.

create or replace function public.get_parent_child_commentary(p_student uuid, p_limit integer default 12)
returns table (
  id uuid,
  generated_at timestamptz,
  locale text,
  period_start timestamptz,
  period_end timestamptz,
  narrative text,
  narrative_source text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id, e.generated_at, e.locale, e.period_start, e.period_end, e.narrative, e.narrative_source
  from public.parent_commentary_entries e
  join public.parent_links l on l.id = e.parent_link_id
  where l.student_user_id = p_student
    and l.parent_user_id = auth.uid()
    and l.status = 'active'
  order by e.generated_at desc
  limit greatest(1, least(p_limit, 50));
$$;
revoke all on function public.get_parent_child_commentary(uuid, integer) from public;
grant execute on function public.get_parent_child_commentary(uuid, integer) to authenticated;

comment on function public.get_parent_child_commentary(uuid, integer) is
  'The read path for parent_commentary_entries -- same is_active_parent_of/SECURITY DEFINER
  shape as migration 0116''s get_parent_child_profile/_target_universities/_applications, but
  NOT a plain call to is_active_parent_of() as an existence gate -- this table is keyed per
  RELATIONSHIP (parent_link_id), unlike profiles/target_universities/applications which have
  exactly one row per student regardless of how many parents are linked. A caller-supplied
  p_student alone is not enough to scope the join: a student with two linked parents has two
  parent_links rows, each with their own commentary entries, and gating only on "is the
  caller an active parent of this student" (is_active_parent_of''s own question) would let
  either parent read BOTH relationships'' entries through the shared student_user_id join --
  confirmed as a real bug locally (2026-09-04) before this migration shipped: an active
  parent''s query returned a second, unrelated parent''s (in the test, a REVOKED parent''s)
  own entries, because the first version of this function checked only that gate. Fixed by
  joining and filtering on `l.parent_user_id = auth.uid() and l.status = ''active''`
  directly -- the same predicate is_active_parent_of() encapsulates, inlined here because
  this function needs it to scope a JOIN, not just gate a boolean. `p_limit` defaults to 12
  (a year of monthly entries) and is clamped 1-50 so a caller cannot force an unbounded scan.';
