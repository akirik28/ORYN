-- Özelleşme piece 1: per-student standing instruction to the advisor (docs/ozellesme-spec-
-- 2026-09-03.md §1) -- founder's "kısa yaz" / "tıp önerme" / "sadece Avrupa" examples: a
-- free-text preference that applies to every advisor call, not a per-message toggle like
-- profiles.response_mode (migration 0091). Written, NOT applied -- house pattern (0076, 0086,
-- 0088, 0089, 0090, 0091): lib/tier/advisor-instructions.ts's resolveAdvisorInstructions
-- defaults an absent/unreadable value to null (no instruction), so the app is correct with or
-- without this migration applied.
--
-- One column on `profiles`, not `advisor_conversations`: the spec is explicit the instruction
-- is permanent and per-student ("Her sohbette, her istemde geçerli" -- every chat, every
-- prompt), not scoped to one conversation. Ultra's unlimited-sessions capability (özelleşme
-- piece 2) would otherwise raise the question of which conversation's instruction wins; a
-- single profile-level column has no such question.
--
-- No CHECK tied to plan_tier: the 500 (Standard) / 2,000 (Ultra) split is enforced in
-- application code (app/(app)/settings/actions.ts's updateAdvisorInstructions), the same
-- place migration 0091's "thorough" response-mode gate lives, not here. A tier-aware
-- constraint on this column would re-validate on every future UPDATE to the row regardless of
-- whether advisor_instructions is even part of that statement, so a student's plan_tier
-- ever moving down while a longer instruction is still stored would start rejecting unrelated
-- profile writes. The flat 2,000-char ceiling below has no such failure mode -- it never
-- depends on another column, so it can only ever reject a write to this column itself.
alter table public.profiles
  add column if not exists advisor_instructions text
  check (advisor_instructions is null or char_length(advisor_instructions) <= 2000);

comment on column public.profiles.advisor_instructions is
  'Student-authored standing instruction to the advisor ("write short", "don''t suggest medicine", "Europe only") -- included in every advisor_chat system prompt (lib/ai/student-context.ts''s formatContextForPrompt). Null means no instruction set. Length is capped at 2,000 characters here as an absolute, tier-independent backstop; the real, tier-aware limit (500 Standard / 2,000 Ultra) is enforced server-side in app/(app)/settings/actions.ts''s updateAdvisorInstructions, since it depends on plan_tier and a CHECK constraint referencing another column would re-validate on every unrelated write to the row.';

-- Re-run safe. Every statement above is guarded, so applying this file twice is a no-op
-- rather than an error — same discipline 0076's own header documents the incident behind.
