# Portfolio audit — 2026-09-02

Phase 20 has no mandated shape to check against — it explicitly says do *not* spend V1
engineering time on dozens of visual résumé templates, so this is a product-judgement read,
not a compliance one. Live data first: 11 accounts exist, all pre-launch internal/QA
(`[[project_oryn_has_never_been_deployed]]`), item counts across the 9 achievement tables
ranging from 0 (three accounts) up to ~21-22 (the two richest). Read the code, then verified
against real data pulled live and rendered through the actual `PortfolioView` component (a
temporary `/design-preview/portfolio` route, reverted before this commit).

**Verdict: the underlying mechanics are genuinely good — real chronological sort, a real
category grouping, a well-written empty state — but two categories of real student data were
silently invisible on the one page meant to show all of it.** Both fixed. One remaining
observation (Timeline's visual sameness across categories) is named, not built — a design
call, not a defect, and outside what Phase 20 asks V1 to spend effort on.

## Is it a portfolio, or a database dump with headings?

**Depends which tab.** Built the actual `PortfolioView` against a real 14-item, 9-category
account and looked at both:

- **By category** reads as a genuine portfolio — clear section headers ("Leadership",
  "Research", "Awards"...) group the work, and a reader can tell at a glance what kind of
  thing they're looking at before reading a single card.
- **Timeline** is closer to the dump end of that spectrum: every category renders through
  the identical generic card (title, date, org, description, one outline badge), with no
  icon, color, or any other visual cue distinguishing a National award from a research essay
  from a leadership role — only the text content tells them apart. No category-icon mapping
  exists anywhere else in this codebase to borrow from (checked `journey-timeline.tsx`,
  which has the same evidence-badge pattern but the same absence of category icons) — this
  would be a genuinely new, somewhat subjective design decision (10 icons, chosen well,
  applied consistently), not a small reuse like the two fixes below. Naming it, not building
  it — squarely the kind of visual-polish spend Phase 20 says not to prioritize for V1.

## Chronological *and* categorized — both real, not one pretending

Checked `lib/portfolio/build.ts` directly: `items.sort((a, b) =>
(b.startDate ?? "0").localeCompare(a.startDate ?? "0"))` is a genuine descending date sort
(ISO strings sort correctly lexicographically), confirmed against the live render — the
14-item account's Timeline tab runs April 2026 down to September 2022, correctly ordered.
"By category" filters that same already-sorted array, so items stay date-ordered *within*
each category too. Both views are real and consistent with each other.

## Does it show evidence status? — No, and it should. Fixed.

`PortfolioItem` had no `evidenceStatus` field at all, so nothing could render one no matter
what `build.ts` did. Confirmed live: 8 of the 9 achievement tables (all except
`education_records`, which doesn't track it) carry a real `evidence_status` column, and one
real row already has `evidence_added` — the same "Economics Club President" activity
discussed explicitly in [[project_oryn_advisor_conversation_audit]]'s real conversation data
("evidence-added-not-independently-verified"). The portfolio would have shown that item with
no indication of that at all — the exact cross-surface inconsistency asked about.

**Fixed**: added `evidenceStatus: EvidenceStatus | null` to `PortfolioItem`, threaded
`record.evidence_status` through `build.ts`'s 8 relevant mappers (`null` for education), and
rendered it in `ItemCard` via the *same* `evidenceStatusPresentation` mapping and `StatusBadge`
component `AchievementSection` and `JourneyTimeline` already use — not a new visual language.
Verified live against all three reachable states: `verified` renders a green checkmark badge,
`evidence_added` a neutral paperclip badge, and — the important negative case —
`self_reported` (12 of 14 items in the test account) and `null` (education) render **no
badge at all**, by the existing mapping's own deliberate design ("a badge repeated on every
row stops being information and starts being wallpaper"). `PortfolioView` is also the public
profile's renderer (`app/(app)/u/[id]/page.tsx` reuses it directly) — the badge now appears
there too. Considered suppressing it publicly and decided against it: `self_reported` still
shows nothing, and a "Verified" badge is a legitimate credibility signal on a page a viewer
might actually be assessing, not new information leakage (no file contents, no verifier
identity — just the same status word already visible to the student privately).

## Skills — an entire named category, invisible. Fixed.

Phase 20 names ten categories including Skills. `buildPortfolio` queries nine tables and
`skills` isn't one of them — real, categorized (technical/analytical/communication/
leadership), proficiency-rated skill data (7 rows on the account above, 2 on another) simply
never reached this page. (The type's tenth slot is `sports`, not a Skills substitute —
`sports_experiences` is its own real table with no natural home elsewhere; a legitimate
addition, just not the one Phase 20 named.)

**Fixed**, scoped narrowly rather than folding skills into the date-sorted model: skills have
no start/end date, so forcing them through `PortfolioItem`'s shape would either invent a fake
date or cluster every skill at the bottom of Timeline via the null-date fallback. Added a
small `getPortfolioSkills()` query and a `PortfolioSkill` type, rendered as its own compact
pill-list section — reusing the exact visual pattern the public profile's own `SkillList`
already established (`rounded-full border`, `flex flex-wrap`), minus the endorsement
affordance (a social feature between two accounts; irrelevant to a student viewing their own
private portfolio). `buildPortfolio`'s own return shape is untouched — it has two other
callers (`profile/cv/page.tsx`, `lib/social/public-profile.ts`) that don't need skills
folded in, so the new query is additive and opt-in per caller. `PortfolioView`'s new `skills`
prop defaults to `[]`, so the public profile's existing call (which already shows skills
separately, with endorsements) needed no change at all.

**One small logic change alongside it**: the empty-state check moved from `items.length === 0`
to `items.length === 0 && skills.length === 0`, and the achievement Tabs block is now skipped
(not shown empty) when there are zero achievements but real skills exist. Verified live: a
0-achievement/3-skill fixture correctly shows only the Skills section, no "your portfolio is
empty" message sitting above real data, and no achievement-empty-state contradicting a
non-empty skills list.

## What does a thin profile see?

A 2-item account renders through the exact same `Tabs` (Timeline/By category) as a 14-item
one. Structurally correct — nothing breaks, nothing looks obviously wrong — but a toggle
between two views that differ only trivially at N=2 is mild interface overhead for a student
who doesn't need it yet. Noted, not changed: this is a polish call with no clearly-better
default (hiding the tabs below some item-count threshold is a real option, but "what
threshold, and does it feel patronizing to a 3-item profile" isn't something to decide
unilaterally), and Phase 43's actual hard requirement — a real, working empty state with a
CTA — was already met before this audit touched anything.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3427/3427, 243 files), and
`npm run build` all pass.
