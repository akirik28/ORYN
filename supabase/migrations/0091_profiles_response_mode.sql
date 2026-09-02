-- Response-mode slider (founder-approved prototype, 2026-09-02: oryn-bar-motion.html) --
-- Fast / Standard / Ultra as the student-facing labels, "hızlı standart ultra kayacının
-- tasarımı var zaten yaptın ya o çok güzeldi". Written, NOT applied -- house pattern (0076,
-- 0086, 0088, 0089, 0090): every read below defaults an absent/unreadable value to
-- 'balanced', so the app is correct with or without this migration applied.
--
-- Deliberately NOT 'standard'/'ultra' as the stored values, even though those are exactly
-- the founder-approved UI labels for two of the three positions. profiles.plan_tier
-- (migration 0089) already uses the literal strings 'standard' and 'ultra' for a
-- completely different concept -- which visual skin renders, not which model answers.
-- Two columns on the same table both containing the string 'ultra' is not a query-
-- ambiguity risk (the column name always disambiguates a WHERE clause) but it is a real
-- human-confusion one: "which ultra" is exactly the kind of question that costs nothing to
-- rule out now and gets genuinely annoying once both columns hold real data for real
-- students. 'fast'/'balanced'/'thorough' internally; "Fast"/"Standard"/"Ultra" only ever
-- as the catalog-driven label a student sees (messages/{en,tr}.json), never read back out
-- of the database as if it were the display string.
--
-- This is a different axis from plan_tier by explicit prior design, not a decision made
-- here: migration 0089's own header already states it -- "a paying student who picks a
-- faster response mode is still a paying student, the product they're paying for shouldn't
-- visually downgrade because of an unrelated per-message choice." Nothing in this file or
-- anywhere reads plan_tier to decide response_mode's default, or the reverse.
--
-- Spend-based degrade (lib/ai/limits/budget.ts) always overrides this column's effect on
-- which model actually answers -- a student picking 'thorough' while already past the
-- $0.50 target still gets the cheaper model, same as an unselected default would. This
-- column records the student's *preference*, not a guarantee of which model runs; it stays
-- selectable and saved even while overridden, matching this product's own "never a hard
-- wall" posture elsewhere -- a student setting today's preference for after next month's
-- reset is a real thing to want, not a dead control.
alter table public.profiles
  add column if not exists response_mode text not null default 'balanced'
  check (response_mode in ('fast', 'balanced', 'thorough'));

comment on column public.profiles.response_mode is
  'Which model/prompt style answers this student''s advisor chat, absent an active spend-degrade override -- ''fast'' (Haiku, same model the degrade path already uses), ''balanced'' (default, the ceiling model with today''s prompt), or ''thorough'' (the ceiling model with a longer-answer instruction). Displayed to the student as "Fast"/"Standard"/"Ultra" (messages/{en,tr}.json) -- never these raw values. A label of student intent, not a live guarantee: lib/ai/limits/budget.ts''s spend-based degrade always overrides which model actually runs a given call. See migration 0091''s own header for why this is a separate axis from plan_tier, including why the stored values deliberately do not reuse plan_tier''s ''standard''/''ultra'' strings.';

-- Re-run safe. Every statement above is guarded, so applying this file twice is a no-op
-- rather than an error — same discipline 0076's own header documents the incident behind.
