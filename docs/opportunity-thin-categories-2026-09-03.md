# Thin-category sourcing: internship, volunteering, entrepreneurship — 2026-09-03

Territory assigned by the CEO after the fleet-wide dedup sweep and the ingest-gate lesson
from the previous package: internship (9), volunteering (7), and entrepreneurship (7) are
mine alone this round — scholarship is 31's, deadline-coverage measurement is b9's. Same
filter as every prior pass (age ~14-18, the product's corridor of Turkey/UK/Europe/US plus
international routes in, no travel, individually applicable, free or genuinely fundable),
with one sharpened requirement: **age and eligibility bounds are the deliverable, not
decoration** — an unbounded row rendering "eligible" with no caveat is worse than no row.

**Result: 2 fully live-fetch-confirmed records (both volunteering), 2 more corroborated but
not confirmed on the organiser's own domain (one internship, one volunteering), 0 for
entrepreneurship after extensive search.** Roughly 25 named candidates investigated and
rejected across the three categories, documented below because the rejection count is the
more informative number, per the brief.

## What shipped

`data/research/opportunities/batch-thin-categories-2026-09-03.jsonl` — 4 records.

| Record | Category | Age bound | Verification |
|---|---|---|---|
| **Citizen Archivist Program** (NARA) | volunteering | Not stated for this specific online tier — left null rather than borrowed from NARA's unrelated in-person 16+ role | `live_fetch` — official FAQ read directly: "open to anyone in the world," international users authenticate via login.gov Back Up codes |
| **DoSomething.org** | volunteering | 13-25 (organisation's own stated member range) | `live_fetch` — official About page read directly for the age figure; the 131-country reach and fee-free claim rest on consistent secondary corroboration layered on top, flagged as such rather than asserted as independently confirmed |
| **Youth Journalism International** | internship | Max 19 ("19 or younger") | `search_summary` — the organisation's own domain returned a connection failure on every attempt; two consistent secondary quotes describe the age rule and free-to-join status |
| **Smithsonian Digital Volunteers: Transcription Center** | volunteering | Min 14 ("14 years or older") | `search_summary` — si.edu returned HTTP 403 on every attempt; the age figure is a secondary-sourced quote of the organisation's own FAQ |

Per the lesson from the last package (`judgeRetrievalEvidence()` hard-fails any
`retrieval_method: "search_summary"` record unconditionally), **the last two of these four
will not pass `ingest:opportunities` as staged.** They're included anyway, honestly flagged,
for the same reason the last batch's three did: it's real research with exact quotes,
ready for a direct fetch once the domain is reachable, not a finished record. Only the first
two (both `live_fetch`) should be expected to land.

## Age/eligibility bounds: what was confirmed, what wasn't, and why nothing was guessed

- **Citizen Archivist**: minimum age genuinely not stated for the online tier. NARA's own
  site does state a 16+ minimum for a *different*, in-person volunteering role — that figure
  was deliberately not carried over, since applying an unrelated program's age floor to this
  one would be exactly the kind of unstated-restriction-presented-as-fact this brief warned
  against, just inverted (inventing a restriction that may not exist, rather than missing
  one that does).
- **DoSomething.org**: 13-25 is a direct quote from the organisation's own About page, not
  inferred from "youth-led" framing.
- **Youth Journalism International**: "19 or younger" is specific and consistent across two
  independent secondary sources, both reading as direct quotes of the same eligibility rule.
- **Smithsonian Transcription Center**: "14 years or older" is similarly specific and
  quote-shaped, not a vague "for young people" restatement.

No record in this batch has a guessed age bound. Where a candidate's age eligibility was
genuinely unclear after checking (Your Green Action Fellowship, below), it was rejected
rather than staged with an assumed range.

## Researched and rejected, with reasons

### Entrepreneurship (0 shipped — the honest result)

Extensive search across accelerator, competition, grant, and course angles turned up no new
candidate that survived all four filter conditions at once. What was found and why it
didn't survive:

| Candidate | Why rejected |
|---|---|
| Global Youth Entrepreneurship Challenge (GYEC) | $100/person application fee; "waivers and scholarships offered" but no stated waiver rate — same unaudited-aid-claim pattern flagged as unreliable in the prior pass (Ladder Internships) |
| School Enterprise Challenge | Confirmed teacher-organised only — official page: "Teachers sign up... bring entrepreneurship to life in the classroom," no individual-student signup path found. Fails "individually applicable" outright |
| JA Connect (Junior Achievement) | The specific "usable independent from a JA learning experience" self-guided track could not be confirmed as accessible without school affiliation or available outside the US (jausa.ja.org is explicitly the US affiliate's domain; JA's global network, including JA Türkiye, may have a separate offering not checked this pass) |
| LaunchX Online BootCamp | Starts at $1,995 |
| Blue Ocean Student Entrepreneur Competition, NFTE World Series of Innovation, Diamond Challenge | All already in the catalog. Diamond Challenge specifically exists as two separate rows (`cb1ae3e2` category=entrepreneurship, `30a605ab` category=competition) — a likely duplicate pair, flagged here since it sits in this territory but not resolved (dedup isn't this task) |
| Rotaract | Ages 18+ explicitly |
| Interact Clubs (Rotary) | Age range (12-18) fits, but structurally chapter-based (join or start a school/community club) rather than an individual online application — deprioritized before full confirmation given the pattern, not conclusively rejected |
| Entrepreneurship World Cup, Endless Frontier Labs, Cisco Startup Program, Primary Venture Partners Founders Fellowship | All aimed at founders with an existing company/venture, not a 14-18-year-old without one; not pursued further given the clear adult-startup framing |
| Business Freedom Grant, Visa Everywhere Initiative, Awesome Foundation, SBA Youth Entrepreneurship grants, Hustler's MicroGrant | General small-business grants requiring an existing registered business — not realistic for this age group without one, not individually pursued to full verification |

### Internship

| Candidate | Why rejected |
|---|---|
| Intern Abroad HQ | Starts at $1,099; no free option found |
| Delta Institute / "Delve" | Reads as a listicle-content marketing site (many "N internships for high schoolers" blog posts funneling to a paid product) rather than a single verifiable program; not pursued given the pattern |
| Your Green Action Fellowship (Wang and Tangang Foundation) | Neither age nor cost could be confirmed after checking two pages (the announcement article and the organiser's own "about" page) — "young people everywhere" is not a stated age range, and cost is simply unaddressed. Rejected on genuine uncertainty rather than staged with an assumed range |

### Volunteering (heaviest rejection rate, as expected)

| Candidate | Why rejected |
|---|---|
| TeensGive.org | The domain now 301-redirects to essayhub.com, a commercial essay-writing service — the organisation's own domain appears to have lapsed and been repurposed. Every aggregator blog still describing it is describing a program that, at its own former address, no longer exists |
| Outreach360 Virtual Volunteer English Teacher | Official page: "18 Years of age or older" — exactly the "quietly requires 18+" trap this brief named specifically |
| UN Online Volunteering (UNV) | Confirmed 18+ minimum to register on the Unified Volunteering Platform; the UN Youth Volunteer programme is 18-26. Already rejected in an earlier pass for the same reason, re-confirmed here |
| Rotaract (cross-listed above) | 18+ |

## Why entrepreneurship landed at zero

The pattern across all four candidate types checked (accelerators, competitions, grants,
courses) is consistent: genuinely free, individually-appliable, teen-appropriate
entrepreneurship programs that aren't already in the catalog appear to be a smaller pool
than the other two categories. Competitions skew toward names already present (Diamond
Challenge, Blue Ocean, NFTE); courses and accelerators skew toward either a real per-person
fee, an unaudited "aid available" claim, or a structural requirement (a teacher, a school,
an existing registered business) that fails "individually applicable." This reads the same
way the earlier scholarship-search pattern did — not a research-effort shortfall, a real
shape of the space — but it's reported as a finding for this specific pass rather than
assumed to generalize; a future pass with more time could still reasonably try the JA
Türkiye / JA Worldwide angle directly (rather than the JA USA domain checked here) and the
Interact Clubs individual-join question, both left genuinely open rather than closed out.
