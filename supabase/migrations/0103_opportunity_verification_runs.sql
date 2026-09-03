-- source_verified_at + opportunity_verification_runs -- the field docs/opportunity-
-- reverification-job-design-2026-08-23.md section 8.5 specifies and section 8.2's runs
-- table, built to that design's semantic contract exactly (CEO dispatch, 2026-09-03: three
-- confirmed instances of the shape this closes -- Stanford Anesthesia, ISSYP, Kadir Has).
-- Numbered 0103: 0102 is the confirmed true max across every remote branch as of this
-- writing (this session's own weekly_plan_budget_settings, already merged); 0101 is claimed
-- by another lane but not yet found on any remote branch, so 0103 stays clear of it too.
--
-- WHY A NEW FIELD, NOT A FIX TO THE TWO THAT EXIST -- see §1.5 of the design doc for the
-- full argument; restated here only as the one-line version because it is the reason this
-- migration exists at all. `verified_at` (0041) and `last_verified_at` (0008) both mean
-- "some pipeline touched this row around this date" -- one is 69% hand-entered midnight
-- dates, the other is either the same OR an unattended Tavily search hit stamped at insert
-- time (lib/opportunities/discover.ts, fixed alongside this migration to stop writing it).
-- Neither has ever meant "Oryn fetched the official source and confirmed the facts a
-- student would act on" -- Stanford Anesthesia carried a fresh `verified_at` while its own
-- page said applications were closed. `source_verified_at` is a new fact, not a reinterpretation
-- of an old one, and it starts null everywhere on purpose (see the column comment below).
--
-- NO BACKFILL, NO DEFAULT -- design doc §8.6 names the one-line `coalesce(verified_at,
-- last_verified_at)` backfill explicitly and refuses it: every value it would write violates
-- at least four of §8.5's seven preconditions (no runs row, no excerpt, no fetch, no
-- integrity guard), and it would launder 138/201 hand-typed dates and at least one live
-- Tavily-search stamp into a claim that Oryn read 392 official sources it never touched.
-- This migration adds the column with no `default` and no backfilling `update` -- the
-- column starts null for every existing row and only becomes non-null one P1 outcome at a
-- time, from the reverification job itself.
alter table public.opportunities add column if not exists source_verified_at timestamptz;

comment on column public.opportunities.source_verified_at is
  'Design doc §8.5''s semantic contract, implemented verbatim: at this instant, Oryn fetched this opportunity''s official source, passed every integrity guard, and located in the returned content the decision-critical facts stored on this row (whether the cycle is accepting applications, and the deadline where one is stated). Written ONLY by a P1 outcome (p1_confirmed/p1_changed) in lib/opportunities/reverification/, in the same operation as the opportunity_verification_runs row that proves it -- see that table''s own comment. Never written by this migration (no default, no backfill), never copied from verified_at/last_verified_at, never advanced by a P2/P3/P4/transport-error attempt. Null means "not yet established" -- by absence-of-a-run OR by a source that cannot be read -- and is NEVER read as staleness (design doc §3.3, §7.2a''s corollary); nothing in this codebase gates recommendation on this column being non-null.';

-- Design doc §8.2, reproduced field-for-field with the schema this migration actually ships
-- (the design deliberately left the DDL unspecified -- "schema decisions are reserved... made
-- from the real records this job produces, not from this document's theory about them" --
-- so this is that decision, made now that the job is being built).
--
-- fetch_attempts / final_url / failure_class are the three fields §8.2 calls out as forced
-- by a §7 finding rather than added for completeness: fetch_attempts makes the §7.3 ladder
-- auditable (research.ku.edu.tr returned 403 or 200 to the identical tool depending only on
-- a header -- without the per-rung record, "unreadable" is an assertion, not evidence);
-- final_url exists because a 301 was being misread as a block; failure_class exists because
-- §7.5 shows "failed" collapses four facts (blocked / transport / dns / reached_unusable)
-- with different retry policies.
--
-- outcome also accepts 'lease_claimed' (design doc §2.2's row-level lease, "an equivalent
-- conditional update" to `FOR UPDATE SKIP LOCKED` -- not available through this app's
-- PostgREST-only access pattern). A transient, non-terminal marker inserted immediately
-- before a row's fetch begins (next_check_at = now + 15 min, every other field null) so a
-- second concurrent invocation's due-set query -- itself reading "the latest run per
-- opportunity", per §2.1's "the due set is derived from stored state, never from run state"
-- -- sees this row as not-yet-due and skips it, without any column or lock outside this
-- already-append-only table. The row's REAL outcome is a second, separate insert once the
-- fetch completes (or fails) -- the runs table stays append-only exactly as §2.1 specifies,
-- and reporting/aggregation (design doc §10.3) must exclude lease_claimed rows, since they
-- describe a claim in progress, not a completed attempt.
create table if not exists public.opportunity_verification_runs (
  id                     uuid primary key default gen_random_uuid(),
  opportunity_id         uuid not null references public.opportunities(id) on delete cascade,
  run_id                 uuid references public.external_sync_jobs(id) on delete set null,
  attempted_url          text not null,
  final_url              text,
  fetch_method           text,
  fetch_attempts         jsonb not null default '[]'::jsonb,
  outcome                text not null,
  evidence_class         text,
  failure_class          text,
  http_status            int,
  matched_excerpt        text,
  detected_deadline      date,
  detected_cycle_signal  text,
  proposed_change        jsonb,
  applied                boolean not null default false,
  consecutive_failures   int not null default 0,
  next_check_at          timestamptz,
  error                  text,
  created_at             timestamptz not null default now(),
  constraint opportunity_verification_runs_outcome_check check (
    outcome in ('p1_confirmed', 'p1_changed', 'p2_unreadable', 'p3_secondary_only', 'p4_contradicted', 'transport_error', 'lease_claimed')
  ),
  constraint opportunity_verification_runs_evidence_class_check check (
    evidence_class is null or evidence_class in ('P1', 'P2', 'P3', 'P4')
  )
);

comment on table public.opportunity_verification_runs is
  'Append-only audit trail, one row per fetch attempt (design doc §8.2) -- "what was checked, when, by what, and with what outcome," joined to external_sync_jobs via run_id for the run that produced it. On delete cascade is deliberate: these rows are about an opportunity and meaningless without it (contrast Phase 58''s warning against cascades that can destroy global data -- this cascade destroys only the audit of a row being deleted anyway, per that same migration''s own precedent). Precondition 6 of §8.5''s seven: a row here committed FIRST, in the same operation, is what makes opportunities.source_verified_at unforgeable by construction -- every non-null value has a real runs row behind it carrying the URL, the fetch ladder, the HTTP status and the excerpt the verdict rests on.';
comment on column public.opportunity_verification_runs.fetch_attempts is
  'Per-rung ladder result (design doc §7.3): [{rung, method, http_status, bytes, error}, ...]. Readability is a property of (tool, headers, redirect policy, moment), not of a domain -- measured directly on research.ku.edu.tr, 403/919B and 200/220KB from the identical tool in the identical minute, differing only in User-Agent -- so "unreadable" must always carry what was actually tried, never just a final verdict.';
comment on column public.opportunity_verification_runs.evidence_class is
  'P1-P4 per this project''s standing evidence taxonomy, null for a transport_error (not an answer; a failure to get one).';
comment on column public.opportunity_verification_runs.failure_class is
  'Design doc §7.5: blocked (403/429 after the full ladder) | transport (timeout/5xx/reset) | dns (does not resolve -- weak evidence about the organisation, still never a demotion) | reached_unusable (200 but under the content floor, wrong page, or PDF-only). Null for a P1/P3 outcome.';
comment on column public.opportunity_verification_runs.matched_excerpt is
  'Design doc §8.3''s excerpt-or-nothing rule: any run claiming a P1 outcome must carry a non-empty excerpt that is a literal substring of the fetched content, checked at write time in lib/opportunities/reverification/classify.ts -- "I fetched it successfully" is mechanically unassertable without one.';
comment on column public.opportunity_verification_runs.proposed_change is
  'What this run would write to opportunities (cycle_status/deadline), never applied directly here -- design doc §9''s demotion envelope decides `applied` separately, subject to the volume guard (>=3 of 25 demotions in one run applies none of them) and REVERIFY_ALLOW_DEMOTION.';
comment on column public.opportunity_verification_runs.consecutive_failures is
  'Non-P1 attempts in a row for this opportunity. At 4, design doc §6.4 retires the row from automatic scheduling (excluded from the due-set query) and routes it to the human-review queue with `failure_class` as the blocker -- chosen from the backoff arithmetic (1+2+4+8=15 days), not preference.';
comment on column public.opportunity_verification_runs.next_check_at is
  'This row''s own scheduling output -- design doc §3''s TTL for a P1, or §6.3''s backoff (min(2^(attempt-1) days, 30 days)) for anything else. The due-set query reads the LATEST run per opportunity (max(created_at)), never a column on opportunities itself -- design doc §8.4 explicitly rules out a denormalized last_machine_check_at column ("this table and §1.2/§1.5 are a standing demonstration of what an extra overlapping timestamp on opportunities costs in comprehension").';

create index if not exists opportunity_verification_runs_opportunity_id_created_at_idx
  on public.opportunity_verification_runs (opportunity_id, created_at desc);
create index if not exists opportunity_verification_runs_run_id_idx
  on public.opportunity_verification_runs (run_id) where run_id is not null;

-- The one query PostgREST cannot express directly: "the latest run per opportunity",
-- design doc §2.1's "the due set is derived from stored state" made concrete. A raw
-- `select *` ordered by created_at desc and reduced client-side would work at today's
-- corpus size but grows unboundedly with the RUNS table (which accumulates many rows per
-- opportunity over months), not with the opportunity count itself -- exactly the shape
-- lib/opportunities/discover.ts's own "fine at single-digit-thousands, revisit if the
-- catalog grows much larger" comment already flags for a bounded-by-corpus-size read; this
-- one is not bounded that way, so it gets a real query instead of a JS reduction.
--
-- `distinct on` intentionally does NOT filter out `outcome = 'lease_claimed'` rows -- a
-- fresh lease claim (next_check_at = now + 15 min) MUST become "latest" for its
-- opportunity, or a second concurrent invocation's due-set read would see the row's
-- previous real outcome instead and claim it too, defeating §2.2's whole purpose. A run
-- that crashes between claiming and writing its real outcome leaves a stale lease as
-- "latest" for at most its own 15-minute window -- self-healing once that expires, per
-- §2.2's own stated tradeoff ("a crashed run costs at most one lease period of delay").
create or replace view public.opportunity_verification_latest as
select distinct on (opportunity_id)
  opportunity_id,
  id as latest_run_id,
  outcome,
  evidence_class,
  next_check_at,
  consecutive_failures,
  created_at as last_checked_at
from public.opportunity_verification_runs
order by opportunity_id, created_at desc;

comment on view public.opportunity_verification_latest is
  'One row per opportunity that has at least one opportunity_verification_runs row -- the latest one, by created_at, including lease_claimed rows (see this migration''s own reasoning above). Read by lib/opportunities/reverification/run-job.ts''s due-set query (next_check_at is null or <= now()) and its §6.4 retirement check (consecutive_failures >= 4). An opportunity absent from this view has never been attempted at all and is due by definition.';

-- No RLS policy at all, matching provider_health/external_sync_jobs/admin_action_log
-- (migration 0014's own comment: "ops tables get no policy at all -- service-role access
-- only"). Every write and read goes through createAdminClient() from inside the job route
-- (verifyCronRequest-gated) or a future admin surface; there is no path by which a normal
-- authenticated client should ever touch this table.
alter table public.opportunity_verification_runs enable row level security;
