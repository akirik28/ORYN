-- Free text for a curriculum the fixed enum can't name (2026-09-03) -- the founder's own
-- observation: a Turkish resident at Alman Lisesi/İtalyan Lisesi/Galatasaray/Saint-Joseph
-- holds a real foreign qualification (German Abitur, Italian maturità, a French track) that
-- `curriculum_type` (migration 0002: 'ap', 'ib', 'a_level', 'turkish_curriculum',
-- 'national_curriculum', 'other') has no value for. A student who picks 'other' today has
-- always had nowhere to say what it actually is -- confirmed live before writing this:
-- checked the onboarding wizard, the profile editor, and every relevant Zod schema, and
-- none of them has ever had a companion text field for this. This migration adds one,
-- narrowly, ahead of any decision about which named qualifications ever get their own enum
-- value (that decision -- and its full cost, six-plus hardcoded lists plus a schema change
-- per value -- is tracked separately and deliberately not part of this migration).
--
-- Two nullable columns, nothing else. Deliberately not a CHECK constraint on length (100
-- chars, enforced in lib/validation/onboarding.ts / achievements.ts instead) -- scope was
-- explicitly held to "two nullable columns" for this pass, and a length constraint is
-- application-layer policy that can change without a migration if the limit ever needs to
-- move.
--
-- Both `profiles` and `education_records` get the column, matching `curriculum` itself
-- being duplicated across both (profiles: the single onboarding-time value; education_records:
-- one value per record, the copy that actually matters for a student with more than one
-- curriculum on file -- confirmed live during the trace that motivated this migration that
-- the two already diverge in practice for a real student).
--
-- Minor-safe scope, deliberately narrow: this field is "what qualification", not "tell us
-- more". It must never become an invitation to enter a school name (school_name is already
-- a separate field on both tables) or any other identifying detail -- the 100-char cap and
-- the field's own label/placeholder (lib/validation and the UI copy) are what keep it that
-- way, not a database constraint, since content can't be policed at this layer.
--
-- Optional in every sense: nullable, no NOT NULL, no default, and the application layer
-- never requires it even when curriculum = 'other' -- a student who picks "other" and types
-- nothing is still a student who picked "other".

alter table public.profiles add column curriculum_other_text text;
alter table public.education_records add column curriculum_other_text text;

comment on column public.profiles.curriculum_other_text is
  'Free text for what "other" means when profiles.curriculum = ''other'' -- optional, max 100 chars (app-enforced). See this migration''s own header for why no CHECK constraint and no school-name/address scope creep.';
comment on column public.education_records.curriculum_other_text is
  'Free text for what "other" means when education_records.curriculum = ''other'' -- optional, max 100 chars (app-enforced). The copy that matters for a student with more than one education_records row.';
