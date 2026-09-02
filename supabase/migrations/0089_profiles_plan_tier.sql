-- Ultra visual-tier foundation (founder-approved, 2026-09-02): adds the one piece of real
-- data every surface needs to know which skin to render. Written, NOT applied -- house
-- pattern (0076, 0086, 0088): every read below defaults an absent/unreadable value to
-- 'standard', so the app is correct with or without this migration applied.
--
-- Deliberately just a label, not a subscription system: no payment, no upgrade flow, no
-- billing table, per CEO's own explicit scope for this pass ("skin only"). Same category of
-- field as profiles.preferred_language or profiles.curriculum -- descriptive data with no
-- side effects of its own. If a real subscription/billing model lands later, this column
-- either gets driven by it (one write path, this column unchanged) or gets absorbed into it
-- -- deliberately reversible either way, not a commitment to a bigger system tonight.
--
-- Why the skin follows this column and not a per-message response-mode toggle (a
-- fast/thorough answer-style control the founder also mentioned): they answer different
-- questions. A paying student who picks a faster response mode is still a paying student --
-- the product they're paying for shouldn't visually downgrade because of an unrelated
-- per-message choice. No such toggle exists in the codebase yet (checked: no "response
-- mode"/"Hızlı" control anywhere in app/ or features/) -- this column is the one, real,
-- durable signal, ready whichever surface it ends up wired to.
--
-- 'standard' default means every existing and future profile is unaffected until something
-- deliberately sets 'ultra' -- constraint #1 (standard must not change) holds by construction
-- at the data layer too, not just in the CSS that reads it.
alter table public.profiles
  add column if not exists plan_tier text not null default 'standard'
  check (plan_tier in ('standard', 'ultra'));

comment on column public.profiles.plan_tier is
  'Which visual skin this student sees -- ''standard'' (default, everyone today) or ''ultra''. A label, not a subscription: no billing/payment logic reads or writes this column. See migration 0089''s own header for why this exists separately from any future response-mode/answer-style setting.';
