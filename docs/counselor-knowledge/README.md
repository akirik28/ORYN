# Counselor knowledge base

Distilled admission-system rules for the AI advisor (Phase 8), synthesised 2026-08-22 from the
2,200+ requirement/deadline records in `data/research/university-requirements/` and the
country-system research in `docs/research/admissions-systems/`. One document per country ORYN has
real coverage of. These are **the rules a good human counselor knows without looking them up** —
not a data dump; the records themselves remain the store of record for ingestion.

## Evidence tiers — the advisor must distinguish what it knows from what it believes

Every claim in these documents is labelled with one of two tiers:

- **VERIFIED** — backed by a sourced corpus record (`REQ-…`/`DL-…` id cited inline, from
  `data/research/university-requirements/*.jsonl`). These were fetched from official pages,
  carry `source_url` + `retrieved_at`, and passed the research lanes' verification discipline.
  The record id is the provenance pointer: look it up for the verbatim text, source URL, and
  caveats (`limitations` / `researcher_notes`).
- **SYSTEM-LEVEL BACKGROUND** — from the R3.1 country-system docs
  (`docs/research/admissions-systems/<country>.md`). Researched against an official-sources-first
  standard, but some findings there are secondary-corroborated rather than fetch-verified
  (several primary sources blocked automated fetch — ucas.com, anabin, education.gouv.fr among
  them). Sound for explaining *how a system works*; before stating a specific number, date, or
  named-university policy from this tier as fact to a student, prefer a VERIFIED record or say
  it needs checking.

When the advisor cannot find a VERIFIED basis for a specific claim, the honest answer is
"check the university's page" — never a confident guess. Unknown is a valid result
(Phase 68; RULE-ADMISSIONS-005: missing evidence and a negative finding are different states).

## Conflicts are recorded, never silently resolved

Where two official sources disagree, the corpus keeps both under `CONFLICTING_EVIDENCE` and these
documents name the conflict instead of picking a side. The advisor must present such facts as
disputed ("the university's own pages disagree; verify directly") rather than choosing the
newer-looking page — the DE/NL lane showed no resolution heuristic generalises safely.

## Cross-cutting facts that affect every country

### The January 2026 TOEFL rescale (VERIFIED — REQ-2026-08-21-4001/4002/4003, source: ETS)

- Effective **21 January 2026**, TOEFL iBT moved to a **1–6 band scale** (0.5 increments).
- The new overall is the **average** of section scores; the old overall was the **sum** — the two
  are not interconvertible by arithmetic.
- For two years ETS also prints a **comparable 0–120 overall** on score reports, but does **not**
  restate section scores on the old 0–30 subscales.
- Consequence: any old-scale threshold with **per-section minimums** (e.g. "22 in Writing") is
  **unsatisfiable by any report issued after the cutover** — found live at Glasgow
  (REQ-2026-08-21-4005, NEEDS_REVIEW) and Boğaziçi (see `turkey.md`). Edinburgh has already
  republished on the new scale ("total 4.5, 4.0 per component", REQ-2026-08-21-4004).
- The advisor must never numerically compare a student's TOEFL score against a threshold without
  knowing which scale each is on. From January 2028 (dual reporting ends) every unconverted
  legacy threshold becomes unmeetable. Full analysis:
  `docs/research/university-requirements/scalar-thresholds-are-not-enough.md`.

### Scalar thresholds are not enough (research finding, same doc)

Three requirement shapes make a bare number-vs-number check **confidently wrong**: unversioned
test scales (above), **recency rules** (Edinburgh: maths qualification ≤ 2 academic years before
entry; Koç: test scores valid 2 years while diploma grades never expire), and **named exclusions**
(Koç rejects superscored SATs; Edinburgh rejects IELTS One Skill Retake and TOEFL MyBest). A
numerically qualifying score can still be rejected on provenance or age. When any of these apply,
the honest verdict is "needs manual review", not met/not-met.

### Never convert grades across systems

Grades stay on their native scale (IB points as IB points, A-levels as letters, TR-YÖS as
TR-YÖS). No universal conversion exists; the only legitimate exceptions are narrow, named,
purpose-bound ones (RULE-ADMISSIONS-004). ORYN's code already refuses cross-system conversion.

### Source-authority footnote

Many VERIFIED records cite pages on official-but-unconventional domains (mitadmissions.org,
ets.org, studielink.nl…) that the ingestion gate's `looksOfficial()` currently rejects
(`source_authority_passes_gate: false`). That flag is an ingestion-pipeline limitation, **not**
a statement about the source's authority — see
`docs/research/university-requirements/source-authority-gap.md`. Do not read it as "unofficial".

## Files

One `<country>.md` per covered country, all complete:

- [`united-states.md`](./united-states.md) — ED/REA binding semantics, per-institution test-optional
  variance, financial-aid variance, the year-offset cohort-labeling trap.
- [`united-kingdom.md`](./united-kingdom.md) — Oxbridge's earlier deadline/admissions-test/
  interview track, the predicted-grade conditional-offer mechanic, per-institution TOEFL-rescale
  and test-provenance exclusions.
- [`turkey.md`](./turkey.md) — domestic YKS as algorithmic placement with zero holistic channel,
  TR-YÖS-only high-demand programmes, quota splits by credential type.
- [`germany.md`](./germany.md) — DSD≠academic-recognition (this package's highest-stakes finding),
  Studienkolleg track gates, uni-assist's three deference relationships.
- [`netherlands.md`](./netherlands.md) — the Studielink undated-statutory-deadline finding,
  per-university Turkish-diploma acceptance variance, VWO's four profielen as hard gates.
- [`france.md`](./france.md) — the Parcoursup-vs-DAP platform split by diploma track and residence,
  Sciences Po's after-the-fact annual pass mark.
- [`italy.md`](./italy.md) — numerus clausus as ranking-against-quota not threshold, OFA's dual
  hard-gate/diagnostic role, the split 2025/26 Medicine reform.
- [`spain.md`](./spain.md) — the sequential homologación→acreditación process, UNEDasiss's numeric
  grade formula, nota de corte as a floating retrospective floor.
- [`switzerland.md`](./switzerland.md) — four coexisting selection mechanisms, the Turkish-applicant
  split with ETHZ's exam-required-regardless exception, per-institution teaching language.
- [`ireland.md`](./ireland.md) — CAO vs. non-EU/direct as two fully parallel systems with opposite
  evidence models, CAO points as competitive outcome not published minimum.
- [`canada.md`](./canada.md) — provincial (not national) centralization, McGill's four-way
  transcript evaluation by applicant origin, Waterloo's AIF-replaces-essays model.

Each document leads with its highest-stakes finding, marks every claim VERIFIED (corpus record id)
or SYSTEM-LEVEL BACKGROUND, and flags open research gaps explicitly rather than filling them with
inference. Two documents (Germany, Netherlands) were corrected mid-pass after a parallel
conflicts-verification lane closed several originally-flagged `CONFLICTING_EVIDENCE` records —
see each document's own history for what changed and why.
