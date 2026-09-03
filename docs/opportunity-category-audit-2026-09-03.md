# Opportunity category miscategorisation audit (2026-09-03)

Assigned after finding Breakthrough Junior Challenge filed as `competition` while its own
prize is a scholarship: audit the full catalog for records whose category is defensible but
not how the student who most wants them would search. Read-only against `oryn-qa-scratch`
(project `qtcvcflzxbuagvvwahhu`). No writes; the one relabel found is staged in
`data/research/opportunity-category-relabel-2026-09-03.sql`, not applied.

## Counts by category (421 total, 282 active)

| Category | Active count |
|---|---|
| summer_program | 139 |
| competition | 80 |
| research | 15 |
| internship | 8 |
| scholarship | 8 |
| student_program | 7 |
| online_program | 6 |
| volunteering | 6 |
| fellowship | 5 |
| entrepreneurship | 5 |
| conference | 2 |
| academic_program | 1 |

## Method

Started with every record carrying a live deadline (37 rows, deadline ≥ today), per the
instruction to prioritize records where the miscategorisation costs something concrete
right now. Then swept the full 282 active rows for category/content mismatches using two
passes: keyword cross-checks (description contains strong scholarship/fellowship/paid
language while filed under a different category) and a full manual read of every row in
the three smallest, easiest-to-fully-check categories that plausibly overlap with a bigger
bucket (`fellowship`, `internship`, `academic_program`) rather than trusting keyword
matches alone for those.

## The one clean case: Breakthrough Junior Challenge

**`competition` → should be `scholarship`. Deadline 2026-09-15, twelve days out. Staged,
not applied.**

This is different in kind from every other record below, not just in degree. Its own
official rules page (read live during the earlier scholarship-batch task, re-confirmed
here) names its prize **"$250,000 Post-secondary scholarship"** — the noun the organizer
itself uses for the prize is "scholarship," not "prize" or "award." A student searching
this catalog specifically for scholarships gets the 8 rows in the `scholarship` category
today; this one, carrying more real money than six of those eight, is not among them.

The relabel is genuinely lossy: `category` is a single column here, not a tag set, so
applying it means the record stops appearing under `competition` even though the entry
mechanism — a submitted video, judged competitively — is honestly still a competition too.
That tradeoff is named directly in the staged SQL's own header, not resolved quietly. The
alternative that avoids the tradeoff (a second category / tag array) is a schema decision,
not a relabelling job — see the closing section below.

## Genuinely dual-category, not wrong — the schema forces one axis to win

Everything else this sweep found shares Breakthrough's *shape* (real content that would
reasonably be searched under a second category) without sharing its *stakes* — none carry a
live deadline, and none hide money or a route a student can't already find under the
category the record currently has.

**Research-shaped work filed as `summer_program` or `internship`, not `research`:**
- **JAX Summer Student Program** (`summer_program`) — its own description opens "A fully
  funded, ten-week residential **research fellowship**" and pays every accepted student a
  $7,500 stipend for mentored genetics/genomics research. It is simultaneously a genuine
  *programme* — co-curricular training, weekly Journal Club, professional development — which
  is exactly what `summer_program` means. Not a mislabel; a record that is honestly both.
- **Nuffield Research Placements**, **Partners for the Future** (`internship`) — both are
  literally named/described as research placements (hands-on research alongside working
  researchers), and both would sit just as naturally in `research` (15 existing rows,
  several of which are the same shape — e.g. UCSB Research Mentorship Programs).
- **Simons Summer Research Program**, **Stanford Anesthesia Summer Institute** (both
  `summer_program`) — both describe themselves in their own text as a "research
  apprenticeship" / "summer internship" respectively, while structurally being cohort-based
  summer programmes with a fixed schedule.

**Competition-shaped opportunities whose top prize is itself a scholarship, filed as
`competition`, not `scholarship`:**
- **Scholastic Art & Writing Awards** — "National Medalists are eligible for scholarships
  of up to $12,500." Judged the same way as Breakthrough and decided the opposite way: here
  the scholarship is a *downstream* prize for a small subset of winners of an otherwise
  ordinary judged competition (entry fees, regional structure, 20+ categories) — the
  competition is the primary, applied-for thing; the scholarship is a consequence of
  winning, not the thing itself. Breakthrough's own copy makes the scholarship the
  *definition* of the prize; Scholastic's makes it a *benefit* of winning. Left as
  `competition`.
- **Diamond Challenge** — "$12,000 prizes." Same reasoning, same conclusion: a pitch
  competition whose top prize happens to be cash, not a scholarship programme with a
  competitive entry mechanism.

**Checked and confirmed correctly filed, not miscategorised despite surface-level keyword
matches:**
- International Journal of High School Research, STEM Fellowship Journal — both mention
  "scholarship"/"fellowship" only in the context of a *fee waiver* for the journal's own
  publication charge, or as part of the organisation's proper name. Neither is a funding
  award reaching the student; both correctly sit in `research`.
- All 5 existing `fellowship` rows (Three Dot Dash Global Teen Leaders, BRI Student
  Fellowship, TechGirls, Ashoka Young Changemakers, Girl Up Project Awards) read
  individually — none look mis-filed; the category is internally consistent.
- All 8 existing `internship` rows read individually — SEAP, Genesys Works, SHIP, and ASSIP
  are unambiguous paid internships/apprenticeships; InvestIN and Venture & Tech Summer
  Program are commercial "academy"-style programmes that nonetheless contain real
  internship-shaped components (VTSP's own description lists "Internship Projects" as a
  named component) — defensible where filed.
- The single `academic_program` row (Pre-College Program Virtual Fairs) is correctly filed
  — an event/fair, no better-fitting category exists for it.

## What this means for the assignment's own question

**The finding is "single-valued," not "wrong," for nearly everything this sweep surfaced.**
Breakthrough is the one genuine exception — and it is the exception specifically *because*
its own official source makes "scholarship" the literal, primary name for what a student
receives, not an inference this pass made by reading between the lines the way it had to
for JAX or Nuffield. Everything else recorded above is real, worth knowing, and is a case
for a second axis (a `secondary_category` column, or a `tags` array a student could filter
by) — not a case for eight more one-off relabels that would each just move the same
single-column tradeoff from one wrong bucket to another.

**This also answers the "ceiling" question directly, the same way the scholarship-research
task did last time:** the ceiling on *clean, deadline-carrying, single-column-relabel-worthy*
miscategorisation in this catalog is 1. That's a real number, checked from every angle this
pass had time for (live-deadline sweep first, then keyword cross-checks across every
category, then a full manual read of the three smallest overlap-prone categories) — not a
number this pass stopped short of.
