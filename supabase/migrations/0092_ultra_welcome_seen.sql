-- Phase 57 / founder request 2026-09-02, verbatim: "ultra alındıktan sonra 'ultraya hoş
-- geldiniz' yazısı çıkması lazım" (once Ultra is acquired, a "welcome to Ultra" message
-- needs to show). Written, NOT applied -- house pattern (0076/0086/0088/0089/0090/0091):
-- lib/tier/ultra-welcome.ts's shouldShowUltraWelcome() treats an absent/unreadable value
-- the same as "cannot durably record having shown it," and deliberately does NOT show the
-- welcome in that case -- see that file's own comment for why showing something this
-- migration can't yet record would risk it firing more than once, the opposite of what it
-- exists to guarantee. The app is correct with or without this migration applied; a
-- genuinely Ultra student in that narrow pre-apply window simply doesn't see the welcome
-- yet, rather than seeing it unrecorded or repeatedly.
alter table public.profiles
  add column if not exists ultra_welcome_seen_at timestamptz;

comment on column public.profiles.ultra_welcome_seen_at is
  'When this student was shown the one-time "welcome to Ultra" moment (Phase 57), or null if never. Set exactly once, synchronously, in the same request that decides to show it (lib/tier/ultra-welcome.ts, app/(app)/dashboard/page.tsx) -- never cleared, never reset afterward. Absence (pre-migration) is read as "cannot show yet," not as "never seen" -- see that file for the distinction and why it matters.';
