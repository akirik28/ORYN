# Weekly-plan context gaps: target geography + admission-rate — measured, then wired

**Status:** code shipped this branch, alongside the Job D `persist.ts` fix. CEO's explicit
instruction: measure admission-rate's cost against weekly-plan's own budget before wiring it
in — "the advisor found it fine; that doesn't prove it's fine here" — not skip the check
because a sibling feature already ran it once.

## Target geography — no cost question, wired directly

`profiles.target_geographies` was already fetched into `buildStudentAdvisorContext` via its
own `select("*")` (zero marginal DB cost — the row was already being read, just not this one
column of it) but never mapped into `StudentAdvisorContext` or rendered by
`formatContextForPrompt`. Added both: [`lib/ai/student-context.ts`](../lib/ai/student-context.ts)
now carries `student.targetGeographies: TargetGeography[]` and renders it with a real label
(`targetGeographyLabel`, wording copied verbatim from the onboarding wizard's own
`t("geographyOptions.*")` catalog keys — the same words the student saw when they picked
these). Reaches both advisor chat and weekly-plan automatically, since both already share this
one formatter. No token-cost question here: this is a handful of words per student
(`"USA, UK"` at most), not a per-target-university-scaling section like admission-rate below.

## Admission-rate — measured first, per instruction

`lib/ai/university-admission-context.ts` (built 2026-09-04, B7) was wired into
`advisor-chat.ts` only. Before adding the same call to `lib/ai/weekly-plan.ts`, measured
against **this feature's own** aggregate budget, not the advisor's:

**Live query, this calendar month (2026-09-05, 5 days in), `ai_usage` where
`feature = 'weekly_plan'`:**

```
calls: 10
total_cost_usd: $0.1953
total_input_tokens: 51,198
avg_input_tokens/call: 5,119.8
unpriced_rows: 0
```

Extrapolated to a full month at the same pace: roughly **$1.17/month**, against the
**$10.00/month** default aggregate ceiling (`DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD`,
`lib/ai/limits/weekly-plan-budget.ts`) — about 12% utilized.

**Admission-rate's own cost, re-confirmed live rather than trusted from yesterday's figure**:
`university_statistics.admission_rate_basis` counts unchanged since B7 —
128 `published` / 3 `not_researched` / 2 `no_single_rate` / 0 `not_published` — so the
previously-measured **234 tokens (realistic 5-target case) to 569 tokens (worst-realistic
10-target-all-published case)** still holds; nothing to re-derive.

**The comparison that actually answers the question**: 234-569 extra input tokens against an
already-measured 5,120 avg input tokens/call is a **4.6%-11.1% increase per call**. At Sonnet's
$3/million input-token rate, that's **$0.0007-$0.0017 of extra cost per call** — against a
feature spending $1.17/month of a $10.00 ceiling today, this does not move the number in any
visible way, even before accounting for the fact that only students with target universities
that have *researched* admission-rate data pay this cost at all (a student with no targets, or
targets nobody has researched yet, pays nothing extra — `formatUniversityAdmissionContext`
returns `""` for an empty fact list, same as today).

**Decision: wired in**, no need to escalate — the instruction was to measure and flag *if* it
threatens the ceiling; it doesn't, by a wide margin (a >100x call-volume increase would be
needed before this specific addition became the reason weekly-plan's aggregate spend
approached $10/month, and at that volume the pre-existing per-call cost would already be the
dominant factor, not this one section).

## A real gap found while wiring this in, fixed rather than reproduced

`buildUniversityAdmissionContextText(userId)` always built its own session-scoped Supabase
client internally, with no override — silently correct for `advisor-chat.ts` (always a real
session) but the exact same silent-empty-data bug class this session spent hours fixing
elsewhere tonight (`lib/plan/persist.ts`'s own `supabaseClient` parameter, `refreshOpportunity
Matches`'s `client` parameter, `buildStudentAdvisorContext`'s own) — Job D has no session, so
without a fix this would have silently returned `""` for every Job-D-generated plan, correct
by accident (empty, not error) but for the wrong reason, and permanently invisible. Added the
identical `supabaseClient?` parameter, threaded through from `generateWeeklyPlan`.
`advisor-chat.ts`'s own call is unaffected (omitting the argument keeps its exact behavior).

## Also found and documented (not fixed): the eval harness under-measures both targets now

`lib/ai/eval/harness.ts`'s `buildWeeklyPlanPrompt`/`buildAdvisorChatPrompt` hand-reconstruct
the real prompts for `cost-estimate.ts`'s projections, without a database. Neither can
represent `buildUniversityAdmissionContextText`'s contribution — it's genuinely DB-dependent
(real `target_universities`/`university_statistics` rows), and fabricating placeholder text
for it would be worse than the gap itself. `buildAdvisorChatPrompt` has been missing this
since B7 shipped yesterday, unnoticed until now; `buildWeeklyPlanPrompt` is missing it as of
this change. Documented in the harness's own header comment rather than left as a silently
false "nothing left to drift" claim — both targets' cost projections now understate real
prompt size by roughly 234-569 tokens for a student with researched target-university
admission data. Not fixed, since faking DB-shaped content in a deliberately DB-free tool would
trade one honest gap for a dishonest non-gap.

## Verification

Full suite: 432 files, 6473 passed / 2 expected-fail (up from 6466 after the Job D fix alone —
+7 new tests: 5 for target-geography rendering, 2 for admission-context reaching the assembled
weekly-plan prompt). tsc and eslint clean on every touched file.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
