# Caltech requirement research — staged, verified, not applied

CEO-assigned Gate F depth research: Caltech had zero requirement records anywhere in the
corpus or `requirement_research_queue` — never researched, unlike MIT (researched, blocked by
the source-authority gate). Confirmed live in `founder-blocked-backlog.md`'s target-set
decision that Caltech belongs in the pilot's ~40 (a real pilot-cohort student has it saved).

## Gate check, done first, per instruction

Caltech's undergraduate admissions content lives on `admissions.caltech.edu`, discovered by
navigating the live site rather than guessed from the name. `domainOf()` strips `www.`, and
`"admissions.caltech.edu".endsWith(".edu")` is true — this is a proper `.edu` subdomain, not a
separate domain the way `mitadmissions.org` is for MIT. `looksOfficial()` accepts it directly;
no `ADDITIONAL_OFFICIAL_DOMAINS` entry, and no change to `lib/acquisition/source-authority.ts`
(oryn-4e's territory), was needed. Confirmed by browsing the live site before writing any
record, not assumed from Caltech's `.edu` primary domain alone — the admissions content could
plausibly have lived on a separate marketing domain the way MIT's did, and didn't.

## What was researched

27 requirement records, `data/research/university-requirements/us_requirements_caltech_2026-09-01.jsonl`,
from four official pages (all under `admissions.caltech.edu`, all real text quoted from the
live page via the browser tool, not a WebFetch summary):

- **Application Requirements** — checklist (Common App/QuestBridge, $85 fee, two teacher
  recommendations one STEM/one Humanities, transcripts, mid-year report, SAT-or-ACT
  required, AP/IB scores), plus international-applicant specifics (definition, English
  proficiency exam policy, need-aware financial aid, mandatory English translation), plus a
  verification/rescission statement.
- **Academic Requirements** — Caltech's specific mandatory coursework (4 years math incl.
  calculus, 1 year each physics/chemistry, 4 years English, 2+ years history/social science)
  and its substitution policy for calculus/chemistry/physics (AP 5, IB 6-7, or a
  Schoolhouse.world course-challenge certification) when the course isn't available.
- **Standardized Tests** — SAT-or-ACT required; no ACT writing/science subscore requirement
  for fall 2027; a "bucket" system (individual subscores shown as a range above set
  thresholds, exact score only shown below them) rather than a single cutoff.
- **Supplemental Application Essays** — all five essay prompts (STEM interest, Scholarly
  Character, Scientific Drive, the "Fun Question," an optional academic short-answer), plus a
  mandatory AI-ethics-guidelines review before submission — a genuinely new requirement
  category this corpus hadn't recorded for any other institution yet.

**One flagged, unresolved ambiguity, recorded rather than silently picked**: the Academic
Requirements page states its calculus/chemistry/physics substitution policy is "For in-coming
fall 2026 first-year applicants" with "no exceptions," while the Standardized Tests and
Supplemental Essays pages both explicitly say "fall 2027." Caltech's own page may simply not
have been updated to the next cycle's language yet — or the substitution policy may genuinely
differ by cycle. Recorded as `cycle_year: 2026` with a `limitations` note spelling out the
open question, rather than assumed to carry forward to 2027 unchanged. This is exactly the
same shape as the Fall-2026-labeled-deadline inconsistency found on Caltech's Standardized
Tests page during this same pass (out of scope for a requirements file, not recorded) — worth
someone re-checking this specific page closer to the real fall 2027 cycle.

## Verified against the real ingest logic — not applied

`scripts/ingest-university-requirements-batch.ts` (the existing write-nothing dry-run tool)
needs `SUPABASE_SECRET_KEY`, absent from this worktree's `.env.local`. Rather than skip
verification, wrote a throwaway script (not committed — lived in this session's scratchpad,
now discarded) that imports the real, unmodified `decideRequirementIngestion` from
`lib/requirements/ingest.ts` directly and runs it against all 27 records with Caltech's real
university row (id, name, country, website — queried live, zero aliases, zero existing
`university_requirements` rows) as the only candidate. Zero network writes; the only I/O was
reading the local JSONL file and one earlier read-only Supabase query for Caltech's own row.

**Result: 27 of 27 decide `accepted`.** Zero `unresolved_university`, zero `not_ingestible`,
zero `malformed_source`, zero `duplicate`.

**Stopped here, as instructed.** The records exist in the corpus and are verified against the
real decision logic; nothing has been written to `requirement_research_queue` or
`university_requirements`. Running the real ingest script with `--apply` (which needs the
secret key this worktree doesn't have, and would be a live write regardless) is the next step,
for whoever holds that authority.
