-- NOT APPLIED. Founder-gated, per the per-user AI spend cap package (2026-09-02) this
-- migration belongs to -- write and leave unapplied, same discipline as every other schema
-- change this project has proposed rather than run tonight.
--
-- Adds two nullable columns so `ai_usage` can record whether a call was degraded by
-- lib/ai/limits/budget.ts's per-user spend cap, and why. Additive, no backfill needed: every
-- existing row predates the cap entirely, and NULL/false is the honest value for "this call
-- was never subject to a budget decision" -- not "known not degraded", a real distinction the
-- nullability preserves rather than collapsing into a default that would misrepresent history.
--
-- Until this is applied, lib/ai/usage.ts's logAIUsage deliberately omits `degraded`/
-- `degrade_reason` from its insert payload (PostgREST rejects an insert naming an unknown
-- column, for the whole row, not just that field) -- the decision is still fully computed by
-- lib/ai/limits/budget.ts and available to every caller (ModelSelection.degraded/.reason),
-- just not yet persisted. See that file's own comment for what changes once this runs: the two
-- lines currently commented out of the insert start being sent.
--
-- degrade_reason stores lib/ai/limits/budget.ts's ModelSelectionReason values verbatim
-- ("at_or_over_target", "unknown_cost_this_month", etc.) rather than a DB enum -- that type is
-- still actively evolving with the cap's own early iterations, and a Postgres enum is
-- meaningfully harder to extend later (ALTER TYPE ... ADD VALUE cannot run inside the same
-- transaction as other DDL) than a text column a future migration can tighten once the reason
-- taxonomy has settled from real usage.

alter table public.ai_usage
  add column if not exists degraded boolean not null default false,
  add column if not exists degrade_reason text;

comment on column public.ai_usage.degraded is
  'True when this call used a cheaper model than ANTHROPIC_MODEL because the user was at or over their monthly budget target (lib/ai/limits/budget.ts). Default false, not backfilled for pre-migration rows -- see this file''s own header for why that default is honest here rather than a guess.';
comment on column public.ai_usage.degrade_reason is
  'lib/ai/limits/budget.ts''s ModelSelectionReason for this call, verbatim, only when degraded=true. Plain text, not an enum -- see this file''s own header.';

create index if not exists ai_usage_degraded_idx on public.ai_usage(user_id, created_at desc) where degraded;

-- Makes user_id's contract explicit rather than leaving it to be re-derived from the FK
-- definition alone -- see docs/handoffs/ai-usage-attribution-audit-2026-09-02.md for the
-- investigation this documents. NULL is legitimate here in exactly two cases: a
-- background/catalog job with no attributable student (opportunity_extraction,
-- requirement_extraction -- both pass userId: null deliberately, never a dropped value), or
-- `on delete set null` firing because the referenced profile was later deleted. Neither case
-- represents lost attribution for a live student's own spend, which is what a monthly-budget
-- query (lib/ai/limits/budget.ts) actually needs: it filters `where user_id = $1`, and a NULL
-- row can never satisfy an equality filter against a specific UUID, so both legitimate-null
-- cases are excluded from any one student's spend calculation automatically, by construction,
-- not by a check this code has to remember to add.
comment on column public.ai_usage.user_id is
  'NULL means either (a) a background/catalog job with no attributable student -- e.g. opportunity_extraction, requirement_extraction, both by design -- or (b) the referenced profile was deleted (on delete set null). Never means "attribution was lost for a real student call" -- every student-facing feature requires a non-null userId at the type level (lib/ai/*.ts). A per-user budget query is unaffected by NULL rows either way: `user_id = $1` never matches NULL.';

-- Re-run safe (added 2026-09-02). Every statement above is guarded, so applying this file
-- twice is a no-op rather than an error. Not defensive habit -- docs/deployment.md 0.1
-- records a real incident where two migrations shared version 0020, `supabase db push`
-- stopped partway, and the database was left half-migrated *while appearing to have one*.
-- Recovering from that means re-running the whole sequence, so any file that cannot survive
-- a second run turns a recoverable stall into a manual repair. Five earlier migrations were
-- already given these guards for the same reason; these were missed.
