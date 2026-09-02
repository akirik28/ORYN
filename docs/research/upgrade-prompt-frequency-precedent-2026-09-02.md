# Upgrade-Prompt Frequency & Dismissal Precedent — 2026-09-02

**Status:** Precedent research only, per oryn-a7's brief. **Report the recommendation,
don't build it** — this is input for whoever implements the mechanism (oryn-d0), not an
implementation. No ORYN code touched.

**What triggered this:** the founder has approved upgrade pop-ups for standard-tier
students, with a frequency cap, and set the price (₺399,99/month, first week free). Their
own instruction to oryn-a7, direct: *"14-18 yaş ürününde pop-up satış çok hızlı rahatsız
edici olur"* (a pop-up sales approach in a 14–18 product gets annoying fast) — they raised
this themselves and agreed the cap is required before oryn-a7 asked. The brief: how do real
apps time and cap this, what do the restrained ones never do, and what should ORYN
specifically do — grounded in real products, not general principles.

---

## Read this first: two documents already exist and change what "the answer" means here

Before any new research, both existing docs in `docs/` were read in full. **They aren't
duplicated below — only cited where directly relevant** — but oryn-a7 should see this
pointer prominently, since the request read as a from-zero brief and it isn't one:

1. **[`docs/research/freemium-genclik-urunleri-2026-09-02.md`](freemium-genclik-urunleri-2026-09-02.md)**
   (oryn-b9, same night) — a 10-product survey (Duolingo, Quizlet, Photomath, Brilliant,
   Khan/Khanmigo, Chegg, Scribbr, Grammarly, Notion, CollegeVine) answering *where the wall
   sits and when it first appears*, with real OBSERVED/SECONDARY/NOT FOUND sourcing
   throughout. **This already covers Q1 and Q4 below for wall-placement.** It does **not**
   cover repeat-prompt frequency or dismissal cadence at all — confirmed by grep, zero
   hits for "dismiss," "frequency cap," "cooldown," "snooze," or "show again" anywhere in
   71KB of text. That gap is this document's actual job.
2. **[`docs/upgrade-prompt-design-spec-2026-09-02.md`](../upgrade-prompt-design-spec-2026-09-02.md)**
   — a full design spec built on that survey plus a parallel minors-payment legal brief
   (`docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md`). Its recommendation: **an
   inline per-reply note on a degraded advisor message as the primary trigger — explicitly
   not a modal, not an ambient banner, not a pop-up.** It rejects a blocking modal outright
   as contradicting the "never a hard wall" cost architecture (`lib/ai/limits/budget.ts`),
   and rejects personalized/behavior-driven pitch copy on legal grounds (Turkey's Ticari
   Reklam Yönetmeliği m. 25/A(3), GDPR Recital 38, UK ICO Standard 12 — all cited with
   specifics in that doc, not re-derived here).

**The tension, named plainly rather than picked around:** that spec's own words are "not a
signup gate, not an ambient banner, not a modal" — and the founder has now asked for a
pop-up by name. Two honest readings, and this document can't settle which one is right —
that's oryn-a7's or the founder's call, not mine:

- **(A) The founder is overriding the spec's placement recommendation.** They want an
  actual interruptive surface, not a quiet metadata line, and "pop-up" means exactly that.
- **(B) "Pop-up" is the founder's own word for "a genuinely visible callout," not
  specifically "modal that blocks the reply underneath."** The spec's §5 already describes
  a self-initiated "See Oryn Premium" page reached via a link — not a pop-up in the literal
  sense, but genuinely more visual/animated than a meta-line.

**This document's recommendation (§5) is built to work under either reading**, by keeping
every constraint the existing spec already argued for (tied to a real system-state event,
never blocking, dismissal never harder to find than the CTA, same copy for every student)
while answering literally what a "pop-up, frequency-capped" version of that trigger should
do — because a dismissible, non-blocking overlay that still "pops up" rather than sitting
quietly in a corner is compatible with both readings, and the frequency-cap mechanics below
are the same either way.

---

## 1. How do good apps time an upgrade prompt?

**RevenueCat** (real subscription infrastructure company, used by a large share of the
top-grossing subscription apps — not a blog giving generic advice, a vendor whose product
*is* this mechanism for thousands of real apps) names four trigger shapes in its own paywall
guide:

1. **Onboarding** — shown during setup, before any value delivered.
2. **Contextual** — triggered when a user reaches a gated feature or hits a limit.
3. **Persistent/"buy now"** — an always-there button (ORYN already has this: the sidebar's
   `tier-upgrade-cta`, `features/app-shell/sidebar.tsx:148`, built the same day as this
   research — worth oryn-a7 knowing it exists, since it's already the "persistent" leg of
   this taxonomy and nothing below needs to duplicate it).
4. **Campaign** — triggered by app events (`app_open`, an achievement) or external channels
   (push, email), independent of what the user is doing right now.

Source: [RevenueCat, "The essential guide to mobile paywalls for subscription apps"](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps).

**Cross-referencing against the internal survey's own pattern table (§11.1 of the freemium
doc):** the placements it found cluster the same way — ambient/always-on (Duolingo's
marketing pages — RevenueCat's type 4/1), usage-metered (Quizlet, Grammarly — type 2),
zero-allowance/gate-is-signup (Khanmigo, Brilliant — an extreme type-1), no wall found at
all (CollegeVine). **Nobody in either document found a *pop-up specifically triggered by
elapsed time or session count* as a primary mechanism** — every restrained, well-regarded
comparator ties its trigger to something that actually happened (a limit hit, a gated
feature touched), not a clock. This is the single most load-bearing finding for ORYN's
question: **the difference between "feels like help" and "feels like an ad" is almost
entirely whether the trigger is a real event or an arbitrary one**, and every product in
both documents that skews toward "feels like an ad" (Duolingo's marketing site, Khanmigo's
funnel) is also the one with no free allowance to tie a real event to in the first place.
ORYN has a real event already built and waiting: `ModelSelection.degraded`
(`lib/ai/limits/budget.ts:61`, per the existing spec's punch list item 1) — a message
just got downgraded because this month's budget is in use. That's the trigger.

**What Duolingo's own product leadership says about this, independent of the survey:**
Duolingo's CPO (Cem Kansu) frames the company's monetization philosophy as *"optimize for
trust, not ARPU"* and gives a concrete example: **ads run only after a lesson completes,
never during one.** Source:
[RevenueCat/Sub Club podcast, Cem Kansu episode](https://www.revenuecat.com/blog/growth/cem-kansu-duolingo-sub-club-podcast-2026).
Worth taking seriously precisely because Duolingo is *not* a restrained comparator overall
(next section) — even the most aggressive product in this whole survey draws the line at
"never mid-task," which directly matches oryn-a7's Q3 and the founder's own weekly-plan
design principle (cap the plan at 3 actions, don't manufacture more to click).

---

## 2. Frequency caps that are actually used

**Honest framing up front:** no source found in this round — including RevenueCat's own
benchmark reports, checked directly — publishes a named app's actual re-prompt cadence
after a dismissal. The 2026 Education-category RevenueCat report
([revenuecat.com/state-of-subscription-apps-2026-education](https://www.revenuecat.com/state-of-subscription-apps-2026-education))
was checked specifically for this and confirmed to cover trial-length and conversion-timing
benchmarks only — no age-segment data, no prompt-cadence data, and it does not name
Duolingo, Khan, Photomath, or Quizlet individually (one Duolingo PM appears as a podcast
guest, unrelated to cadence). **This is a real, load-bearing evidence gap, not an oversight
in this document — companies don't publish this number, because it's a live A/B-tested
lever, not a fixed policy.** What follows is the closest real grounding available, not a
verified industry standard.

**Braze** (a real customer-engagement platform many production apps run on — this is what
the mechanism looks like when actually implemented, not a suggestion) documents frequency
capping as *"a limit on how many messages any individual customer can receive within a
defined time period,"* applied at the user level before any per-campaign logic runs, and
gives illustrative real-shape examples: **"no more than three push notifications per week,"
"no more than five messages across all channels in a single day."** Source:
[Braze, "What is frequency capping?"](https://www.braze.com/resources/articles/whats-frequency-capping).
Lower-confidence, generic-source pattern (a product-marketing blog post, not a named
company's disclosed policy, flagged as such and used only for the *shape* of the
convention, not as a citation of fact): dismissing a prompt should suppress similar
messages for **at least a week**, and that same source frames the exact hours-vs-days
cooldown length as something products A/B test rather than a fixed number.

**Duolingo's own observed behavior is the opposite pole, and worth stating as the
cautionary data point it is.** A hands-on teardown (not this document's own testing — a
named author's first-person account, flagged as such) counted **at least seven distinct
upgrade touchpoints in a single session**: twice in the shop, on the hearts view, on the
homepage via mascot characters, twice in the review tab, and again after a lesson via ads —
and quotes the app's own apparent internal logic: *"If you only ask users to pay once,
you're leaving money on the table."* Source:
[adplist.substack.com, "How Duolingo pushes users from freemium to premium"](https://adplist.substack.com/p/how-duolingo-pushes-users-from-freemium).
This is not a frequency cap — it's closer to no cap, dressed as several different surfaces
so no single one repeats identically. **Directly disqualifying as a model for ORYN**, both
on the founder's own stated concern and because Duolingo's target base skews younger and
broader than ORYN's 14–18 band, so "Duolingo does it" is not itself a defense even before
getting to taste.

**Dismissal semantics — "dismissed" vs. "dismissed twice" vs. "never show again":** no
source found describes a real product's actual tiered logic here with specifics (this is
the part of oryn-a7's brief this research could not fully close — flagged rather than
papered over with an invented-sounding answer). What's real and citable: (a) the general
convention above (a single dismissal earns a cooldown measured in days, not hours); (b)
Instagram's 2018 notification-permission dark pattern, where users could dismiss a repeat
prompt but never fully decline it — cited by a UX-ethics analysis as a textbook example of
*"Not Now" without a real "never"* (source below, §3) — which is useful precisely as the
shape ORYN must not reproduce: **any tier beyond a first soft dismissal has to include a
dismissal that actually means never, or ORYN has built the same pattern under different
copy.** ORYN has no existing schema for this at all — checked directly: `notifications`
(`supabase/migrations/0012_notifications.sql`) has only `read_at`, no dismissed/snoozed/
shown-count concept anywhere in the schema. This is new surface, not a column to reuse.

---

## 3. What the good ones never do

Grounded in what's *actually* documented, not assumed:

- **Interrupt an in-progress task.** Duolingo's own CPO states this as company policy
  (ads after a lesson, never during — §1 above) — the one restraint even the most
  aggressive comparator in this research keeps. ORYN's advisor chat has an exact analog:
  never during a streaming reply, never inside the message composer.
- **Block content.** Already established, independently, by two sources that agree without
  citing each other: ORYN's own `lib/ai/limits/budget.ts` architecture ("never a hard wall
  on quality, degrade instead") and the existing design spec's rejection of a blocking
  modal on those same grounds. Nothing in this round's research weakens that; RevenueCat's
  own taxonomy (§1) treats "contextual" triggers as informational moments, not blocks.
- **Dark-pattern dismissal.** Two named precedents, not a general principle: **Instagram's
  2018 notification-nag pattern** — a "Not Now" button that only deferred the ask rather
  than declining it, cited as a canonical deceptive-pattern example (source:
  [Medium/The Interaction Lab, "Deceptive Patterns and the designer's responsibility"](https://medium.com/the-interaction-lab/deceptive-patterns-and-the-designers-responsibility-3a3ac5d6cd95)) —
  and **FTC v. Epic Games** ($245M order, 2023), already cited in the existing legal brief
  as the outer legal bound: no artificial urgency, no countdown, no button-hierarchy trick
  making "not now" harder to find than "upgrade." The existing design spec's §3 copy
  already gives "Not now" equal visual weight for exactly this reason — that constraint
  should carry over to whatever the pop-up's own button row looks like.
- **Re-show after an explicit no.** Covered in §2 — the real gap in what any source will
  name a specific number for, but every source that discusses it agrees on the direction:
  an explicit decline gets a longer wait than a passive dismissal (clicking elsewhere,
  closing the tab), not the same one.
- **Migrate a feature from free to paid after launch.** Not something either app-behavior
  document above addresses as a *prompt* pattern, but real and named: Photomath users
  report specific problem-explanation steps that were free becoming Plus-gated over time
  (multiple independent complaint threads, not one source — treated as SECONDARY/
  anecdotal, not OBSERVED against Photomath's own page, since this document didn't
  independently verify a before/after). Relevant because it's exactly the trust failure
  ORYN's own premium decision set already commits to never doing (`docs/oryn-premium-
  karar-seti-2026-09-02.md`, Karar 1: moving something from free to paid costs trust,
  moving free-to-free-forever the other way doesn't — "err generous"). Independent
  confirmation of a principle ORYN already holds, not a new one to add.

---

## 4. The 14–18 constraint — Duolingo, Khan, Photomath, Quizlet by name

Pulling forward only what's new or sharpened relative to the existing survey, which already
covers all four in depth (its §1.6, §2.6, §3.6, §5.6):

**Khanmigo is the one that crosses a real line, and it's the sharpest, most directly
relevant finding in the whole existing survey.** DOM-verified, not inferred: *"To access
Khanmigo as a parent or learner, you must make a monthly or annual payment, be 18 years or
older, live in the United States, and have a billing address in the U.S."* No free
allowance at all — payment required before message one, and no path for a minor to hold
their own account; a minor reaches it only as one of up to 10 children on a paying adult's
account. This is the single most age-restrictive AI-tutoring product either document found,
and it's the closest existing comparator to ORYN's own advisor by shape (an AI tutor layer
on a free education platform). **The line it crosses, named plainly: it doesn't have a
"free tier with a prompt problem" at all — the wall is total, so there's no version of this
worth copying for ORYN's actual, already-decided free/paid split** (ORYN's own Karar 1
already rejects the Khanmigo model explicitly, citing AGENTS.md's own MVP definition — this
document independently arrives at the same conclusion from the frequency-and-tone angle,
not just the access-and-funding angle Karar 1 argued from).

**Duolingo crosses the frequency line, not an access line — worth distinguishing, because
it's the one relevant to *this* brief specifically.** Its Child User policy (existing
survey §1.6) is genuinely well-built: age-appropriate content, no behavioral ad targeting
under 16, restricted social features, paid access only via a parent's Family Plan. **None
of that restraint carries over to prompt frequency** — the same product that protects
under-16 users from targeted ads shows every user, minor or not, seven-plus upgrade
touchpoints per session (§2 above). **This is the one comparator where "child-safe" and
"not annoying" turned out to be two separate design decisions, made independently, with
only one of them actually made carefully.** Directly useful for oryn-a7's ask: it's proof
that age-appropriateness work doesn't automatically constrain monetization frequency unless
someone deliberately makes it — the founder raising the concern themselves, unprompted, is
the thing that closes this exact gap for ORYN before it opens.

**Photomath and Quizlet:** no new frequency-specific findings this round beyond the
existing survey's wall-placement data (Photomath: uncapped free volume, Plus sells
explanation depth via a discoverable menu tab, not an interrupt; Quizlet: per-feature caps
hit organically, no trial window). Neither this document nor the existing survey found
prompt-repetition data for either — a real gap, not a "nothing to report" — flagged rather
than filled with a guess.

**Stated plainly since oryn-a7 asked directly: none of the four comparators throttle
upgrade-prompt *frequency* specifically because their users are minors.** Khan restricts
*access* (18+ only); Duolingo restricts *ad targeting and social features* (§1.6) but not
prompt volume; Photomath and Quizlet show no age-differentiated prompt behavior found at
all. If ORYN caps pop-up frequency specifically because its users are 14–18, that would be
ORYN choosing a restraint none of these four comparators chose — not copying an industry
norm. Worth the founder hearing that framing directly: it's not "how the good ones do it
for teens," it's "what none of them bothered to do, and ORYN doing it anyway."

---

## 5. Recommendation for ORYN

**Trigger — reuse the same real event the existing spec already identified, don't invent a
second one.** `ModelSelection.degraded` (`lib/ai/limits/budget.ts:61`) is a message that
just got downgraded because this month's advisor budget is in use — a real, already-
occurred, honest state, not a timer or session count. Every restrained comparator in this
research ties its prompt to something that happened; every product that reads as an ad
(Duolingo's marketing site, Khanmigo's funnel) ties it to nothing at all. This is also the
one trigger point that's already load-bearing in a second way: it's the exact plumbing gap
the existing design spec's punch list already calls out as needed (thread `degraded`
through `generateAdvisorReply` → `sendAdvisorMessage` → the UI) — building the pop-up and
building the inline note draw on the same one piece of missing wiring, not two.

**Where — a dismissible, non-blocking overlay anchored to that reply, distinct from (and
compatible with) the existing spec's quiet inline meta-line.** Never a modal that blocks
reading the reply underneath (`lib/ai/limits/budget.ts`'s own "never a hard wall" principle,
independently reinforced by the existing spec and by nothing in this round's research
contradicting it). Never mid-task — specifically: never while a reply is still streaming,
never while the composer has unsent text in it, matching the one restraint even Duolingo
keeps (§1, §3).

**Cap — real numbers, reasoned from the closest available real precedent (§2), stated as a
recommendation, not a rediscovered industry standard, since no source found publishes exact
figures:**
- At most **once per session**, and only on the *first* qualifying reply that session —
  not once per degraded reply, which given ORYN's own budget math (~15 Sonnet messages
  before degrade starts, per `docs/oryn-premium-karar-seti-2026-09-02.md` Karar 2) could
  otherwise mean several pop-ups in one sitting.
- **A soft dismissal** (clicking away, closing it without choosing an option) → suppressed
  for **7 days**, the one number that shows up consistently across the (lower-confidence,
  generic) frequency-cap sources in §2, applied here as a reasoned floor rather than an
  invented one.
- **An explicit "Not now"** (equal visual weight to the CTA, per §3 and the existing spec's
  own copy) → suppressed for the **rest of the current billing month** — longer than a
  passive dismissal, matching the one directional agreement every §2 source shares
  ("explicit decline earns more silence than passive dismissal"), without inventing a
  specific multi-week number nothing found actually supports.
- **A second explicit "Not now" in a following month** → suppressed indefinitely, with a
  real, discoverable way back — a line in Settings (ORYN already ships a settings surface
  for exactly this shape of preference, built the same night:
  `features/settings/plan-tier-view.tsx`) rather than the Instagram pattern of a "Not Now"
  that only ever defers. **This is the tier that has to actually mean never, or it's the
  same dark pattern under different copy** (§2, §3) — the discoverable settings escape
  hatch is what keeps it from becoming that.
- This needs new schema — checked directly, ORYN's `notifications` table has no dismissed/
  snoozed/shown-count concept to extend (§2). Not a blocker, just a scoping fact for
  whoever sizes the build.

**Copy and content — inherit the existing spec's §2/§3 constraints wholesale, don't
re-argue them:** same copy for every student in the same state, never built from an
individual's behavioral/usage data (the legal brief's line, already argued in detail in the
existing spec), states a fact before an ask, no urgency language, "Not now" as visually
prominent as the CTA. Nothing in this round of research found any reason to loosen any of
those — if anything, Duolingo's "ask more than once" philosophy (§2) and Instagram's "Not
Now" pattern (§3) are exactly the shape those constraints already guard against.

**The one open call this document can't make:** whether "pop-up" means the interruptive
overlay described above, or whether the founder would be equally satisfied by the existing
spec's self-initiated "See Oryn Premium" page (reached via a link, chained/animated
treatment, zero interruption risk since the student opened it on purpose) with *this
document's* cap/dismissal mechanics applied to how often the *entry point* to that page
gets surfaced instead of a full overlay. Both are defensible against everything found this
round; they differ in how much attention the moment demands, which is a product-feel
decision, not a research question. Worth a direct check with the founder before oryn-d0
builds either one, given how much these two options actually cost to reverse once shipped.

---

## Sources

- [RevenueCat — The essential guide to mobile paywalls for subscription apps](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps)
- [RevenueCat — State of Subscription Apps 2026, Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education)
- [RevenueCat / Sub Club podcast — Cem Kansu (Duolingo CPO)](https://www.revenuecat.com/blog/growth/cem-kansu-duolingo-sub-club-podcast-2026)
- [adplist.substack.com — How Duolingo pushes users from freemium to premium](https://adplist.substack.com/p/how-duolingo-pushes-users-from-freemium)
- [Braze — What is frequency capping?](https://www.braze.com/resources/articles/whats-frequency-capping)
- [Medium/The Interaction Lab — Deceptive Patterns and the designer's responsibility](https://medium.com/the-interaction-lab/deceptive-patterns-and-the-designers-responsibility-3a3ac5d6cd95)
- Internal: `docs/research/freemium-genclik-urunleri-2026-09-02.md`, `docs/upgrade-prompt-design-spec-2026-09-02.md`, `docs/oryn-premium-karar-seti-2026-09-02.md`, `docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md` (cited, not duplicated)
- Code read directly: `lib/ai/limits/budget.ts`, `supabase/migrations/0012_notifications.sql`, `features/app-shell/sidebar.tsx`, `features/settings/plan-tier-view.tsx`
