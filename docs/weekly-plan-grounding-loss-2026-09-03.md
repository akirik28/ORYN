# Why weekly-plan generation silently loses its counselor grounding

**Date:** 2026-09-03. **Why this doc exists:** the latency measurement in
`docs/advisor-latency-vs-function-limits-2026-09-03.md` surfaced a real, reproducible crash —
`getTranslations` is not supported in Client Components — inside every one of 5 real
`generateWeeklyPlan` calls, caught by a resilience wrapper that logs it and continues. oryn-45
asked for a proper diagnosis before anyone fixes it: why does this fire outside a request
context, is `refreshOpportunityMatches` called from a job as well as a page, and what does a
plan actually lose when grounding is absent. **This is diagnosis only — nothing here is fixed,
and nothing should be shipped to the plan generator tonight**, per oryn-45's own instruction,
given the founder is mid-migration with four rename lanes in flight.

## The root cause

Two independent things need "a real Next.js request" to work, and this call chain only got one
of them fixed.

**1. A Supabase client that needs `cookies()`.** `lib/supabase/server.ts`'s `createClient()`
throws outside a real request. This half was already found and fixed, 2026-09-02, by threading
an explicit client parameter through `getCounselorState` → `refreshOpportunityMatches` instead
of letting either function build its own cookie-based client — both files' own comments document
this exact fix, with dates and the live symptom that motivated it (an anonymous client reading
back empty RLS results for the scheduled job specifically).

**2. `next-intl`'s `getTranslations`.** `lib/opportunities/persist-matches.ts:373`, inside
`notifyNewlyEligibleMatches`:

```ts
const locale = toLocale(preferredLanguage);
const t = await getTranslations({ locale, namespace: "notifications" });
```

This throws outside a real Next.js request lifecycle regardless of the explicit `locale`
argument — the error text itself (`getTranslations is not supported in Client Components`) is
`next-intl` detecting it isn't inside Next's request-scoped async-storage machinery at all, not
a complaint about the locale value. **This is the same "no request scope" problem as #1, in the
same file, one function down from the one that already got fixed** — the DB-client half of this
exact call chain was patched; the i18n half of it never was. Nothing else in
`notifyNewlyEligibleMatches` needs a request: the notification-dedup check that follows already
runs on the caller's own passed-through client, and `createNotification`
(`lib/notifications/create.ts`) builds its own admin client internally and takes a plain string
— confirmed by reading it in full, no other request-scope dependency anywhere downstream of the
`getTranslations` call.

## Is `refreshOpportunityMatches` called from a job as well as a page? Yes — traced exactly.

`generateWeeklyPlan` (`lib/ai/weekly-plan.ts`) has exactly one real caller:
`getOrCreateWeeklyPlan` (`lib/plan/persist.ts:111`), which itself has three:

1. **The dashboard's lazy first-generate-of-the-week.** Real page render, no explicit client —
   `createClient()` resolves a real cookie-backed session, and `getTranslations()` succeeds
   because this genuinely is inside a Next.js request.
2. **The manual "Regenerate" Server Action** (`app/(app)/plan/actions.ts`). Same story — a real
   Server Action invocation is a real request. `getTranslations()` succeeds here too.
3. **Job D** — `generateWeeklyPlansForActiveStudents`
   (`lib/plan/generate-for-active-students.ts`), which loops every onboarded student and calls
   `getOrCreateWeeklyPlan(userId, { supabaseClient: adminClient })` with an explicit admin
   client and **no request context of any kind** — this isn't a page render or a Server Action,
   it's a plain async function called from a route handler's POST body, running the same code
   this session's own latency script reconstructed to get 5 real, reproducible hits.

So: **the bug is not intermittent and not caller-dependent in the way "sometimes it happens"
would suggest.** It is deterministic and caller-specific — it fires on 100% of Job-D-generated
plans and 0% of interactively-generated ones (dashboard visit, manual regenerate), because only
Job D lacks the real request context both `createClient()` and `getTranslations()` need, and
only one of those two dependencies was ever given a no-request-context fix.

## Job D's actual status — a real correction, checked directly rather than assumed

`app/api/jobs/generate-weekly-plans/route.ts`'s own header comment states this plainly: **"NOT
wired into vercel.json and NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS — both are
deliberately left for whoever turns this on."** Confirmed against the actual
`vercel.json` in this repo — its `crons` array lists seven jobs (opportunity discovery,
requirement discovery, university sync, deadline reminders, stale-data detection, admission
outlook refresh) and `generate-weekly-plans` is not among them. The route is real and reachable
(`curl -X POST /api/jobs/generate-weekly-plans` with the cron secret), but nothing calls it on a
recurring schedule today.

Combined with this session's own separate finding in the latency doc — the account's only
Vercel team has **zero deployed projects** right now — the accurate statement is: **this defect
is real, confirmed, and will fire on every single Job-D-generated plan the moment Job D is both
deployed and someone arms its cron entry. It is not currently degrading a live student's plan on
any recurring basis, because there is no live deployment yet and Job D specifically stays
deliberately inert even once one exists**, until whoever turns it on does so. Worth stating
plainly rather than left implied, the same way the latency doc corrected its own dispatched
framing — the underlying code defect is exactly as real as first reported; only the "happening
right now, repeatedly, to real students" framing needed narrowing to "confirmed and inevitable
once armed, not yet live."

## What a plan actually loses when grounding fails

`buildCounselorGrounding` (`lib/ai/weekly-plan.ts:158`) wraps the whole counselor-recommendations
call in a try/catch that was always meant to degrade gracefully for *any* failure — Counselor
Core being unavailable was designed from the start to never block a plan. On this specific
failure it returns `{ text: "", recommendedTitles: [], recommendations: [] }`, same as any other
cause of failure would. Three separate, traceable things go missing, each already a designed
fallback rather than a new failure mode:

1. **The model's prompt loses Counselor Core's grounding text entirely.** No deterministic
   "this addresses your weakest dimension, here's why" reasoning reaches the model — it has to
   infer priority from raw student-context facts alone. Same quality tier as
   `buildOpportunityContextText`'s own try/catch degrading the advisor's opportunity context on
   an unrelated failure — a designed degrade, not a crash the student would notice as broken.

2. **One of two independent self-contradiction checks goes dark.**
   `resolvePlanSelfContradiction` (`weekly-plan.ts:258`) cross-checks the model's `avoidForNow`
   against two sources: the model's own `actions` array, and Counselor Core's
   `recommendedTitles`. With grounding empty, only the first check still runs — a model that
   names a genuine Counselor Core recommendation as something to avoid, without also naming it
   in `actions`, would previously be caught and now would not be. This is the 2026-09-02 eval
   finding this exact guard was built to close, silently losing half its coverage on every
   Job-D-generated plan.

3. **Phase 38's impact/urgency/confidence/effort ranking collapses to "rank by impact alone."**
   `rankPlanActions` (`weekly-plan.ts:344`) matches each action back to a Counselor Core
   recommendation via `namesSameActivity`; with `recommendations` empty, every action is
   unmatched, so every action gets the same neutral constant and the ranking reduces entirely to
   the model's own self-reported `impact` field — the intentional, documented fallback for a
   genuinely-unmatched action, now applying to all three instead of only the ones that would
   have been unmatched anyway.

**None of this crashes, blocks, or empties the plan.** A Job-D-generated plan still has three
real actions and real reasoning — it loses the deterministic Counselor Core layer specifically:
the "why this and not that" grounding, half of the contradiction safety net, and the
purpose-built ranking. It is a real, worth-fixing quality gap, not a broken feature.

## Fix cost — small, and this codebase already has the pattern

The entire fix is replacing one `getTranslations` call and one `t(...)` interpolation with an
inline locale-branch — `app/(app)/advisor/actions.ts` already does exactly this for its own
Server-Action-returned strings, and documents why in its own header: *"Server Action return
values, not React-tree copy... hand-written rather than routed through the catalog."* The real
strings already exist in the catalog to copy verbatim rather than retranslate —
`messages/en.json:1588` (`"New match: {name}"`) and `messages/tr.json:1588`
(`"Yeni eşleşme: {name}"`).

Nothing downstream needs to change: `createNotification` already takes a plain string and
already builds its own admin client with no request dependency (read in full — confirmed clean).
No exported function signature changes, no new dependency, one string. This session's own 5 real
Job-D-equivalent calls tonight hit this exact single failure point every time and nothing else
in the chain — no second `getTranslations`-shaped crash anywhere else across 20 total real calls
in the latency measurement, which is direct empirical evidence this is the only landmine in this
specific path, not code-reading inference alone.

## What this diagnosis does not do

No code changed. No fix shipped. This is the shape and the cost, handed back for someone to
decide when to take it — explicitly not tonight, with the founder mid-migration and four rename
lanes already in flight.
