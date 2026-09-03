# Opportunity cost field -- hand-read fill pass, 2026-09-03

Follow-on to [`opportunity-cost-field-measurement-2026-09-03.md`](./opportunity-cost-field-measurement-2026-09-03.md)
(commit `dc88b931`), which measured the 258 active/null-cost rows and named two bounded,
zero-new-research fill targets: (A) rows whose own stored `description` explicitly states the
programme is free, and (B) the `financial_aid_available = true` / `cost is null` rows, checked
for a price already sitting in evidence that never got written back to `cost`.

**Method**: hand-read, not keyword-swept. A broadened multilingual pre-filter (English +
Turkish + German/French/Spanish/Italian free-language terms) was run first and found 15
candidate rows -- treated only as a pre-filter, not an answer, per the task's explicit
instruction. All 258 active/null-cost rows were then read in full by hand. Every fill was
re-checked against the row's live `cost`/`status` immediately before the SQL file was written.

**Coordination note**: the CEO dispatched this same free-but-null population to both this
session and oryn-31 without namespacing the output path, so both landed on
`data/research/opportunity-cost-field-handread-2026-09-03.sql` in what turned out to be
oryn-31's own worktree. Reconciled directly with oryn-31: all 6 rows they'd independently found
(5 free-text rows plus an identical $2,500 on Iowa Young Writers' Studio -- a clean independent
cross-check) are included below; oryn-31 dropped them from their own file rather than duplicate
the writes. Their own file (`opportunity-cost-handread-31-2026-09-03.sql`) carries their
distinct contribution: a full hand-read of the 227 rows outside the original 34-row sample,
finding 21 more schema-unrepresentable prices (foreign-currency/tiered) plus a live
keyword-sweep-vs-hand-read comparison over that pool.

## Headline result

| | Count |
|---|---|
| Bucket A candidates read (all 258 null-cost rows) | 258 |
| Bucket A -- **filled**, `cost = 0` | **8** |
| Bucket A -- documented, not filled (scope-ambiguous or mixed) | 2 |
| Bucket A -- keyword-matched but false positive on read | 6 |
| Bucket B rows today (`financial_aid_available = true` + `cost is null`) | 32 (was 28 when assigned -- population moved under concurrent activity on this table tonight) |
| Bucket B -- **filled**, single clean price | **2** |
| Bucket B -- documented, tiered/multi-track, not filled | 7 |
| Bucket B -- documented, pays the student (concept doesn't apply) | 4 |
| Bucket B -- documented, no price anywhere in evidence | 19 |
| **Total rows getting a `cost` value in this pass** | **10** |

## Bucket A -- filled (8)

Every row below states, in its own text, that the programme itself is free -- unscoped, not
hedged, not negated. All staged as `cost = 0`.

| Title | Evidence (verbatim) |
|---|---|
| Hong Kong Baptist University (HKBU) | "nine **free**, online summer programmes across its six faculties and schools" |
| Kode With Klossy | "Our **free** (yep, free!) two-week summer program for young women and non-binary individuals" |
| NYU High School Law Institute | "we offer **free**, yearlong academic programming in constitutional law, criminal law, and speech and debate" |
| University of Bath International Summer School | "is a **free**, online programme (via Microsoft Teams)" |
| Wharton HS Data Science Competition | "This **free** competition offers students..." / "**Free** and open to all current high school students" |
| Pre-College Program Virtual Fairs | "**Free** virtual fairs connecting students/families with pre-college summer program representatives" |
| Research Program KUSRP 2026 (Koç Üniversitesi) | Turkish: "...**ücretsiz** bir programdır" -- "...is a **free** program" |
| SPINWIP (Stanford) | "This 3-week program is **completely free** to participants" |

The KUSRP case is the flagship example the task called out: a Turkish-morphology "ücretsiz"
statement that no English-only keyword list would have caught, and that this session's own
15-hit multilingual pre-filter did catch -- but only hand-reading confirmed it as genuine
(unscoped, unambiguous) rather than a false positive.

## Bucket A -- documented, not filled (2)

**Gençlik Merkezleri (Youth Centres) -- e-Genç** (`d5790a1c-1238-4510-bdb4-25ce563595f3`): the
description lists "free courses and workshops" as one benefit within a longer list of what
membership grants access to. The word "free" is genuinely in the text, but it reads as scoped
to that one benefit, not unambiguously to the membership itself. Recorded here rather than
filled, on the same principle as the measurement doc's Lumiere Education case: picking `0`
would risk asserting something the text doesn't quite say.

**Blue Ocean Competition** (`cb4a1030-d035-4c1f-8579-37c458a88b0e`): the prior measurement doc
names this as one of 4 confirmed-free rows in its 34-row sample. Its current stored
`description` -- re-read directly for this pass -- contains no free-language or cost mention at
all ("Virtual business-strategy pitch competition... Site invites registration for the next
cycle but no deadline/dates published yet."). Not filled, because the live evidence doesn't
support it regardless of what the earlier doc reported. Given the concurrent activity on this
table tonight (see Coordination note above), a since-edited description is a plausible
explanation; flagging the discrepancy rather than guessing which version was right.

**Also seen and correctly excluded** (keyword-matched, false positive on read): FIRST Global
Challenge ("should not be assumed **free**" -- a negation), International Mathematical Olympiad
("exam-**free** university placement" -- substring match, unrelated to programme cost; also
Shape-4 institutional-not-individual cost like IChO in the prior doc), InvestIN ("Confirmed NOT
**free**" -- already known), and The Marshall Society Essay Competition (self-flags
"free-to-enter (unconfirmed)" -- not a confirmed claim). Two more were read as genuinely mixed
rather than free: Copenhagen Business School Summer University (tuition-free only for
already-enrolled/exchange categories; a current 14-18-year-old would apply through a paying
category) and Freie Universität Berlin SommerUNI (on-site courses ~EUR 10/day; "a small number
of online courses are free").

## Bucket B -- filled (2)

| Title | Filled cost | Evidence |
|---|---|---|
| Iowa Young Writers' Studio | `2500` | "$2,500 per session" -- both 2026 sessions same length and price. 2027 dates/pricing not yet posted; same staleness shape as the prior doc's LaunchX example. Independently confirmed by oryn-31's own separate read. |
| Parsons Summer Intensive Studies | `5875` | "tuition was $5,610 plus a $265 university fee" for 2026 -- both mandatory, so the true cost every student faces is their sum. Optional housing (+$2,180) excluded. Not tiered: there's no track/duration choice here, just two additive mandatory line items on one official page. 2027 dates/pricing not yet posted. |

## Bucket B -- the LaunchX correction

The task named LaunchX as the worked example of this bucket ("aid flagged true, cost never
captured... e.g. LaunchX's '$1,995+'"). On verification, that figure doesn't hold up as a clean
fill:

- The "$1,995" number traces to `docs/opportunity-thin-categories-2026-09-03.md`, where it's
  recorded as **"LaunchX Online BootCamp | Starts at $1,995"** -- a floor price for one specific
  track, not the programme as a whole (this row's own description covers "online and in-person
  (San Diego)" broadly).
- A separate, more rigorous, primary-sourced research record for this exact row
  (`data/research/opportunities/s6a_turkeyelig_batch1.jsonl`, fetched directly from
  `launchx.com/admissions/cost`, dated 2026-08-27) found a **$250 international surcharge** for
  non-US students on top of the base price, and explicitly recorded: *"Base program cost itself
  not confirmed this session (only the international surcharge) -- a student's total real cost
  is not yet fully known."*

So LaunchX is a program with at least two tracks at different prices, a "starts at" floor
rather than a firm number for the cheapest of them, and this session's own most careful look at
it says the base cost is unconfirmed. That's the tiered/uncertain shape the task's own
instruction says not to force into one column -- it just happens to be the instruction's own
example. Not filled; moved to the tiered/multi-track list below.

## Bucket B -- documented, tiered/multi-track, not filled (7)

Real, known prices exist for all seven, but each has more than one correct value depending on
track, duration, or residential status -- collapsing to one number would mean picking a value
the source itself doesn't single out.

| Title | Known range/tiers |
|---|---|
| Interlochen Arts Camp | $2,125 - $10,500 by session length |
| NSLC Business & Entrepreneurship | $4,195 - $4,495 |
| NYLF Medicine & Health Care | $4,099 - $4,799 residential |
| Tisch Summer High School | $8,008 / $12,012 by track |
| RISD Pre-College (On-Campus) | $9,595 / $12,495 by track |
| UWC Short Courses | Course-by-course; official page states each course sets its own cost, no unified figure |
| LaunchX | "Starts at $1,995" (one track only) + $250 international surcharge; base cost unconfirmed even by this session's most rigorous look (see above) |

## Bucket B -- documented, pays the student, not a cost to fill (4)

These carry `financial_aid_available = true` but are fellowships/scholarships that pay money
*to* the student -- a null `cost` is already correct, not a gap:

- **Ashoka Young Changemakers** -- network/mentorship, no cost concept
- **Girl Up Project Awards** -- "Funding of up to $1,000 USD to deliver the applicant's own project"
- **Girl Up Global Teen Advisor Board** -- "$750 USD honorarium"
- **Türkiye Scholarships -- Bachelor's Degree Programme** -- government scholarship; its own
  official page didn't disclose stipend/tuition/housing figures, so even the aid *amount* is
  unconfirmed, let alone a cost to the student

## Bucket B -- documented, no price anywhere in evidence (19)

Read in full; none contain a stated price, tiered or otherwise. Genuinely a research backlog,
not a schema problem or a fill missed:

SEES Summer Intern Program, Nuffield Research Placements, Aggie STEM Overnight Camp (only the
separate day-camp track's price was captured -- $425+$75 deposit -- which is a different
program from this row's residential track), Boston University Tanglewood Institute, John Locke
Institute Courses, Johns Hopkins CTY Summer Residential, Northwestern NHSI "The Cherubs," NYU
Precollege Program (some courses "carry added lab or studio fees," no single figure), PROMYS,
SUMaC, Worldwide Youth in Science and Engineering (WYSE), Yale Young Global Scholars, Alpha Leo
Club, Geleceği Eşitle, Schoolhouse.world Tutor Certification, Genç UPSHIFT Sosyal Girişimcilik
Programı, Erasmus+ Youth Exchanges ("a **funded** multi-country youth exchange" -- suggestive of
no cost to the student, but "funded" is not the same claim as "free," and this pass only fills
what's stated, not what's implied), European Youth Parliament Türkiye.

## What this pass plus oryn-31's adds up to

Between the two hand-read passes tonight (this file's 258-row read plus oryn-31's independent
227-row read), the schema-unrepresentable count moved from "2 of 34 in the original sample" to
"23 of 258 across the full population" (2 from the sample + 21 more from oryn-31's non-sample
read, before this file's own 7 tiered Bucket-B rows are even added). That's no longer a couple
of edge cases -- it's a normal, recurring shape in this catalog, which is the evidence base the
founder's schema decision (a currency field, or a min/max range, alongside `cost`) should be
made against.

## Applying

```bash
psql "$DATABASE_URL" -f data/research/opportunity-cost-handread-bd-2026-09-03.sql
```

Every `UPDATE` re-guards on `status = 'active' and cost is null`, so a row already changed by
another lane before this runs will simply no-op rather than overwrite.
