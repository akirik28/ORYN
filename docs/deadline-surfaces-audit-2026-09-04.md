# Deadline surfaces audit — 2026-09-04

Scope, per CEO's dispatch: what do deadline-facing surfaces show against **real account
data** right now — the dashboard's "Due Soon" block and the application tracker.
Specifically: real vs. empty vs. misleading data; whether past/expired dates leak
through; whether the 3/7/14/30-day urgency thresholds work; what a zero-deadline
student sees. Look-and-report only — no account creation, no live writes, no code
fixes. One safety check performed and passed: before reading anything in the Browser
pane, confirmed via `document.cookie`/`window.location.pathname` that the tab was the
unauthenticated `/design-preview/dashboard` fixture route, not a real session — no
navigation into any authenticated page happened this pass.

Method: source read (`lib/deadlines/upcoming.ts`, `components/proxola/deadline-badge.tsx`,
`features/dashboard/dashboard-view.tsx`, `app/(app)/applications/*`), cross-checked
against real production data via read-only SQL (project `qtcvcflzxbuagvvwahhu` — this is
the only database that exists; see `qa-scratch is the only database` in prior audits),
and one live, unauthenticated fixture render to confirm the badge colors actually paint
as distinct, not just in source.

## Two different surfaces, not one

CEO's dispatch treats "deadline surfaces" as one thing; the code has two, and they're
deliberately not the same:

- **Dashboard "Due Soon" / "Yaklaşan"** (`lib/deadlines/upcoming.ts`'s
  `getUpcomingDeadlines`, rendered at `features/dashboard/dashboard-view.tsx:468-493`,
  `limit=4`) — a curated digest. Every sub-query filters to `deadline >= today` at the
  database level before anything reaches the UI.
- **Application tracker** (`app/(app)/applications/page.tsx` →
  `features/applications/applications-view.tsx`) — a full record. The query
  (`applications-page.tsx:22`) has **no date filter at all**; every application a
  student has shows, regardless of date.

That's the right design for what each one is for (a digest should hide what isn't
relevant soon; a tracker should hide nothing), but it means "do past dates leak
through" has two different answers depending on which surface is meant.

## Q1 — real / empty / misleading?

11 profiles exist right now. Per-account count of items that would populate the
dashboard's Due Soon block (application + saved-opportunity + target-university
deadlines, filtered exactly as the app filters them):

| Account | Onboarded | App | Opp | Uni | Total |
|---|---|---|---|---|---|
| Mei Tanaka | yes | 0 | 0 | 11 | 11 |
| Ada Yilmaz | yes | 0 | 0 | 7 | 7 |
| Elif Demir | yes | 0 | 0 | 5 | 5 |
| oryn.qa.a | yes | 0 | 0 | 4 | 4 |
| Ada Sarp KIRIK (founder's own account) | yes | 1 | 0 | 3 | 4 |
| oryn.qa.b | yes | 1 | 1 | 0 | 2 |
| Deniz Kaya | yes | 0 | 0 | 1 | 1 |
| Claude UI QA | **no** | 0 | 0 | 0 | 0 |
| Oryn QA Sweep | **no** | 0 | 0 | 0 | 0 |
| Persona A Test | **no** | 0 | 0 | 0 | 0 |
| Daniel Okafor | **yes** | 0 | 0 | 0 | 0 |

7 of 11 see real, non-fabricated data — every item traces to a real row, nothing
invented. 3 of the 4 empty accounts haven't finished onboarding, which is a reasonable
empty. Daniel Okafor is not — see Q4, it's the most interesting finding in this audit.

**Not misleading in the sense of fabrication** — but there is a real precision problem:
5 of the items currently live on real accounts' Due Soon feeds are backed by
`university_deadlines` rows with `verification_state = 'unverified'`, and the widget
gives them the exact same visual treatment (title + `DeadlineBadge`, no confidence
mark) as a fully verified date. AGENTS.md Phase 37 says an unverified search result
should not be published as confirmed information; this widget doesn't caption it as
confirmed, but it doesn't caption it as anything — a verified and an unverified date
are indistinguishable to the student looking at this block. The full university detail
page does carry a `SourceBadge`/confidence treatment elsewhere in the app; this specific
digest doesn't inherit it.

## Q2 — do past/expired dates leak through?

**Dashboard Due Soon: no**, and it's a stronger guarantee than a display filter — it's
enforced at the query itself, three times over
(`lib/deadlines/upcoming.ts:30,73,117`, all `.gte(..., today)`), and additionally,
`VERIFIED_HISTORICAL` university-deadline rows are excluded regardless of date
(`upcoming.ts:134`) so a historical record can't leak through even if it were somehow
re-dated forward. A past date cannot reach this widget short of a bug in the query
itself, not a bug in what's rendered.

**Application tracker: by design, the opposite** — no date filter, so an application
with a deadline that's already passed but is still `in_progress` would correctly show,
and `DeadlineBadge` has an explicit branch for it (`"Past due"` / `"süresi geçti"`,
`components/proxola/deadline-badge.tsx:20`). This is the right behavior for a tracker —
a student needs to see they missed something, not have it quietly vanish.

**But this path is currently unexercised by real data**: of the 4 application rows
that exist in the entire database, 2 have future deadlines and 2 have none — zero have
a past one. The "past due" branch is real code with an explicit test-shaped case built
for it, but nothing today proves it renders correctly when actually reached; it's
verified-by-reading, not verified-live. Worth knowing before anyone points to it as a
confirmed-working feature.

## Q3 — do the 3/7/14/30-day thresholds work?

AGENTS.md Phase 23 names four urgency bands: 3 / 7 / 14 / 30 days. The actual
implementation (`components/proxola/deadline-badge.tsx:6-11`) has three dynamic tiers
and one flat catch-all:

```
≤3 days   → error (red)
≤7 days   → warning
≤14 days  → brand (accent)
>14 days  → neutral   ← everything past this point, no further distinction
```

There is no fourth tier at 30 days. A deadline 20 days out and one 120 days out render
identically. This is a real spec/implementation gap, confirmed by reading the function,
not an interpretation.

Checked against real data, and it currently makes little practical difference — the
closest real deadline **anywhere in the database** is 6 days away (one application, on
the founder's own account). Nothing currently falls in the ≤3-day band, and nothing
falls in the 8–14 day band either; the real distribution jumps from 6 days straight to
20+. So right now the ≤3 and the "brand"/8–14 tiers are both empirically idle, and the
missing 30-day distinction is the one that would actually matter if it existed — most
of the real, non-trivial upcoming deadlines (20 to 124+ days out, sampled from live
data) all land in the single flat "neutral" bucket today.

Live-verified (unauthenticated `/design-preview/dashboard` fixture, computed styles
read directly): a 6-day item, a 12-day item, and a 28-day item render as three visibly
distinct colors (amber/warning, brand blue-purple, neutral gray respectively) — the
tiers that exist do work and do paint correctly in the browser, not just in source.

## Q4 — what does a zero-deadline student see?

Neither an empty box nor a guiding message — **the entire section is omitted**:

```tsx
{upcomingDeadlines.length > 0 ? (
  <section ... aria-label={t("dueSoon")}> ... </section>
) : null}
```
(`features/dashboard/dashboard-view.tsx:468`)

A student who opens the dashboard with nothing due soon sees no trace that this feature
exists — no "nothing due right now," no prompt to add a target university or save an
opportunity. AGENTS.md Phase 43 ("Empty States") explicitly argues against exactly this
shape elsewhere in the product ("Bad: 'No activities found.' Better: [explain + CTA]");
this block currently gets neither the bad version nor the better one — it gets silence.

**The real account behind this finding, and why it's more than a copy nit:**
Daniel Okafor is fully onboarded with 3 actively-targeted universities (Carnegie
Mellon, MIT, Caltech) and sees a completely blank Due Soon section. That is not a
data-coverage gap — CMU alone has 17 `university_deadlines` rows on file, MIT has 2.
Every one of those 19 rows is in one of two states: a real date that's `
VERIFIED_HISTORICAL` (last cycle's deadlines, correctly retired — e.g. CMU's early
deadline `2025-11-03`), or `VERIFIED_RECURRING_UNDATED` — Proxola's own way of saying
"we know this deadline recurs, we don't have next cycle's exact date yet," which by
definition has no `deadline_date` and therefore cannot appear in a date-sorted feed.

This isn't specific to Daniel Okafor's two schools. Database-wide, **140 of 470
`university_deadlines` rows (≈30%)** are `VERIFIED_RECURRING_UNDATED` — real research,
correctly distinguished from "unknown" in the data model, and structurally invisible to
this widget regardless of how much work went into it. A blank Due Soon section
currently means one of two very different things — "we don't know anything about your
schools" or "we know a great deal, just not the exact day yet" — and a student has no
way to tell which one they're looking at.

## What this doesn't cover

`lib/digest/build.ts` also calls `getUpcomingDeadlines` (for a notification/email
digest) — out of scope here since CEO's dispatch named the dashboard block and the
tracker specifically, not the notification pipeline. Not audited.

## Bottom line

- No fabrication and no expired-date leak found on either surface — both hold up under
  direct inspection, one by a hard query-level guarantee, the other by design intent
  that real data hasn't yet had occasion to exercise.
- Two real gaps worth CEO's attention, both precise rather than hypothetical:
  1. The spec's fourth urgency tier (30 days) doesn't exist in code, and it's the one
     that would matter most against real data today.
  2. A well-researched-but-undated deadline (30% of the table) and a completely
     unresearched one currently look identical to a student: nothing.
