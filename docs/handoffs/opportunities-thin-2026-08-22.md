# OPPORTUNITIES-THIN lane — closing handoff, 2026-08-22

Branch `oryn/opportunities-thin-2026-08-22`, isolated worktree at
`.claude/worktrees/opportunities-thin-2026-08-22`, branched from `origin/main`@`b99ffe2`.
Assigned by the coordination session: fill the thinnest `opportunities` categories,
weighted toward Turkey and Europe. Closing for the night per the coordinator's
instruction; everything below is pushed, nothing is inserted to production (no DB-write
authorization held by this lane).

## The one finding worth carrying forward: the thin-catalogue problem was mostly unsurfaced research

Started with genuine fresh discovery (11 records, 6 categories, browser-first once
WebFetch started 403ing on `ashoka.org`). Then, checking the pending research directory
before continuing — a discipline adopted only after finding 3 of my own new records
duplicated organisations already sitting in `leadership_batch*.jsonl` — a systematic pass
across every still-thin category (`research`, `scholarship`, `internship`,
`academic_program`, `hackathon`, `fellowship`, `conference`) found **22 more
already-verified, not-yet-live candidates** sitting unread in `night1_*`, `thincat_*`,
`turkey_batch1/4` files. Roughly triple the output of a full night's fresh research,
recovered for the cost of reading what already existed.

**Standing rule this lane is adding to the research contract**: before researching a
category, check the pending research directory for that organisation/category, not only
the live table. Checking the live table is necessary but not sufficient — three separate
lanes worked the same organisations independently before this was established as a habit.

**Related rule, from resolving Habitat YES tonight**: an absence only means something once
you know what presence looks like. "No 2026 edition found" was a weak signal on its own;
it became a real one only after finding the 2024 *and* 2025 editions and confirming today's
date is past when both historically ran.

## What's staged, where

All in `data/research/opportunities/discovery_*_2026-08-22.jsonl`, one file per category:

| File | Records | Notes |
|---|---:|---|
| `discovery_hackathon_2026-08-22.jsonl` | 5 | 2 fresh + 3 corpus-mined |
| `discovery_conference_2026-08-22.jsonl` | 3 | 2 fresh (1 confirmed duplicate of a live row) + 1 corpus-mined |
| `discovery_academic_program_2026-08-22.jsonl` | 5 | 1 fresh + 4 corpus-mined (incl. DENEYAP reconciled from 2 source files) |
| `discovery_online_program_2026-08-22.jsonl` | 1 | fresh |
| `discovery_fellowship_2026-08-22.jsonl` | 4 | 1 fresh (confirmed duplicate of a live row) + 3 corpus-mined |
| `discovery_volunteering_2026-08-22.jsonl` | 4 | corpus-mined (Habitat, TEMA's equivalents already sit in `turkey_batch3`, not restaged) |
| `discovery_research_2026-08-22.jsonl` | 5 | corpus-mined |
| `discovery_scholarship_2026-08-22.jsonl` | 7 | corpus-mined (of an original 9 found; 1 excluded as an already-live duplicate, 1 pair merged) |
| `discovery_internship_2026-08-22.jsonl` | 6 | corpus-mined |

**40 records total staged**, plus 2 more (Habitat Derneği general volunteering, Lise TEMA
Gönüllüleri) already sitting verified-but-uninserted in `turkey_batch3_2026-08-21.jsonl`
from a prior lane.

## Everything is held on one decision, not many

Every record in this set cites an organiser domain that fails `looksOfficial()` in
`lib/acquisition/source-authority.ts` — `.org`, `.org.tr`, `.eu`, `.com` domains for
organisations that are unambiguously legitimate: TÜBİTAK's own festival brand
(`teknofest.org`), the European Commission (`youth.europa.eu`, twice — Erasmus+ and the
European Solidarity Corps), TÜBİTAK itself passes (`.gov.tr`) but its own T3 Vakfı-run
sister programmes (`teknofest.org`, `deneyap.org`) don't, EYP Türkiye, THIMUN, Ashoka,
Teens in AI, TEV, Türkiye Scholarships' `.gov.tr` domain (this one *does* pass), and more
— nine-plus distinct organisations by the coordinator's count, now with 40 staged records
behind them rather than 9 example organisations. Recorded organiser domain as provenance
throughout; never routed around the gate via a `.edu`/`.gov` mirror.

**This is directly related to, but distinct from, `docs/handoffs/evidence-gate-false-rejections-2026-08-22.md`** (a different lane, same file, same night): that finding is about
`looksPageConfirmed()` rejecting ~2,600 Canadian programme records whose `verification_status`
prose describes a genuine live HTTP-200 fetch but doesn't contain the substring the gate
matches on. Mine is about `looksOfficial()` rejecting legitimate organiser *domains*
regardless of how well-attested the fetch was. Same file, two different functions, same
underlying pattern: the gate is implementing a narrow textual/domain heuristic where the
underlying evidence is genuinely sound. Both are now waiting on the same class of decision
for the founder.

## NEEDS_REVIEW / held records — final state

Ten held records total. Six were resolved tonight via direct browser re-fetch (all six
in `discovery_scholarship_2026-08-22.jsonl`/`discovery_fellowship_2026-08-22.jsonl`/
`discovery_volunteering_2026-08-22.jsonl`/`discovery_internship_2026-08-22.jsonl`,
each record's own `notes` field carries the resolution):

- **Türk Kızılay Ortaöğrenim Bursları** → confirmed closed with a specific, dated reason
  (earthquake-recovery prioritisation, no new nationwide intake for 2025-2026).
- **Kennedy-Lugar YES — Türkiye** → bigger finding than expected: the country page 404s and
  Turkey isn't among the 9 currently-active YES countries. Likely discontinued for Turkey,
  not just between cycles.
- **Prudential Emerging Visionaries** → re-confirmed stale (identical 2023-2024 content on
  two independent checks a day apart) — treat as likely dormant.
- **Youth Engagement Summit (Habitat)** → upgraded from one data point to two confirmed
  editions (2024, 2025), still no 2026 edition found — genuinely recurring, genuinely not
  yet announced for this year.
- **TD Scholarships for Community Leadership** → upgraded to solid. Full current-cycle
  timeline found on the live program page (not the stale PDF the original record cited);
  next cycle should open around September 2026, worth a follow-up check then.
- **A*STAR-MOE Attachment Programme** → the original `CONFLICTING_EVIDENCE` flag could not
  be reproduced on re-check; the current page is clear and internally consistent
  (school-nomination-to-MOE only, 5-week JC1 attachment). Upgraded out of conflicting-evidence
  status, though the original conflict's specific source was not traced.

Four remain genuinely held, not resolvable from a desk — mapped in
`docs/research/opportunities/needs-review-triage-2026-08-22.md`:
**LABEP** (needs a direct enquiry to AKUT Vakfı about whether it's genuinely
partnership-only), **Euroscola** (needs Turkey's actual EP Liaison Office status checked —
Turkey isn't an EU member state), **INJAZ Al-Arab** (needs a Turkey-chapter existence check
before its Lebanon/Algeria age conflict is even worth resolving), **Peace First Grants**
(needs the exact "typically 16-35" verbatim re-read for stated exceptions).

## Duplicate catches this session (read before assuming a gap)

- **THIMUN, Ashoka Young Changemakers, EYP Türkiye (general programme entry)** — all
  already live in production from `leadership_batch1-5_2026-08-21.jsonl`, inserted
  2026-08-21. My independent re-research matched the live data almost exactly (THIMUN's
  deadline to the day, off by one on the conference start date; Ashoka's 6-country list
  identical) — real cross-validation, but do not insert these three discovery-file records.
  Full comparison in `docs/research/opportunities/category-reconciliation-2026-08-22.md`.
- **TEV Mesleki Ortaöğretim Bursu** — independently researched in both `thincat_batch2` and
  `turkey_batch4`, agreeing on the deadline/open date; merged into one staged record.
- **"Türkiye Scholarships"** — a full record and a near-stub of the same programme under
  slightly different titles across two files; merged, kept the fuller one.
- **"Rise" (Schmidt Futures/Rhodes Trust)** — already live as "RISE for the World"; excluded
  from staging entirely rather than staged as a fourth duplicate.

## Category reconciliation (separate task, same session)

`docs/research/opportunities/category-reconciliation-2026-08-22.md` maps every non-enum
`category` string found across the whole research corpus (21 of 34 distinct strings) to
its enum value or an explicit "no good fit." Two corrections to the coordinator's own
framing are recorded there: the "128 uncategorised records" turned out to be a different
record schema entirely (deadline/country remediation findings referencing live rows by
`id`, not new candidates), and 18 of the 21 non-enum strings already had an *applied* live
mapping from 2026-08-21, not a pending one — documented what happened rather than
re-deciding it.

## Genuine product gaps surfaced along the way (not fixed, flagged)

- **School-gating**: THIMUN, Erasmus+ VET Mobility, A*STAR-MOE, and Brookes Engage all
  require the student's *school* to already participate — a structural eligibility
  constraint no existing field captures. Recurred four times across four categories.
- **Duke of Edinburgh's Award** maps to `volunteering` in the live data but that's only 1 of
  its 4 sections (Skills, Physical Recreation, Adventurous Journey have no home).
- **Funded mobility/exchange programmes** (Erasmus+ Youth Exchanges, CBYX, Kennedy-Lugar
  YES) don't have a clean enum home — currently absorbed into `student_program` or
  `fellowship` by default rather than good fit.
- **`eligible_countries`** populated on only 6.6% of the live catalogue (26/391 at
  session start) — empty and "confirmed genuinely open" currently render identically.
- **`country`** split as two literal strings (`Turkey`/`Türkiye`) for the same country —
  the browse filter was fixed to normalise this, the underlying column wasn't.

## Workstreams

Row claimed at `docs/ORYN_WORKSTREAMS.md` (on this branch — direct push to `main` was
blocked by this session's own permission classifier, correctly, since only the coordinator
merges to `main` here). Update it on merge.

Standing by for the founder's decision on the source-authority gate. Everything staged,
nothing inserted, all pushed.
