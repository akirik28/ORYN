-- Requirement alternatives, exclusions, and clause-level traceability.
--
-- Defect being fixed: lib/requirements/evaluate.ts and every caller of evaluateRequirement()
-- treat every university_requirements row as independently mandatory. Edinburgh's four
-- English-proficiency test routes (IELTS/TOEFL/PTE/Duolingo) are ingested today as four
-- separate rows, so a student with a valid IELTS score is told they failed the TOEFL
-- requirement — a confident wrong answer, worse than an honest unknown, because the student
-- acts on it. This migration adds the schema to represent "any one of N rows satisfies this
-- requirement" (Case B) and folds in `is_exclusion` (previously an implicit, unreliable
-- concept — see below) rather than adding it separately. lib/requirements/evaluate.ts's new
-- evaluateRequirementGroup() (this same change set, not a DB change) is what actually reads
-- this schema; see docs/handoffs/requirement-alternatives-design.md for the full design,
-- worked evidence, and — just as important — an explicit list of what this schema and
-- evaluator deliberately do NOT attempt to represent (Case C's cross-clause dependencies, the
-- national-vs-institutional YÖK rule-set question). No existing row is touched: both tables
-- below are extended additively and every new column is nullable or has a default, and
-- requirement_groups starts empty — nothing is backfilled into the new structure by
-- inference.
--
-- Does not touch program_id resolution (a separately-scoped problem, see the Org Leader's own
-- framing of Case A) or add any ingestion code that writes requirement_group_id/group_role —
-- schema only, per instruction.

-- ---------------------------------------------------------------------------
-- 1. requirement_groups — a set of university_requirements rows that must be evaluated
--    TOGETHER rather than independently.
--
-- Deliberately carries no university_id/program_id/scope of its own. Every member row
-- already states those (migrations 0006/0042), and a group only ever makes sense when every
-- member shares them — duplicating them here would be a second source of truth for a fact
-- the members already state, with no DB-level way to keep the two in sync short of a
-- trigger this design doesn't need yet. Consistency across a group's members is an
-- ingestion-time responsibility, the same trust boundary this schema already uses elsewhere
-- (e.g. nothing here cross-validates program_id against university_id either).
-- ---------------------------------------------------------------------------
create table public.requirement_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger requirement_groups_set_updated_at before update on public.requirement_groups for each row execute function public.set_updated_at();

alter table public.requirement_groups enable row level security;
create policy "authenticated read" on public.requirement_groups for select to authenticated using (true);
-- No insert/update/delete policy: admin/ingestion tooling only, same posture as
-- university_requirements itself (see migration 0014).

comment on table public.requirement_groups is
  'A set of university_requirements rows evaluated together rather than independently — see lib/requirements/evaluate.ts evaluateRequirementGroup(). Empty until an admin or ingestion pipeline explicitly assigns rows to a group; never populated by backfilling existing rows on inference.';

-- ---------------------------------------------------------------------------
-- 2. university_requirements additions.
--
-- requirement_group_id + group_role: which group (if any) this row belongs to, and what it
-- contributes to that group's combined verdict.
--   'inclusion' — one alternative in an any-of-N set. Evidenced by Edinburgh's four English
--     tests (the defect-B example this task starts from) and by the YÖK esaslar batch's
--     B-a-1..B-a-N "internationally classified applicant" categories, where matching any one
--     category qualifies (requirements_batch9_yok-esaslar_2026-08-21.jsonl).
--   'exclusion' — a carve-out that overrides the group's verdict regardless of which
--     inclusion alternative was met. Evidenced by the same batch's B-b-1..B-b-N list. The
--     researcher's own note on this data is explicit and load-bearing: "the exclusion list
--     is NOT the negation of the inclusion list — several categories appear in both with
--     different qualifiers, so a flat boolean will get at least one wrong." Stored as its
--     own independently-evaluated fact for exactly that reason — this schema and
--     evaluate.ts never derive an exclusion from the inclusions, and never derive the
--     reverse either.
--   'qualifier' — a condition that applies to the group as a whole rather than to one
--     alternative (e.g. a recency window on whichever test was used). Named explicitly in
--     this task's brief as a shape the design must survive; not drawn from one specific
--     quoted source record the way inclusion/exclusion are. Kept distinct from 'inclusion'
--     so a qualifier can never be miscounted as a fifth alternative that alone satisfies the
--     group.
--
-- is_exclusion: the same "this is a negative/carve-out fact, never auto-resolve it" meaning
-- as group_role = 'exclusion', but standalone. Real exclusion facts are not always grouped —
-- the Sabancı batch's REQ-2026-08-21-5008/5009/5010
-- (requirements_batch6_sabanci_2026-08-21.jsonl) are single exclusion rows with no
-- accompanying alternative-set, and that batch has no structured is_exclusion-equivalent
-- field at all: those three records are marked as exclusions only via free text in
-- `limitations` ("This is an EXCLUSION. Storing it alongside positive requirements without
-- an is_exclusion marker would invert its meaning" — the researcher's own words). is_exclusion
-- is kept as its own column rather than folded entirely into group_role because group_role is
-- only meaningful for grouped rows; the CHECK constraint below keeps the two mechanisms from
-- disagreeing, so lib/requirements/evaluate.ts has one single flag to test regardless of
-- whether the exclusion is grouped or standalone.
--
-- clause_ref: the source document's own hierarchical clause numbering (e.g. "B-a-1",
-- "B-b-5-a", "A-2-c-ii"), stored verbatim and never parsed into components. The evidence
-- includes cross-clause dependencies (B-b-3's exclusion is cancelled by B-a-4 elsewhere in
-- the same rule; A-2-c-ii's scope depends on an antecedent in a preceding clause; a single
-- Danıştay judicial carve-out appears written into both an inclusion clause and, separately,
-- an exclusion clause) that this migration deliberately does NOT model as a queryable
-- relationship — see docs/handoffs/requirement-alternatives-design.md for why parsing or
-- linking clause_ref is out of scope rather than an oversight.
alter table public.university_requirements
  add column if not exists requirement_group_id uuid references public.requirement_groups(id) on delete set null,
  add column if not exists group_role text
    check (group_role is null or group_role = any (array['inclusion', 'exclusion', 'qualifier'])),
  add column if not exists is_exclusion boolean not null default false,
  add column if not exists clause_ref text;

alter table public.university_requirements
  add constraint university_requirements_group_role_consistency
    check ((requirement_group_id is null) = (group_role is null)),
  add constraint university_requirements_exclusion_role_implies_flag
    check (group_role is distinct from 'exclusion' or is_exclusion);

create index if not exists university_requirements_requirement_group_id_idx
  on public.university_requirements (requirement_group_id);

comment on column public.university_requirements.requirement_group_id is
  'Set only when this row must be evaluated together with sibling rows in the same requirement_groups row rather than independently — see that table''s comment and lib/requirements/evaluate.ts evaluateRequirementGroup().';
comment on column public.university_requirements.group_role is
  'inclusion | exclusion | qualifier — this row''s contribution to its group''s combined verdict. Null iff requirement_group_id is null (enforced by university_requirements_group_role_consistency).';
comment on column public.university_requirements.is_exclusion is
  'True for any row stating a negative/carve-out fact (who is NOT eligible), whether or not it belongs to a requirement_groups row. Never auto-resolved by evaluate.ts — always needs_manual_review, deliberately never derived from an inclusion set by negation.';
comment on column public.university_requirements.clause_ref is
  'The source document''s own clause numbering (e.g. "B-a-1"), stored verbatim for traceability. Not parsed and not used to model cross-clause dependencies — see docs/handoffs/requirement-alternatives-design.md.';

-- ---------------------------------------------------------------------------
-- 3. requirement_research_queue.outcome CHECK gap found during the 2026-08-21
--    requirements/deadlines incident backfill (docs/handoffs/
--    requirements-deadlines-incident-and-backfill-report.md, item 6): migration 0051's own
--    file already lists 'superseded' as a valid outcome, but what was actually applied to
--    this database at the time did not include it, so 7 genuinely-superseded records had to
--    be mapped to 'not_ingestible' instead during that recovery (nothing lost —
--    outcome_detail still states the real reason — but not the value the schema always
--    intended). Bringing the live constraint in line with what 0051 always intended, rather
--    than leaving the drift in place. Folded into this migration rather than a standalone
--    one, per instruction.
alter table public.requirement_research_queue
  drop constraint if exists requirement_research_queue_outcome_check,
  add constraint requirement_research_queue_outcome_check
    check (outcome = any (array['accepted', 'duplicate', 'unresolved_university', 'superseded', 'not_ingestible', 'malformed_source', 'rejected']));
