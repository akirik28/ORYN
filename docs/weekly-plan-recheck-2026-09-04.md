# Weekly-plan generation recheck — grounding-loss, context freshness, cost

**Status:** measurement only, no code changed, per explicit instruction ("Bak ve raporla,
düzeltme"). **Base:** `origin/main` (`832c7bf4`). **Branch:** `docs/weekly-plan-recheck-2026-09-04`.
Read all 4 named docs (`weekly-plan-grounding-loss-2026-09-03.md`,
`weekly-plan-prompt-regression-2026-09-03.md`, `weekly-plan-aggregate-budget-2026-09-02.md`,
`job-dry-run-audit-2026-09-03.md`) in full before touching any code. This genuinely is a
recheck, not a first look — unlike the research-generator task, all 4 existed and were current.

## 1 — Grounding-loss: fixed at the diagnosed site, but a second, more severe, undiagnosed
## site exists in the exact same call chain

**The originally diagnosed site is fixed.** `lib/opportunities/persist-matches.ts`'s
`notifyNewlyEligibleMatches` no longer calls `getTranslations()` — it now uses a
`newOpportunityMatchTitle(locale, name)` inline locale-branch, with a comment naming this exact
fix and its date. Confirmed by reading the current file; only a comment mentions
`getTranslations()` now, describing why the inline branch was needed.

**A second, previously undiagnosed instance of the identical failure mode is live today, and
it's worse.** `lib/plan/persist.ts:92`, inside `getOrCreateWeeklyPlan`:

```ts
const t = await getTranslations({ locale, namespace: "notifications" });
```

Unconditional, no try/catch, and reached by all three callers the original doc traced —
including Job D (`generateWeeklyPlansForActiveStudents` → `generateForStudent` →
`getOrCreateWeeklyPlan`, admin client, no session, no request). `t` is not dead code — it's
used at line 307 to build a real notification title (`t("weeklyPlanReady")`) after a plan
saves successfully — but per the original doc's own finding, `getTranslations()` throws
outside real request scope regardless of whether its result is ever used, and regardless of
the explicit `locale` argument.

**Why this is more severe than the original finding, precisely stated**: the original bug
(inside `buildCounselorGrounding`, called from `generateWeeklyPlan` itself) was wrapped in a
try/catch designed for exactly this kind of degrade — a plan still generated, just with less
grounding. This new site is **upstream of `generateWeeklyPlan` entirely** — it runs at line 92,
before the AI call at line ~115 is ever reached. There is no grounding to lose because there
is no plan to lose it from: **the call throws before generation starts.**

**Bounded, not catastrophic, by the job orchestrator — checked directly, not assumed.**
`lib/plan/generate-for-active-students.ts`'s `generateForStudent` wraps
`getOrCreateWeeklyPlan` in a try/catch (same "one student's failure must never abort the run"
pattern the file's own comment names), so the job itself would not crash. But every single
student's result would land as `{status: "error", detail: "..."}` — **the job would run to
completion, report success at the job level, and generate zero real plans for anyone**, every
week, silently, unless someone specifically inspects per-student error details rather than
just "did the job run."

**Job D's own wiring, reverified live, not from either doc's claim** — `job-dry-run-audit`
itself proved tonight that a "not wired" comment can go stale the moment someone arms a job
without updating it, so I checked the actual files directly rather than trusting either doc's
2026-09-03 claim:

```
vercel.json crons: 7 entries, generate-weekly-plans NOT among them.
lib/jobs/schedule.ts: "generate-weekly-plans" appears only in comments, describing it as
  still unwired — no entry in JOB_DEFINITIONS itself.
```

Both confirmed today, live. **Job D is still not armed anywhere.** This bug is real and
confirmed but not currently firing on any schedule — same "confirmed and inevitable once
armed, not yet live" framing the original doc used, now covering a worse failure mode than
that doc knew about.

## 2 — Does weekly-plan see today's context changes? Three separate answers, not one

**Skills: yes, confirmed by reading the current code, not inferred from having built it
myself hours ago.** `lib/ai/weekly-plan.ts:502` calls
`formatContextForPrompt(context, context.student.preferredLanguage)` directly — the exact
shared formatter this session's earlier fix added the `Skills:` line to. No changes needed;
this reached weekly-plan automatically the moment it landed on `formatContextForPrompt`,
because weekly-plan and advisor chat share that one function rather than each building their
own render of student facts.

**Target geography / target-university countries: no.** `grep -n "targetGeograph"
lib/ai/student-context.ts` returns nothing — the field doesn't exist in
`StudentAdvisorContext` at all. This is a different code path from what today's country-boost
work touched: `isTargetingCountry`/`targetUniversityCountries` (this session, earlier today)
lives in `lib/opportunities/matching.ts`/`persist-matches.ts`, scoped specifically to
opportunity-relevance *scoring* — it was never meant to and does not reach
`buildStudentAdvisorContext`, so neither weekly-plan nor advisor chat can say anything about a
student's target geography today. Confirmed by [[project_oryn_advisor_context_freshness_audit]]
for the advisor path already (finding 3: "`buildStudentAdvisorContext` doesn't read
`universities.country` at all"), and the same is true for weekly-plan since both read the same
context object.

**Eligibility's third state (`checked_not_stated`): code-ready, DB-blocked — reverified live,
unchanged since the prior audit.** This isn't a `EligibilityVerdict` value
(`known_eligible`/`known_ineligible`/`unknown`, confirmed in `lib/counselor/types.ts`) —
it's a value on `opportunities.age_eligibility_basis`/`country_eligibility_basis`/
`grade_eligibility_basis`, upstream columns that feed into building the `notes` text
`formatEligibilityCaveat` renders. That rendering function is shared — `weekly-plan.ts`'s own
`formatOne` calls `formatEligibilityCaveat(recommendation.eligibility)` at line 67, the
identical function the advisor path uses — so whatever's true for one is true for the other,
by construction, not by coincidence (the advisor-freshness audit's own finding 4 names an
already-fixed prior incident where these two surfaces *didn't* share a path and disagreed).
Reran the live check myself just now, not relying on the prior audit's timestamp:

```sql
select column_name from information_schema.columns
where table_name = 'opportunities'
and column_name in ('age_eligibility_basis','country_eligibility_basis',
                     'grade_eligibility_basis', ...);
-- returns: [] (zero rows)
```

None of the three basis columns exist live yet. Same standing state as the prior audit found,
not a regression — this codebase's own documented convention is "write migrations, leave them
unapplied" (confirmed directly in `lib/plan/persist.ts`'s own comment on a different column),
so "pending" is the normal condition here, not a gap introduced today.

**A fourth thing, not asked, worth naming since it's the direct weekly-plan analogue of what
you found for the advisor**: admission rate (`lib/ai/university-admission-context.ts`, built
per B7, CEO's own 2026-09-04 decision following the advisor-freshness audit) is imported by
`lib/ai/advisor-chat.ts` **only** — confirmed via `grep -rln "university-admission-context"`
across the whole repo, two hits: the file's own test, and `advisor-chat.ts`. `weekly-plan.ts`'s
full import list (already read in full) has no reference to it. **Weekly-plan does not carry
admission-rate context at all today** — not a code bug, just never wired to this second
consumer, the same shape the advisor-freshness audit's own finding 4 already named as a past
failure mode for a different field (eligibility caveats, since fixed by unifying on one shared
renderer). This one hasn't been unified — advisor and weekly-plan currently disagree on
whether they know a target university's admission rate.

## 3 — Cost

**The aggregate-budget mechanism is unchanged and still live** — `checkWeeklyPlanAggregateBudget`/
`selectModelForWeeklyPlan` (`lib/ai/limits/weekly-plan-budget.ts`), wired into
`weekly-plan.ts`'s `withUsageLogging` call exactly as the 2026-09-02 doc describes, ceiling
still `$10.00/month` (admin-editable, `weekly_plan_budget_settings`), degrade-not-stop,
summed across every student. Confirmed by reading the current file — no drift from the doc.

**Could not find a source for the "~234-569 token" figure** — searched `docs/` for
"admission" combined with a token count, and for a `B7`-named doc; neither the admission-context
file's own header comment nor its test file states a measured token cost. Not asserting the
number is wrong — just that I can't cite where it came from, so I'm not relaying it as verified.
Computed my own independent estimate from the real template strings in
`formatAdmissionRateLine`/`formatUniversityAdmissionContext` (a ~60-token section header plus
~20-45 tokens per rendered line, published/not_published/no_single_rate only —
`not_researched` renders nothing) — for a student with 3-8 target universities, that lands
roughly in the 200-500 token range, the same order of magnitude as the cited figure. Consistent,
not independently re-derived to the token.

**But that cost doesn't apply to weekly-plan's budget at all** — since
`university-admission-context.ts` is advisor-chat-only (§2 above), its token cost, whatever the
precise number, is an advisor-chat cost, not a `weekly_plan`-feature cost. It cannot be
pushing `weekly_plan`'s aggregate spend toward the $10 ceiling because weekly-plan never calls
that function.

**Target geography contributes nothing to weekly-plan's cost** — confirmed absent from
`StudentAdvisorContext` entirely (§2), so there's no token growth to account for from it, for
either consumer.

**Skills is the one real, confirmed token-cost growth weekly-plan picked up today** — a single
new line, `Skills: {name} [{category}], ...`. Estimated directly from the real render shape
(not measured against a live model): at the average 4.5 skills/student this session measured
earlier tonight for the accounts that have any, roughly `"Financial modeling [Analytical], "` ×
4-5 entries ≈ 35-45 tokens total, plus the `Skills: ` prefix — call it **under 50 tokens per
call**, on both weekly-plan and advisor-chat since both share `formatContextForPrompt`. At
$3/million input tokens (Sonnet, matching the aggregate-budget doc's own $0.029/call baseline
for a much larger prompt), 50 tokens is on the order of **$0.00015/call** — not a number that
moves the $10/month ceiling in any visible way, even multiplied across every student, every
week.

**Net answer to "does today's growth threaten the budget once cron is armed"**: no, on the
evidence gathered here. The one context addition that actually reached weekly-plan today
(skills) is negligible. The larger addition CEO's own figure describes (admission rate) never
reached weekly-plan's prompt at all, so it isn't part of this feature's cost picture yet — it
would only become relevant to `weekly_plan`'s own budget if someone later wires
`buildUniversityAdmissionContextText` into `weekly-plan.ts` too, which hasn't happened. **Real
per-student cost once Job D is armed remains what the 2026-09-02 doc already measured**:
$0.029/call (Sonnet) or ~$0.0097/call (Haiku, once degraded), ~$1.00/month all-Sonnet at
today's 8 students — **contingent entirely on §1's finding**: today, that cost would be spent
achieving zero successful plan generations, since every Job-D call fails before reaching the
billed model call. Once §1 is fixed, the existing cost math and aggregate ceiling apply
unchanged.

## What I could not measure

No live token count against the real Anthropic API for either the admission-rate section or
the skills line — estimated from template strings, not measured, matching this session's
established "no live model call" convention. Could not find the specific document CEO's
"~234-569 token" figure traces to, despite a real search — noted rather than silently
substituting my own estimate as if it were the same claim. This investigation was also
interrupted mid-task by a real, separate disk-space emergency (`/private/tmp`'s volume hit
zero free bytes, confirmed via repeated `ENOSPC` failures on even trivial Bash calls) —
reported to CEO immediately, resolved itself within a few minutes (810Mi free, 96% capacity,
genuinely thin but not currently blocking), and cost roughly 5 minutes of this task's time;
noting it here for completeness, not as a finding about weekly-plan itself.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
