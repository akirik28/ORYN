# Release readiness — `main`@`63a832b`, 2026-08-21

Scope: is `main` deployable, and specifically — with `ANTHROPIC_API_KEY`/`TAVILY_API_KEY` both
confirmed empty in `.env.local` (checked directly, presence/emptiness only) — which routes fail
hard versus degrade gracefully. Grounded in reading the actual code paths, not inferred.

## Bottom line

**`main` is deployable as a non-AI product today.** Every user-facing AI surface checked
explicitly catches the missing-credential case and returns a specific, actionable message —
none of them crash to a 500 or a blank error boundary. One surface (the dashboard's weekly
priorities) goes further: it has a genuine deterministic fallback and stays fully functional,
not just gracefully degraded. The gaps are in *background* jobs, not live user pages, and even
those fail safely (tracked, not silent, not data-corrupting).

## AI-provider architecture (why this was checkable at all)

`lib/ai/index.ts` is the single factory (`getAIProvider()`); `lib/ai/anthropic-provider.ts`
throws `AIProviderNotConfiguredError` lazily, only on the first real call
(`getClient()` checks `env.anthropic.apiKey`) — not at construction time. So the question for
each feature is simply: does its call site catch that specific error type.

## User-facing routes — checked directly against the code

| Feature | Entry point | On missing key |
|---|---|---|
| Advisor chat | `app/(app)/advisor/actions.ts` | Try/catch present; failed messages persist a retryable failed state (per the counselor-priorities work) rather than losing the turn. |
| CV extraction (onboarding) | `app/(onboarding)/onboarding/actions.ts` | Explicit `AIProviderNotConfiguredError` catch → *"We couldn't fully read this document. You can retry or add the information manually."* Matches `AGENTS.md` Phase 61 verbatim. |
| Weekly plan — explicit regenerate | `app/(app)/plan/actions.ts` (`regenerateWeeklyPlan`) | Explicit catch → *"The AI Advisor isn't configured yet... See API_SETUP.md."* |
| Weekly plan — dashboard auto-generate | `app/(app)/dashboard/page.tsx` | Explicit catch, sets `planError = "not_configured"` — **and then falls back to Counselor Core's deterministic `rankCandidates` output** (zero AI required) for the priorities block, per the code's own comment: *"the dashboard's priorities block simply showed an error/empty state whenever the AI provider was unavailable... Counselor Core's own ranked, verified, eligible candidates... already existed and could substitute."* This is the one surface that isn't just degraded — it's still genuinely useful. |
| Essay outlines (story bank) | `app/(app)/profile/story-bank/actions.ts` | Explicit catch → *"Couldn't generate story ideas right now."* |
| Research idea generator | `app/(app)/profile/actions.ts` | Explicit catch → *"The AI Advisor isn't configured yet, so research ideas can't be generated. See API_SETUP.md."* |
| Achievement AI-refine | `app/(app)/profile/actions.ts` | Explicit catch → *"AI suggestions aren't configured yet."* |
| Requirement interpretation | `app/(app)/universities/[id]/requirement-actions.ts` | Try/catch present. |
| Counselor explanation text | `lib/ai/counselor-explain.ts` | Catches at the *lib* layer itself and returns `null` — the one module that handles this below the route, not just at it; callers already treat a null explanation as optional. |

**None of the above throw to a Next.js error boundary or a raw 500 for a missing-key failure.**
Every one names the specific cause to the student rather than a generic error.

## Background jobs — lower stakes (not what a live user hits), still checked

- `app/api/jobs/discover-opportunities`, `discover-requirements`: cron-triggered
  (`CRON_SECRET`-gated, confirmed present and non-empty), not user-facing. Per-candidate
  extraction failures are caught individually and collected (`errors: string[]`) rather than
  aborting the whole batch — one bad extraction doesn't lose the rest. The job wrapper
  (`lib/jobs/run-with-tracking.ts`) records `status: "failed"` with the error message into
  `external_sync_jobs` (visible in the admin panel) before re-throwing — so a `TAVILY_API_KEY`-
  empty failure here is *tracked*, not silent, even though the HTTP response to the cron caller
  itself would still be a failure. Acceptable for a background job; would not be for a live page.

## Not covered by this pass

- No live HTTP request was made against a running instance (no dev server credential set was
  assembled for this check) — this is a static code-path read, not a runtime click-through. If
  the founder wants an actual browser confirmation of one or two of these (advisor chat, CV
  upload) before trusting this write-up fully, that's a fast, separate follow-up.
- Tavily-specific graceful-degradation coverage was checked only for the two `discover.ts`
  background jobs above, not exhaustively for every place `TAVILY_API_KEY` might be read.

## Everything else already on record, not re-litigated here

See `docs/ORYN_WORKSTREAMS.md`'s "Open founder escalations" section for the source-authority
domain gate, scalar-column type mismatches, the unweighted 9-dimension average, and the
Drive-vs-chat product conflicts — all founder decisions, not reproduced in full here.
