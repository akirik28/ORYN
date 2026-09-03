# Homepage strip top-5 quality — measured against the real catalogue, 2026-09-03

Scope: measure what the planned homepage opportunity strip (oryn-ab, plan-page/homepage
redesign) would actually show, for three of the canonical QA personas, using the real
production matching path against the real live catalogue. **Doc only — no homepage
component, matching code, or ranking code was changed.** The one temporary script used to
run the measurement (`scripts/_scratch-top5-quality-check.ts`) is deleted before this
branch is pushed; it was never committed.

## Method — read this before the results

- **Personas**: A (Turkey/YKS-track, strong academics, thin extracurriculars), B
  (entrepreneurship/leadership strong, weak research — AGENTS.md's own worked example), D
  (14-year-old, one club, one course, nothing else). Reused verbatim from
  [`scripts/qa-counselor-loop.ts`](../scripts/qa-counselor-loop.ts)'s own canonical fixtures —
  not reconstructed. Persona C (research-heavy STEM) was not run; CEO named D as the case
  most worth seeing in detail, and A/B/D already span strong/moderate/near-empty profiles.
- **Catalogue**: all 366 rows currently `status = 'active'` in `oryn-qa-scratch`
  (live production data, pulled read-only via SQL this session — no synthetic opportunities).
- **Matching**: the real `computeCareerProfile`, `computeOpportunityMatch`
  ([`lib/opportunities/matching.ts`](../lib/opportunities/matching.ts)) functions — not a
  reimplementation.
- **Pre-ranking gate**: initially ran only `filterActionableOpportunities` (status/cycle/deadline).
  Mid-measurement, reading `app/(app)/dashboard/page.tsx` (the existing homepage opportunity
  preview — the direct precedent for the new strip) showed its real gate is stricter:
  `isOpportunityRecommendable` (actionable AND sufficiently verified) **composed with**
  `competesInCoreRecommendations` (the founder's 2026-08-24 pay-to-enroll ruling — a
  materially-priced, non-selective opportunity may stay in Browse but must not compete for a
  core recommendation slot). The measurement below uses that real, stricter chain — 273 of
  366 active rows pass it, down from 288 under the looser filter. **This is the load-bearing
  methodology correction of this pass**: the first-draft numbers undercounted what the product
  actually excludes before ranking.
- **Ranking**: not yet decided by ab as of this writing. Used `matchScore` descending among
  `eligible === true` results — the one number `computeOpportunityMatch` itself produces for
  this purpose, and the same one `dashboard-view.tsx`'s existing preview sorts by. Naming this
  explicitly per instruction: **if ab's actual strip uses a different order, re-run.**
- **Not measured**: `avoidReasons` (the dismissal-derived "shown less because you said not
  interested" signal) is empty for all 15 results because these are fresh fixtures with no
  saved/dismissed history — expected, not a finding. Anything gated on `saved_opportunities`
  rows is equally untested for the same reason.

## Headline finding: every result shown carries an unresolved caveat, and the strip's likely rendering pattern would hide that

**15 of 15 top-5 results, across all three personas, carry at least one live
`eligibilityNotes` caveat.** Zero fully-verified matches appear anywhere in this sample.
`eligible: true` in this codebase means "not confirmed ineligible," not "confirmed
eligible" — a deliberate, documented design choice
([`matching.ts`](../lib/opportunities/matching.ts):248-301, `countryUnknown`/
`ageEligibilityUnverified`/`gradeEligibilityUnverified` etc.), correct on its own terms, but
it means the strip's entire candidate pool is, today, unverified-with-a-caveat by default —
not a rare edge case to special-case around.

The codebase already has two different answers for what to do with that caveat once a card
renders it:

- **`features/opportunities/opportunity-card.tsx`** (the Browse/"For you" list) renders the
  tier label, **and** a `warning`-toned "eligibility unknown" badge, **and** the actual
  `eligibilityNotes` text as a visible line on the card
  (`opportunity-card.tsx`:387-409).
- **`features/dashboard/dashboard-view.tsx`**'s existing homepage opportunity preview — the
  direct ancestor of the new strip — renders only title, tier label (e.g. "Exceptional
  match"), an optional cycle descriptor, and a deadline badge. **It does not read or render
  `eligibilityNotes` anywhere in the file.** `app/(app)/dashboard/page.tsx` itself already
  names this exact risk in its own comment — *"this preview renders a bare title and 'N%
  match' with nowhere to put a caveat... it can only show a confidence number Oryn can't
  stand behind"* — and responds to it by tightening which **rows** are allowed to appear
  (the `isOpportunityRecommendable` + `competesInCoreRecommendations` chain this measurement
  now uses). That tightens the candidate pool; it does not put the caveat text anywhere on
  the card once a row clears it.

Put together: the existing homepage surface already had to solve this problem once (its own
comment, and a documented live incident — *"4 of 14 top-2 slots were unverified, among them
a row titled 'Earn college credit that may transfer to any college you attend'"* — see
`app/(app)/dashboard/page.tsx`:169-172) and chose row-filtering over caveat-display. That
was a reasonable choice when the alternative was showing literally anything. But this
measurement shows row-filtering alone isn't sufficient today: **even after every existing
gate, 100% of what's left still carries a caveat.** If the new top-5 strip is built by
extending `dashboard-view.tsx`'s existing rendering (title + tier + deadline), it inherits a
pattern that was never actually tested against "what if every surviving row still has a
caveat" — because until now, nobody measured that fraction. It's 100%, in this sample.

## Persona A — Turkey/YKS-track, strong academics, thin EC

Career profile overall = 9 (weakest: leadership, research, entrepreneurship). 245 of 273
gate-passing rows eligible (90%).

All 5 results tie at `match=67` (`tier: strong`), all in the CS/math competition space
(matching the one interest, "Computer Science"):

| # | Title | Deadline | Application path | Caveats |
|---|---|---|---|---|
| 1 | CMIMC (Carnegie Mellon) | none announced | official site doubles as apply link | age/country/grade unverified |
| 2 | IOI (Intl. Olympiad in Informatics) | none announced | none — routes through TÜBİTAK | age/country/grade unverified |
| 3 | IOAI (Intl. Olympiad in AI) | none announced | none — routes through TÜBİTAK | age/country/grade unverified |
| 4 | MIT Battlecode | none announced | none | age/country/grade unverified |
| 5 | Conrad Challenge | **2026-10-30** (real, future) | none | country/grade unverified |

Findings specific to this persona:
- **`matchedGapDimensions` is empty for all 5.** The system's own category→dimension map
  (`competition` → `awards_distinction`, `academics`) doesn't overlap this persona's actual
  weakest three (leadership, research, entrepreneurship) at all. The `need=45` component of
  the score isn't coming from "this addresses your gap" for this persona — it can't be, by
  the function's own accounting — so the "strong match" framing rests entirely on topic
  overlap (`relevance=100`, "Computer Science"), not on the profile-need story the product
  is supposed to tell. Worth ab knowing before any copy says "because this addresses your
  gap in X."
- 4 of 5 have no announced deadline at all (`date_not_announced`) and 3 of 5 have no
  `application_url` — nothing to click today beyond the official page. IOI/IOAI are
  self-described as not directly enterable ("self-registration is not possible") and route
  through TÜBİTAK's own national competition instead — accurate, well-sourced text (the IOI
  link literally points at `stats.ioinformatics.org/countries/TUR`), but not something this
  specific student can act on by clicking "apply."
- Read as a whole: topically sensible for the stated interest, accurate and well-written,
  but low on immediate actionability and not actually addressing the profile gaps the system
  itself identified. A Turkish student reading this would plausibly think "these are real
  and relevant," not "this understands what I need to work on."

## Persona B — Strong entrepreneurship & leadership, weak research

Career profile overall = 32 (weakest: research, awards_distinction, career_exploration). 242
of 273 eligible (89%). This is the persona AGENTS.md itself uses as its worked example.

All 5 tie at `match=91` (`tier: exceptional`), all genuinely on-topic
(entrepreneurship/business), all real, recognizable organizations (NSLC, Blue Ocean, DECA,
NFTE, Diamond Challenge/U. Delaware) with working-looking official pages, most with a real
application URL:

- This is the strongest slate of the three personas. No gated/unreachable entries, no
  wildly-mismatched prestige tier, real orgs, real fields, three of five carry
  `matchedGapDimensions` that plausibly connect to the stated weak dimensions
  (`career_exploration`, `awards_distinction`).
- **One concrete data-quality defect, worth fixing on its own**: **Blue Ocean Competition**
  (`id cb4a1030-d035-4c1f-8579-37c458a88b0e`) has a structured `deadline` of **2027-02-21**,
  while its own `description_snippet` — verified the same day (2026-08-23) — reads *"Site
  invites registration for the next cycle but **no deadline/dates published yet**."* One of
  these two fields is wrong, on a currently-recommended row, in the exact field
  (`deadline`) a homepage strip would use for urgency messaging
  (`dashboard-view.tsx` already has a `DeadlineBadge` for this). This is a small, concrete
  instance of the thing AGENTS.md Phase 34 explicitly warns against ("never silently
  manufacture a value") — flagging by id for a data-side fix, not touching it here.
- Deadline coverage is otherwise thin here too (4 of 5 `date_not_announced`), consistent with
  the catalogue-wide base rate below, not a targeting problem.

## Persona D — 14-year-old, one club, one course, nothing else

**This is the case CEO explicitly named as the one most worth seeing.** Career profile
overall = **2** (weakest: academics, leadership, research) — for scale, 15x weaker than
Persona B's 32. 252 of 273 eligible — **92%, the highest eligible fraction of the three
personas**, despite having by far the thinnest profile. Country is entirely unset (no
education record at all), which the matcher treats as "unknown, don't exclude" rather than
"exclude" — a deliberate, documented choice elsewhere in the code, but it means a
near-blank profile is *less* filtered than a developed one, not more.

All 5 tie at `match=91` (`tier: exceptional`) — **the identical score and identical
"Exceptional match" label Persona B's genuinely strong, well-matched slate above also
carries.** Nothing in the score, tier, or (per the headline finding) the likely card
rendering distinguishes "great match for a demonstrated entrepreneur" from "great match for
a 14-year-old who joined one club two weeks ago."

| # | Title | Real fit for this profile? |
|---|---|---|
| 1 | **Davidson Fellows Scholarship** | Its own description: *"recognizing exceptional, largely independent work by students 18 or younger."* This is a national scholarship for near-professional-level independent achievement (`selectivity_tier: highly_selective`). Shown as the #1 "Exceptional match" to a profile with zero projects, zero awards, zero research, one unremarkable club. |
| 2 | **FIRST Global Challenge** | Its own description: *"Entry is not direct — self-registration is not possible. One national team per country."* Not something an individual freshly-onboarded student can act on today regardless of fit. |
| 3 | Conrad Challenge | Free Activation stage, real future deadline (2026-10-30), genuinely age-appropriate (13-18). Reasonable. |
| 4 | Science Olympiad (Div. C) | School-team-based but realistic for grades 9-12, `selective` but not elite-only. Reasonable, if this student's school fields a team. |
| 5 | FIRST Robotics Competition | `open_enrollment`, real future deadline (2026-11-17), age 14-18, mentor-supported. The most genuinely accessible of the five. |

**This is a real, present instance of "the failure that would embarrass him," not a
hypothetical.** It's not that the catalogue lacks anything appropriate for a beginner — 3 of
5 shown are reasonable, real, actionable entry points. It's that the ranker doesn't
distinguish "prestigious but currently unreachable for this student" from "achievable
starting point" within the eligible set, and the single least-appropriate item (a
scholarship whose own copy says it wants independent, exceptional work) lands in the #1
slot, under the same confident "Exceptional match" framing the same code gives to an
actually-strong profile.

## Cross-cutting context (so the above isn't misread)

- **Base rate, not a targeting bug**: across the full 366-row active catalogue, 272 (74%)
  have no deadline at all and 326 (89%) have an empty `eligible_countries` (the matching
  code's own comment: ~90% of rows have simply never had this researched — empty is not the
  same as "confirmed worldwide"). The "most top-5 results have no deadline / unverified
  country" pattern in every persona above reflects the catalogue's current data maturity,
  not something the ranking algorithm is doing wrong.
- **Score-tie density**: every persona's top 5 ties on the exact same `matchScore` (67 for A,
  91 for both B and D). `Array.prototype.sort` is stable, so among ties the order shown is
  whatever order rows arrived in from the database — not further-differentiated ranking.
  "Top 5" is likely a slice of a much larger tied block for at least persona A (all 5 shown
  score identically; there may be dozens more at 67 not shown here) — worth knowing before
  treating today's specific 5 as stable across re-fetches, if ab's ranking ends up using bare
  `matchScore` with no secondary sort key.
- **Positive finding, stated plainly**: description quality across all 15 sampled records is
  consistently strong, specific, real prose — not scraped fragments. Examples: correctly
  identifying TÜBİTAK as Turkey's national routing body for IOI/IOAI, correctly separating
  Conrad Challenge's free Activation stage from its paid Innovation stage. Every record has a
  working-looking `official_url`. The catalogue's content quality is not the problem here —
  matching against a beginner profile, and caveat-display once matched, are.

## Bottom line

- **Persona B** (developed, on-topic profile): strip works as intended, modulo one
  data-quality fix (Blue Ocean's deadline).
- **Persona A** (developed but off-target-dimension profile): topically fine, low
  actionability today, and the "addresses your gap" story doesn't actually hold for any of
  its top 5 — worth knowing if strip copy claims gap-relevance.
- **Persona D** (near-empty profile): does not degrade gracefully. Same confident label,
  same tier, as a 15x-stronger profile; #1 slot is a genuine mismatch by the opportunity's
  own description. This is the concrete, present-tense version of the failure CEO asked to
  see measured, not avoided by the current gates.
- **Structural point underneath all three**: 100% of every top-5 result in this measurement
  carries an eligibility caveat the code already knows how to display (Browse does it) and
  the homepage preview's existing pattern does not. Whatever the new strip's final ranking
  logic turns out to be, this gap exists independently of it.
