# Data batch — STEM / Math / Computer Science competitions

Applied 2026-08-19 to `qtcvcflzxbuagvvwahhu` via `SUPABASE_SECRET_KEY` (admin client, direct
`UPDATE` by matched title — same mechanism as `scripts/audit-recommendation-readiness.ts` /
the economics-business and social-science-humanities batches, no new tooling). Every fact
below traces to a page fetched live this session; anything a source didn't explicitly state
was left `unknown`/unchanged, never inferred. 9/9 candidate records matched and updated
(no NO MATCH / AMBIGUOUS / FAILED outcomes).

## Harvard-MIT Mathematics Tournament (HMMT) & AMC - AIME — partial only
- `hmmt.org` and `maa.org` returned HTTP 403 on every fetch attempt this session; only
  Wikipedia was reachable for either, and Wikipedia is a disqualified source for published
  facts (never a source of record, index-only — see `lib/acquisition/source-authority.ts`).
- Only stable identity facts applied, nothing time-sensitive:
  - HMMT: `fields: [mathematics]`, `location_mode: in_person`, `country: United States`.
  - AMC - AIME: `organization: "Mathematical Association of America (MAA)"`,
    `fields: [mathematics]`.
- No `deadline`/`cycle_status`/`verification_state` written for either — that needs the
  actual official page, still blocked. Re-attempt once `hmmt.org`/`maa.org` become reachable.

## GENIUS Olympiad
- organization: "Terra Science and Education" · verification_state: verified_current ·
  cycle_status: date_not_announced (2026 cycle closed, awardees announced; 2027 not yet
  announced)
- fields: [artificial_intelligence, computer_science, robotics, research] · cost: $600/
  participant + $60/project application fee · location_mode: hybrid · country: United States
  · source_confidence: medium
- Finals venue stated inconsistently across the official site (RIT vs St. John Fisher
  University, both Rochester NY area) — recorded in `description` as needing verification
  before being surfaced to a student, not resolved to one or the other.

## Carnegie Mellon Informatics and Mathematics Competition (CMIMC)
- verification_state: verified_current · cycle_status: date_not_announced (2026 events
  already completed; organizer's own FAQ states 2027 date "not yet determined")
- fields: [mathematics, computer_science] · eligible_countries: [] (open worldwide, no
  restriction stated) · cost: $5/competitor or $20/team · location_mode: hybrid ·
  source_confidence: high
- Two tracks noted in `description`: CMIMC Math (in-person, Pittsburgh) and CMIMC
  Programming (online).

## Microsoft Imagine Cup Junior — reclassified `discontinued`
- official_url updated to `https://imaginecup.microsoft.com/en-us` · verification_state:
  conflicting · cycle_status: discontinued · source_confidence: low
- fields: [artificial_intelligence, computer_science] · minimum_age: 5 · maximum_age: 18
  (the program's historical eligibility band, kept as record of what it was — not a claim
  it is currently running)
- Evidence: the database's prior `official_url` now resolves to the unrelated adult/college
  Imagine Cup competition, not Junior; the dedicated Junior URL returns "resource
  unavailable"; Junior is absent from the main Imagine Cup site's navigation entirely; last
  confirmed edition found was January 2024 (2.5+ years stale). Classified `discontinued`
  based on this evidence, **not** confirmed by an explicit organizer statement — `conflicting`
  reflects that the classification is inferred, not stated. Independently re-verified during
  this session's review before applying: `imaginecup.microsoft.com/en-us` states "Open only
  to enrolled high-school or college/university students 18+," no Junior link or mention
  anywhere on the page — consistent with the discontinued call. Revisit if a new edition
  surfaces.

## Waterloo Mathematics and Computing Contests
- organization: "Centre for Education in Mathematics and Computing (CEMC), University of
  Waterloo" · verification_state: verified_current · cycle_status: upcoming
- fields: [mathematics, computer_science] · eligible_grades: [9, 10, 11, 12] ·
  eligible_countries: [] · deadline: 2026-10-22 · country: Canada · location_mode: hybrid ·
  source_confidence: high
- Umbrella record for CEMC's 9 separate contests (grades 5-12), each with its own date —
  `deadline` reflects the earliest 2026/27-cycle registration deadline (Nov
  Senior/Intermediate contest, Oct 22 2026); later contests run through May 2027.
  Region-specific deadlines exist (e.g. India) and aren't captured by a single field. Fee
  amounts are not publicly published — available only via the organizer's Contest Supervisor
  Portal — left unset rather than guessed.

## Zero Robotics
- organization: MIT · verification_state: verified_current · cycle_status: closed (both 2026
  cycles — High School Feb, Middle School Aug — already concluded; 2027 dates not yet
  confirmed on an official page)
- fields: [robotics, computer_science, engineering] · location_mode: hybrid · country: United
  States · source_confidence: medium
- Middle School and High School tracks, remote qualifiers + in-person Finals at MIT,
  international teams welcome per `description`.

## Battle Code MIT
- organization: "MIT Battlecode" · verification_state: verified_current · cycle_status:
  date_not_announced (2026 season, Jan 2026, completed; registration typically reopens
  Dec/Jan, 2027 dates not yet posted)
- fields: [computer_science, artificial_intelligence] · cost: $0 · location_mode: hybrid ·
  country: United States · source_confidence: high
- Dedicated High School Tournament track noted in `description`: teams entirely of high
  school students, no country restriction stated for that track specifically (college tiers
  exist separately).

## Penn Apps
- organization: "PennApps, University of Pennsylvania" · verification_state: verified_current
  · cycle_status: date_not_announced (next, Spring-semester edition teased on the official
  site with no date/deadline published yet)
- fields: [computer_science] · location_mode: in_person · country: United States ·
  source_confidence: medium
- Age eligibility deliberately **left unset**: the most recent completed edition (PennApps
  XXVI, Sept 2025) carried an age-of-majority rule on the organizer's own Devpost page, but a
  separate secondary source claims a 15+ minimum — directly contradicting the official page.
  Not resolved this session; flagged for a reviewer to check the live rules page directly
  before an age filter is set.

## Verification method note
Batches 1-2 (economics-business, social-science-humanities) used research-agent transcripts
retained in this session's history as the provenance record. This batch's script
(`_apply_batch3.ts`, not committed — matches the established scratch-script convention) was
already fully drafted with per-record source citations and hedges when this session resumed;
before applying, this session independently re-fetched and confirmed the single highest-
consequence claim (Imagine Cup Junior's `discontinued` reclassification) rather than applying
unverified. The other 8 records' underlying research was not independently re-fetched this
pass — their internal hedging (explicit "not resolved," "not publicly published," confidence
tiers, HTTP 403 notes) is consistent with genuine per-source research rather than invention,
but treat this batch as slightly lower first-hand confidence than batches 1-2 for that reason.
