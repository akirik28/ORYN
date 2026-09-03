# What a student sees when the AI allowance degrades or runs out — 2026-09-03

Measurement only, per oryn-a7's dispatch. **No code changed — this mechanism is already
built, consistently, across every surface checked.** Traced end to end: what computes each
signal, whether it reaches a real component, and whether the copy shown is honest. No fix
follows because none of the five questions asked found a silent path.

## The five questions, answered against the actual code

**1. Is a degraded reply disclosed, or silent?** Disclosed, per message, not silent.
`AdvisorReply.degraded` (lib/ai/advisor-chat.ts) is threaded into `LocalMessage.degraded`
(features/advisor/advisor-chat.tsx) and rendered as both a label (`meta={... ?
t("degradeNote.label")}`, "Shorter reply") and a full detail line under the reply itself:
*"This reply was kept brief — you're still getting the answer, just not the long
explanation."* Same copy for every degraded reply, not personalized, no upsell language in
the note itself (that's a separate, gated overlay — see Q5).

**2. What does the student see when the allowance is exhausted?** A persistent `Alert`
(calm variant, not destructive-red) reading *"This month's allowance is used up. Chat
resets on {date}. The rest of Oryn — your plan, opportunities, universities — stays open as
always."* — states what's gone (chat) and what isn't (everything else), by design (see the
component's own comment: "this is a fact about a monthly allowance, not something the
student did wrong"). The composer placeholder also changes ("This month's Oryn AI is used
up") and Retry is disabled — the exhausted state is ambient, not just a one-time toast.

**3. Are they told when it resets?** Yes, on every surface that shows usage at all — the
exhausted alert, the full quota meter, and the compact shell indicator all include the
formatted reset date (`quota.resetsAt`, locale-formatted).

**4. Does the usage bar distinguish "you used your allowance" from "something is broken"?**
Yes, explicitly, in the copy itself, not just internally: `unknown`: *"We couldn't load how
many tokens you've used. Your {limit}-token monthly allowance still applies and resets
{date}."* vs. `exhausted`: *"All {limit} tokens are used for this month."* — deliberately
different sentences, not the same message reused. `usageState()` (lib/ai/usage-state.ts) is
the single shared classifier both `MonthlyUsageMeter` (the advisor page's full panel) and
`UsageIndicator` (the always-on shell pill, Topbar + MobileNav) both call — one
classification, not two that could drift. Priority order is deliberate and documented:
`unknown`/`exhausted` outrank `degraded`, which outranks `low` — a student several degraded
replies deep sees that fact even while the raw token count still looks healthy (confirmed:
the $0.50 degrade target is reached around 79,000 of the 236,150-token allowance — well
before the bar would otherwise look concerning).

**5. Is a degraded reply's model-swap silent anywhere else?** Checked the one place it
plausibly could be: the frequency-capped upgrade overlay shown after a degraded reply
(`shouldShowUpgradePrompt`, lib/advisor/upgrade-prompt.ts) is gated on `context.tier ===
"standard"` and the exact real `degraded` boolean (never a timer or count), heavily
frequency-capped (once/session, 7-day soft-dismiss, permanent opt-out on a second explicit
decline), and its own copy — *"This reply used a lighter model — Ultra keeps every reply at
full depth"* — names the real thing that happened, doesn't invent urgency, and points at a
tier that genuinely exists (`/settings/plan`). No contradiction found.

## Where the signal actually comes from (not just where it's declared)

`budgetDegraded` is not a decorative prop. Both `app/(app)/advisor/page.tsx` and
`app/(app)/layout.tsx` (the shared shell every authenticated page renders through) call the
real `selectModelForUser(userId)` — the same function the actual model-selection gate
uses — server-side, on every page load, and pass its `degraded` field straight down. The
shell-level indicator (visible on every page, not just /advisor) gets the identical signal,
not a weaker or absent one. Verified this specifically because "wired for it but nothing
ever sends true" is the shape of gap this fleet has found elsewhere tonight — it isn't the
shape here.

## One correction to the dispatch, worth having precisely

"The founder's account is at 304% of its cap" is real but not current-tense. Queried
`ai_usage` directly: the founder's account has an all-time total of **$3.0704** against 103
rows (307% of the $1.00 ceiling — matches "304%" closely enough to be the same incident,
likely a small timing/rounding difference from when it was last checked) — but that spend
spans **2026-08-24 through 2026-09-02**, i.e. it happened before this calendar month's
`selectModelForUser`/`getMonthlyQuota` reset boundary (both scope strictly to
`>= currentUtcMonthStartIso()`). This month's actual spend on that account so far is
**$0.0315** — nowhere near degraded. So: the incident was real, and it's exactly the
$3.04-in-a-week burst both `budget.ts`'s own header and `docs/ai-cost-at-scale-2026-09-02.md`
already document — but "live for a real person today" isn't accurate as of right now,
2026-09-03. Worth keeping precise since it's the kind of claim that's easy to repeat past
its expiry; doesn't change anything about the audit above, which was checked against the
mechanism itself, not against that account's current state.

## Not a gap, noted for completeness

`LocalMessage.degraded` is live-session-only — a reply reloaded from `initialMessages`
(e.g. after a page refresh) never shows the degrade note even if it originally had one.
This is an existing, already-documented, deliberate scope line
(docs/upgrade-prompt-design-spec-2026-09-02.md's own punch list, item 1) tied to migration
0088 not persisting the flag on the `advisor_messages` row — not something this pass found
newly broken, and not something I touched.

## Bottom line

Every one of the five questions this dispatch asked has a real, honest, already-shipped
answer, consistently wired across the advisor page, the shared app shell, and the two
compact indicators — not just declared in one place and silent elsewhere. Nothing here
needed a contained fix, so nothing was built.
