# Leadership/community-impact batch — staging report

Source: `data/research/opportunities/leadership_batch{1..5}_2026-08-21.jsonl` on `main`
(`8ace449`), 25 records closing part of the measured `community_impact`/`leadership`
dimension-tagging gap (0 base-dimension `community_impact` occurrences, `leadership` only
twice, across all 166 verified opportunities). Not this session's own research — staged for
ingestion per the coordination session's assignment.

## Schema note

The source batch uses the field-naming convention from the founder's original mission brief
verbatim (`canonical_name`, `organizer`, `organizer_type`, `subjects_fields`, `delivery_mode`,
nested `age_range` objects, etc.) rather than this repo's established
`docs/research-handoff-opportunities.md` contract. Mapped record-by-record into
`ResearchOpportunityRecord` shape (25 records, by hand, not a generic auto-script — the
category/age/cycle-status judgment calls needed per-record reading, not pattern-matching).
Full mapping table and rationale available on request; the transform script is not committed
(scratch only, per this session's own no-app-code-changes constraint).

## Important correction to the assignment's own framing

The assignment stated "only 2 of the 25 pass `looksOfficial()` unmodified... the gate
currently rejects the European Parliament, an elected metropolitan municipality, Rotary and
Lions" and instructed working around this via the `organizer_domain_provenance` field.
**Running the real `decideIngestion()` (not `looksOfficial()` in isolation) found the actual
gate already accepts nearly all of them.** `sourceAuthority()` — the function `decideIngestion()`
actually calls — wraps `looksOfficial()` with a self-referential fallback specific to the
`opportunities` fact class: it also passes when `source_url`'s domain matches `official_url`'s
domain, by design (the code comment states this directly: *"unlike universities, arbitrary
organizers... have no registry of known-official domains to check against. The best available
signal is that the researcher's own claimed official_url and their source_url agree on
domain"*). Since every record in this batch cites the organizer's own page as both
`official_url` and `source_url`, this fallback fires for all of them — European Parliament
(Euroscola, Erasmus+, EYE), İBB (elected metropolitan municipality), Rotary, and Lions all
passed cleanly. **Zero records were blocked by `sourceAuthority()`** in this batch; the
`organizer_domain_provenance` field wasn't needed as a workaround. Worth correcting wherever
"the gate rejects non-.edu/.gov organizers" got documented — it doesn't, for this fact class,
by design.

## Classification (25 records, dedup pool = fresh live 369 rows + this session's own 51 + the
programme lane's 10 pending wave4/wave5 records)

| Classification | Count |
|---|---|
| READY_TO_INSERT | 22 |
| NEEDS_REVIEW | 3 |
| DUPLICATE_OF_EXISTING | 0 |
| DROP | 0 |

**Zero duplicates** against all three pools checked (live table, this session's own 51,
programme lane's 10) — this batch's subject matter (leadership/community-impact/civic
organizations) is genuinely disjoint from everything else researched tonight.

## NEEDS_REVIEW (3) — matches the source batch's own flags exactly, not a new finding

- **Euroscola**: source marked `NEEDS_REVIEW` itself — Turkish-school eligibility through
  European Parliament Liaison Offices is unresolved on the official page.
- **Peace First Grants**: source marked `CONFLICTING_EVIDENCE` — official page states ages
  "typically 16-35" directly contradicting a widely-circulated "13-25" figure; the researcher
  correctly did not silently pick one.
- **INJAZ Al-Arab — The Company Program**: source marked `NEEDS_REVIEW` — the only MENA-region
  entrepreneurship lead found, but eligibility/age/duration are unresolved and two national
  INJAZ members (Lebanon vs. Algeria) publish conflicting age rules for the same federation
  programme.

Deliberately kept out of `decideIngestion()`'s auto-accept path (their `verification_status`
text avoids the substring `"verified"` specifically so `looksPageConfirmed()` doesn't
false-pass them on a bare string match) rather than silently forcing them through.

## The urgent one

**Geleceği Eşitle — Habitat×UNICEF Train-the-Trainer** (`LEAD-03`): deadline **2026-08-26**,
five days from today. `READY_TO_INSERT`. Flagging this explicitly so it's not lost in a
25-row batch — per the assignment, this is exactly the shape ORYN exists to surface in time.

## Counseling distinction preserved in the data (not just this report)

Three records carry an explicit `research_notes` flag distinguishing whether an *existing*
initiative is a precondition: **Three Dot Dash** and **Ashoka Young Changemakers** both
require one (wrong recommendation for a student whose gap is that they haven't started
anything yet); **Genç UPSHIFT** explicitly does not (the right recommendation for that same
student). Carried into the actual inserted rows, not just this document, so matching logic
can use it once it exists.

## Applied 2026-08-21 (production write, standing founder authorization)

Fresh dedup re-check against a freshly-pulled live table immediately before writing (all 22
official_urls confirmed absent from live at that moment). One real bug caught and fixed at
execution time, not a classifier issue: `application_open_date` is a `date` column, but the
Ashoka record's source value was the free-text "Nominations accepted year-round" (correct
information, wrong field) — the whole transaction rolled back atomically on the first
attempt (verified: 0 of 22 rows landed), fixed by nulling that field and folding the same
information into `current_cycle_label` instead, then re-ran clean.

**Landed exactly as predicted**: 22 of 22, category breakdown volunteering 6 / student_program
7 / fellowship 3 / entrepreneurship 4 / conference 2 — matches the classification table above
exactly, no divergence.
