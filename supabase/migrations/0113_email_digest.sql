-- Two columns on profiles for the periodic email digest (founder, 2026-09-03, verbatim:
-- "dönemden döneme kullanıcılara mail gitmeli, standard alanlara ve ultra alanlara aynı da
-- farklı da olur, bunlara karar ver uygula" -- periodic email to students, same or different
-- fields for standard/ultra, decide and implement). Full reasoning in
-- docs/digest-email-design-2026-09-03.md; this migration is the schema half only.
--
-- BUILT, DELIBERATELY NOT ARMED -- same posture as advisor_conversation_retention
-- (migration 0112) and opportunity_reverification's canAutoApplyPromotion(): the mechanism
-- exists and can be inspected, nothing sends. Two independent reasons, not one: (1) no
-- email-sending infrastructure exists anywhere in this codebase at all (confirmed by grep,
-- docs/email-audit-transactional-vs-commercial-2026-09-03.md) -- there is no provider to wire
-- even if the legal question were already settled; (2) İYS (Law 6563) requires its own
-- registered consent for a commercial electronic message, and while this digest's own content
-- is designed to read as transactional (no promotional content -- see the design doc's
-- classification section), that reading is this document's own, not counsel's yet.
--
-- digest_email_enabled exists specifically because the founder's own instruction and CEO's
-- explicit design constraint both require an unsubscribe path to exist in the design even
-- though nothing ships yet -- "retrofitting one is how products end up non-compliant."
-- Defaults true, matching every one of the seven existing notify_* in-app categories
-- (migration 0090) -- an opt-out default is the right posture for content this document
-- classifies as transactional/service information about the student's own saved deadlines
-- and profile-matched opportunities, not for unsolicited marketing, which would need the
-- opposite (opt-in) default under İYS if this reasoning turns out to be wrong.
alter table public.profiles add column if not exists digest_email_enabled boolean not null default true;

comment on column public.profiles.digest_email_enabled is
  'Student-controlled opt-out for the periodic email digest (lib/digest/). Defaults true, matching the seven notify_* in-app categories (migration 0090) -- see that default''s own reasoning in this migration''s header for why an opt-out (not opt-in) default was chosen. Has no live effect today: nothing calls lib/digest/run.ts with dryRun:false anywhere, and no cron entry exists (lib/jobs/schedule.ts unchanged by this migration) -- this column exists so the preference is real and inspectable before the sending decision is made, not after.';

-- Drives "what is new since the student's last digest" for the opportunity-match section --
-- see lib/digest/build.ts. Null means "never received one" (or the mechanism was never armed,
-- which is every real account today) -- read as "everything currently eligible counts as new"
-- by the content builder, not as an error or a zero. Only ever written by
-- lib/digest/run.ts's own runDigestPass, and only when dryRun is explicitly false -- which no
-- real caller sets today, so this column stays null on every live row until a founder decision
-- arms the job, the same contract advisor_conversations.summarized_at (migration 0112) already
-- established for its own job.
alter table public.profiles add column if not exists last_digest_sent_at timestamptz;

comment on column public.profiles.last_digest_sent_at is
  'When this student''s last email digest was actually sent -- never written on a dry run (lib/digest/run.ts). Null means never sent, which includes every real account today, since nothing arms this job. Drives the opportunity-match section''s "new since last time" window in lib/digest/build.ts; a null value there is read as "nothing to compare against yet," not defaulted to any particular lookback window.';
