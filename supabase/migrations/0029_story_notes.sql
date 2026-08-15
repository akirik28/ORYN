-- Essay Story Bank (founder-confirmed MVP scope — Drive doc sections 12/20, see
-- docs/known-issues.md). One free-text field per achievement-shaped record: why started,
-- hardest moment, what changed, what learned, measurable outcome, who worked with — the
-- founder's own prompt list, shown as UI helper copy rather than split into seven columns
-- per table. Not CV-facing (features/profile/cv-builder.tsx doesn't read it); surfaced
-- only as candidate material when generating essay outlines
-- (lib/ai/essay-outlines.ts), and the AI is instructed to organize what's here, never
-- invent beyond it.
alter table public.activities add column story_notes text;
alter table public.projects add column story_notes text;
alter table public.awards add column story_notes text;
alter table public.research_experiences add column story_notes text;
alter table public.volunteering_experiences add column story_notes text;
alter table public.work_experiences add column story_notes text;
alter table public.sports_experiences add column story_notes text;
