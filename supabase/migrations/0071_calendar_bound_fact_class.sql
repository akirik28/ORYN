-- A calendar-bound fact (a fact whose validity is tied to a known external annual
-- publication event — see lib/acquisition/verification.ts's AnnualCalendarWindow, added
-- 2026-08-31) is a different KIND of requirement row from an ordinary one, not just a
-- differently-dated one. verification_state already distinguishes "current" from
-- "historical", and evaluation_gate already stops evaluateRequirement() producing a
-- Met/Not-met verdict for either — both apply identically to every historical row,
-- calendar-bound or not, so neither can tell a caller "this specific row should surface
-- as dated informational context, the other 23 historical rows in the same batch should
-- not." This column exists to carry exactly that distinction, and only that distinction
-- — verification_state and evaluation_gate are untouched by this migration and by the
-- backfill that follows it.
--
-- Nullable, CHECK-constrained to a short, explicit enum rather than a free-text tag: a
-- new calendar-bound fact class should be a deliberate addition to this list, the same
-- discipline requirement_type/verification_state already apply, not a string a caller
-- can invent inline.
alter table public.university_requirements
  add column calendar_bound_fact_class text
    check (calendar_bound_fact_class is null or calendar_bound_fact_class = any (array[
      'cao_points_ie'
    ]));

comment on column public.university_requirements.calendar_bound_fact_class is
  'Null for an ordinary requirement row. Set only for a fact whose validity is tied to a known external annual publication event (see lib/acquisition/verification.ts AnnualCalendarWindow) — currently just cao_points_ie, Ireland''s CAO points cutoffs. Read exclusively by the calendar-bound-fact display path, which is structurally incapable of producing a Met/Not-met verdict (see features/universities/calendar-bound-fact-card.tsx and its own doc comment) — never read by evaluateRequirement() or anything that could confuse a dated competitive-outcome figure for a threshold a student can clear. See docs/handoffs/cao-calendar-display-2026-08-31.md.';

create index university_requirements_calendar_bound_fact_class_idx
  on public.university_requirements (calendar_bound_fact_class)
  where calendar_bound_fact_class is not null;
