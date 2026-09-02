# What Ultra should actually offer — a recommendation, 2026-09-02

The founder, directly, relayed by CEO: the comparison page is thin and needs real features
— *"ya yeni özellik yazıp premiuma geçiricez ya da halihazırdaki özellikleri premium yapıp
kilitliycez"* (either write new features and put them behind premium, or take existing
features and lock them) — plus a welcome moment after upgrading, showing things a student
would actually want to try.

**Status: recommendation only. Nothing below is built.** Per CEO's instruction, this is the
list for the founder to decide from, not a build in progress.

## Ground truth, and one correction to it

Read `docs/ultra-tier-value-2026-09-02.md` (60's census) and
`docs/oryn-premium-karar-seti-2026-09-02.md` (a prior, detailed decision document) as
instructed. Both are good work and both are **partly superseded by a change that landed
after they were written**, worth stating plainly before anything else: the AI quota
mechanism they analyze — per-feature `MONTHLY_AI_QUOTAS`, `advisor_chat: 300` as the one
metered feature — no longer exists. `lib/ai/monthly-quota.ts` (read fresh for this pass,
current on `main`) is now **one shared 236,150-token pool across all seven student-facing
AI features at once** (`advisor_chat`, `weekly_plan`, `cv_extraction`,
`achievement_refinement`, `research_generator`, `counselor_explanation`,
`essay_story_bank` — `PER_STUDENT_AI_FEATURES`), following the founder's own directive
("mesajla değil tokenla ölç" — meter by tokens, not messages). This isn't a footnote — it
changes what the cheapest, most honest lever actually is, and it invalidates several of the
karar-seti's per-feature proposals (below).

**The other thing that changed underneath the karar-seti's proposals: a lot of product code
shipped since it was written.** Several things it proposed gating behind Ultra are, checked
against current code rather than assumed, already open to every student today. Gating them
now wouldn't be "making them premium" — it would be **removing something free students
currently have**, which is exactly what the founder's message and CEO's principle rule out.
This is the single most important finding of this pass — see §3.

## 1–2. What Ultra could honestly offer

Four proposals, not six padded to six — the product's own voice principle (Phase 56/57,
"specific, not abartısız") applies to this list too. Each is checked against: does this
require taking something away from free, and what does it cost to build.

### A. A bigger shared AI allowance — raise `MONTHLY_AI_TOKEN_LIMIT` for Ultra

**Kind:** limit raise. **Cost:** small — the constant has exactly three real call sites
outside its own file (`app/(app)/layout.tsx`, `app/(app)/advisor/actions.ts`,
`app/(app)/advisor/page.tsx`); making `getMonthlyQuota(userId)` look up tier and branch the
limit is one function, not a rewrite. **Free without it:** yes — free keeps its exact
current 236,150-token pool, unchanged. Nothing is removed to build this.

Because the pool is now shared across all seven features, this one change is honestly "more
of everything AI-powered" — more advisor conversations, more weekly-plan regenerations
before the shared wall, more achievement-refinement calls, more research-generator runs —
not just more chat. That's a materially better pitch than the old per-feature quota would
have allowed, and it's the reason this doc leads with it instead of with what 60's census
called the honest floor.

### B. Slower degrade to the cheaper model — raise the spend target before Haiku kicks in

**Kind:** limit raise, and a different axis from A — quality, not quantity. **Cost:**
small — `selectModelForUser` (`lib/ai/limits/budget.ts`) is already the one place every AI
call routes model selection through (8 call sites, all going through this one function);
making its `MONTHLY_BUDGET_TARGET_USD` check tier-aware is a single branch inside a function
every caller already uses, not a change at each call site. **Free without it:** yes — free
keeps today's exact $0.50 degrade point.

**This one is worth being precise about, because it's coupled to A, not independent of it.**
`budget.ts`'s own comment confirms the token pool in A is *calibrated from* the same
$0.50/$1.00 constants this lever would change. Shipping A alone gives Ultra a bigger
allowance, but most of the extra headroom would still be spent at Haiku quality once the
$0.50 target is hit — genuinely more, but not uniformly better. Shipping B alone means the
same-sized allowance goes further at full Sonnet quality before degrading — better, but not
bigger. They compound; each is independently honest to ship alone, but the strongest, most
truthful "Ultra feels different" answer is both together, not either as a stand-in for the
other.

### C. Portfolio export

**Kind:** new capability — this does not exist for anyone today, checked directly (no
export/PDF/share route found under `features/profile` or `app/(app)/profile`). **Cost:**
medium — a real new surface (a render/export route), but not an AI-cost feature at all, so
it doesn't touch the quota system or add spend risk. Phase 20 of the spec names this
directly: *"Allow export-ready architecture later"* — later is now. **Free without it:**
trivially yes, since it doesn't exist for anyone yet; free's portfolio view is unaffected.

The reason this is on the list and not just "more AI": it diversifies what Ultra buys beyond
a bigger allowance, and a clean exportable portfolio is a concrete, demonstrable "thing a
student would want to try" the moment they see it — closer to what the founder's "insanların
denemek isteyeceği" is actually asking for than another quota number is.

### D. On-demand refresh for one saved item

**Kind:** new capability. Today's freshness model (Phase 30/34) is entirely a scheduled,
shared background job — `opportunity_extraction`/`requirement_extraction` serve the whole
catalog at once, correctly un-scopable to one tier (60's census already ruled this out, and
correctly). What's never been built is a **student-triggered, single-item** recheck — "check
this one deadline again right now" on something already saved — which is a different,
smaller thing than re-running the shared job, and genuinely attributable to one student's
action rather than the shared catalog. **Cost:** medium — reuses the existing
extraction/Tavily plumbing per-item instead of per-catalog, plus its own burst limit so a
student can't turn it into a free-form scraper. **Free without it:** yes, doesn't exist for
anyone today; free keeps the exact current scheduled-refresh cadence.

*(Already shipped, listed for completeness, not proposed here: the visual identity —
flame, amber ground, sidebar canvas — is real and already approved. It stays row one on the
comparison page; nothing about it changes with this recommendation.)*

## 3. What must never be gated

60 found one — the weekly plan's three-action cap. Checking the rest of the surface against
current code, not just against what sounds sellable, found four more. Two are the same
failure shape as 60's; two are a different, more urgent shape — **things the karar-seti
proposed gating that current code already gives every student, unconditionally, today.**

1. **Weekly plan's `.max(3)`** (`lib/ai/weekly-plan.ts`) — 60's finding, restated because
   it's the clearest example of the pattern: a design ceiling, not a cost artifact. "Ten
   priorities instead of three" sells the opposite of the product.
2. **Research generator's three-idea cap** (Phase 13's own spec: *"Generate 3 project ideas
   maximum"*) — the identical failure shape as #1, one level down. More ideas per generation
   isn't more value; Phase 13.1 explicitly warns against generating impressive-sounding,
   unachievable projects. Naming this now, before anyone reaches for "Ultra gets 10 ideas,"
   the way CEO asked.
3. **The admission outlook range** (`lib/admissions/outlook.ts`,
   `estimate_range_low`/`estimate_range_high`) — checked live in
   `app/(app)/universities/[id]/page.tsx:254-257`: shown to **every** student today whenever
   the underlying data supports it, gated only on data sufficiency, not on any tier check.
   The karar-seti proposed this as Ultra-exclusive (*"Free = yok... Premium = var"*) — that
   proposal, checked against what's actually shipped, would be a removal, not an addition.
   Reject it as written.
4. **CV/profile re-import** (`app/(app)/profile/import/`) — checked directly: no one-time
   gate, no tier check, no limit of any kind found in `actions.ts`/`page.tsx`. The
   karar-seti's *"Free = hesap başına 1 kez, Premium = sınırsız"* describes a restriction
   that isn't live — building it now, for the purpose of then selling its removal, is
   introducing a new limit to have something to sell. Same rejection as #3, same reason.
5. **A per-feature monthly cap on `achievement_refinement`/`research_generator` for free
   specifically** — the karar-seti's table proposes capping these to free while leaving
   Ultra generous. Superseded by the architecture change in the "ground truth" section
   above: both already share the one 236,150-token pool every feature draws from today.
   Introducing a *second*, feature-specific monthly cap that only applies to free would be a
   new restriction stacked on top of what free currently has — proposal A already gives
   Ultra more room across exactly these features, honestly, without needing this.

## 4. The welcome moment

**Honest framing of the trigger, stated once so it isn't glossed over: there is no purchase
flow yet.** "After upgrading" currently means "after `profiles.plan_tier` is set" — by an
admin, not a checkout. The welcome moment should be designed against *that* trigger, not
against a payment event that doesn't exist:

- **Trigger:** the first authenticated page load where `plan_tier` reads `"ultra"` and the
  student hasn't seen the welcome yet (a small persisted flag — a boolean/timestamp column
  or equivalent, checked once on `app/(app)/layout.tsx`'s existing tier read, no new query
  shape needed). Shown once, dismissible, never reappears — the same one-time-state pattern
  onboarding already uses (`onboarding_completed`), not a new mechanism.
- **What it says:** introduces what's now available, not what was bought. No "Congratulations
  on upgrading" — Phase 57's own rule against excessive praise applies here exactly as it
  does to advisor copy. Concretely: name the real things from §1–2 that actually shipped
  (whichever subset the founder approves), specifically, the way the product already talks
  about everything else — *"Your AI allowance is bigger now, and stays at full quality
  longer before slowing down"* — not *"Unlock the full power of Oryn!"* If C or D ship, the
  same sentence pattern: what changed, plainly, not why it's exciting.
- **Where:** a dismissible panel on the dashboard's normal load, not a modal blocking the
  page — matches the product's existing calm-not-gamified posture (§13 of the spec:
  "avoid excessive animations," "avoid unnecessary gamification").

## 5. What the comparison page should show

Today (`lib/tier/comparison.ts`): three rows — visual theme (differs), advisor allowance
(differs), weekly plan focus (same by design). The file's own discriminated-union shape
(`differs` vs `sameByDesign`) is exactly right and shouldn't change — it's what makes "kept
equal on purpose" a visible claim instead of a silent gap, and §3 above means that list is
about to get longer, not shorter.

**Once the founder picks from §1–2, the page should show:**
- Visual identity — differs (unchanged, already true).
- AI allowance — differs, reframed from "advisor allowance" to cover the real shared pool
  (proposal A), not chat specifically.
- Response quality under load — differs (proposal B), stated as its own row, not folded into
  the allowance row, since a reader shouldn't have to infer that bigger and better-quality
  are two different claims.
- Portfolio export / on-demand refresh — differs, one row each, only for whichever of C/D the
  founder approves — not listed speculatively.
- Weekly plan focus — same by design (unchanged).
- **At least one more `sameByDesign` row than exists today** — the research-generator idea
  cap or the admission-outlook range (§3, items 2–3) belongs on the page as a stated "kept
  equal on purpose," the same way the weekly-plan row already is. Right now the page shows
  one thing Ultra doesn't touch; after this pass, it should show that this was a deliberate,
  repeated stance, not a single exception.

A short, honest page is still the goal — this isn't a call to maximize row count, only to
make it match whatever the founder actually approves from §1–2 plus §3's now-larger "kept
equal" list.
