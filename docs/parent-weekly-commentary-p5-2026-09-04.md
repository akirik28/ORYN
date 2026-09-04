# P5 — the parent weekly AI commentary: content assembly

**Superseded in one respect, same day:** B3b (PROXOLA-PLAN.md, founder: "ayda bir AI özet
versin gelişimi") converted this whole feature from weekly to monthly — every symbol below
that said "Weekly" now says "Monthly" in the real code
(`lib/digest/parent-commentary.ts`/`-run.ts`, `lib/ai/parent-commentary-prompt.ts`), and the
runner gained a due-date gate (`isDueForMonthlyCommentary`) since no cron is armed to make
"monthly" true on its own. Nothing else in this account changed — the privacy boundary, the
honest-nothing path, and the pre-registered over-claim criterion below are exactly as they
were, just narrating a longer window now. Left as written below rather than rewritten, since
this is a record of what was actually built and decided that night, not a spec to keep current.

**Date:** 2026-09-04. **Why this doc exists:** oryn-45 dispatched P5 (the AI half of
`docs/veli-hesabi-spec-2026-09-04.md`'s parent-account feature) with an explicit brief: build
the honest-nothing path first, reuse the existing digest infrastructure rather than inventing a
second one, and pre-register what counts as an over-claim before generating anything — the same
discipline this session already applied to an ordinal-ranking test earlier tonight. This is that
account: what got built, the privacy boundary that reshaped the design mid-build, the
pre-registered criterion, and — stated plainly — what could and could not actually be verified
in this environment.

## What P5 is

Two pieces, described together in the founder's own words (quoted in the spec): a weekly AI
commentary on the child's development, premium-only, and a summarization mechanism focused on
what's new that week rather than a restatement of the profile. Built here as one integrated
output — a short narrative plus a list of new opportunity matches — gated as a single premium
feature, matching G6's own framing ("premium: AI's weekly development commentary") rather than
splitting the narrative and the match list into separately-gated pieces.

Parameterized by `studentUserId` alone. P1 (`account_role`, `parent_links`, the RLS policies —
migration 0116) is staged, not applied, when this was built. K4's tier-inheritance rule already
defines a parent's effective tier as their linked student's `plan_tier`, so entitlement can be
checked today against the student's own profile row; only the "for every active parent_link,
call this" batch runner needs P1's schema, and that's a few-line wrapper once it exists — not a
reason to block content assembly.

## The privacy boundary that reshaped this build mid-flight

The first version of this file queried `weekly_actions` (completed-action titles) and reused
`buildDigestContent`'s `deadlines` field (which sources `applications`, `target_universities`,
and `university_deadlines`) as part of the weekly signal. Partway through, oryn-45 sent the
settled P1 schema and, with it, the actual constraint: **a parent never gets a raw grant on
`profiles`** — that table also holds `advisor_instructions`, a student's private customization
instruction to the advisor, so a blanket grant would have handed this over incidentally. Real
parent reads go through a SECURITY DEFINER function with an explicit 9-column whitelist —
`display_name`, `graduation_year`, `curriculum`, `country`, `school_name`, `plan_tier`,
`onboarding_completed`, `completeness_percent`, `profile_strength_score` — plus direct RLS
policies on `opportunity_matches`, `profile_scores`, and `profile_score_snapshots`. Nothing else.

`weekly_actions` isn't on that list. Neither are `applications` or `target_universities` (the
deadline sources). Both got removed from this file entirely rather than left as a wider surface
generating content a parent was never actually authorized to see the raw material for — even
though the content-assembly code here runs with an admin client (which technically bypasses RLS
for a background job, the same way `buildDigestContent`/`runDigestPass` already do), the design
intent behind the whitelist is a product boundary, not merely a database mechanism, and this
file's own signal sources now respect it independently rather than relying on RLS alone to
catch a mistake. What survived: `profile_scores` + `profile_score_snapshots` (score movement,
via `lib/scoring/change.ts` — already deterministic, already tested elsewhere), and
`opportunity_matches` (new matches only, via `buildDigestContent` — its `deadlines` field is
fetched and discarded, not read, since forking that shared function to drop the query entirely
would cost more than the one wasted read costs).

This is genuinely a smaller, simpler feature than the first draft — one fewer table query, one
fewer fact category the model has to be told not to invent from. The privacy constraint made
the implementation better, not just narrower.

A second, independent correction landed the same way, later in the same build: the tier gate
(`resolveParentWeeklyCommentary`) originally read `profiles.plan_tier` directly and compared it
to `"ultra"`. P6 (the tier-inheritance lane, landed on main mid-build) shipped
`lib/tier/parent-tier.ts`'s `resolveParentEffectiveTier`, which routes through
`lib/tier/plan-tier.ts`'s `resolvePlanTier` — the one function, with roughly thirty existing
call sites, that also resolves an active Ultra *gift* (`ultra_gift_expires_at` in the future,
permanent `plan_tier` still `"standard"`). The raw read this file started with would have
silently denied the commentary to a legitimately gifted-Ultra student's parent. Fixed before
shipping, with a test that constructs exactly that shape (gift active, permanent tier still
standard) rather than trusting the import was sufficient on its own.

## The honest-nothing path, built first

`hasNotableWeeklySignal` is the single gate: real signal is a notable dimension-score movement
(reusing `NOTIFIABLE_DIMENSION_DELTA` from `lib/scoring/profile-update-notification.ts` — the
same, already-data-grounded 5-point bar that decides whether a movement is worth a student-
facing notification, not a second threshold invented for this feature) OR at least one new
opportunity match. When neither is true, `honestNoActivityNarrative` returns a fixed,
deterministic sentence — **no AI call happens at all**. Verified directly, not just by
inspection: the test suite mocks `getAIProvider` and asserts it was never invoked for this case.

A second-order guard worth naming: `filterNotableDimensionChanges` runs before
`describeProfileChange` (the existing, already-tested function that turns a `ProfileChange`
into a plain sentence). Without it, a 0.3-point formula-level drift would still get named
"the area that moved most" by `describeProfileChange`'s own logic — true in a narrow technical
sense, misleading in the sense a parent reading it would take it. Sub-threshold moves are
dropped from `improved`/`declined` before that function ever sees them, not filtered after.

A third path exists for a case this session had direct, current evidence for: real signal, but
the AI provider isn't configured (this dev environment has no `ANTHROPIC_API_KEY` — confirmed
live while testing this exact file). `assembleFactsWithoutAI` builds a plain, deterministic
sentence from the same facts the AI path would have used, naming the actual movement and match
titles rather than silently dropping real signal because the model couldn't be reached — the
same "degrade to the honest facts, never go silent" instinct AGENTS.md's Rule 4 states
generally, applied here specifically.

## Pre-registered over-claim criterion

Written into `generateNarrative`'s own doc comment before any real model output from this
prompt existed to read — the same discipline this session applied to an ordinal-ranking test
earlier tonight, for the reason oryn-45 named directly: "measuring absence after the fact is the
easiest score in the world to award yourself." A generated narrative over-claims if it contains
any of:

1. A specific number (a score, a count, a percentage) not present in the fact sentences passed
   to the model.
2. A specific date, or a relative time reference ("last month", "in March") beyond "this week",
   not present in the facts.
3. A named activity, award, or opportunity title not present in the real `newMatches` list.
4. Any claim about *why* a score moved — the facts state a magnitude and direction, never a
   cause.
5. Language that reads as resolved/certain about a weak signal — e.g. calling a single, just-
   above-threshold dimension move "strong" or "significant" progress.

## What was verified, and what genuinely was not

Verified directly: the pure decision functions (`filterNotableDimensionChanges`,
`hasNotableWeeklySignal`, `honestNoActivityNarrative`) against plain fixtures, including the
specific case the whole feature exists to get right — a steady score with nothing crossing the
notability threshold must not, by itself, trigger an AI call. Verified that the AI provider is
genuinely never invoked for a quiet week (mocked and asserted uncalled, not inferred). Verified
the `ai_unavailable` degrade path end to end, for real, against this environment's real
unconfigured state — not a simulated error.

**Not verified, and stated plainly rather than implied otherwise: the pre-registered over-claim
criterion has never been checked against real model output**, because no `ANTHROPIC_API_KEY` is
configured in this environment. Every real invocation this session made of
`buildParentWeeklyCommentary` with genuine signal took the `ai_unavailable` path, not the `ai`
path the criterion is actually about. This is the one open verification step before this prompt
should be trusted at face value: someone with real API access needs to run
`generateNarrative` against a handful of representative fact sets (a barely-notable single-
dimension move; a genuinely strong week; a week with one new match and nothing else) and check
each output against the five-point criterion above. The prompt is written with the strongest
instruction this session's own night of measurement could motivate — it has not been measured
against a real response, and saying it has when it hasn't would be exactly the kind of
overclaim this whole feature exists to avoid.

## Scope not built here

No `parent_links`-driven batch runner — P1 isn't applied yet, and the runner needs it to find
which `studentUserId`s a given parent is linked to. When it's built: filter to
`parent_links.status = 'active'` before calling `resolveParentWeeklyCommentary` at all — a
`pending` link (the schema's own default) grants nothing, so an awaiting-confirmation parent
gets no commentary, not a degraded one (oryn-45's own instruction). No email sending — same
posture as the student digest (`lib/digest/run.ts`'s own header), same reason: no provider, no
legal answer yet on emailing about a minor. Nothing in this file or its tests calls anything
that could be an email API. No UI — P3 (the parent panel) and P7 (upgrade pop-ups) are separate
lanes; this is content assembly only, returning structured data a future template renders.
