# New-student flow audit — one confirmed live bug (fixed), one clean answer, one honest limit

**Status:** investigation + one fix, gates green (typecheck/lint/3309 tests/build). **Author
lane:** oryn-31, at oryn-a7's request. **Base:** local `main` (`95fb51b2`). **Branch:**
`oryn/new-student-flow-audit-2026-09-02`. No test accounts created — oryn-qa-scratch's
Supabase email rate limit was already hit tonight by another lane; this used only live data
and code reading, as instructed.

---

## 0. The constraint that shapes everything below

**Zero of the 11 accounts in production are a genuine, organic new-student signup.** Every
one is either a QA/dev test fixture or the founder's own account:

| Account | Email | What it is |
|---|---|---|
| Persona A Test | `orynqapersonaa20260820@mailinator.com` | Dev persona fixture (AGENTS.md Phase 49) |
| Claude UI QA | `claude-ui-simplification-qa@mailinator.com` | Claude-session test account |
| Ada Yilmaz | `test@oryn.dev` | Generic dev test signup |
| Deniz Kaya | `oryn.qa.walkthrough.deniz@gmail.com` | Named "walkthrough" — deliberate manual QA persona |
| Oryn QA Sweep | `oryn.qa.sweep.claude@gmail.com` | Claude-session test account |
| oryn.qa.a / oryn.qa.b | `oryn.qa.{a,b}@example.com` | Batch pair, 465ms apart — one INSERT, not two signups |
| Daniel Okafor / Elif Demir / Mei Tanaka | `oryn.gate2.p{1,2,3}@orynqa.test` | Gate 2 persona batch, sub-second spread |
| **Ada Sarp KIRIK** | `akirik28@my.uaa.k12.tr` | **The founder's own real account** |

So the honest answer to "where does a real new student stall" is: **there is no data that
answers that question, because no real new student has ever gone through this product.**
Reporting a funnel drop-off rate from this data would be reporting noise as signal. What
follows instead is what the available evidence — code, the deliberate walkthrough accounts,
and the founder's own usage — can actually support.

## 1. What's confirmed working

- **Onboarding's redirect on completion** (`app/(onboarding)/onboarding/actions.ts:203`) sends
  every completed account to `/dashboard`. No dead end, no extra click needed.
- **8 of 11 accounts completed onboarding successfully**, across multiple distinct testers/
  personas, over a two-week span — not one lucky run.
- **Profile scoring is fully reliable**: every one of the 8 completed accounts has exactly 9
  rows in `profile_scores` (all 9 dimensions, every time). Whatever else varies, this doesn't.
- **The new `/confirm-age` interstitial** (landed ~1h before this task, per oryn-a7) is
  well-built: explicit three-way redirect split with a comment reasoning through why each of
  the three routes can't loop into each other, correctly uses the session-scoped client (a
  real authenticated Server Action, not a job — no RLS issue), and deliberately logs rather
  than unilaterally acting on a self-reported age below the minimum, with a linked design doc.
  Nothing to fix here.
- **The `weekly_plans` schema itself is sound** — real unique constraint matching the code's
  own `onConflict` target, a standard owner-scoped RLS policy. The bug below is not a schema
  problem.

## 2. The confirmed, live mechanism — fixed

**A student who completed onboarding but has no weekly plan is not always the same kind of
gap.** Cross-referencing the 8 completed accounts against `weekly_plans`, 3 have zero rows
despite all having activities, education, and full scores. One of those three —
`96f3274c-…` (Mei Tanaka, a gate2 persona) — has something the other two don't: a real, dated
row in `ai_usage` for `feature: weekly_plan` (3357 input / 671 output tokens, real Anthropic
model, 2026-08-23). **A real AI call happened, succeeded, and cost real money. Nothing was
saved.**

Traced precisely, not guessed at:

- `getOrCreateWeeklyPlan`/`getCurrentWeeklyPlan` (`lib/plan/persist.ts`) both default to
  `lib/supabase/server.ts`'s session-scoped client — correct for their two real callers (the
  dashboard's lazy first-visit generation, the manual "Regenerate" action), both of which run
  inside a real authenticated request.
- `lib/plan/generate-for-active-students.ts` (Phase 30's Job D) is a **third caller with no
  session at all** — it correctly uses `createAdminClient()` for its own query, but calls the
  two functions above without passing that client through. Under the session-scoped client's
  default, `auth.uid()` resolves to null in that context.
- A `SELECT` under RLS with `auth.uid()` null doesn't error — it silently returns zero rows.
  So the job's own "does this student already have a plan" check always said no, for everyone,
  every run.
- `generateWeeklyPlan` then runs, completes successfully, and — this is the part that costs
  money — **logs to `ai_usage` via its own, already-correct admin client**
  (`lib/ai/usage.ts`), independent of the bug above.
- Only then does `getOrCreateWeeklyPlan` attempt `.from("weekly_plans").upsert(...)`. That
  table's RLS `WITH CHECK (user_id = auth.uid())` evaluates `<real-uuid> = null`, which is not
  true. The write is rejected. `getOrCreateWeeklyPlan` throws; `generateForStudent` catches it
  per-student (by design — one student's failure can't abort the batch) and returns
  `{status: "error"}`.
- The job route (`app/api/jobs/generate-weekly-plans/route.ts`) reports `itemsProcessed` as a
  count of `status === "generated"` only — so a run where this fails for every student reports
  `itemsProcessed: 0` rather than crashing or looking successful. The real per-item RLS error
  is present in the response body, but only if someone reads into it rather than the summary
  count.

**This does not affect a real student's day-one experience.** The dashboard path — the one
CEO's brief is actually about — runs inside a real session and was never exposed to this. The
job's own route comment says it plainly: built and safe to trigger manually, but **deliberately
not wired into `vercel.json` or `schedule.ts` yet**, specifically because scheduling it means
paying for an AI call per onboarded student on a recurring cadence. Nothing has scheduled it,
so this hasn't compounded into ongoing cost. But the code was staged to do exactly that the
moment it's turned on — the natural next step its own comments anticipate — and would have
silently spent money and delivered nothing, for every eligible student, every run, until
someone happened to read past `itemsProcessed`.

**Why the existing job test didn't catch it**: `__tests__/plan/generate-for-active-students.test.ts`
fully mocks `lib/plan/persist.ts` by its own explicit design ("this file's job is the
batching/dedup/error-isolation behavior… not re-testing getOrCreateWeeklyPlan's own
internals") — a reasonable boundary that structurally cannot see an RLS interaction, since the
mock always succeeds regardless of what it's called with.

**Fixed**: `supabaseClient` threaded as an optional parameter (default: the existing
session-scoped client — zero behavior change for every real caller) through the entire chain
Job D exercises: `persist.ts`'s two functions, `weekly-plan.ts`'s `generateWeeklyPlan` and
`buildCounselorGrounding`, `student-context.ts`'s `buildStudentAdvisorContext`,
`counselor/state.ts`'s `getCounselorState`, `counselor/index.ts`'s
`getCounselorRecommendations`. The job now passes its own already-created admin client through
explicitly. `refreshOpportunityMatches` (called inside `getCounselorState`) needed no change —
it already used `tryCreateAdminClient()` internally. One existing test assertion updated to
match the new call shape, and strengthened to assert the client is actually passed (not just
that `force` is absent) — a direct regression guard for this exact bug.

Also fixed in passing: a comment in `persist.ts` explicitly asserted "`getOrCreateWeeklyPlan`
has exactly two callers… neither is a scheduled job" — true when written, false since Job D was
added, and nobody had updated it. Left as a stale claim, it would have kept steering the next
reader away from exactly this.

## 3. What I can't explain from available evidence, and won't overclaim

Two other completed accounts also show zero weekly plans — but with **zero rows in
`ai_usage` too**, unlike Mei Tanaka's. That's a different signature: no attempt was logged at
all, successful or failed. Deniz Kaya's account is the deliberate "walkthrough" persona and
did sign in about 1.5 hours after account creation, so a dashboard visit is plausible — but I
can't determine from data alone whether she never actually reached `/dashboard`, or reached it
at a moment when `ANTHROPIC_API_KEY` wasn't configured (which throws before any token is spent
or logged, and degrades to a visible "not configured" state rather than crashing — not a bug,
a fact about environment state at some point weeks ago that I have no way to check
retroactively). Naming a specific cause here without evidence would be exactly the kind of
overclaim this session tries not to make. Flagging the pattern; not asserting a mechanism for
it the way §2 does.

## What this does NOT do

- No claim about real-student abandonment rates — see §0. There is no such data.
- No fix or further investigation of the Deniz Kaya / Ada Yilmaz pattern in §3 — insufficient
  evidence to identify a mechanism, as opposed to §2's fully traced one.
- No change to whether Job D is scheduled — still deliberately not wired into
  `vercel.json`/`schedule.ts`, unchanged. That's a separate decision, not this task.
- Did not audit the onboarding wizard's 5 steps line-by-line — no data pointed there (8/11
  accounts completed it; the 3 that didn't are test artifacts that never confirmed email or
  never signed in, not evidence of mid-onboarding abandonment), and the brief was to let the
  data say where to look rather than reading everything.
