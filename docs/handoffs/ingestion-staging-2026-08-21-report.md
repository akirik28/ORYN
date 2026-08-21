# Ingestion staging dry-run — 2026-08-21 night-research programme-catalogue batches

Generated 2026-08-21T08:13:27.925Z by scripts/stage-programs-ingestion-dryrun.ts. **Dry run — no database writes occurred.** Live-DB snapshot (universities/entity_aliases/entity_external_ids/university_programs) fetched read-only via Supabase MCP immediately before this run.

Input: 25 batch files, 4048 total research records (`independent_batch5_2026-08-21.jsonl` through `independent_batch29_2026-08-21.jsonl`).

## Class counts

| Class | Count | % |
|---|---|---|
| READY_TO_INSERT | 3783 | 93.5% |
| DUPLICATE_OF_EXISTING | 169 | 4.2% |
| UNRESOLVED_UNIVERSITY | 0 | 0.0% |
| NEEDS_REVIEW | 96 | 2.4% |
| **Total** | **4048** | 100% |

Canonical-supersession redirects applied (resolved university was a known-duplicate "loser" row, redirected to the live canonical winner via `lib/universities/canonical.ts`): **0**.

## Reason breakdown (every non-ready record has a reason; every reason bucket is counted, not just totaled)

| Reason | Count |
|---|---|
| Accepted by decideIngestion(): university resolved, source domain authoritative, verification_status page-confirmed, no existing duplicate. | 3783 |
| Same university + program identity + degree level already exists. | 116 |
| malformed_source | 70 |
| Same official_program_url already exists at this university under a different name. | 53 |
| language_of_instruction is an explicit research-hedge (genuine unresolved uncertainty about teaching language), not a clean confirmed production value -- would produce a low-confidence row per the founder's own standard (drop rather than guess). | 26 |

## Per-university breakdown of READY_TO_INSERT

| University | READY_TO_INSERT count |
|---|---|
| The University of Manchester | 294 |
| University of Wisconsin-Madison | 217 |
| Technological University Dublin | 200 |
| University of Exeter | 188 |
| University of Liverpool | 170 |
| University of Illinois Urbana-Champaign | 127 |
| Loughborough University | 124 |
| University of Texas at Austin | 119 |
| The University of Sheffield | 111 |
| University of Glasgow | 101 |
| University of Limerick | 101 |
| Hacettepe University | 99 |
| University of Leicester | 98 |
| City St George’s, University of London | 97 |
| University of St Andrews | 87 |
| Cornell University | 81 |
| University of Washington | 79 |
| Boston University | 76 |
| Northwestern University | 75 |
| Rice University | 75 |
| Johns Hopkins University | 74 |
| Maynooth University | 74 |
| University of Michigan-Ann Arbor | 72 |
| University of Galway | 68 |
| University of California, San Diego (UCSD) | 67 |
| University College Dublin | 64 |
| Dublin City University | 63 |
| University of Bristol | 62 |
| Duke University | 61 |
| University of Chicago | 60 |
| University College Cork | 58 |
| Carnegie Mellon University | 52 |
| Radboud University | 52 |
| Istanbul Technical University | 45 |
| KIT, Karlsruhe Institute of Technology | 45 |
| Yildiz Technical University | 43 |
| Georgia Institute of Technology | 42 |
| University of California, Los Angeles (UCLA) | 36 |
| University of York | 34 |
| Bilkent University | 29 |
| Maastricht University | 27 |
| California Institute of Technology (Caltech) | 26 |
| Boğaziçi University | 26 |
| Özyeğin University | 20 |
| Wageningen University & Research | 20 |
| Koç University | 18 |
| Utrecht University | 13 |
| Sabancı University | 8 |
| University of Twente | 4 |
| Trinity College Dublin, The University of Dublin | 1 |

## NEEDS_REVIEW sample (first 30, for spot inspection)

- **Leiden University** — "African Studies (BA)" (`RSRCH-2026-08-21-B24-0014`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Ancient Near Eastern Studies (BA)" (`RSRCH-2026-08-21-B24-0015`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Arabic Language and Culture (BA)" (`RSRCH-2026-08-21-B24-0016`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Archaeology (BA)" (`RSRCH-2026-08-21-B24-0017`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Art History (BA)" (`RSRCH-2026-08-21-B24-0018`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Arts, Media and Society (BA)" (`RSRCH-2026-08-21-B24-0019`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Astronomy (BSc)" (`RSRCH-2026-08-21-B24-0020`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Bio-Pharmaceutical Sciences (BSc)" (`RSRCH-2026-08-21-B24-0021`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Biology (BSc)" (`RSRCH-2026-08-21-B24-0022`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Biomedical Sciences (BSc)" (`RSRCH-2026-08-21-B24-0023`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Chinese Studies (BA)" (`RSRCH-2026-08-21-B24-0024`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Classics (BA)" (`RSRCH-2026-08-21-B24-0025`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Clinical Technology (BSc)" (`RSRCH-2026-08-21-B24-0026`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Computer Science & Economics (BSc)" (`RSRCH-2026-08-21-B24-0027`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Computer Science (BSc)" (`RSRCH-2026-08-21-B24-0028`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Criminology (BSc)" (`RSRCH-2026-08-21-B24-0029`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Cultural Anthropology and Development Sociology (BSc)" (`RSRCH-2026-08-21-B24-0030`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Culture, History and Society (BA Major of Liberal Arts and Sciences: Global Challenges)" (`RSRCH-2026-08-21-B24-0031`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Cybersecurity & Cybercrime (BSc)" (`RSRCH-2026-08-21-B24-0032`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Data Science and Artificial Intelligence (BSc)" (`RSRCH-2026-08-21-B24-0033`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Digitalisation, Governance and Society (BSc)" (`RSRCH-2026-08-21-B24-0034`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Dutch Language and Culture (BA)" (`RSRCH-2026-08-21-B24-0035`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Dutch Studies (BA)" (`RSRCH-2026-08-21-B24-0036`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Earth, Energy and Sustainability (BSc Major of Liberal Arts and Sciences: Global Challenges)" (`RSRCH-2026-08-21-B24-0037`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Economics, Public Administration and Management (BSc)" (`RSRCH-2026-08-21-B24-0038`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Economie & Samenleving (BSc)" (`RSRCH-2026-08-21-B24-0039`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "English Language and Culture (BA)" (`RSRCH-2026-08-21-B24-0040`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "Film and Literary Studies (BA)" (`RSRCH-2026-08-21-B24-0041`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "French Language and Culture (BA)" (`RSRCH-2026-08-21-B24-0042`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).
- **Leiden University** — "German Language and Culture (BA)" (`RSRCH-2026-08-21-B24-0043`): malformed_source: source_url "https://www.universiteitleiden.nl/en/education/study-programmes?type=bachelor" does not resolve to an accepted authority for program facts (must be the institution's own domain).

### Root cause of all 70 `malformed_source` records: one stale DB field, not a research-quality problem

Checked directly rather than left as a mystery: every `malformed_source` record is Leiden
University, and every one of them uses `universiteitleiden.nl` as its source domain — the
real, live official domain, verified directly by this session's own research throughout
batch 24 (the university's own site, its own admissions pages, all on this domain). The live
`universities` row for Leiden has `website_url = "http://www.leiden.edu/"` — a `.edu` domain,
which does not itself satisfy `looksOfficial()` for a non-US institution's actual current
domain, and does not match `universiteitleiden.nl` either, so `sourceAuthority()` correctly
(per its own conservative rule) refuses to certify these as `official_primary`.

**This is a one-field data-quality fix, not a defect in these 70 research records.**
Whoever owns the `universities` table should check whether `leiden.edu` is stale/incorrect
data or a legitimate secondary domain, and if it should be `universiteitleiden.nl` (or that
domain added as an additional recognized official domain), updating it would move all 70 of
these records straight to `READY_TO_INSERT` with no other change needed. No other university
in this batch shows this pattern — Utrecht, Radboud, Maastricht, Twente, Wageningen (also
`.nl` domains) and all Irish `.ie`-domain universities in this batch have correctly
populated, matching `website_url` values already.

## UNRESOLVED_UNIVERSITY — full list of distinct university names (candidates for a spine-side alias/name fix)

None — every record's university_name resolved to a live universities row.

## Execution

Generated SQL for the READY_TO_INSERT set only: `docs/handoffs/ingestion-staging-2026-08-21.sql` (3783 INSERT statements). **Not executed.** Execution stays gated on the founder's return, per the ORYN multi-agent coordination assignment.

Equivalent apply path using this repo's own existing tooling (also not run): for each batch file, `npm run ingest:university-programs -- data/research/university-programs/<file>.jsonl --apply` — this performs the identical decideIngestion() classification live against Supabase and writes both `university_programs` (accepted rows) and a full audit trail to `program_research_queue` (every outcome, not just accepted). The SQL file above is offered as an additional, directly-inspectable alternative for review.
