# D3 — field-level breakdown and a fill-priority list for D1/D2

**Run 2026-09-04, against the live database (`qtcvcflzxbuagvvwahhu`) plus a full render-chain
trace of every field measured.** Scope, per the assignment: the two existing aggregate numbers
(`lacksResearchDepth` 68.8%, opportunity "unverified" 94.8%) are compound flags — several
individual fields OR'd or AND'd together. Nothing below re-measures those two aggregates from
scratch (rule 5); this breaks each into its components, adds render-chain confirmation for
every one, and adds two axes neither aggregate currently covers at all
(`university_deadlines`, and opportunity `cost`/`application_url`).

## Headline: nothing found here is an `academic_tier`-shaped trap

Every field measured below is confirmed, by reading the actual render code (not by assuming),
to be shown to a student somewhere — a badge, a filter, an empty-state message, or a warning.
None of them are dead columns. That itself is worth stating plainly rather than leaving
implicit: the ordering below is driven entirely by *how empty* each field is, not by filtering
anything out for being unused. See "What was checked and cleared" at the bottom for the exact
render sites.

## A real complication found while measuring: don't fill known duplicates

`docs/PROXOLA-PLAN.md`'s new D4 entry (university de-duplication) is confirmed, concretely,
against live data — not just the two examples it names:

| Row | has_stats | has_programs | has_requirements | has_sources |
|---|---|---|---|---|
| Massachusetts Institute of Technology | ✓ | ✓ | ✓ | ✓ |
| Massachusetts Institute of Technology (MIT) | ✓ | ✗ | ✗ | ✗ |
| The Hong Kong University of Science and Technology | ✗ | ✗ | ✗ | ✗ |
| The Hong Kong University of Science and Technology (HKUST) | ✗ | ✗ | ✗ | ✗ |
| UCL | ✗ | ✗ | ✗ | ✗ |
| University College London | ✗ | ✓ | ✓ | ✓ |

Every empty row above currently counts toward the "lacks depth" numbers below. Filling
"Massachusetts Institute of Technology (MIT)" or "UCL" specifically would be wasted effort on
a row that should be merged away, not researched — exactly D4's own warning. **The numbers
below are not duplicate-adjusted** (that's D4's job, still unassigned); treat them as an
upper bound on real work until D4 lands, and skip these five named rows specifically if
picking up D1 before then.

## Universities — field-by-field, all confirmed rendered

Total: **1,019** (CEO's cited 1010 is a few hours stale — the D1 lane closed nine more since;
see "numbers that moved" below). Each row: how many universities have **zero** rows in that
table, and where a viewer actually sees the gap.

| Field / table | Empty | % | Rendered where |
|---|---|---|---|
| `university_deadlines` | 914 | **89.7%** | Detail page, `[id]/page.tsx:132` — "only rendered when a value is actually present" (own comment); also feeds the deadline-engine's "due soon" surfacing everywhere a deadline would show up |
| `university_requirements` | 904 | 88.7% | Detail page requirements section (deliberately *not* gated by the depth flag — always renders, with its own empty state) |
| `university_statistics` | 886 | 86.9% | Detail page stats block; `hasStatistics` input to `lacksResearchDepth` |
| `university_programs`, `verification_state='verified_current'` | 869 | 85.3% | Program count input to `lacksResearchDepth`; detail page program list |
| `university_sources` | 858 | 84.2% | `SourceBadge` component, detail page — "Source: … · Checked: …" |

**Not in the current `lacksResearchDepth` flag at all**: `university_deadlines`. It's the
single emptiest field measured, confirmed genuinely rendered, and confirmed genuinely
independent of the four fields the existing flag already tracks — worth its own attention
regardless of how D1 orders the other four.

**One live code inconsistency found while tracing this, currently zero-impact, flagged not
fixed** (out of D3's scope): the detail page's `lacksResearchDepth` call filters programs to
`verification_state = 'verified_current'`; the bulk browse-grid scan
(`getAllResearchDepthUniversityIds`) counts *any* program row, unfiltered. Checked directly —
right now, zero universities have programs but none `verified_current`, so the two paths agree
by coincidence, not by construction. The moment a university gets a freshly-researched,
not-yet-verified program row with nothing else backing it, its own detail page and its own
browse card will disagree about whether it "has depth."

## Opportunities — field-by-field, all confirmed rendered

Total **active**: **367** (CEO's own scope — confirmed by checking `status`: 367 active, 27
under_review, 27 disabled, 1 expired; the unscoped total is 422). Cross-checked: OR'ing the
three eligibility-note fields below reproduces **348**, exactly CEO's own 94.8% figure — the
scoping and the underlying logic both check out.

| Field / condition | Empty | % | Rendered where |
|---|---|---|---|
| `minimum_age` and `maximum_age` both null (→ `age_eligibility_unverified`) | 273 | **74.4%** | `StatusBadge` (card, detail, home strip), footnote on the advisor's "take" panel, counselor-priorities warning |
| `eligible_grades` empty (→ `grade_eligibility_unverified`) | 272 | 74.1% | same four render sites |
| `cost` null | 259 | 70.6% | detail page cost line; compare-page cost column |
| `eligible_countries` empty *and* no citizenship/residency restriction text *and* not confirmed-open (→ `country_eligibility_unverified`) | 224 | 61.0% | same four render sites |
| `application_url` empty | 177 | 48.2% | the actual "Apply" CTA (`opportunity-actions.tsx`) — empty here means the button has nothing to link to, not just a missing footnote |
| `description` empty | 0 | 0% | sanity check — every active opportunity has some description already |

**`eligible_citizenships` is empty on all 367** — but that alone never fires a note; it only
matters combined with `eligible_countries` (both empty together is what triggers
`country_eligibility_unverified`, already counted above). Listed for completeness, not as a
fifth independent row.

**`cost` and `application_url` are not part of the "unverified" aggregate at all** — same
situation as `university_deadlines` above. `application_url` in particular is worth calling
out specifically: an opportunity missing it isn't just under-documented, its own primary call
to action has nowhere to send the student.

## Priority order this produces

**Within universities**, by emptiness (all confirmed rendered, so ranked on raw impact):
1. `university_deadlines` (89.7%) — highest, and the one axis the existing flag misses entirely
2. `university_requirements` (88.7%)
3. `university_statistics` (86.9%)
4. `university_programs` / verified_current (85.3%)
5. `university_sources` (84.2%)

**Within opportunities**, same basis:
1. `minimum_age`/`maximum_age` (74.4%)
2. `eligible_grades` (74.1%)
3. `cost` (70.6%)
4. `eligible_countries` + citizenship/residency (61.0%)
5. `application_url` (48.2%) — lower % empty, but the one row where "empty" breaks a working
   feature (the Apply button) rather than just omitting a footnote; worth weighting up for
   that reason even though the raw percentage is the lowest on either list

**Between D1 and D2**: universities run consistently emptier across every individual field
(84–90%) than opportunities do (48–74%), for what that's worth as a raw signal — but I don't
have data on relative page traffic between the two surfaces to make a real impact-weighted
claim beyond "more of the university data is missing." Read as a lean, not a verdict; a
founder or CEO call on which surface matters more to the current user base would settle it
better than emptiness percentage alone.

## What was checked and cleared (the actual render-chain trace, not assumed)

- **`lacksResearchDepth`** (`lib/universities/data-depth.ts`): computed in
  `app/(app)/universities/[id]/page.tsx`, renders an `EmptyState` on the detail page (line
  373) and a `BadgeCheck` "detailed profile" badge on every browse/search card
  (`features/universities/university-card.tsx:148-153`), and drives the "detailed profiles
  only" filter toggle (`app/(app)/universities/page.tsx`, `lib/universities/filters.ts:185-188`).
- **Opportunity eligibility notes** (`lib/opportunities/matching.ts`'s `computeEligibility`,
  persisted into `opportunity_matches.eligibility_notes`): rendered as a warning badge and
  footnote across four independent surfaces — the browse/for-you card
  (`features/opportunities/opportunity-card.tsx:386-401`), the detail page
  (`app/(app)/opportunities/[id]/page.tsx:267-306`), the home-page rotating strip
  (`features/opportunities/opportunity-strip-card.tsx:122`), and the advisor's
  counselor-priorities panel (`features/advisor/counselor-priorities.tsx:71-77`).
- **Confirmed silent on this**: `app/(app)/opportunities/compare/page.tsx` states raw facts
  (age range, cost) but renders no eligibility-warning row at all — not a gap this pass needs
  to fix, just noted so nobody assumes it's covered there. (Not independently checked: whether
  the university compare page has an equivalent silent spot for the fields above.)

## Numbers that moved since they were last cited

Universities: CEO's own 1010/695 vs. this run's 1019/703 — both up by roughly the same amount
(+9/+8), consistent with the nine universities the D1 lane has already closed landing as *new*
rows in this snapshot rather than replacing the count downward. Not a discrepancy worth
chasing further; the fresh numbers above are what to build on going forward.

Opportunities: CEO's own 367/348 reproduced exactly, unscoped and per-condition. No drift.
