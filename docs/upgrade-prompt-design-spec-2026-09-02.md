# ORYN Upgrade Prompt — Design Spec

**Status:** Design spec, not an implementation. Every claim about existing code below is a
direct file:line citation, read this session — nothing here is inferred from memory or a
prior summary. **Opened:** 2026-09-02.

**What this answers**, per the founder's brief (relayed via the coordinating session):
promote ORYN's own premium tier in-product — first-party only, explicitly not a
third-party ad network — with "chained, animated" presentation. This spec covers *when it
fires*, *what it says* (both locales), *what it must never do* (grounded in the parallel
legal research), *how it behaves given the no-hard-wall cap already built*, and a concrete,
argued answer to what "chained, animated" should mean here.

**What this doesn't do:** name a price, size a free allowance, or design the checkout/
billing flow. Those are open product decisions (see [Open questions](#open-questions)) that
sit upstream of a prompt spec — I'm not filling them in here to avoid the doc quietly
becoming the place those got decided by default.

**Companion visual:** [claude.ai/code/artifact/465ce8e2-5605-44e1-8b71-6a764fdf0e17](https://claude.ai/code/artifact/465ce8e2-5605-44e1-8b71-6a764fdf0e17)
— the rejected and recommended treatments side by side, built with Oryn's actual tokens
and the real `AdvisorMessage` anatomy, not a generic mockup.

---

## Executive summary

**Primary trigger: an inline, per-reply note on the specific advisor message that was
served by the degraded model — not a signup gate, not an ambient banner, not a modal.**
This is the one moment in the product where "you're on the free tier" is *true right now,
about the thing in front of the student*, rather than a claim about their account in
general. It's also the only trigger option that's consistent, simultaneously, with three
independent constraints this research turned up: ORYN's own no-hard-wall cost cap (a
message never fails, so the prompt has nothing to interrupt — it can only inform),
the freemium survey's finding that every working comparator ties its prompt to a real,
already-occurred limit rather than showing it ambiently, and the minors-payment legal
research's caution against personalizing marketing content to a specific student's own
usage pattern (a factual "this reply used a lighter model" is a system-state disclosure,
not a targeted pitch — see [What it must never do](#what-it-must-never-do)).

**"Chained, animated" is right for a page the student opens on purpose, wrong for a note
interrupting one they didn't.** Argued in full below, but the short version: ORYN's own
design system already has exactly one deliberately elaborate animation in the product (the
application-acceptance celebration) and documents, in its own words, "don't add a second
one of these elsewhere without the same restraint applied." A chained reveal belongs on a
self-initiated "See what Premium changes" surface, not injected into a counseling reply.

**What's actually built today: the degrade mechanism, and nothing else.** No premium tier,
no billing, no signal from a degraded call to the UI at all — this is a from-zero build on
top of a real, working, silent-degrade cost cap. The [punch list](#whats-not-built-yet)
below is concrete and short.

---

## 1. The moment — where and why

### 1.1 What's already built, and where it stops

`lib/ai/limits/budget.ts:86-122` (`selectModelForUser`) checks `ai_usage` fresh before every
advisor call and returns `claude-haiku-4-5` once this calendar month's known spend crosses
**$0.50** (`MONTHLY_BUDGET_TARGET_USD`, `:22`) — the founder's own code comment (`:6-20`)
states the reasoning directly: *"A student who hits a wall mid-question doesn't come back.
So there is exactly one enforcement mechanism — degrading to a cheaper model... never a
second, harder-enforced threshold."* `$1.00` (`MONTHLY_BUDGET_CEILING_USD`) is explicitly a
monitoring number, not a second gate. This already matches the pattern
`docs/research/freemium-genclik-urunleri-2026-09-02.md` §11.1 found across every working
comparator (branch `oryn/freemium-genclik-research-2026-09-02`, not yet merged): a real
allowance, not a wall that stops the product cold.

`ModelSelection.degraded` (`lib/ai/limits/budget.ts:61`) is fully computed on every call —
but `generateAdvisorReply` (`lib/ai/advisor-chat.ts:26-51`) discards everything except
`result.text` (`:50`), and `sendAdvisorMessage` (`app/(app)/advisor/actions.ts`) returns no
`degraded` field either. **Today, nothing in the response chain tells the UI a given reply
was degraded.** Migration `0076_ai_usage_degrade_columns.sql` (adds `degraded`/
`degrade_reason` to `ai_usage`) is written but **not applied — explicitly founder-gated**
(`lib/ai/usage.ts:51-59`'s own comment). None of this needs to change for this spec to be
useful, but building it requires threading one boolean through four call sites — see the
punch list.

One existing surface already almost does this: `AdvisorMessage`'s `meta` prop
(`components/oryn/advisor-message.tsx:30,38-39,66`) — *"Quiet right-aligned metadata — a
timestamp, a model note"* — is a designed-for, currently-empty slot sitting exactly where
this note belongs, in the component's own header row, right-aligned, `text-[0.6875rem]
text-ink-3 tabular-nums`. This spec proposes filling a slot that was already left for it,
not inventing a new one.

### 1.2 Why this moment, not the alternatives

Four alternatives considered and rejected, each against a specific finding:

- **At signup / onboarding.** Rejected — every comparator survey found that shows the
  upgrade pitch before any value is delivered reads as a growth-hacking pattern (Duolingo's
  omnipresent marketing CTAs, Brilliant's page-level redirect before the first exercise
  loads) associated with products explicitly *unlike* ORYN's stated calm/premium identity.
  A student hasn't experienced anything degraded yet — there's nothing true to tell them.
- **Ambient, always-visible (e.g. a persistent banner on the advisor page).** Rejected as
  the *primary* trigger, kept as a light-touch *secondary* surface (§4) — an ever-present
  nag is exactly the "wall shown regardless of use" pattern the freemium survey found only
  on the least-restrained comparators (Duolingo, Khanmigo's whole site), and it can't be
  made truthful the way the per-reply note can: it would have to either lie ("upgrade!"
  shown to a student who hasn't been degraded at all this month) or require the same
  plumbing this spec already needs, with none of its precision.
- **A blocking modal at the moment of degrade.** Rejected outright — it contradicts the
  founder's own explicit "never a hard wall" design (`lib/ai/limits/budget.ts:12-20`). A
  modal the student must dismiss to keep reading *is* a wall in every way that matters to
  the student, even if the message underneath still generates.
- **A personalized, usage-pattern-driven pitch** ("You've asked 8 great questions about
  research this month — see what Premium could unlock for you"). Rejected on legal
  grounds, not just taste — see §2. This is the one alternative where the freemium
  research and the legal research point the same direction independently: the survey found
  this style of copy nowhere among the calmer, better-regarded comparators, and the
  parallel minors-payment brief found a live, untested Turkish rule that plausibly reaches
  exactly this pattern.

---

## 2. What it must never do

Grounded in `docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md` (the parallel
minors-payment-law brief) — **not legal advice, and neither is this section**; treat both
as a design constraint pending real legal review, not a cleared position.

**The single rule that resolves cleanly across every jurisdiction that document covers:
the prompt's content must be the same for every student in the same system state, never
tailored using an individual student's own usage or activity data.** Specifically:

- Turkey's Ticari Reklam Yönetmeliği **m. 25/A(3)** (in force 2026-08-01, untested) bans
  targeted advertising to a known-or-reasonably-assumed child that's built by *"kişisel
  verilere dayalı profilleme"* — and, unlike the EU's DSA, **carries no remuneration
  requirement**, so a first-party, unpaid house-ad isn't obviously exempt the way it likely
  is under DSA Art. 3(r)'s "against remuneration" language. A prompt that says "this reply
  used a lighter model" is a disclosure of *system state*, not profiling; a prompt that
  says "you're strong in leadership, here's why Premium's research tools matter for you" is
  built from the student's own profile data to persuade — squarely the shape m. 25/A(3)
  describes.
- The UK's ICO Age Appropriate Design Code, **Standard 12**, expects any profiling used to
  drive something *other than the core free service* to sit behind a privacy setting that
  defaults off. An upgrade pitch is, by definition, not required to deliver the free
  service — so if it's built from behavioral profiling at all, UK guidance wants that
  off by default, which a same-copy-for-everyone note sidesteps by not profiling in the
  first place.
- GDPR **Recital 38** singles out "creating personality or user profiles" of a child for
  marketing purposes as meriting specific protection — same direction as the above from a
  third, independent regime.
- Turkey's Yönetmelik **m. 24(1)(ı)** separately bans advertising that directly encourages
  a child to go persuade their parent. **Concretely: never write copy addressed to the
  student asking them to go ask a parent to upgrade.** Any parent-facing surface must be
  addressed to the parent, on a page the parent reached themselves (e.g. billing/account
  settings), not routed through the student as a messenger.
- The sharpest cautionary precedent found isn't about the ad-definition question at all:
  **FTC v. Epic Games** ($245M order, 2023) was about *dark-pattern design* tricking users
  — including minors — into unwanted charges. Nothing in this spec's recommended design
  approaches that, but it sets the outer bound: no artificial urgency, no fake scarcity, no
  countdown timer, no button-hierarchy trick that makes "not now" harder to find or read
  than "upgrade." The [copy](#3-copy) below gives "not now" equal visual weight.

None of this blocks a prompt tied to **system state** (a specific reply was degraded, an
account is on the free tier) — only prompts built from an individual's **behavioral/content
data** to persuade them specifically. That's a real, implementable line, and it's the one
this spec's primary trigger (§1) is designed to sit on the safe side of.

---

## 3. Copy

Tier name: **"Oryn Premium"** — deliberately not "your plan," which already means the
free weekly plan feature everywhere else in the product (`messages/en.json`'s `plan`
namespace). Using "plan" for the subscription too would put two different meanings of the
same word in the same sidebar. If the founder's own "planını yükselt" phrasing was meant
literally as the subscription's name rather than colloquial shorthand, that's a call worth
making explicitly rather than by drift — flagged in [Open questions](#open-questions).

New i18n namespace, matching the existing pattern (`messages/en.json`'s `advisor.usageMeter`
block, plain nesting, ICU placeholders) — proposed shape for **both** files:

```json
"advisor": {
  "degradeNote": {
    "label": "Lighter model",
    "detail": "This reply used a lighter model — this month's advisor budget is in use.",
    "cta": "Restore full depth"
  },
  "premium": {
    "tierName": "Oryn Premium",
    "sidebarChip": "Free tier",
    "sidebarChipCta": "See Oryn Premium",
    "settingsTitle": "Oryn Premium",
    "settingsIntro": "The free advisor stays fully usable all month. Premium keeps every reply on the full model, not just the ones your budget covers.",
    "notNow": "Not now"
  }
}
```

```json
"advisor": {
  "degradeNote": {
    "label": "Daha hafif model",
    "detail": "Bu yanıt daha hafif bir modelle üretildi — bu ayın danışman bütçesi kullanımda.",
    "cta": "Tam derinliği geri aç"
  },
  "premium": {
    "tierName": "Oryn Premium",
    "sidebarChip": "Ücretsiz katman",
    "sidebarChipCta": "Oryn Premium'a bak",
    "settingsTitle": "Oryn Premium",
    "settingsIntro": "Ücretsiz danışman ay boyunca tam kullanılabilir kalır. Premium, yalnızca bütçenin karşıladığı yanıtları değil, her yanıtı tam modelde tutar.",
    "notNow": "Şimdi değil"
  }
}
```

**Why this reads as ORYN, not generic SaaS**, checked against Phase 57's own bar
("specific, concise, analytical, calm, evidence-aware, action-oriented... avoid excessive
praise"): no exclamation marks, no "unlock," no "don't miss out," no urgency language. The
detail line states a fact (lighter model, budget in use) before the ask. `"Restore full
depth"` names the actual mechanism (depth of response, the thing Premium changes) instead
of a generic "Upgrade now" — matching how the advisor's own voice already distinguishes
itself from a template chatbot (`components/oryn/advisor-message.tsx:14-17`).

**What this is not:** it never says "you've used your free messages" or implies the
*student* is blocked — because they aren't (§1.1). The line is true regardless of how many
messages remain; it describes *this reply*, not the account.

---

## 4. Secondary surface — ambient, but not a nag

A persistent but low-key state chip belongs beside `MonthlyUsageMeter`
(`app/(app)/advisor/page.tsx:107-109`, same sidebar column, zero new data plumbing — the
free/paid state just needs to exist as a field, see punch list). Rendered as a
`StatusBadge` (`components/oryn/status-badge.tsx`) with the `neutral` tone (per the design
system's own tone table: *"no signal yet"* — appropriate, since "you're on the free tier"
isn't a warning or a status about anything going wrong) reading `sidebarChip` above, with
`sidebarChipCta` as a plain text link beneath, not a button — a link reads as available
information; a button reads as a demand.

This is deliberately **not** where the "chained, animated" treatment goes either — it's a
one-line, static chip, present every time the page loads, identical for every free-tier
student regardless of their usage that session. That constancy is what keeps it on the
right side of §2's line: it's account-tier chrome, not a targeted pitch.

---

## 5. "Chained, animated" — where it belongs, and why not here

The founder asked for a chained, animated presentation, explicitly not a third-party ad
unit. Worth taking at face value that an animated, premium-feeling moment is wanted
*somewhere* — the disagreement in this spec is with *where*, not with the idea.

**ORYN's own design system already answers this question, independently of anything in
this brief.** `docs/design-system.md`'s Motion section documents the acceptance-moment
celebration (`features/applications/status-control.tsx`) as *"the one deliberately more
elaborate animation in the product... spec-mandated ('no childish fireworks... a
meaningful, memorable moment')"* and states directly: **"don't add a second one of these
elsewhere without the same restraint applied."** That sentence was written before this
brief existed, for an unrelated feature — it's independent corroboration, not something
this spec is arguing into existence to win a point.

**Injecting a multi-step animated sequence into the degrade note (§1) would violate that
rule directly**, and it would do it in the single worst place to do it: `AdvisorMessage`'s
whole reason for existing is to read as "written counsel," not a messaging surface
(`components/oryn/advisor-message.tsx:6-17`, the component's own doc comment states the
bubble-vs-counsel distinction is load-bearing to the product's identity). A chained reveal
sitting next to a piece of advice the student asked for reads as a chatbot upsell
interstitial bolted onto a counselor — exactly the thing that comment warns against.

**Where a chained, animated moment is genuinely appropriate: a "See Oryn Premium" surface
the student opens on their own**, reached via the sidebar chip's link (§4) or a Settings
section, alongside the app's other tier-neutral settings forms
(`features/settings/*-form.tsx`). There, the student has already chosen to look, which
removes the manipulation concern (§2) — there's no minor being served a pitch they didn't
seek — and a more expressive moment matches how the survey's own comparators (Brilliant's
`/premium`, Duolingo's `/super`) present their paid tier: a dedicated page, not an
interruption.

**Concrete proposal, using tokens that already exist rather than inventing new ones:**
3–4 short cards (reusing the `InsightCard`/`ActionCard` anatomy from
`components/oryn/*` — see `docs/design-system.md`'s Core Primitives section), one per
thing Premium actually changes (full-depth replies every time; [whatever else the founder
decides belongs in the tier]), revealed via `staggerFadeUp` from `lib/motion.ts` — the
same entrance pattern already used for the weekly-actions list, capped at 6 items so it
doesn't feel sluggish. That *is* a chained animation, built from the product's existing
motion vocabulary (`transition("base")`, `--ease-emphasized`) rather than a new one, and it
respects `MotionConfig reducedMotion="user"` for free, like everything else in the app. No
confetti, no bouncing icons, no gamified badge unlock — the acceptance-moment celebration is
already the product's one "childish fireworks" exception, and it's spent on something a
student worked toward for weeks, not on a subscription upsell.

---

## 6. What's not built yet

A from-zero build, in dependency order:

1. **Thread `degraded` from the model-selection decision to the UI.** `withUsageLogging`
   (`lib/ai/usage.ts:99-115`) already has `selection.degraded` in scope — it's computed and
   simply not returned. `generateAdvisorReply` (`lib/ai/advisor-chat.ts`) needs to return
   `{ text, degraded }` instead of a bare string; `sendAdvisorMessage`
   (`app/(app)/advisor/actions.ts`) needs `degraded` in its return type; `LocalMessage`
   (`features/advisor/advisor-chat.tsx:14-23`) needs the field; the render call needs to
   pass a `meta` node into `AdvisorMessage` when `degraded` is true.
2. **Apply migration `0076_ai_usage_degrade_columns.sql`** — currently blocked on a
   founder go-ahead per its own header, not a technical blocker. Needed for admin
   visibility and any historical "how often is this student degraded" question; not
   strictly required for the live per-reply note in #1, which can read the fresh
   `ModelSelection` directly without touching `ai_usage`'s stored columns at all.
3. **A `subscription_tier` (or equivalent) field.** Confirmed absent everywhere —
   `types/database.ts`'s `Profile` interface has no billing concept at all. Required
   before the sidebar chip (§4) or any settings surface can exist, and before "does this
   user get the ceiling model unconditionally" can be added as a second branch in
   `selectModelForUser` (`lib/ai/limits/budget.ts:86`) alongside the existing spend check.
4. **Fix `MonthlyUsageMeter`'s urgency signal, independent of this spec but discovered
   while reading its code.** `features/advisor/monthly-usage-meter.tsx` colors and
   captions itself off the **300-message monthly quota**
   (`lib/ai/monthly-quota.ts:18-20`) — the hard-refuse abuse backstop — not the **$0.50
   dollar cap** that actually triggers degrade first (`lib/ai/limits/budget.ts:22`, at
   ~$0.035/message that's ~14 messages, nowhere near 300). Concretely: a student can
   already be several degraded-quality replies into their month while the meter still
   shows a full indigo-violet bar and "270 messages left" — technically true and actively
   misleading about the thing that actually happened to their last few replies. This
   spec's per-reply note (§1) works regardless, since it reads live model-selection state
   rather than the meter's number, but the meter itself is worth a fix so it isn't telling
   a student the opposite of what just happened to their conversation.
5. **The premium checkout/billing flow itself** — entirely out of scope here; this spec
   assumes it exists and only designs the prompt pointing at it.

---

## Open questions

Not resolved here — decisions for the founder, or for whoever owns the piece:

1. **Is "Oryn Premium" the actual name**, or does "planını yükselt" mean the founder wants
   the subscription itself called some form of "plan," accepting the collision with the
   free weekly plan feature? Affects every string in §3.
2. **What does Premium actually change**, beyond "full-depth replies"? This spec only
   knows the one mechanism that exists today (model tier). If Premium is meant to unlock
   something else too (higher message ceiling, priority processing, anything else), §5's
   "3-4 cards" content needs that list before it can be built.
3. **Should a paid account skip the degrade check entirely, or just get a higher target?**
   A design/cost question for whoever sizes the actual offer — this spec's punch list item
   #3 assumes an unconditional skip (simplest to reason about, matches "Premium" reading
   as "the wall doesn't apply to you") but a softer "higher ceiling, same mechanism" is
   equally compatible with everything above.
4. **Turkey m. 25/A(3)'s actual reach** is explicitly unresolved in the parallel legal
   brief's own question #2 — pending real legal review, not something this spec or that
   one can close on its own. This spec's "same copy for everyone, no profiling" design
   is the conservative reading, not a guarantee it clears the line with certainty.
