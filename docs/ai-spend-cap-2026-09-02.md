# AI spend cap — verification, forensics, and the fix

Assigned as "does the founder's per-student dollar cap need building." The honest answer is
narrower and more specific than that framing: **a complete, dollar-denominated, per-student
cap already existed** — built the same night, by a different lane, under
`lib/ai/limits/budget.ts` — and the actual gap was a burst-protection hole in one feature that
the cap's own "never a hard wall" design doesn't and shouldn't close. This document is the
verification trail: what's real, what was assumed, what was fixed.

---

## 1. The ten features, verified from call sites, not inferred from names

`ai_usage` has exactly ten distinct `feature` values written by application code. Traced every
one to its actual caller rather than guessing from the name:

| Feature | Trigger | Evidence |
|---|---|---|
| `advisor_chat` | Student | `lib/ai/advisor-chat.ts`, called from the Advisor page's chat action |
| `cv_extraction` | Student | `lib/ai/cv-extraction.ts`, onboarding CV import |
| `weekly_plan` | Student | `lib/ai/weekly-plan.ts`, dashboard lazy-generate + Regenerate action |
| `research_generator` | Student | `lib/ai/research-generator.ts`, profile research-ideas tool |
| `achievement_refinement` | Student | `lib/ai/refine-achievement.ts`, "Improve this entry" |
| `counselor_explanation` | Student | `lib/ai/counselor-explain.ts`, advisor's narrated explanation |
| `essay_story_bank` | Student | `lib/ai/essay-outlines.ts`, Essay Story Bank outlines |
| `opportunity_extraction` | **Background** | `lib/ai/opportunity-extraction.ts` — `withUsageLogging({ userId: null, ... })`, confirmed at the call site, not the doc comment describing it |
| `requirement_extraction` | **Background** | `lib/ai/requirement-extraction.ts` — same, `userId: null` at the call site |
| `requirement_interpretation` | **Admin, not student** | `lib/ai/interpret-requirement.ts` — takes `adminUserId`, the "suggest a rule" tool on the requirement form (AGENTS.md Phase 5). Attributed to a real user (the admin's own account), but that account is the founder/operator, not a student the $0.50/$1.00 framing is about. |

**Three-way split, not the two the assignment framed**: 7 student-triggered, 2 background
(`userId: null`, structurally invisible to any per-student check by construction), 1
admin-triggered (attributed to a real account, but not a student one). Nobody had separated the
third category before — it matters because it's currently swept into the same per-account
budget check a student would be, using the founder's own account.

**Not touched, flagged not silently expanded into**: neither existing per-student mechanism
(`monthly-quota.ts`, `limits/budget.ts`) treats `requirement_interpretation` differently from a
student feature today. Whether the founder's own admin-tool usage should be exempted from the
same $0.50/$1.00 framing built for students is a real product question — named here, not
decided.

---

## 2. The cap already exists — correcting the assignment's own premise

The assignment's framing was: `monthly-quota.ts` has one key (`advisor_chat: 300`), nine
features are uncapped, build a dollar-denominated mechanism. That's true of the **message-count**
quota specifically. It is not true of spend generally.

**`lib/ai/limits/budget.ts`** (built the same night, "the per-user spend cap package") already
does exactly what was being asked for:

- `MONTHLY_BUDGET_TARGET_USD = 0.5`, `MONTHLY_BUDGET_CEILING_USD = 1.0` — the founder's own
  figures, dollar-denominated, summed from `ai_usage.estimated_cost` for the current UTC
  calendar month, per user.
- Resolved automatically for **every** feature that logs usage through `withUsageLogging`
  (`lib/ai/usage.ts`) — 7 of the 10 features go through that wrapper directly
  (`opportunity_extraction`, `requirement_extraction`, `advisor_chat`, `research_generator`,
  `achievement_refinement`, `weekly_plan`, `cv_extraction`); the other 3
  (`interpret-requirement.ts`, `counselor-explain.ts`, `essay-outlines.ts`) call
  `selectModelForUser` directly and use its result, same effect. **Coverage is automatic, not
  per-feature opt-in** — a feature that logs usage at all gets budget-aware model selection for
  free.
- Answers "what happens mid-month" (the assignment's explicit question): nothing dramatic. The
  very next call after crossing $0.50 silently uses Haiku instead of Sonnet. No interruption, no
  message, no student-visible event. That's a deliberate founder decision recorded in the file's
  own header: **never a hard wall**, because "a student who hits a wall mid-question doesn't come
  back." `MONTHLY_BUDGET_CEILING_USD` is explicitly a monitoring number, not a second
  code-enforced gate, "not an inference from 'ceiling' sounding stricter than 'target'."
- Handles the "unpriced row" concern already: a `NULL estimated_cost` row (a model absent from
  `pricing.ts`) triggers `unknown_cost_this_month`, which degrades defensively rather than
  treating unknown spend as free.

**Do not build a second mechanism next to this one.** A parallel dollar cap would either
duplicate `selectModelForUser`'s logic exactly (redundant, a second place to drift) or disagree
with it (two different opinions about the same student's spend, worse than either alone).

**What this document actually contributes on the "should it be dollar-denominated" question**:
confirming it already is, tracing exactly which of the 10 features get it and how, and finding
the one place burst protection — a different guarantee from spend-degradation — was still
missing. See §4.

---

## 3. The `weekly_plan` forensics — why the cap alone wasn't enough

While mapping the ten features, a live measurement (oryn-a7, cross-checked here against
`ai_usage`/`weekly_plans` directly) found `weekly_plan` is **86–90% of all AI spend ever
recorded**, dominated by one account: **98 calls in a 33-second window** on 2026-08-30
(21:38:28.896–21:39:01.566719, confirmed via `ai_usage.created_at`), $2.97, against only 2 real
`weekly_plans` rows for that account total.

**The dollar cap would not have stopped this — it would have made it cheaper.** A soft degrade
to Haiku after $0.50 reduces the burn rate; it does not limit call *frequency*. 98 calls in 33
seconds is a burst problem. `MONTHLY_BUDGET_TARGET_USD` has no opinion about how fast calls
arrive, only how much they've cost so far this month — by the time 98 calls have landed, the
degrade already fired somewhere in the middle of the burst, and the burst kept going anyway.

**Traced precisely, not left at "something went wrong":**

- A legitimate plan generation for that same week had already succeeded and saved at 21:01:10
  (confirmed: `weekly_plans` row `created_at` matches). Every one of the 98 burst calls happened
  **after** a plan already existed for that week.
- `getOrCreateWeeklyPlan`'s own idempotency check (`if (!opts?.force) { ...return existing... }`)
  would have short-circuited all 98 calls before they ever reached the billed AI call — **unless
  every one of them passed `force: true`**, which is the only thing that skips that check.
- `force: true` is passed by exactly one real caller: the "Regenerate" Server Action
  (`app/(app)/plan/actions.ts`), which is also the only caller with a rate limit (5 calls/60min,
  via `assertWithinAIRateLimit`). But that limit lived **in the Server Action**, not inside
  `getOrCreateWeeklyPlan` itself — a fast, friendly pre-check, not a real gate on the function.
- **Ruled out the AI eval harness specifically**, since it also calls weekly-plan generation
  directly: it uses a hardcoded fixture ID (`00000000-0000-0000-0000-0000000000ee`,
  `lib/ai/eval/harness.ts`), not the founder's real account. Not this.
- **Ruled out the dashboard's lazy-generate path**: it never passes `force: true`, and it always
  runs inside a real, valid session (`requireUser()` redirects otherwise) — `auth.uid()` always
  matches the `userId` being written, so the RLS-write-failure mode `lib/plan/persist.ts`'s own
  comment documents for the *job* path structurally cannot occur through the dashboard. The
  dashboard was the door originally suspected; it isn't the one that was open.
- **Best-supported read**: something called `getOrCreateWeeklyPlan(userId, { force: true })`
  directly — not through the Regenerate action, not through the UI — during the window this
  session's own memory places the regenerate/reflection-loss bug investigation (a plausible,
  though not certain, source: a debugging script reproducing that bug via repeated forced
  regeneration). The specific historical author matters less than what it proves: **the guarded
  door was one of several, and anything bypassing it got zero rate limiting, at any speed, any
  number of times.**

---

## 4. The fix — rate limiting moved inside `getOrCreateWeeklyPlan`

`lib/plan/persist.ts`: `assertWithinAIRateLimit(userId, "weekly_plan", { maxCalls: 5,
windowMinutes: 60 })` now runs inside `getOrCreateWeeklyPlan` itself, immediately before the one
billed call it ever makes (`generateWeeklyPlan`) — not just in the one Server Action that used to
be the only guarded door.

**Placement is deliberate, not incidental**: it sits *after* the existing-plan short-circuit, not
before. A student whose plan already exists for the week costs nothing and is never rate-limited
for a request that would have been free anyway — only the branch that's about to spend a real
dollar is guarded.

**Every caller now gets it, with no caller needing to know it exists:**
- The dashboard's lazy generate (never guarded before).
- The Regenerate Server Action (was guarded there directly; now guarded one layer down —
  removed the action's own duplicate call rather than run the same check twice on the same
  window for no benefit; its existing `catch (error) { if (error instanceof
  RateLimitExceededError) ... }` needed no change, since the error still propagates from
  wherever it's actually thrown).
- The scheduled job (`lib/plan/generate-for-active-students.ts`) — calls this once per distinct
  student per run, never the same student twice, so a per-`(userId, feature)` limit essentially
  never trips under that access pattern. Verified with a dedicated test (§5), not just reasoned
  about — the job's own aggregate spend is `job-budget.ts`'s territory regardless (though note:
  `job-budget.ts`'s `JobBudgetFeature` type only covers `opportunity_extraction`/
  `requirement_extraction` today, not `weekly_plan` — the scheduled weekly-plan job has no
  aggregate-spend ceiling of its own beyond the per-student rate limit this fix adds. Out of
  scope for this fix; named for whoever picks up Job D scheduling next).
- Any future caller — a script, a new Server Action, a new job — that calls this function
  without knowing about today's one guarded door.

**What this does not touch**: the founder's own $0.50/$1.00 figures. Nothing about
`MONTHLY_BUDGET_TARGET_USD`/`CEILING_USD` changed, and `MONTHLY_AI_QUOTAS.advisor_chat = 300`
(the separate, older message-count quota — the founder's own decision #4, "300 → 130") was not
touched either. **Worth naming plainly**: that decision is computed against `advisor_chat`
alone, which measured 10 real calls total against `weekly_plan`'s 112 — the number was aimed at
a feature that isn't where the actual spend or the actual burst risk lives. Still the founder's
call to make; not remade here.

---

## 5. Verification — proved, not assumed

Wrote `__tests__/plan/rate-limit-coverage.test.ts` against the real (unmocked)
`assertWithinAIRateLimit`, with a controllable `ai_usage` count:

- Under the limit: proceeds, bills the call.
- At the limit: throws `RateLimitExceededError`, `generateWeeklyPlan` is never called.
- `force: true` does **not** bypass the rate limit (only the existing-plan check) — the exact
  gap the burst used.
- A caller with no Server Action, no session, no request context at all — modeling the
  debugging-script hypothesis directly — is still throttled.
- A student whose plan already exists never reaches the check (confirms placement).
- Three distinct students, each under their own limit, are each allowed independently — the
  job's access pattern doesn't self-throttle.

**Confirmed these tests catch the regression, not just read like they would**: `git stash`'d the
fix, reran the suite, 3 of 6 genuinely failed against the pre-fix code (the other 3 pin behavior
that was already correct and shouldn't change), then restored the fix.

`__tests__/plan/persist.test.ts` (the existing carried_forward-preservation suite) needed
`@/lib/ai/rate-limit` mocked as a no-op — it doesn't exercise the rate limit itself and had no
`ai_usage` table in its mock `createClient`, so every test in that file would otherwise fail on
"unexpected table in test: ai_usage" the moment the real check ran.

All 4 gates green: 254 files / 3531 tests, lint clean, typecheck clean, build compiles.

---

## 6. Two smaller fixes, same pass

**Duplicate constants.** `lib/admin/queries.ts` independently redefined
`PER_STUDENT_MONTHLY_TARGET_USD = 0.5` / `PER_STUDENT_MONTHLY_CEILING_USD = 1.0` — the same
founder-set figures `lib/ai/limits/budget.ts` already owns, typed twice with nothing tying them
together. The admin display layer now imports the enforcement layer's own constants and
re-exports them under the existing names, so nothing downstream (the two admin section
components that use them) needed to change.

**Test data in the live table.** `ai_usage` has 3 rows with `model: "test-model"`
(2026-08-15, same microsecond — a fixture that leaked into the real table). Checked precisely
rather than assumed dangerous: all 3 have `user_id: null`, so every per-student mechanism
(`limits/budget.ts`, `monthly-quota.ts`, `rate-limit.ts`, all filtered on a specific `user_id`)
already excludes them structurally, and their `estimated_cost` is null (not in `pricing.ts`'s
table), which sums as zero — no dollar figure anywhere is inflated. The one real effect:
`lib/admin/queries.ts`'s `getSpendSummary` had no filter at all and was counting these 3 rows
into `allTimeCalls`/`byFeature`/`byModel`. Filtered them out at the one place they were leaking
in.

---

## 7. The honest failure mode — named, not papered over

The assignment specifically required this: the sliding-window rate limiter
(`lib/ai/rate-limit.ts`) and the message-count monthly quota (`lib/ai/monthly-quota.ts`) both
read `ai_usage` through the request-scoped `createClient()`, and both already document —
correctly — that they're "two layers over one dependency, not defence in depth." **This fix adds
a third reader of the same shape.** `assertWithinAIRateLimit`, now called from inside
`getOrCreateWeeklyPlan`, uses the same session-scoped client, the same table, and fails the same
way: if the count query itself fails (a connection problem, an RLS misconfiguration, the table
being unavailable), `count` comes back as `undefined`, `(count ?? 0) >= opts.maxCalls` evaluates
to `false`, and **the call is permitted** — silently, with no distinguishable signal from "this
student genuinely hasn't hit the limit."

This is not a new problem this fix introduced — it's the existing `assertWithinAIRateLimit`
behavior, now reached from one more call site. Worth stating precisely rather than leaving
implicit: **a total `ai_usage`-read outage would simultaneously disable the burst limiter, the
message quota, and (via a different client — `lib/ai/limits/budget.ts` uses
`tryCreateAdminClient()`, not the session-scoped client) *also* the dollar degrade, since all
three ultimately depend on `ai_usage` being readable at all, even though two of the three don't
share the exact same client.** Three code paths, one underlying table. If that table becomes
unreadable, every guard in this document fails open at once — by design, individually (an
unavailable check must never punish a student for the check's own unavailability), but the
combination is one dependency wearing three hats, not three independent defenses.

Not fixed here — the individual fail-open choices are each correct on their own stated
reasoning (this codebase's established "availability over false confidence" convention, applied
consistently across `monthly-quota.ts`, `rate-limit.ts`, and `limits/budget.ts` alike). Naming
the combined picture is what was asked for; redesigning the whole family's shared dependency is
a larger, separate decision.

---

## 8. What's still open, named rather than guessed at

- **`requirement_interpretation`'s categorization** (§1) — currently billed against the
  founder's own account under the same per-student framing built for students. Founder/product
  call, not made here.
- **`job-budget.ts` doesn't cover `weekly_plan`** (§4) — only the two catalog-extraction features
  have an aggregate monthly ceiling. If Job D (scheduled weekly-plan generation) is ever turned
  on, its aggregate cost across every onboarded student has no ceiling of its own beyond the
  per-student rate limit this fix adds.
  Worth a look before that job is ever scheduled, not before.
- **The shared-dependency failure mode** (§7) — named precisely, not restructured. A future pass
  could consolidate the three `ai_usage` readers onto one shared, cached-per-request count if the
  duplication itself becomes worth removing; today it's three call sites each independently
  correct, not one bug in three places.
- **Decision #4 on the founder's morning list** (advisor quota 300 → 130) computes against the
  smaller of the two features by an order of magnitude. Flagged for the founder's own
  reconsideration, not silently overridden.
