# Deadline surfaces audit — follow-up: the honesty gap between surfaces

Addendum to [deadline-surfaces-audit-2026-09-04.md](./deadline-surfaces-audit-2026-09-04.md),
per CEO's follow-up: does the university detail page's honest "we haven't confirmed this yet"
empty state (D6, already merged) contradict the Due Soon block's plain silence for the same
university? And does the same question apply to opportunities carrying an eligibility caveat?
Look-and-report only, same constraints as the parent audit — no writes, no fixes.

## The university case: yes, confirmed, and it's worse than "different wording"

`app/(app)/universities/[id]/page.tsx` (D6, already on `origin/main`) renders an "Important
dates" section under three conditions — `datedDeadlines.length > 0 || recurringDeadlines.length
> 0 || missingApplicationDeadline` (line 817) — and specifically shows, when nothing else
applies:

> "Proxola hasn't confirmed this university's application deadline yet — check the official
> admissions page for the current date." + a link to `university.admissions_url ??
> university.website_url`.

`missingApplicationDeadline` is `lacksApplicationDeadline(deadlineTypes)` —
`!deadlineTypes.includes("application") && !deadlineTypes.includes("early")`, computed over
**every** `deadline_type` on file for that university, not just upcoming ones
(`lib/universities/data-depth.ts:53`). This means the detail page distinguishes two real
states the dashboard cannot:

1. **Genuinely nothing researched** (e.g. Caltech, 0 rows) → the honest message + source link.
2. **Real research exists, just not a confirmed current date** (e.g. Carnegie Mellon, 17 rows —
   an `early` deadline on file but only as `VERIFIED_HISTORICAL` 2025-11-03, plus several
   `VERIFIED_RECURRING_UNDATED` rows) → `lacksApplicationDeadline` is **false** here (an
   `early`-typed row exists, just historical), so no honest-unconfirmed message shows, but the
   `recurringDeadlines` group *does* render — CMU's undated rows show with their own
   `recurringBadge`, distinct from a dated one. The detail page is telling the truth in two
   different ways depending on which of these it's looking at.

**The dashboard Due Soon block does neither.** `getUpcomingUniversityDeadlines`
(`lib/deadlines/upcoming.ts:112-117`) selects only rows where `deadline_date` is not null and
`>= today` — `VERIFIED_RECURRING_UNDATED` rows are excluded by construction, and there is no
equivalent to `missingApplicationDeadline` at all. For the same student looking at the same two
universities:

- **Caltech** (real "nothing researched" case): silent on both surfaces — consistent, if not
  informative.
- **Carnegie Mellon** (the sharper case): the detail page shows a real "Recurring" section
  naming CMU's undated deadlines; the dashboard shows nothing for CMU at all, as if it had no
  deadline information whatsoever. **A student who visits CMU's own page gets a partial but
  honest answer. The same student's dashboard drops CMU from "what's coming up" entirely**,
  even though 17 real, researched rows exist for it. That's not two surfaces using different
  words for the same fact — the dashboard is materially less informative than a page reachable
  one click away, about the exact same underlying data.

This is the real account behind Q4 in the parent audit (Daniel Okafor: 3 active targets, empty
Due Soon section) — confirmed here to be specifically a CMU-shaped case, not a Caltech-shaped
one: real, substantial research that the digest simply has no vocabulary to surface.

## The opportunity case: same structural gap, confirmed in code, not yet reachable in real data

`eligibility_notes` (stored per student on `opportunity_matches`, not on `opportunities`
itself) is a real, already-shipped concept — rendered as a `StatusBadge` ("eligibilityUnknown",
warning tone) on the opportunity strip/cards (`features/opportunities/opportunity-card.tsx:399`,
`opportunity-strip-card.tsx:122`) and used to build the AI advisor's own eligibility caveat text
(`lib/ai/opportunity-context.ts:32`).

`getUpcomingOpportunityDeadlines` (`lib/deadlines/upcoming.ts:63-86`) — the Due Soon block's
opportunity source — doesn't carry this at all. Its query
(`.select("id, title, status, deadline, cycle_status")`) never fetches `eligibility_notes` in
the first place, and `UpcomingDeadline`'s own type (`id, source, title, date, href`) has no
field for it. An opportunity with a real eligibility caveat would show in the Due Soon block
with the identical treatment as one with none — title and a date badge, nothing else — same gap
shape as the university case: information the app already knows how to display elsewhere is
structurally absent from this one digest.

**Checked against real data, this scenario doesn't exist yet to observe live.** Exactly one
saved opportunity with a future deadline exists in the whole database right now (Yale Young
Global Scholars, on one account) — `eligible: true`, `eligibility_notes: []`. So this is a
confirmed structural gap (the query doesn't select the column, the type doesn't carry it), not
a live-observed bad rendering — worth fixing before it happens to matter, not because it has yet.

## Bottom line

Same root cause both times: `getUpcomingDeadlines` was built as a bare list of (title, date)
pairs, and every other surface in the app has since grown a vocabulary for "we don't know yet"
that this one never inherited. The university case is the one to weigh first — it's live,
confirmed on a real fully-onboarded account, and the contrast (an honest partial answer one
click away from total silence) is the more visible inconsistency. The opportunity case is the
same shape, real in the schema, just not yet reachable with the amount of real data that exists
today.
