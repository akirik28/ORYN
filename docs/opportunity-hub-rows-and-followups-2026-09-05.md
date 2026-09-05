# Hub rows, the Massachusetts pattern, and the Wharton duplicate — measured, per CEO's explicit "measure and propose, don't code" instruction

## Part 1 — the 9 hub rows: what a student actually sees

Pulled current title/description/official_url for all 9 directly (not from memory of the
research pass). Two genuinely different problems hiding under one label:

**Group A — description already reads as general/brand-level, just needs the title to match.**
The description doesn't claim to be one specific program's facts, so nothing here is actively
misleading — it under-informs, but doesn't assert something false.
- **UCSB** — description already says "two premier pre-college programs... RMP and SRA" by
  name. Closest of the 9 to already being honest.
- **Northwestern** — description is self-aware ("wide range of courses... age 4 through grade
  12... check the official page for the current course catalog"), but the **title is just
  "Northwestern University"** — zero signal of breadth. Click leads to a real course-catalog
  page matching the description.
- **Oxbridge Academic Programs** — description is a research note admitting the fetched page
  was marketing boilerplate; brand-level framing already, but official_url is the bare
  homepage, not even the `/programs` list page that names the 9 actual programs.
- **ICS** — description reads as an organizational profile ("full-service education and
  workforce development firm"), not a specific competition. Click leads to the org homepage,
  which hosts 6 unrelated competitions.
- **Wharton Global Youth Program** — description says "a range of pre-college business
  programmes," genuinely plural. Click leads to a general application-info page.
- **UChicago** — the row's **title already names the bundle**: "Pre-College Summer Programs
  (Immersion/Stones and Bones/Summer Bridge/Summer College)." Closest of the 9 to option (b)
  already implemented, just needs the parenthetical made clearer to a student than a bare
  program-name list.

**Group B — description reads as ONE specific program's real facts, but the row covers many.**
This is the more seriously misleading pattern — a student reading it would reasonably believe
these numbers describe the whole catalog entry.
- **Brown University (RI, USA)** — description opens with a full subject-area list (all 8
  programs), then drops into "Eligibility for **Summer @ Brown**: grades 9-12, ages 14-18 by
  **June 16, 2024**" as if that specific, dated fact were the row's own. The official_url is
  the `/programs` hub, not Summer @ Brown's own page. (The 2024 date is also stale, independent
  of the hub problem.)
- **American University, Washington DC** — description is entirely about **Community of
  Scholars** specifically (3-credit course, DC campus details, "rising juniors and seniors"),
  reading like a single-program listing. official_url goes to the general precollege hub,
  which has 6+ programs — Community of Scholars is only one of them.
- **Cornell University** — milder version of the same pattern: description centers on one
  specific track (Winter Session online courses, real dates) while official_url leads to a
  4-track hub (online/commuter/residential/post-grad) with materially different age bands.

**Where clicks lead, summarized:** 7 of 9 go to a multi-program catalog/hub page; 1 (Oxbridge)
goes to a bare brand homepage one level above even that; 1 (ICS) goes to an org homepage
hosting unrelated competitions.

### On the three options
Not recommending a build — this is what the measurement supports, for CEO to decide:
- **(a) Split into per-row programs** is the only option that gives an honest eligibility
  value per row, but at real cost (Brown alone would become 8 rows) and won't fully resolve
  UCSB/Northwestern/Oxbridge/ICS/Wharton Global Youth/UChicago, where the eligibility gap
  isn't really about which sub-program — it's that the row IS the brand, not one program.
- **(b) Fix the title, leave eligibility deliberately blank** matches what 6 of the 9 rows are
  already doing at the description level (UCSB, Northwestern, Oxbridge, ICS, Wharton Global
  Youth, UChicago) — for these six, this is a small, honest fix: make the title say what the
  description already admits. It does NOT fix Brown/American University/Cornell on its own,
  since their problem is the description asserting false specificity, not just the title being
  vague — those three would need the description rewritten to match the hub reality, not just
  the title.
- **(c) Disable** removes real, live-linked opportunities a student could otherwise discover
  through the official site directly — costliest in lost value, no row here looked broken
  enough (dead link, wrong audience) to warrant it the way Bocconi/Navarra did.

If the direction is (b), the 6 "already-honest-in-description" rows are a fast, low-risk pass;
Brown/American University/Cornell need slightly more (title AND description), and are worth
flagging as a distinct sub-task rather than bundling all 9 as identical-effort fixes.

## Part 2 — how common is the Massachusetts pattern across the full catalog?

Searched the full active catalog (422 rows, not just this slice) two ways: state names near
"resid-" language, then explicit "resident of / residing in / must live in" phrasing. Checked
every hit's actual sentence before counting it, not just the keyword match:

- 4 false positives from the first pass — "residential" describing the PROGRAM's housing
  format (participants live on campus) coinciding with a state name that's the campus
  *location*, not an applicant restriction (Johns Hopkins CTY, Colorado School of Mines, Penn
  Medicine, NYU Tisch).
- 2 false positives from the second pass — genuine residency language, but **country**-level
  (Davidson Fellows: "U.S. citizens residing in the U.S."; TechGirls: "residents of 2026
  participating countries") — the existing `eligible_countries` field already handles this.
- **2 genuine sub-country cases**: Harvard CURE (Massachusetts-only, already known) and
  Scholastic Art & Writing Awards ("residing in the United States... or Canada **excluding
  Quebec**" — a province-level carve-out inside an otherwise country-level rule, a milder
  version of the same gap).

**2 of 422.** Genuinely rare. This measurement supports handling it in text (a note on the
affected rows) over adding a new schema field for two live cases.

## Part 3 — rows 135 and 150: verified duplicate, canonical row measured, retirement SQL prepared (not applied)

Confirmed duplicate, not just similarly-named: both rows carry the **identical** organization
string ("Wharton Sports Analytics and Business Initiative / Wharton Global Youth...") and were
created **18 seconds apart** (2026-08-18 23:57:48 vs 23:58:06) — a single discovery run almost
certainly found the same real competition via two different URLs (the operating team's own
event page vs. the umbrella program's directory listing) and never deduplicated them.

Measured which row is canonical, per CEO's explicit instruction (before deciding, not by
guessing):

| | row 135 (c35f002c, "Wharton Sports Analytics and Business Initiative") | row 150 (cfb32772, "Wharton Data Science Competition") |
|---|---|---|
| opportunity_matches | 1 | **8** |
| saved_opportunities | 0 | 0 |
| official_url | wsb.wharton.upenn.edu (operating team's own page) | globalyouth.wharton.upenn.edu (umbrella program directory) |

Row 150 has 8x the real match activity, and its title ("Wharton Data Science Competition")
names what the competition actually is; row 135's title reads as an organization name, not a
competition. Proposing row 150 as canonical, row 135 retired.

Followed this codebase's own established consolidation pattern exactly
(docs/opportunity-duplicate-consolidation-2026-09-04.sql, Package 16, CEO's own prior
decisions) rather than inventing a new one: `status = 'disabled'`, never a hard delete. Unlike
that file's Edinburgh/Garcia pairs, no data-migration step is needed here first — both rows
will carry the **same** age/grade facts once today's earlier SQL applies (both were researched
from the same underlying rules page), so this is the simple case, matching that file's own
Lehigh pair (3/3): retirement only.

```sql
-- NOT applied. Retire row 135 as a confirmed duplicate of row 150 (canonical: 8 real matches
-- vs 1, clearer competition-specific title). No data migration needed -- both rows carry
-- identical age/grade facts once docs/opportunity-fill-96-190-sql-2026-09-05.sql applies,
-- confirmed via the same source page. Pattern matches this repo's own established
-- duplicate-consolidation convention (status='disabled', not delete).
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e'
  and status = 'active';
```
