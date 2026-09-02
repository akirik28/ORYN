# What does this cost at 100 and 1,000 students?

No live calls made for this document — arithmetic over `ai_usage` (queried live,
2026-09-02) and `lib/ai/pricing.ts`'s published per-token rates, cross-checked against
`docs/tier-proposal-2026-09-02.md`'s own real-assembled-prompt measurements from the same
day. Every figure below is labeled **measured**, **modeled from a real prompt** (the tier
proposal's method), or **estimated** (a proxy, no data at all) — the three have very
different confidence, and collapsing them into one number would misstate all of them.

## The one fact that qualifies everything else

**Every real row in `ai_usage` is `claude-sonnet-5`. There is not one Haiku row.**
`lib/ai/limits/budget.ts`'s degrade-to-Haiku mechanism has never fired against real
traffic — it was built and wired the same night this document was written, after every
call currently in the table. The free-tier plan (`docs/tier-proposal-2026-09-02.md`) puts
students on Haiku by default. **That configuration has never run.** Everything below
that involves Haiku is arithmetic on published rates and the tier proposal's own
assembled-prompt measurements, not observed production behavior. Said once here; flagged
again at each point it matters rather than assumed remembered.

---

## 1. Real per-feature unit costs, measured

`ai_usage`, `model != 'test-model'` (see `docs/ai-spend-cap-2026-09-02.md` for those three
fixture rows), whole database:

| Feature | Calls | Distinct users | Avg cost/call (Sonnet) | Sample |
|---|---|---|---|---|
| `weekly_plan` | 112 | 6 | **$0.0292** | Real, but 98 of 112 are one account's 33-second burst (`docs/ai-spend-cap-2026-09-02.md`) — the *per-call* cost isn't skewed by that (each call is a similarly-shaped plan-generation prompt), but the *call count* is not representative of normal usage frequency |
| `advisor_chat` | 10 | 3 | $0.0296 | Thin — 10 calls total |
| `cv_extraction` | 2 | 2 | $0.0617 | 2 calls |
| `achievement_refinement` | 1 | 1 | $0.0055 | 1 call |
| `research_generator` | 0 | 0 | — | **No data** |
| `counselor_explanation` | 0 | 0 | — | **No data** |
| `essay_story_bank` | 0 | 0 | — | **No data** |
| `opportunity_extraction` | 0 | 0 | — | **No data** — never run, ORYN has never been deployed |
| `requirement_extraction` | 0 | 0 | — | **No data** — same |
| `requirement_interpretation` | 0 | 0 | — | **No data** |

**Six of ten features have zero real calls.** Any monthly total that includes them is
using a proxy for those six, not a measurement — flagged per-line below, not silently
blended in.

**Where a real, better-grounded number exists for the unmeasured six**: the tier
proposal's own §"What a budget actually buys" measured `weekly_plan` and
`counselor_explanation` from **real assembled prompts** (not logged calls) —
$0.266/month Sonnet or $0.089/month Haiku for "four weekly plans plus thirty counselor
explanations." That's a stronger source than the thin `ai_usage` sample for those two
specifically (a designed prompt at realistic length, not whatever the 6 real accounts
happened to type), and it's used in §3 below in preference to the raw average for
`weekly_plan`'s per-plan cost, with the difference between the two sources shown rather
than picked silently.

---

## 2. Three cost shapes, not one bucket

Oryn-a7's own framing, verified rather than assumed:

### Per-student (degrade-capped, `lib/ai/limits/budget.ts`)
`advisor_chat`, `cv_extraction`, `weekly_plan` (when triggered by the student — dashboard
lazy-generate or Regenerate), `research_generator`, `achievement_refinement`,
`counselor_explanation`, `essay_story_bank`. Bounded (softly) by the founder's own
$0.50/$1.00 per student per month. **Does not shrink or grow with total student count** —
it's a per-student figure by construction.

### Per-run (`generate-for-active-students.ts`, Job D — **not scheduled today**, confirmed
directly against `vercel.json`, no `generate-weekly-plans` entry)
If ever turned on: one `weekly_plan` call **per onboarded student, per run**, whether or
not that student ever opens the app. This is the shape that scales **linearly** with
student count — oryn-a7's own example, verified: $0.029/plan × N students. **Also
attributes to each student's own `user_id`** (confirmed in `generate-for-active-students.ts`
— `getOrCreateWeeklyPlan(userId, { supabaseClient: adminClient })`), so this is not only a
company-wide cost — every Job D run also consumes part of *that specific student's* own
$0.50 target, whether they asked for it or not. Not a hypothetical detail: see §4.

### Per-install (`opportunity_extraction`, `requirement_extraction` — the two catalog
jobs, scheduled daily in `vercel.json`, never run because ORYN has never been deployed)
One shared catalog, read by every student, paid for once regardless of student count.
**Gets cheaper per student as the userbase grows** — the exact opposite shape from Job D.
No real usage to measure (§1); `lib/ai/limits/job-budget.ts`'s own estimates, derived from
today's configured batch sizes and `pricing.ts` rates, not logged calls:
- `opportunity_extraction`: ~30 calls/night (`DEFAULT_DISCOVERY_QUERIES` × `maxResults: 6`),
  ~$0.017/call → **~$15/month**, ceiling $25.
- `requirement_extraction`: ~15 calls/night, self-limiting (only targets universities with
  zero requirement rows, so it trends toward zero as the backlog clears) → **up to
  ~$11/month** while backlog work continues, ceiling $15.
- **Combined ceiling: $40/month, actual estimate ~$26/month, fixed**, whether the
  userbase is 10 or 10,000.

These three shapes are not comparable line items in one sum — they answer different
questions ("what does a heavy student cost," "what does turning on Job D cost the
company," "what does the catalog cost per student as we grow") and the rest of this
document keeps them separate rather than adding them into one misleading total.

---

## 3. Per-student monthly model — does the cap actually hold, or just slow the burn?

Two usage profiles, priced three ways: **measured Sonnet** (what's actually been billed),
**modeled Haiku** (pricing.ts's exact 3× cheaper rate — Haiku is $1/$5 per M tokens vs
Sonnet's $3/$15, precisely 1/3 on both input and output — applied to the same
measured/modeled token counts, since no real Haiku call exists to measure output-length
drift against), and **the tier proposal's own real-prompt figures** where they cover the
same ground, shown alongside rather than overwritten.

### Light/typical (what's actually been observed)

`docs/tier-proposal-2026-09-02.md`'s own finding, re-confirmed here directly against
`ai_usage`: of 6 accounts with any real activity, **5 are under $0.25 lifetime** — not
monthly, lifetime, across the whole time ORYN has existed. At this usage level the
$0.50 target isn't approached, degrade never fires, the question doesn't arise. This is
the actual population today, for what that's worth with a QA-only user base.

### Heavy — the 300-message quota's own worst case

`docs/tier-proposal-2026-09-02.md` already computed this precisely: **everyone starts on
Sonnet, degrades to Haiku at $0.50, quota caps at 300 messages/month → worst case
$4.10.** That's **4.1× the $1.00 ceiling.** Independently re-derivable from the same
document's own message-count table: $0.50 buys 7 Sonnet messages before degrading; the
remaining 293 messages at Haiku's own per-message rate (~$0.0117, back-solved from "$1.00
ceiling → 79 Haiku messages after the fixed floor") add roughly $3.60 more.

**Direct answer: no, the mechanism does not reliably hold a heavy user under the $1.00
ceiling — it slows the burn, exactly as `budget.ts`'s own comment says CEILING is "a
monitoring number... never a second code-enforced gate." A student determined (or
malfunctioning) enough to reach 300 messages ends the month at roughly 4× the stated
ceiling, by design, because the founder explicitly chose no hard wall.**

### The burst this session already fixed, priced under both regimes

The real 98-call/33-second `weekly_plan` incident (`docs/ai-spend-cap-2026-09-02.md`) cost
**$2.97 at all-Sonnet pricing** — matches the ai_usage record exactly, since Haiku had
never fired. Priced under the *now-live* degrade mechanism (had it been active at the
time): the first ~17 calls (~$0.50 ÷ $0.029/call) would have been Sonnet, the remaining
81 would degrade to Haiku (~$0.0097/call, `weekly_plan`'s own per-call rate ÷ 3) →
roughly $0.50 + $0.79 ≈ **$1.29 — still 29% over the $1.00 ceiling**, from the same
burst, even with the dollar-based degrade fully active. **The dollar cap alone was never
going to hold this specific incident under $1.00; only the rate-limit fix (already
shipped) actually stops it, by preventing the 81st call from happening at all rather than
making it cheaper.** This is the clearest concrete evidence available that burst
protection and spend protection are different guarantees, priced rather than just
argued.

---

## 4. At scale — 100 and 1,000 students

Per-install (fixed) and per-run (linear, if Job D is ever scheduled) modeled separately;
per-student aggregate uses the light/typical figure (§3) as the realistic case and the
quota's own worst case as the ceiling case, since no real distribution of usage across a
real population exists to model a "typical heavy-tail" scenario honestly.

| | 100 students | 1,000 students |
|---|---|---|
| **Per-install** (catalog, fixed) | ~$26/mo total → **$0.26/student** | ~$26/mo total → **$0.026/student** |
| **Per-run, Job D** (if scheduled; currently off) | $0.029 × 100 × 4.33wk ≈ **$12.6/mo**, all-Sonnet | $0.029 × 1,000 × 4.33wk ≈ **$125.7/mo**, all-Sonnet |
| — same, if Job D's own calls degrade to Haiku after each student's $0.50 (plausible for any student already near target from interactive use) | as low as **~$4.2/mo** | as low as **~$42/mo** |
| **Per-student aggregate, light/typical usage** (§3, <$0.25/student observed) | **< $25/mo total** | **< $250/mo total** |
| **Per-student aggregate, quota worst case** (§3, $4.10/student ceiling-quota max) | **$410/mo** if every student hit the quota max (not expected, upper bound only) | **$4,100/mo**, same caveat |

**Per-install genuinely gets cheaper per student with scale — the only line in this table
that does.** Per-run is linear and, unlike the per-student cap, has **no ceiling of its
own** at all today (`lib/ai/limits/job-budget.ts`'s `JobBudgetFeature` type covers only
`opportunity_extraction`/`requirement_extraction` — confirmed directly, `weekly_plan` is
not in it). If Job D is ever scheduled, it adds a real, currently-unbudgeted, linearly-
scaling cost with nothing stopping it from growing unbounded with signups, on top of
whatever each student's own interactive usage already costs against their personal cap.

**One number the founder's tier plan should see before scheduling Job D**: at 1,000
students, proactive weekly generation alone consumes **~$0.126/student/month**
(4.33 × $0.029) against every student's own $0.50 target — about 25% of it — before a
single one of them sends a message, reads an outlook, or does anything else that costs
money. That's not this document's decision to make; it's the number the decision needs.

---

## 5. What this document did not do

No live AI calls, per the assignment. No attempt to model a realistic *distribution* of
student usage (heavy/typical/light mix) — there is no real population to draw one from
yet, and inventing a distribution would dress up a guess as data. Six features have zero
real usage data, represented here by their nearest available proxy rather than a number:
one (`counselor_explanation`) has a designed-prompt estimate from the tier proposal, two
(`opportunity_extraction`, `requirement_extraction`) have `job-budget.ts`'s own
capacity-derived estimates, and three (`research_generator`, `essay_story_bank`,
`requirement_interpretation`) have nothing at all — no figure for those three appears
anywhere in this document. Naming that gap precisely is the honest version of "modeled,"
not a placeholder pretending otherwise.
