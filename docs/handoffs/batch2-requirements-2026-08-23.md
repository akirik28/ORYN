# Batch-2 requirement/deadline sourcing — handoff (2026-08-23)

Third package in this session's throughput series (after top-5 and next-10, both already
ingested/pushed and not touched here). Same methodology: `AGENTS.md` §7 official-source
priority, `source_url`+`retrieved_at`+`confidence` per record, live-DB identity check before
research.

## Scope — asymmetric by design, per the CEO's package definition

- **UCL** — deadline-only (already had 10 requirement rows, 0 deadline rows). No requirement
  records added, per instruction.
- **MIT** — requirement-only (already had 2 deadline rows, 0 requirement rows). One
  testing-completion-deadline record was added alongside the requirement records because
  it's inseparable detail on the testing requirement itself (when tests must be completed
  relative to EA/RA), not a duplicate of MIT's existing application-deadline rows.
- **Brown, St Andrews, WashU St Louis, Cornell, University of Washington, RWTH Aachen,
  Boston University, Rice** — full-stack (both requirement and deadline needed), confirmed
  0/0 before research.

## Live-DB identity check done before research started

All 10 confirmed via direct query — canonical status and existing req/deadline/programme
counts matched the CEO's package definition exactly:

| University | `university_id` | pre-existing req/deadline | `programme_count` |
|---|---|---|---|
| University College London | `03c8faf1-4b30-47fe-b09e-8851b96c1f6e` | 10 / 0 | 429 |
| Massachusetts Institute of Technology | `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` | 0 / 2 | 55 |
| Brown University | `ff51f88e-e52d-4487-841a-aad28f4fe952` | 0 / 0 | 87 |
| University of St Andrews | `ccbc69f7-e322-483e-a2b1-11d7d43e377b` | 0 / 0 | 87 |
| Washington University in St. Louis | `a8a8c588-25f2-4d1e-b1be-57ea12ddc71f` | 0 / 0 | 84 |
| Cornell University | `5929571e-0644-408a-ba0a-1626d8e59670` | 0 / 0 | 81 |
| University of Washington | `ccd1db9c-6d3f-4d1d-af46-c415c20fc37e` | 0 / 0 | 79 |
| RWTH Aachen University | `cbbbed73-34f9-4cbf-abfc-2c0594bda8cd` | 0 / 0 | 77 |
| Boston University | `def5fb54-31b5-4104-bfc8-5149e7ce82e7` | 0 / 0 | 76 |
| Rice University | `c04ec920-0469-4c7b-8797-28012b00a552` | 0 / 0 | 75 |

**Identity traps caught and avoided**: a superseded "UCL" row (`cf8adcbd...`, 0 programmes)
and a superseded "Massachusetts Institute of Technology (MIT)" row (`ba3a30b2...`, 0
programmes) both exist in the live DB alongside the canonical rows above — both targeted
correctly.

## Coverage — 10 requirement + 11 deadline records

Every one of the 10 universities named in the CEO's package now has coverage matching its
specific scope (UCL: deadlines only; MIT: requirements + 1 tightly-scoped testing-deadline
detail; the other 8: both).

**Confidence spread, same honesty standard as the two prior packages** — not presented
uniformly:
- High confidence, directly fetched with verbatim quotes: UCL (both records), MIT (both
  requirement records + the testing-deadline record), Brown (requirement), Cornell
  (requirement + deadline), University of Washington (requirement + deadline), Boston
  University (requirement), WashU (deadline).
- Medium confidence, WebSearch-synthesized from the correct official domain but not
  independently raw-fetched: St Andrews (both records), WashU (requirement), Brown
  (deadline), Boston University (deadline), Rice (both records), RWTH (deadline).
- Low confidence / `NEEDS_REVIEW`: RWTH's requirement record (the official Bachelor's page
  was fetched directly but didn't itself state the TOEFL/TestAS specifics found via
  WebSearch of Master's-level pages — flagged as possibly not identical at Bachelor's
  level).

## Recurring patterns confirmed again

1. **ETS TOEFL 21-Jan-2026 rescale** — fifth confirmed sighting (MIT), and the first source
   to publish both a minimum AND a separate recommended score per test rather than one
   threshold.
2. **ED-II/RD same-calendar-day deadlines** — now confirmed at Rochester, Emory (prior
   package), WashU, and Boston University (this package) — a well-established structural
   convention among test-optional private US universities, not a per-institution anomaly.
3. **UCL's Medicine (A100) course-specific 15-October deadline** was directly confirmed on
   UCL's own page (not just the generic national UCAS exception) — stronger evidence than
   the equivalent claim for St Andrews' Medicine deadline in this same batch, which was only
   WebSearch-synthesized.
4. **A new outlier deadline shape**: Brown's Early Decision deadline (6 December) is later
   than every other ED deadline found across all three packages so far (typically Nov 1) —
   recorded as Brown's genuine distinctive date, not smoothed to match the common pattern.
5. **RWTH Aachen** doesn't fit the US fall-application or UK January-equal-consideration
   templates — its main entry point is the winter semester, opening in May and closing in
   July for restricted-admission programmes, a structurally different calendar worth keeping
   distinct rather than mapping onto either prior template.

## Files

- `data/research/university-requirements/batch2_requirements_2026-08-23.jsonl` — 10 records.
- `data/research/university-requirements/batch2_deadlines_2026-08-23.jsonl` — 11 records.

Not yet ingested — research handoff only, per this lane's `RESEARCH` mandate (no live-DB
writes). Follows the existing JSONL contract in
`docs/research-handoff-university-requirements.md`. Scope held to exactly the CEO's package
definition (deadline-only for UCL, requirement-only for MIT, full-stack for the other 8) —
no expansion attempted.
