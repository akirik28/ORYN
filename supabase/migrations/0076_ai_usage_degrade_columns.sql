-- APPLIED (confirmed live against the real DB, 2026-09-02 -- this header said "NOT APPLIED"
-- for long enough after that stopped being true that lib/ai/usage.ts's logAIUsage kept
-- omitting these two columns from its insert well past when it needed to; see that file's
-- own comment for the fix, caught by oryn-31's migration audit).
--
-- STATUS, corrected 2026-09-02 (docs/migration-audit-applied-vs-written-2026-09-02.md):
-- SCHEMA APPLIED, CODE NOT YET UPDATED TO USE IT -- a real, separate follow-up, not a
-- second stale-header case. Confirmed against `qtcvcflzxbuagvvwahhu` directly:
-- `ai_usage.degraded`, `ai_usage.degrade_reason`, and `ai_usage_degraded_idx` all exist
-- live, so the "NOT APPLIED" line above is no longer true of the database. But
-- `lib/ai/usage.ts`'s `logAIUsage` insert (checked directly, not assumed) still omits
-- both fields from its payload, exactly as this file's own body describes for the
-- unapplied case -- nobody removed the comment explaining the omission or added the two
-- fields once the migration landed. Every `ai_usage` row today still gets `degraded`'s
-- column default (`false`) regardless of whether the call was actually degraded, and
-- `degrade_reason` stays permanently null. The schema gap this migration closed is
-- closed; the code gap it was written to enable is not. Flagged for whoever owns
-- `lib/ai/usage.ts`, not fixed here.
--
-- Adds two nullable columns so `ai_usage` can record whether a call was degraded by
-- lib/ai/limits/budget.ts's per-user spend cap, and why. Additive, no backfill needed: every
-- existing row predates the cap entirely, and NULL/false is the honest value for "this call
-- was never subject to a budget decision" -- not "known not degraded", a real distinction the
-- nullability preserves rather than collapsing into a default that would misrepresent history.
--
-- lib/ai/usage.ts's logAIUsage now writes `degraded`/`degrade_reason` on every insert.
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
