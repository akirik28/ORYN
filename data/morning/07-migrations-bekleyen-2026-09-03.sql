-- ══════════════════════════════════════════════════════════════════════════
-- ORYN — BEKLEYEN MİGRASYONLAR  (3 Eylül 2026 akşamı)
--
-- Bu dosya, bugün YAZILAN ama HENÜZ UYGULANMAYAN 7 migrasyonu sırasıyla
-- birleştirir. Hepsi tek bir işlemde çalışır: biri hata verirse HİÇBİRİ
-- uygulanmaz. Supabase SQL Editor'e olduğu gibi yapıştır ve çalıştır.
--
-- ÖNEMLİ: Bu dosya bir kez çalıştırılmak üzere yazıldı. Bazı bölümlerde
-- "if not exists" yok — ikinci kez çalıştırırsan hata verir. Bu bir sorun
-- değil, sadece "zaten uygulanmış" demektir.
--
-- Sıra numaraları migrasyon dosyalarının kendi sırası. 0113 (geri bildirim formu)
-- akşam yazıldı ve bu dosyaya eklendi -- toplam 8 migrasyon.
-- ══════════════════════════════════════════════════════════════════════════

begin;


-- ══════════════════════════════════════════════════════════════════
-- 0107_page_views.sql
-- ══════════════════════════════════════════════════════════════════
-- Anonymous page-view counting (2026-09-03) -- the founder's own ask when he approved the
-- control centre design: "uygulamayı kaç kişi izlemiş falan her şey orda olmalı" (how many
-- people have looked at the app, all of it should be there). Scoped to logged-out visitors:
-- authenticated usage is already counted via profiles/product_events, so this table only
-- ever receives writes from the public landing page (lib/analytics/page-views.ts).
--
-- Minor-safe by construction, not by policy: visitor_hash is a one-way SHA-256 of a
-- server-only secret + the UTC calendar date + the request's IP + its user agent, computed
-- and discarded in the same request that reads it -- no IP, no user agent, and no cookie or
-- other client-side identifier is ever stored. Including the date in the hash input means
-- the same visitor produces a different hash every day: this table can answer "how many
-- distinct hashes were seen today" but cannot link one visitor's activity across two
-- different days, and there is nothing on the client to expire or clear because nothing is
-- ever set there. See PAGE_VIEW_HASH_SECRET in .env.example/API_SETUP.md for the secret
-- itself, and lib/admin/queries.ts's getPageViewStats for how this is read.
--
-- No RLS policy at all, matching admin_action_log/provider_health/external_sync_jobs --
-- "ops tables get no policy at all -- service-role access only" (migration 0014's own
-- framing, migration 0097's citation of it). Every write goes through the admin client from
-- lib/analytics/page-views.ts; there is no path by which a normal client should ever read or
-- write this table.
--
-- Proposed, not yet applied to the live database as of 2026-09-03 -- see
-- docs/founder-morning-runbook-2026-09-02.md for why schema changes wait on explicit
-- founder sign-off rather than landing silently alongside the code that uses them. The
-- application code that writes to and reads from this table (lib/analytics/page-views.ts,
-- lib/admin/queries.ts's getPageViewStats) already degrades to an honest "not measured"
-- state when this table is absent, so nothing breaks before this migration is applied.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  visitor_hash text not null
);

comment on table public.page_views is
  'Anonymous logged-out page views (2026-09-03) -- no IP, user agent, or cookie is ever stored. See this migration''s own header for the visitor_hash construction and why it cannot identify a visitor or link their activity across days.';
comment on column public.page_views.path is
  'Pathname only, e.g. ''/'' -- never the full URL, so an accidental query-string value (a referral token, an email in a link) can never end up stored here.';
comment on column public.page_views.visitor_hash is
  'sha256(secret + UTC date + IP + user agent), computed server-side and discarded immediately -- not reversible to an IP or user agent, and changes daily for the same visitor by design. Distinct count within a single day is an accurate distinct-visitor count; summed across multiple days it over-counts (a returning visitor gets a new hash each day), so multi-day totals in the UI are labeled as page views, not visitors.';

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;


-- ══════════════════════════════════════════════════════════════════
-- 0108_academic_tier.sql
-- ══════════════════════════════════════════════════════════════════
-- Written not applied, same discipline as every migration in this project written ahead of a
-- founder decision (e.g. 0104/0106's ultra_gift). Proposed in response to a founder decision
-- that's been open since the Netherlands hogescholen batch and now blocks five countries'
-- worth of staged, dry-run-validated, not-yet-applied institution data:
-- data/research/sql-dry-runs/universities/{netherlands-hbo,germany-haw,finland-amk,
-- austria-fh,ireland-tu}-2026-09-03.sql (275 rows total). All five write institution_type as
-- NULL specifically because that column is occupied table-wide by US College-Scorecard-style
-- ownership classification ('university'/'Public'/'Private not for Profit'/etc, 1,019 existing
-- rows) -- a different axis than academic tier, and writing a tier value into it would
-- misrepresent it as ownership data for every future reader. See each batch's own findings doc
-- for the full per-country reasoning; this migration is the schema-level follow-through.
--
-- THE NAMING QUESTION, ANSWERED WITH TWO COLUMNS, NOT ONE
--
-- A Fachhochschule, an ammattikorkeakoulu, and an Irish Technological University are related
-- but not the same institutional form, and flattening them into one label loses exactly what a
-- student researching universities abroad needs: the actual local term, not a lossy English
-- gloss of it. So this proposes two columns doing two different jobs:
--
--   academic_tier (enum, 2 values): the shared, cross-country CLASS -- the thing a control or
--   a filter can group on without knowing five countries' vocabularies. 'research_university'
--   vs 'applied_sciences'. Deliberately NOT a bigger enum with a value per country/form --
--   that would just be institution_type's problem (a column meant for grouping, cluttered with
--   values that don't group) recreated one level up.
--
--   academic_tier_local_name (free text, not enum): the actual local-language institutional
--   form -- 'Fachhochschule', 'Hogeschool', 'Ammattikorkeakoulu', 'Technological University'.
--   Free text, not an enum, for the same reason institution_type already is: this axis is
--   genuinely open-ended (Switzerland's Fachhochschule system, Austria's -- already staged and
--   using the same German word as Germany's, correctly, since it is the same term -- Belgium's
--   Hogeschool/Haute École split, whatever the next country turns out to use) and a closed enum
--   would need a migration every time a sixth country's data landed. `country` already
--   distinguishes which nation's Fachhochschule a given row is; local_name does not need to
--   re-encode that.
--
-- THE ONE CASE THIS DESIGN DOESN'T RESOLVE ON ITS OWN: IRELAND
--
-- Ireland's five Technological Universities are legally, currently, full universities --
-- converted from Institutes of Technology by statute, the same mechanism as the UK's 1992
-- polytechnic conversions, with degree-awarding powers no different in law from Trinity or
-- UCD. Every other country in this batch (NL/DE/FI/AT) uses a word for its applied-sciences
-- tier specifically because that tier is legally distinct from "university" in that country
-- *today*. Ireland's TUs are not in that position anymore.
--
-- Two defensible answers, and this migration does not pick one by fiat:
--   (a) academic_tier = 'research_university' for all 5 Irish TUs -- correct by current legal
--       status, consistent with every other Irish university row already in the catalogue.
--   (b) academic_tier = 'applied_sciences' for all 5 -- correct by lineage and by the product
--       reason this whole corridor-gap line of work exists: the corridor scan's own finding
--       was that the applied-sciences tier is specifically the more accessible admission route
--       for a Turkish applicant, and Ireland's TUs are the control case for exactly why some
--       applied-sciences-lineage institutions already read as ordinary universities in this
--       catalogue while others didn't -- they got the word "University" in their name.
--       Classifying them as 'research_university' here would repeat that same accident at the
--       schema level instead of correcting it.
--
-- This migration leans toward (b) in the comment below because it matches why this data was
-- sourced in the first place, but says so rather than deciding it silently.
--
-- 2026-09-03 UPDATE: the admissions-mechanism half of this open question has been checked and
-- answered -- Irish TU admissions today are NOT, in practice, materially different from
-- Dublin/UCC/Galway's. TU Dublin's own CAO entry-requirements page and CAO's own unified Level 8
-- points list both confirm the identical points-and-tiebreak mechanism, with the same
-- restricted-course exceptions every CAO-route HEI carries, no TU-specific process. Structural
-- reason: the Technological Universities Act 2018 dissolved the Institutes of Technology outright
-- rather than creating a parallel statute the way Austria's FHStG or Finland's
-- ammattikorkeakoululaki did -- see docs/research/admissions-systems/ireland.md's own 2026-09-03
-- addendum for the full sourcing. This resolves the factual/admissions half of the open question
-- this comment originally flagged; the (a)-vs-(b) academic_tier lineage-classification choice
-- below is unaffected by it and remains the founder's call.
--
-- ABSENCE, NOT UNKNOWN-AS-A-VALUE
--
-- academic_tier is nullable, and NULL means "not yet classified" -- not "is a research
-- university," and not "is applied sciences" either. This migration does NOT backfill the
-- 1,019 existing rows (verified directly before writing this: 1,019 total, 17 already with a
-- null institution_type for unrelated reasons). Backfilling 1,019 rows with a real, checked
-- classification is a second, separate, and non-trivial research task this migration does not
-- attempt -- most of those rows are traditional research universities where the honest answer
-- is genuinely 'research_university', but "genuinely likely" is not the same discipline this
-- whole night's work has held every other claim to, and a bulk UPDATE assuming it without
-- checking would be exactly the kind of confident-output-from-absent-data problem Phase 4 of
-- this project's own build spec exists to prevent.
--
-- What IS ready the moment this migration is approved: the 275 rows in the five staged
-- applied-sciences files, and the 2 rows in the Netherlands WO-gap file, all have a known,
-- already-researched classification. None of the six files write academic_tier today, because
-- the column didn't exist when they were written. Applying them as-is after this migration
-- lands would leave 277 more rows at NULL alongside the 1,019 -- so if this is approved, the
-- follow-up is editing those six already-staged (five already merged to main) files to add
-- real academic_tier / academic_tier_local_name values before they're applied, not a bulk
-- UPDATE afterward. Flagged as the next step, not done here -- five of those six files are
-- already merged, and rewriting merged files is its own decision to surface rather than do
-- unasked.
--
-- WHAT THIS MIGRATION DOES NOT BUY
--
-- A column no page reads changes nothing for a student. institution_type -- the column this
-- one is deliberately not overloading -- is already rendered today: as a plain badge on both
-- the university card (features/universities/university-card.tsx) and the detail page
-- (app/(app)/universities/[id]/page.tsx), and as a public/private filter
-- (lib/universities/filters.ts, InstitutionTypeFilter, currently exactly two values, with its
-- own bilingual EN/TR label map). None of that exists yet for academic_tier. Surfacing it to a
-- student -- a filter, a badge distinct from the ownership one, a compare-page column, Turkish
-- strings alongside the English ones the way the existing filter already has them -- is real,
-- separate front-end work this migration does not include and does not estimate. Approving the
-- column is a data-modeling decision; approving a visible feature is a second, later one.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'academic_tier') then
    create type academic_tier as enum ('research_university', 'applied_sciences');
  end if;
end $$;

alter table public.universities add column if not exists academic_tier academic_tier;
alter table public.universities add column if not exists academic_tier_local_name text;

comment on column public.universities.academic_tier is
  'Migration 0108, written not applied — the shared cross-country class distinguishing a research university from the applied-sciences/polytechnic tier (Fachhochschule/hogeschool/ammattikorkeakoulu/Technological University). NULL means not yet classified, not "is a research university" — this column is not backfilled for the 1,019 pre-existing rows as part of this migration; that is separate, unattempted future research. Where a row''s institution_type is already occupied by US College-Scorecard-style ownership data (public/private/nonprofit), academic_tier is the correct place for tier instead, not institution_type.';

comment on column public.universities.academic_tier_local_name is
  'Migration 0108, written not applied — the actual local-language institutional form (e.g. "Fachhochschule", "Hogeschool", "Ammattikorkeakoulu", "Technological University"), free text rather than enum because this axis is genuinely open-ended across countries not yet in the catalogue. NULL means not yet classified. Paired with academic_tier (the shared class) and country (which nation''s form this is) — this column does not repeat the country.';


-- ══════════════════════════════════════════════════════════════════
-- 0109_curriculum_other_text.sql
-- ══════════════════════════════════════════════════════════════════
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

alter table public.profiles add column if not exists curriculum_other_text text;
alter table public.education_records add column if not exists curriculum_other_text text;

comment on column public.profiles.curriculum_other_text is
  'Free text for what "other" means when profiles.curriculum = ''other'' -- optional, max 100 chars (app-enforced). See this migration''s own header for why no CHECK constraint and no school-name/address scope creep.';
comment on column public.education_records.curriculum_other_text is
  'Free text for what "other" means when education_records.curriculum = ''other'' -- optional, max 100 chars (app-enforced). The copy that matters for a student with more than one education_records row.';


-- ══════════════════════════════════════════════════════════════════
-- 0110_advisor_generation_lock.sql
-- ══════════════════════════════════════════════════════════════════
-- Enforces docs/ozellesme-spec-2026-09-03.md §"Ne satın alınıyor" / "Eşzamanlı üretim ikisinde
-- de bir tane": at most one advisor reply may be generating for a given student at any moment,
-- Standard and Ultra alike -- Ultra buys more conversations (piece 1, oryn-11), never more
-- parallel generation. Written, not applied -- house pattern (0076, 0086, 0088, 0106, 0107,
-- 0108); lib/advisor/generation-lock.ts degrades to fail-open (never blocks a reply) via
-- isUndefinedTableError until this lands, matching every other unapplied-migration path in
-- this codebase.
--
-- One row per user, present only while a generation is actually in flight -- not a boolean
-- column on `profiles`, because the interesting content is *when it started*, not just *that
-- it's running*: `started_at` is what lets a crashed or timed-out request's lock be reclaimed
-- rather than permanently wedging that student's advisor (the same "never permanently blocking"
-- posture lib/advisor/upgrade-prompt.ts's own header states for a different mechanism). A
-- dedicated table rather than another nullable column on the already-crowded `profiles` follows
-- this codebase's own normalization discipline (advisor_conversations/advisor_messages are
-- already separate tables for the same reason) and keeps the lock's lifecycle -- insert on
-- acquire, delete on release -- independent of every other profile write.
--
-- Both operations are Postgres functions, not application-code read-then-write, because the
-- one property this mechanism exists to guarantee is atomicity: two requests racing (a double-
-- click, two tabs) must not both observe "no lock held". `acquire_advisor_generation_lock`'s
-- `insert ... on conflict (user_id) do update ... where <stale>` is a single statement --
-- Postgres either inserts a fresh row, replaces a stale one, or (the ordinary contested case)
-- turns the update into a no-op and returns zero rows, all as one atomic operation with no
-- window for a second caller to interleave. A `select` followed by a conditional `insert` from
-- TypeScript would have exactly that window.
create table if not exists public.advisor_generation_locks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.advisor_generation_locks enable row level security;
drop policy if exists "owner full access" on public.advisor_generation_locks;
create policy "owner full access" on public.advisor_generation_locks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Returns the lock's started_at on success, NULL if a fresh (non-stale) lock is already held
-- by this user -- the caller (lib/advisor/generation-lock.ts) reads NULL as "reject this
-- request", matching quota/rate-limit's own established shape of a clean, typed refusal rather
-- than a thrown error for an expected, non-exceptional outcome.
--
-- security invoker (default, stated explicitly): auth.uid() must resolve to the calling
-- session's own claim, never an elevated identity: the RLS policy above is redundant with the
-- auth.uid() scoping already inside this function, kept anyway to match this codebase's
-- established defense-in-depth posture (e.g. app/(app)/advisor/actions.ts re-verifies
-- conversation ownership despite RLS already making a foreign id harmless).
--
-- p_stale_after_seconds default 120: comfortably longer than any real advisor generation
-- (the provider call plus two DB round-trips), short enough that a genuinely crashed request
-- (an uncaught exception before the release path runs, a function timeout) doesn't leave a
-- student locked out of their own advisor for more than two minutes.
create or replace function public.acquire_advisor_generation_lock(p_stale_after_seconds integer default 120)
returns timestamptz
language sql
security invoker
as $$
  insert into public.advisor_generation_locks (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set started_at = excluded.started_at
    where public.advisor_generation_locks.started_at < now() - (p_stale_after_seconds || ' seconds')::interval
  returning started_at;
$$;

-- Deletes only the exact lock this caller acquired (matched by started_at, not just user_id) --
-- if this caller's own lock went stale and was reclaimed by a newer request while this one was
-- still (unexpectedly) running past the staleness window, this release must not delete that
-- newer, legitimately-held lock out from under it. In the overwhelmingly common case (release
-- happens well within p_stale_after_seconds) this is identical to an unconditional delete by
-- user_id; the match on started_at only matters for the crash-adjacent edge case, and costs
-- nothing to include.
create or replace function public.release_advisor_generation_lock(p_started_at timestamptz)
returns void
language sql
security invoker
as $$
  delete from public.advisor_generation_locks
  where user_id = auth.uid() and started_at = p_started_at;
$$;


-- ══════════════════════════════════════════════════════════════════
-- 0111_advisor_instructions.sql
-- ══════════════════════════════════════════════════════════════════
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


-- ══════════════════════════════════════════════════════════════════
-- 0112_advisor_conversation_retention.sql
-- ══════════════════════════════════════════════════════════════════
-- summary + summarized_at on advisor_conversations, plus an audit table for the 24-hour
-- inactivity retention rule (docs/ozellesme-spec-2026-09-03.md §3, founder decision,
-- 2026-09-03): "the clock runs on conversation inactivity, not message age... 24 hours
-- untouched: summarised, raw messages deleted, summary stays. No deletion on Ultra."
--
-- Numbered 0112, not 0109: first claimed 0109 believing the instructions/talimat lane
-- (piece 1 of the same spec, advisor_instructions on profiles) had taken it first; rebasing
-- onto origin/main found the real 0109 was a third, unrelated migration
-- (curriculum_other_text) neither lane knew about. Renumbered on rebase, not assumed --
-- see __tests__/social/posts-schema.test.ts's own migration-numbering test for the full
-- collision history this file is the latest entry in. This migration doesn't touch
-- profiles/advisor_instructions/education_records at all -- no schema overlap with either
-- of the other two, the number bump is the only coordination any of this needed.
--
-- WHY THIS IS PURELY ADDITIVE AND WHY THAT MATTERS HERE SPECIFICALLY: every column below
-- starts null/empty for every existing conversation, no backfill, no default beyond what's
-- structurally required. The retention job itself -- the thing that would actually read a
-- real student's messages and delete them -- is deliberately NOT armed by this migration or
-- by anything in this commit (see lib/advisor/retention.ts's own header): the spec is
-- explicit that this "cannot be implemented before the privacy notice says so," and
-- LEGAL_REVIEW.md §3 item 5 lists retention as an open policy question with no answer today.
-- Shipping the schema and the (off, dry-run-only) job code is preparation for that decision,
-- not an implementation of it -- exactly the same posture opportunity_reverification's
-- canAutoApplyPromotion() takes: the machinery exists and can be inspected, nothing acts.
alter table public.advisor_conversations add column if not exists summary text;
alter table public.advisor_conversations add column if not exists summarized_at timestamptz;

comment on column public.advisor_conversations.summary is
  'AI-generated summary of this conversation''s raw messages, written once by the 24-hour retention job (lib/advisor/retention.ts) immediately before those raw advisor_messages rows are deleted. Null until first summarized. Never shown as a substitute for live conversation content while raw messages still exist -- summarized_at is null in that case, which is the actual "not yet summarized" signal; a null summary with a null summarized_at and zero remaining messages means the conversation predates this feature or was never populated, not that summarization failed silently.';
comment on column public.advisor_conversations.summarized_at is
  'When summary was written -- distinct from updated_at, which keeps advancing if the student resumes the conversation after summarization. Never written on a dry run (see RunOptions.dryRun in lib/advisor/retention.ts); a real value here is proof a real AI summarization call happened and was persisted, mirroring source_verified_at''s "unforgeable by construction" contract on opportunities (migration 0103).';

-- One row per real action taken, append-only, mirroring opportunity_verification_runs
-- (migration 0103) -- an audit trail for exactly the kind of operation that most needs one:
-- irreversible deletion of a minor's own private conversation content. Deliberately does NOT
-- log a row for "not yet due" (the overwhelming majority of every pass, pure noise) -- only
-- for a conversation the job actually decided something about. Never written on a dry run,
-- same rule as the two columns above -- a dry run's findings live entirely in that call's own
-- return value, never in a persisted table, matching run-job.ts's own established contract.
create table if not exists public.advisor_conversation_retention_runs (
  id                     uuid primary key default gen_random_uuid(),
  conversation_id        uuid not null references public.advisor_conversations(id) on delete cascade,
  run_id                 uuid references public.external_sync_jobs(id) on delete set null,
  action                 text not null,
  messages_deleted_count int,
  created_at             timestamptz not null default now(),
  constraint advisor_conversation_retention_runs_action_check check (
    action in ('summarized', 'messages_deleted', 'skipped_ultra')
  )
);

comment on table public.advisor_conversation_retention_runs is
  'Append-only audit trail for the 24-hour retention job -- one row per real action on a real conversation. "summarized" and "messages_deleted" for a Standard-tier conversation usually appear as two rows from the same pass (summarize first, then delete, per this migration''s own column comments); "skipped_ultra" records a conversation that WAS due but was exempted by tier, which is itself worth auditing since it is a policy decision, not a no-op. Never contains message content -- deliberately, this table exists to prove an action happened and when, not to duplicate what was deleted.';
comment on column public.advisor_conversation_retention_runs.messages_deleted_count is
  'Set only on an action = ''messages_deleted'' row. Null (not zero) for ''summarized''/''skipped_ultra'' rows -- absence of a count where none was ever computed, not a fabricated zero.';

create index if not exists advisor_conversation_retention_runs_conversation_id_idx
  on public.advisor_conversation_retention_runs (conversation_id, created_at desc);

-- No RLS policy at all, matching opportunity_verification_runs/provider_health/
-- external_sync_jobs/admin_action_log (migration 0014's own "ops tables get no policy at
-- all -- service-role access only"). Every write and read goes through createAdminClient()
-- from inside the job route; no authenticated client path should ever reach this table.
alter table public.advisor_conversation_retention_runs enable row level security;


-- ══════════════════════════════════════════════════════════════════
-- 0113_feedback_reports.sql
-- ══════════════════════════════════════════════════════════════════
-- A place for a student to report a problem or leave feedback (2026-09-03) -- the
-- founder's own words: "sitede şikayet veya geri bildirim alacak bir yer olmalı" (there
-- should be a place on the site to receive complaints or feedback).
--
-- One table, deliberately minimal: no category (a sentence in a student's own words is
-- worth more than a taxonomy at the volume this starts at -- CEO's call, and a category
-- column is exactly the kind of thing a later migration can add once there's real triage
-- volume to justify it), no status/read tracking (same reasoning -- the admin section this
-- ships with is a plain list, not a queue that needs a workflow yet).
--
-- Context, not the person: `path` and `locale` are captured automatically by the client at
-- submit time (never asked for), `plan_tier` and `user_id` come from the server-side
-- session, never client-supplied. No name field, no email field -- the session already
-- identifies the student, and these are minors (spec Phase 12/13): the product must not ask
-- for more than the report needs. `message` is free text a student wrote, so it gets the
-- same handling as any other student-authored content in this product -- private to the
-- team that reads it, never published, never surfaced on any profile.
--
-- `user_id` is `on delete set null`, matching `admin_action_log`'s own precedent (migration
-- 0097) for the same reason stated there: an unrelated table must never be the reason a
-- real account-deletion request (spec Phase 12) can't complete. A report surviving its
-- author's deleted account, with the link to them severed, is the correct minor-safe
-- outcome, not a bug.
--
-- RLS: a student can insert their own report (`auth.uid() = user_id`, enforced at the
-- database level so a client can't spoof `user_id` even if a bug ever tried) and can read
-- back their own rows -- not anyone else's, and this table has no admin-internal column
-- (nothing like message_reports' reviewed_by/resolution_note) for a select-own policy to
-- leak. Added specifically so this table can be included in the account data export (spec
-- Phase 12) the same way ai_usage/quota_grants already are -- a student's own written
-- feedback is their data, and lib/export/tables.ts's own established rule is "select-own
-- RLS plus a plain user_id column belongs in EXPORT_TABLES." The admin panel's own read
-- (features/admin/sections/feedback-reports-section.tsx) goes through the service-role
-- client regardless, which bypasses RLS entirely and was never gated by this policy either
-- way.

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  path text not null,
  locale text not null,
  -- `profiles.plan_tier` (migration 0089) is itself a plain `text` + CHECK, not a named
  -- enum type -- matching that representation exactly rather than inventing a type that
  -- doesn't exist on the column this mirrors.
  plan_tier text not null check (plan_tier in ('standard', 'ultra')),
  created_at timestamptz not null default now()
);

comment on table public.feedback_reports is
  'A student-submitted problem report or piece of feedback (2026-09-03). No category, no status/read tracking -- deliberately minimal, see this migration''s own header. message is free text; treat it with the same care as any other student-authored content.';
comment on column public.feedback_reports.path is
  'The pathname the student was on when they opened the report form, captured automatically -- never asked for. Pathname only, never a full URL with query string, so an accidental token in a link can never end up stored here.';
comment on column public.feedback_reports.plan_tier is
  'The student''s plan_tier at submission time (server-derived from their session, never client-supplied) -- context for whoever reads the report, not something the student was asked to state.';

create index if not exists feedback_reports_created_at_idx on public.feedback_reports (created_at desc);

alter table public.feedback_reports enable row level security;

drop policy if exists "students can submit their own feedback report" on public.feedback_reports;
create policy "students can submit their own feedback report"
  on public.feedback_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "students can read their own feedback reports" on public.feedback_reports;
create policy "students can read their own feedback reports"
  on public.feedback_reports for select
  to authenticated
  using (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════
-- 0114_email_digest.sql
-- ══════════════════════════════════════════════════════════════════
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


commit;
