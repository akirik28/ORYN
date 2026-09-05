# Do today's five "do we know enough to say this" gates agree? — 2026-09-05

CEO's ask: five separate mechanisms, built by five different lanes today, each answer some
version of "does Proxola know enough to make a confident claim here" — `hasAnyEligibilityDataAtAll`
(matching.ts), `classifyEligibilityGap` (matching.ts, feeds the card/detail-page badge),
`canClaimGap`/`isAssessed` (scoring/signal.ts), and `evaluateCandidateEligibility`'s
`verdict === "unknown"` (counselor/eligibility.ts + scoring.ts). None of the five lanes saw the
other four. Measure whether they agree, using concrete scenarios — not a review of each in
isolation.

## First correction to the premise, worth stating before anything else

Not all five answer the same question. They split into two genuinely different axes:

- **Opportunity-eligibility confidence** — does Proxola know enough about *this opportunity's*
  rules, and this *student's* fit against them, to make a claim: `hasAnyEligibilityDataAtAll`,
  `classifyEligibilityGap`, `computeEligibility` (all three in `lib/opportunities/matching.ts`),
  and `evaluateCandidateEligibility` (`lib/counselor/eligibility.ts`).
- **Profile-dimension confidence** — does Proxola know enough about the student's own
  achievement record on one of the nine career-profile dimensions (academics, research,
  leadership...) to name it as a gap: `isAssessed`, `canClaimGap`, `hasConfidentSignal`
  (all three in `lib/scoring/signal.ts`).

These two groups can't directly contradict each other on "the same opportunity" the way CEO's
framing implies for all five — they're not computing the same fact. `canClaimGap`/`isAssessed`
were checked on their own terms (see the last section) and found internally consistent; the
substantive findings below are all within the first group.

## Finding 1 — the same student+opportunity pair can be "Exceptional" on one surface and
capped on another, for the identical reason, because the two surfaces don't share a check

**Concrete scenario, traced through the actual code, not assumed**: a student with a
completely blank profile (no birth year, no country, no graduation year on file) looking at an
opportunity with real, recorded restrictions (a minimum age, an eligible-grades list, an
eligible-countries list).

- `computeEligibility` (matching.ts:635-766): for each restriction, the student's own value is
  `null`, so it pushes `age_unknown`/`country_unknown`/`grade_unknown` — but **never returns
  `eligible: false`** for an unknown (only for a *confirmed* mismatch). Falls through to
  `return { eligible: true, notes: unknownNotes }` at the end. **A blank profile is
  `eligible: true` by construction.**
- `hasAnyEligibilityDataAtAll` (matching.ts:585-609) takes **only the opportunity**, never the
  student — it has no way to see that the student's own data was unknown. Since the opportunity
  itself carries a real age/grade/country bound, this returns `true`.
- The card's match score (matching.ts:1149): `!eligible ? 0 : hasAnyEligibilityDataAtAll(...) ?
  rawScore : capped` → `eligible=true` and `hasAnyEligibilityDataAtAll=true` → **the raw score
  is used uncapped.** This can land in "Exceptional" and, at ≥80, the card's own Ultra ring glow
  (opportunity-card.tsx:318) — the single most visually prominent element on the card.
- Meanwhile, `evaluateCandidateEligibility` (counselor/eligibility.ts:31-219), used only by the
  Advisor/Counselor's own recommendation ranking, **does look at the student side directly**
  (`birthYear === null`, `!studentCountry`, `currentGradeLevel(graduationYear) === null`) and
  pushes the same kind of unknown-notes — but here, `if (notes.length > 0) return { verdict:
  "unknown", notes }` (line 215-218). Back in `scoring.ts:95`, `eligibility.verdict === "unknown"`
  **hard-caps** the candidate's score at `RANKING_THRESHOLDS.considerFloor`, which
  `rankCandidates` (scoring.ts:223) turns into `recommendationClass: "deprioritize"`.

**The result: for the exact same student and the exact same opportunity, the Opportunities page
can show "Exceptional match" with an animated glow, while the Advisor deprioritizes the same
opportunity — for the identical underlying reason (the student's own age/country/grade is
unknown), because the card's score-capping check never looks at the student and the counselor's
does.** This is the sharpest form of CEO's question 2 ("can a student see something
contradictory on two different surfaces") — not hypothetical, traced end to end through both
call chains.

**Root cause, stated precisely**: `hasAnyEligibilityDataAtAll` was written (today, per its own
comment) to fix a *different*, already-measured bug — a data-blank *opportunity* scoring as
Exceptional. It solves that one correctly. It was never designed to also ask whether the
*student's* side of the same check is known, because at the time it was written nobody was
looking at `evaluateCandidateEligibility`'s parallel, independently-built handling of exactly
that case. Two real fixes, built the same day, for two related but distinct gaps in the same
underlying question — neither one is wrong on its own terms, and that is exactly why this needed
measuring rather than assuming.

## Finding 2 — same root cause, visible on a single surface, and already partially defended
against

The card's own badge logic (opportunity-card.tsx:240-247) is more careful than Finding 1 might
suggest: when `eligibilityGap === "profile_incomplete"`, the generic caveat badge is
deliberately suppressed (set to `null`) — the card does NOT show a generic "eligibility unknown"
chip next to a confident tier label, which would be a starker, more obviously-broken
contradiction. Instead (opportunity-card.tsx:472-481) it renders the profile-completion note as
a clickable link ("add your birth year..." → `/profile`) — a real, considered design choice
documented in its own comment as turning the caveat into the fix itself.

**But this only suppresses the smaller, secondary badge — it does not touch the score or the
tier label**, which are computed upstream of any of this rendering logic and have no
profile-completeness awareness at all (`canClaimMatch = eligible && !needsVerification`, and
`eligible` is the same unconditionally-true-on-blank-profile value from Finding 1). So the actual
on-screen result for the scenario above is: a prominent, glowing "Exceptional match" claim with
a real "why this fits you" sentence, sitting above a quiet, small-text link suggesting the
student add their birth year to check eligibility. The two pieces of copy do not contradict each
other in wording — but the visual hierarchy asserts confidence the underlying data doesn't
support, and a student skimming the card (most of them, most of the time) sees the glow, not the
dotted-underline link below the description.

The opportunity detail page inherits the same root cause via a different path: it reuses the
*stored* `opportunity_matches.eligible` value (computed by `computeEligibility` at persist
time, same unconditional-true-on-unknown default) rather than recomputing it, so the same
blank-profile-scores-uncapped shape reaches that surface too, not just the card.

## Finding 3 — a genuine consistency, not just problems (CEO's own scenario 2, confirmed)

For the specific scenario CEO named — all three eligibility dimensions (age/grade/country)
`checked_not_stated`, nothing about the *student's own* profile unknown — the two
independently-built mechanisms agree, even though they reach the answer through different logic:

- `hasAnyEligibilityDataAtAll` deliberately excludes `checked_not_stated` from counting as real
  positive data (its own comment: "the source was checked and said nothing... is not evidence
  this specific opportunity fits any given student"). Returns `false` → the card score is
  capped.
- `evaluateCandidateEligibility` pushes an unknown-note for each `checked_not_stated` dimension
  (ageEligibilityCheckedNotStated etc.) exactly the way it does for a true unknown — `notes.length
  > 0` → `verdict: "unknown"` → the counselor's ranking is also capped.

**Both surfaces cap this specific case, independently, for compatible reasons.** This is a real,
measured "the five are consistent" result for this one scenario, not an assumption — worth
recording as a positive finding, per CEO's own framing that a confirmed absence of contradiction
is itself the deliverable, not a non-result.

The one place this scenario's OWN badge and score could still read as odd on a single card:
the badge for this exact case is `"checked_not_stated"` — the calmest of the three non-null
states, described in its own comment as "nothing about this row has been left untouched" — shown
on a card that is *also* capped into a low tier. Both are correct on their own terms (the badge
answers "has this been researched," the score answers "do we have enough signal to rank this
confidently for you") and this exact tension is already named explicitly in
`hasAnyEligibilityDataAtAll`'s own comment as a deliberate, accepted design choice, not an
oversight — flagged here only because CEO's own question was about what a student could
*see*, not just whether the code is internally coherent by its author's own stated intent.

## `canClaimGap` / `isAssessed` (`lib/scoring/signal.ts`) — checked on their own terms

Confirmed this is genuinely the other axis (profile-dimension achievement evidence, not
opportunity-eligibility demographic data) and does not directly interact with the four functions
above on the same opportunity. Checked for the shape of gate it uses instead:
`isAssessed(state)` excludes `not_assessed`/`limited_evidence` from ever being asserted as a
real dimension score (`hasConfidentSignal`/`canClaimGap` both require at least one genuinely
assessed dimension before naming any gap at all) — the identical spirit as the opportunity-side
functions ("don't claim confidence you don't have"), independently arrived at, and internally
self-consistent (`canClaimGap` composes `hasConfidentSignal` + `signalStateFor`, doesn't
reimplement the assessed-check separately — one lane already confirmed this composition). No
contradiction found here; noted as a second real "consistent" result, not left unchecked because
the first two findings were more interesting.

## What to decide, not what to fix here

Per instruction: measured, not coded. The actual design decision — should
`hasAnyEligibilityDataAtAll`/the card's score-capping logic also treat student-side unknown data
the same way `evaluateCandidateEligibility` already does, so the two surfaces agree — is a real
product call (it changes how many opportunities score as "Exceptional" for a student who hasn't
finished onboarding), not something to resolve unilaterally. Two shapes worth considering when
this gets picked up: (a) extend `hasAnyEligibilityDataAtAll` to accept the student profile and
apply the same unknown-check `evaluateCandidateEligibility` already has, aligning the card to the
counselor; or (b) the reverse — decide the counselor's cap is too aggressive and loosen it to
match the card. Not recommending one over the other here — that's the discussion this finding is
for.
