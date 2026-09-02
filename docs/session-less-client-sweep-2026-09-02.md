# Session-less client sweep — 2026-09-02

CEO's framing: four independent instances of the same bug class in one night
(`getOrCreateWeeklyPlan`, `refreshAdmissionOutlook`, `refreshOpportunityMatches`,
`recomputeCareerProfile`) is no longer a coincidence, and the class has a live, measured
cost attached (`weekly_plan` is ~86–90% of all ORYN spend to date; one account: 100 calls,
$2.97, 2 rows saved). The ask: sweep mechanically for every remaining instance, rank by
whether the wrapped work is billed, and write the note somewhere it actually gets read.

## The mechanism, restated precisely

`lib/supabase/server.ts`'s `createClient()` reads the request's cookies via
`next/headers`. In a real page render or Server Action there's a real request with a
logged-in student's cookies. In a scheduled job (`app/api/jobs/*`) there is no request in
that sense — `cookies()` still resolves (it doesn't throw), just to an empty jar, so
`createClient()` still succeeds and returns a working, *unauthenticated* client. Every
RLS-protected read through it then comes back empty — not an error. The bug never throws;
it silently computes on missing data. Confirmed against this project's real RLS policies
(`__tests__/opportunities/refresh-matches-no-session.test.ts`, live-verified 2026-09-02).

## Method: traced from the reachable surface, not from a guess

Started from all nine `app/api/jobs/*/route.ts` entry points and traced each one's full
call graph by hand (imports, then each import's own imports) for any function that calls
`createClient()` internally. Cross-referenced against every file in `lib/` that calls
`createClient()` at all (16 files), to make sure nothing reachable was missed by the
forward trace alone.

**Population, and why it's the complementary one to oryn-d0's own sweep**: oryn-d0 checked
whether the ~7 functions that already accept an optional client thread it correctly to
every table read *within their own body*. This sweep's population is different: every call
site, anywhere in the job-reachable graph, to one of those same client-accepting
functions — including calls made from *inside* one of them to *another* one. That's
exactly where the one real finding below was hiding: not a function with no override
capability, but a function that had one and used it correctly seven times, then called an
eighth, sibling function bare.

## Findings

**Eight functions currently sit on a job's call graph and accept a client override.**
Traced all eight; seven were already correct going into this pass. Full list, and what
each does when correctly threaded:

| Function | File | Reachable via | Wraps billed work? |
|---|---|---|---|
| `getOrCreateWeeklyPlan` / `getCurrentWeeklyPlan` | `lib/plan/persist.ts` | `generate-weekly-plans` job | **Yes** — the weekly-plan AI call |
| `generateWeeklyPlan` | `lib/ai/weekly-plan.ts` | same, one level in | **Yes** — is the AI call |
| `getCounselorRecommendations` | `lib/counselor/index.ts` | same, via `buildCounselorGrounding` | No AI call of its own (deterministic pipeline, Phase 27) — feeds the prompt for the one above |
| `getCounselorState` | `lib/counselor/state.ts` | same | No AI call of its own — same as above |
| `buildStudentAdvisorContext` | `lib/ai/student-context.ts` | same, called from two places | No AI call of its own — assembles the context text the prompt is built from |
| `refreshOpportunityMatches` | `lib/opportunities/persist-matches.ts` | `getCounselorState`, and separately page renders | No — deterministic matching |
| `refreshAdmissionOutlook` | `lib/admissions/persist.ts` | `refresh-admission-outlooks` job | No — deterministic (own header comment: "no AI/network call") |
| `recomputeCareerProfile` | `lib/scoring/persist.ts` | `scheduled-review` job (built same night) | No — pure arithmetic (Phase 27) |

**One real, live, previously-unfound instance**: `lib/counselor/state.ts`'s
`getCounselorState` calls seven of its eight parallel reads correctly against `supabase`
(its own resolved client — session-scoped or the job's admin one), including a careful
`supabaseClient ? <raw query> : getProfileScores(userId)` guard for the one shared,
`cache()`-wrapped helper that can't take a client at all. The eighth —
`buildStudentAdvisorContext(userId)` — was called bare, with no second argument, even
though the function accepts one and the exact same call one level up
(`generateWeeklyPlan`'s own direct call) already threads it correctly.

**Ranked**: this is the "billed work, corrupted inputs" case, not the "wasted call" case
oryn-d0's own $2.97 evidence describes. `getCounselorState` makes no AI call of its own.
But its return value (`advisor`) feeds directly into `generateWeeklyPlan`'s prompt as
counselor-grounding text — so the actual, billed AI call in `generateWeeklyPlan` still
happens and still bills, correctly, every time. What was silently wrong was the *input*:
under the job's no-session client, every RLS read inside the bare call came back empty, so
`getCounselorState`'s own internal notion of the student's advisor context was a
near-empty stand-in for the real one `generateWeeklyPlan` had already built correctly a
few lines earlier — a systematically degraded prompt for every job-generated plan
specifically, never for a dashboard-visit-triggered one, and never a thrown error that
would have surfaced it.

**Not claiming this explains the $2.97 anomaly** — that pattern (100 calls, 2 rows, a
0.3-second median gap) is an unbounded retry loop, which points at the *already-fixed*
`getOrCreateWeeklyPlan` bug (AI succeeds, save fails RLS, next call's "already have a
plan?" check finds nothing, retries) from before that fix landed, not at this one.
Separating the two is oryn-d0's own territory per CEO's assignment; this finding is
reported as a distinct, real bug with its own distinct consequence, not a second
explanation competing for the same evidence.

**Fixed**: `lib/counselor/state.ts` line ~132, `buildStudentAdvisorContext(userId)` →
`buildStudentAdvisorContext(userId, supabaseClient)`. One line.

## Everywhere else checked and confirmed safe (not reachable from a job)

Every remaining `lib/` file that calls `createClient()` internally, and every remaining
call site of a client-accepting function, was checked for job-reachability and found to be
real-session-only:

- `lib/ai/monthly-quota.ts`, `lib/ai/rate-limit.ts` — Server Actions only (advisor, plan,
  profile, story-bank, onboarding).
- `lib/i18n/actions.ts` — the language switcher; a student's own click.
- `lib/security/rate-limit.ts` — Server Actions and `/api/export-data` (a logged-in
  student's own data-export request, not a cron route).
- `lib/social/post-actions.ts`, `lib/benchmarking/index.ts` — no live callers found outside
  their own tests; not job-reachable regardless of wiring status.
- `lib/universities/detail-reads.ts` — reachable only via `refreshAdmissionOutlook`, which
  already bypasses it entirely (raw query on its own resolved client) whenever an explicit
  client is passed — confirmed by reading the guard, not assumed from the function accepting
  one elsewhere.
- `lib/requirements/persist.ts` — only called from two real page renders
  (`universities/[id]`, `applications/[id]`); not on any job's call graph.
- `lib/search/index.ts` — only called from the search page/command palette, both real
  sessions (confirmed directly during tonight's earlier search audit).
- `buildOpportunityContextText`/`getCounselorRecommendations`'s bare call inside
  `lib/ai/opportunity-context.ts` — only reachable via `lib/ai/advisor-chat.ts`, itself only
  reachable from a Server Action (`app/(app)/advisor/actions.ts`).
- `buildStudentAdvisorContext`'s bare calls in `lib/ai/research-generator.ts` and
  `lib/ai/advisor-chat.ts` — both Server-Action-only, not job-reachable.
- `refreshAdmissionOutlook`'s bare call in `lib/universities/queries.ts` — reachable from
  four real page/component paths; `lib/admissions/scan.ts` (the job) references this file
  only in a comment, never actually imports it.

## The standing note

A markdown doc doesn't stop a fifth instance; per CEO's own framing, a comment on the
shared helper or a test that pins the property might. Built both, weighted toward the
test:

- **`lib/supabase/server.ts`**: no change needed — its own header comment already states
  the mechanism plainly ("Reads the auth session from request cookies"). The gap was never
  "nobody knew this," it was "a call site three functions deep forgot to pass through a
  parameter that already existed." A comment on `createClient()` itself can't fix a missing
  argument at a call site it has no visibility into.
- **`__tests__/security/session-less-client-threading.test.ts`** (new): source-pins the
  exact threaded call in every function currently known to sit on a job's call graph — not
  just the one fixed here, all eight. A future edit that reintroduces a bare call to any of
  these — including a *new* job calling into this same graph — fails a fast, specific unit
  test naming exactly which call regressed, rather than surfacing as a quiet quality
  regression discovered from a cost anomaly weeks later. The file's own header comment
  states the property in general form and says explicitly: if you're adding a tenth
  instance this file doesn't yet cover, extend it — a green run here means what's listed is
  clean, not that the codebase is clean.

## Tests

`__tests__/security/session-less-client-threading.test.ts` — 10 cases across 6 describe
blocks (one per already-fixed instance plus the new one), source-text-pinning the same way
`__tests__/security/computed-writes-use-admin-client.test.ts` already pins the
admin-vs-supabase split for the writes side of this exact problem family.
