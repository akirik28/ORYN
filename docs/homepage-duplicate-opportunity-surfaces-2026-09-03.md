# The home page shows the same opportunities twice, with contradictory confidence

Write-up only — nothing changed. Both surfaces exist exactly as built tonight; this doc lays
out what they are, whether they can ever disagree on *which* records to show, and what removing
one would look like, for the founder to decide.

## What the two surfaces are

**The old preview** — `app/(app)/dashboard/page.tsx`'s `opportunityPreview` block (spec Phase 7,
predates tonight), rendered by `features/dashboard/dashboard-view.tsx` as a plain two-item `<ul>`
inside the "Fırsatlar" panel, paired in a two-column grid with "Üniversite görünümü." Query: top
`OPPORTUNITY_PREVIEW_SIZE` (2) of `opportunity_matches` where `eligible = true`, ordered by
`match_score` descending, joined against `opportunities` filtered to
`verification_state = 'verified_current'`, then narrowed by `isOpportunityRecommendable` +
`competesInCoreRecommendations`. Its rendered shape is `{ title, matchScore, deadline,
cycleStatus }` — a title, a match-tier label ("Exceptional match" / "Strong match" / "Worth a
look"), an optional cycle descriptor, a deadline badge. **There is no `eligibilityNotes` field in
that shape at all** — not hidden, not defaulted, structurally absent. The panel cannot render a
caveat for any row, regardless of what that row's own data says.

**The new strip** — `lib/opportunities/home-strip.ts` + `features/dashboard/opportunity-strip.tsx`
(built tonight, `docs/homepage-strip-top5-quality-2026-09-03.md`'s findings). Same eligibility
gate, same `verification_state`/recommendability/pay-to-enroll filters, top 5 instead of top 2.
Carries `eligibilityNotes` through to every card and shows a caveat badge whenever it's non-null;
carries no match-tier label at all, on purpose, after `docs/homepage-strip-top5-quality-2026-09-03.md`
measured that label giving a 14-year-old with a 2/100 profile the identical "Exceptional match" a
genuinely strong profile gets.

**Current page order, as of tonight's own founder-requested move (`faeb2590`): the strip renders
FIRST, above "This week," with the old panel still in its original position further down** (paired
with "Üniversite görünümü" in the two-column grid near the bottom). This reorder was a deliberate,
separate founder call about placement — not related to tonight's finding — but it changes the
shape of the contradiction: **a student now meets the honest strip first, then the confident old
panel second**, on the way down the same page. Reading order runs from "we're not sure about
this" to "Exceptional match" for the identical record, not the other way around.

The old panel's own header comment, written earlier tonight when the strip was first added
(since corrected once already, when the reorder made its own wording stale — see `faeb2590`'s own
commit message): originally *"additive to the small text preview two sections up, not a
replacement for it: that panel stays for a fast, quiet glance."* That reasoning is what tonight's
finding overturns regardless of which section is physically above the other — the panel's
quietness is exactly what makes it a problem: it says nothing about eligibility while confidently
asserting a tier, on the same page as a surface that was rebuilt specifically because that
combination turned out to be false confidence.

## The DOM evidence

Rendered `/design-preview/dashboard` (the real `DashboardView` component against the real
fixture data — the design-preview harness passes the old panel all 5 fixture opportunities
unsliced, so it shows more rows here than the `OPPORTUNITY_PREVIEW_SIZE = 2` a real account
would see; the contradiction itself doesn't depend on the count). Checked twice, hours apart, as
other work landed on the same fixture data — both checks confirm the same shape, the second one
cleaner than the first:

| Title | Old panel's claim | New strip's claim |
|---|---|---|
| International Economics Challenge 2027 | **"Exceptional match"** | **"Eligibility unknown"** |
| Youth Research Fellows Programme | **"Strong match"** | **"Eligibility unknown"** |
| Coastal Ecology Summer Institute | **"Strong match"** | **"Eligibility unknown"** |
| Global Merit Scholarship | **"Worth a look"** | **"Eligibility unknown"** |
| Student Founders Accelerator | **"Worth a look"** | **"Eligibility unknown"** |

Raw `textContent`, confirming the two surfaces really do address the identical row:

```
old panel: "International Economics Challenge 2027Exceptional match6 days left"
new strip: "International Economics Challenge 2027Global Economics FoundationSelective6 days leftEligibility unknown"
```

**All five records on the page carry a flatly contradictory verdict between the two surfaces** —
a confident tier label on one, "we don't know if you're eligible" on the other, for the identical
opportunity, on the identical page. An earlier same-evening check of this same page found one
exception (this fixture's first record briefly carried no caveat on either surface, so the two
surfaces briefly agreed on it); by the second check the same record had picked up a caveat too, in
step with other unrelated fixture work landing that evening. The finding doesn't depend on which
exact fraction is contradictory — even the earlier, milder reading was four of five.

## Can the two surfaces ever show genuinely different records?

No, not under normal operation — and this matters for the decision, because "they might diverge
later" would be a different, harder problem than "they currently duplicate." Both read
`opportunity_matches` with the identical filter (`eligible = true`), the identical join
(`verification_state = 'verified_current'`), the identical recommendability/pay-to-enroll
narrowing, and the identical `match_score DESC` ordering. The old panel takes the first 2 of that
ordering, the strip takes the first 5 — **the old panel's 2 records are always a strict prefix of
the strip's 5**, given a large enough candidate pool on both sides (20 vs. 30, both comfortably
above 5). There is no code path where the two surfaces disagree on *which* opportunities to show,
only on *what to claim about them*.

One narrow, honest caveat: the two reads are separate round trips (one in `dashboard/page.tsx`,
one inside `getHomeOpportunityStrip`), not one shared query — if `match_score` ties exist with no
secondary sort key, row order among tied rows isn't guaranteed identical across two independent
executions by the SQL standard, only in practice for the same immutable data queried moments
apart in the same request. Not observed to actually happen; named because "always the same
record" is a claim worth being precise about, not because there's evidence it's ever false.

## What removing the old panel would look like

The old panel lives inside a `grid grid-cols-1 md:grid-cols-2` pairing with "Üniversite görünümü"
(`features/dashboard/dashboard-view.tsx`, the same section pinned by
`__tests__/dashboard/dashboard-view-grid-overflow.test.ts`). Deleting the Opportunities half
outright leaves University Outlook as the grid's only child — CSS Grid does not collapse a
two-column track to one just because one cell is empty; the remaining card would sit in the first
column at half width, with dead space where the second column used to be. Not a reason to avoid
the change, just a real consequence worth naming rather than discovering after the fact. Three
shapes that resolve it, described only, not built:

1. **Delete the panel, make University Outlook full-width.** Simplest; loses the paired
   "two things at a glance" layout that section of the home page currently has.
2. **Delete the panel, put something else in that grid slot.** No specific candidate assessed
   here — would need its own look at what else on the page could reasonably pair with University
   Outlook.
3. **Replace the panel's content, keep its slot.** Reuse the strip's own honest card rendering
   (or a smaller variant of it) inside the existing two-column slot instead of the bare-list
   rendering — keeps the "quick glance" utility the panel was originally for, without the
   confident-label problem, at the cost of building a second, differently-sized card treatment.

All three are homepage layout changes. None is built here.
