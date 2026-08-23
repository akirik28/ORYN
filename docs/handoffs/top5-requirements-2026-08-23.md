# Top-5 requirement/deadline sourcing — session-continuity handoff (2026-08-23)

Assigned by ORYN-CEO to close DATA's live-measured gap: `university_requirements`/
`university_deadlines` at 0 rows for these 5 universities despite existing
`university_programs` coverage (153–202 programmes each, except Warwick — see below).
Scope fixed by the CEO: USC, University of Warwick, Purdue University, Durham University,
Ankara Üniversitesi — requirement + deadline facts only, official-source-first per
`AGENTS.md` §7. **Written mid-package on explicit founder instruction** ("persist what you
have before continuing") so partial progress survives a session interruption — this is not
a closeout, work continues after this commit.

## Live-DB identity check done before research started

Queried `oryn-qa-scratch` directly (not assumed):

| University | `university_id` | `req_count` | `deadline_count` | `programme_count` |
|---|---|---|---|---|
| University of Southern California | `a878ed43-5683-4838-912c-242e0aba6dca` | 0 | 0 | 202 |
| University of Warwick (**canonical**) | `0b204add-2507-45b0-85f4-917e725b16c2` | 0 | 0 | 190 |
| Purdue University | `f00117b8-dd32-451b-836e-84f246d3b0c5` | 0 | 0 | 163 |
| Durham University | `03c11cb6-b1b8-4c06-8377-5519fec553aa` | 0 | 0 | 162 |
| Ankara Üniversitesi | `4a9446cc-5391-45a9-8b68-39d0531e9246` | 0 | 0 | 153 |

**Duplicate caught before research started**: `universities` has a second Warwick row,
`ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5` ("The University of Warwick", 0 programmes),
`duplicate_status='superseded'`, `superseded_by_id` pointing at the canonical row above.
All Warwick records in this batch target the canonical id only.

## Status by university

- **USC — done at this pass's depth.** 2 requirement records (standardized testing:
  test-optional; English proficiency incl. the TOEFL rescale trap) + 3 deadline records
  (Early Action, the new Fall-2027-only university-wide Early Decision, Regular
  Decision/performing-arts). All `official_primary` (`admission.usc.edu`,
  `provost.usc.edu`).
- **Warwick — done at this pass's depth.** 1 requirement record (English proficiency,
  3-band A/B/C structure) + 2 deadline records (2026-entry UCAS date, already historical by
  retrieval date; 2027-entry UCAS date sourced from `ucas.com` since Warwick's own page
  hadn't republished it yet).
- **Purdue — done at this pass's depth.** 2 requirement records (testing policy — Purdue's
  own "test expected" framing, distinct from optional/required; English proficiency, same
  TOEFL rescale boundary as USC) + 2 deadline records (Early Action/priority, Regular
  Decision).
- **Durham — done at this pass's depth.** 2 requirement records (A-level general band
  A*A*A–BBB with equivalence tables; a genuine 2027-entry-specific IB point-composition
  change found in a table footnote) + 1 deadline record (UCAS equal-consideration, national
  2027 date via `ucas.com` since Durham's own page states it in evergreen terms without a
  year).
- **Ankara Üniversitesi — done at this pass's depth, all 5 universities in scope now
  covered.** The exam-score table and application announcement were genuinely served as
  linked PDFs, not static HTML (as flagged at the prior checkpoint) — located both PDF URLs
  in the wrapper pages' raw HTML and extracted them directly with `pypdf`. 3 requirement
  records (general TR-YÖS/IB/ABITUR/A-Level/TQDK-DİM/WASSCE-WAEC/SAT/Kyrgyzstan-ORT exam
  equivalency table with per-exam minimum scores; a second, structurally distinct
  elevated-threshold TR-YÖS-only table for 21 named competitive programmes — Medicine,
  Dentistry, Computer Engineering, Law, etc., minimums 275–440 depending on programme tier;
  a Turkish-language-proficiency requirement that applies even to English-medium
  programmes, TÖMER/Yunus Emre certificate or a 2-year grace period) + 1 deadline record
  (2026-2027 international-student application window, 22 May 2026 09:30 – 26 June 2026
  17:00, results/registration dates explicitly "to be announced later" by the university
  itself — recorded as unknown, not estimated). All `official_primary`
  (`isoidb.ankara.edu.tr` PDFs).

## Two defect classes recurring across this batch, worth flagging generally

1. **The ETS TOEFL rescale (21 January 2026 boundary)** — appears identically at USC and
   Purdue, both with the same before/after split and the same odd-looking post-boundary
   numbers (e.g. Purdue "4.5... 4.0 in each section" — a genuinely different scale, not a
   typo). Matches the same defect class multiple prior lanes (DE-NL-REQUIREMENTS,
   US-REQUIREMENTS) already flagged. Any future US/UK requirements pass should expect this
   split by default, not treat it as an anomaly per-institution.
2. **UK institutions frequently don't publish next-cycle dates on their own site until
   later, while `ucas.com` already has the national date** — both Warwick and Durham hit
   this for 2027 entry. `ucas.com`'s equal-consideration-deadline announcement pages are a
   legitimate `official_primary` fallback for this one specific fact (the national date
   applies identically to every UCAS institution), not a downgrade to secondary-source
   confidence — recorded that way in both WAR0002 and DUR0001.

## Access notes

- `durham.ac.uk` (as opposed to `dur.ac.uk`) 403s on both WebFetch and a plain `curl`
  without a browser User-Agent; resolves fine with one. `dur.ac.uk` appears to be Durham's
  actual serving domain — worth checking which one is recorded as
  `university_official_domain` if/when this gets ingested.
- `admission.usc.edu`'s `/apply` and `/prospective-students/how-to-apply/` landing pages
  return sparse content to WebFetch (mostly nav text) — the actual deadline figures live on
  deeper sub-pages (`/test-optional-faq/`, school-specific admission sites) or were
  corroborated via WebSearch across multiple same-domain pages rather than one single raw
  fetch — see `limitations` field on the affected records rather than treating them as
  unverified.

## Files

- `data/research/university-requirements/top5_requirements_2026-08-23.jsonl` — 7 records
  (2 USC, 1 Warwick, 2 Purdue, 2 Durham).
- `data/research/university-requirements/top5_deadlines_2026-08-23.jsonl` — 8 records
  (3 USC, 2 Warwick, 2 Purdue, 1 Durham).
- `data/research/university-requirements/top5_requirements_ankara_2026-08-23.jsonl` — 3
  records (Ankara Üniversitesi).
- `data/research/university-requirements/top5_deadlines_ankara_2026-08-23.jsonl` — 1
  record (Ankara Üniversitesi).

**All 5 universities in scope now have at least one requirement and one deadline record.**
10 requirement + 9 deadline records total, all `official_primary`, all with `source_url` +
`retrieved_at` + `confidence`. Not yet ingested — this is the research handoff only, per
this lane's `RESEARCH` mandate (no live-DB writes). Follows the existing JSONL contract in
`docs/research-handoff-university-requirements.md`. Scope held to exactly the 5 named
universities per the CEO's package definition — no expansion attempted.
