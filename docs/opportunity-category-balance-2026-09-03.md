# Opportunity category balance — 2026-09-03

Founder's own instruction, relayed: *"her iş biterse daha fazla büyüt — üni ve opportunity
şeylerini araştır."* CEO's specific ask: measure the real category distribution, pick the
two thinnest categories that matter most to students who can't travel or pay, research and
stage real additions with full provenance, and give Turkey/international eligibility
first-class attention given the exclusion audit earlier tonight.

## 1. The real distribution, re-measured live

```sql
select category, count(*) as n, round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from public.opportunities
where status = 'active'
group by category
order by n desc;
```

| category | n | % |
|---|---|---|
| summer_program | 139 | 49.3 |
| competition | 80 | 28.4 |
| research | 15 | 5.3 |
| internship | 8 | 2.8 |
| scholarship | 8 | 2.8 |
| student_program | 7 | 2.5 |
| online_program | 6 | 2.1 |
| volunteering | 6 | 2.1 |
| fellowship | 5 | 1.8 |
| entrepreneurship | 5 | 1.8 |
| conference | 2 | 0.7 |
| academic_program | 1 | 0.4 |

The founder's 49% figure holds exactly on re-run. `summer_program` + `competition` are
77.7% of the live catalogue between them.

## 2. Which two, and why

Picked **`online_program`** and **`volunteering`** — both tied for thinnest at 2.1%, and
both are the two categories that most directly answer "a student who can't travel or pay":
`online_program` needs no travel by definition, and unlike `summer_program` — which is
mostly paid, in-person, multi-week commitments — a strong `volunteering` option can be free,
remote, and startable immediately.

Considered and rejected as the second pick: `fellowship` and `entrepreneurship` (also
2.1%/1.8%, but the well-known examples I could find in a first pass skew toward the same
travel/cost profile as `summer_program`, not away from it) and `scholarship` (2.8%, and
genuinely valuable for the "can't pay" half of the brief — but nearly every well-known
scholarship for this age group is tied to a specific country's own citizenship, which would
risk quietly repeating the exact pattern the Turkey-exclusion audit just flagged rather than
countering it; didn't find a strong, verifiably-international candidate in the time this
pass had). `conference` and `academic_program` are too small a population (2 and 1 record)
to read as a real signal about the category rather than about one or two individual rows.

## 3. Staged: 2 new records, both free, remote, and internationally open

`data/research/opportunities/batch-category-balance-2026-09-03.jsonl` — not applied.
Dedup-checked directly against live `opportunities` (title/official_url, no match) before
staging; the real dry-run gate (`npm run ingest:opportunities -- <path>`, no `--apply`)
wasn't run against this batch — copying `.env.local` into this worktree to reach the
Supabase secret key needed for that specific command was refused by this session's own
permission classifier, and I didn't route around that refusal. What *was* verified directly
against `lib/opportunities/ingest.ts`'s source: both records use only valid enum values
(`category`, `location_mode`, `cycle_status`) and carry every field the research-handoff doc
marks required.

1. **CS50x: Introduction to Computer Science** (Harvard University, `online_program`) — the
   organizer's own page states plainly: *"Even if you are not a student at Harvard, you are
   welcome to 'take' this course for free via this OpenCourseWare."* Free, self-paced (no
   deadline, no start date — genuinely open-ended), no citizenship or age language found
   anywhere on the page. `minimum_age`/`maximum_age` left null rather than guessed — the page
   doesn't state one.
2. **Zooniverse** (`volunteering`) — real citizen-science research participation, not a
   simulation: volunteers classify images and transcribe documents for live academic
   projects. Own page: *"anyone can be a researcher"* and *"on their own computer, at their
   convenience."* Free, no application, no citizenship restriction found. **`minimum_age`
   left null and flagged, not assumed** — checked the FAQ and privacy page specifically for
   an age floor (many US-based UGC platforms carry a COPPA-driven 13+) and found nothing
   confirming one either way; stated here rather than silently picking 13.

Both: `eligible_countries: []` (unrestricted, the same convention `computeEligibility`
already reads as open-to-all), `citizenship_restrictions: null` on genuine absence of any
stated restriction, not on failure to look.

## 4. Real candidates researched and deliberately not staged

Reporting these because a rejected candidate with a reason is worth more than silence about
the search:

- **AIESEC Global Volunteer** — real and well-known, but its own page requires "life and
  health insurance" and walks through "prepare for departure": this is an *in-person,
  international-travel* volunteering placement, the exact profile this pass was trying to
  move away from, not toward. Wrong fit regardless of category label.
- **UN Volunteers' Online Volunteering service** — exactly the shape wanted (free, remote,
  global), but its site returned three different connection failures across three URL
  attempts (SSL name mismatch, unverifiable certificate, then 403). Genuinely couldn't
  verify, not verified-and-rejected; worth a retry from a different network path some other
  time, not concluded to be a dead end.
- **Technovation Girls** — real and global in spirit, but its own page describes
  participation through "Chapters" or "Clubs" of 15+ students led by an organizer, not
  something an individual student signs up for directly. A genuinely different participation
  shape from every other row in this catalogue; would need its own modeling question before
  it fits this schema, not a research gap.

## 5. Not done in this pass

Only 2 records staged, deliberately, not a rounding error — this pass prioritized verified
quality over count per the standing instruction that a small table of real options beats a
padded one. Did not attempt `fellowship`, `entrepreneurship`, `scholarship`, `conference`, or
`academic_program` beyond the reasoning in §2; each would need its own research pass with the
same bar, not a lighter one because they're smaller categories.
