# Handoff — Opportunity Dimension Tagging

**Branch**: `oryn/opportunity-dimension-tagging`, forked from `oryn/geography-conditional-weighting`
at `b09f999` (that branch's own final state, which itself forked from `oryn/counseling-
intelligence-research-013956` at `cebe8b9`).

## Why this branch exists

Assigned by the "ORYN multi-agent coordination" session after the geography-conditional design
spec landed. The observation motivating it: `02-opportunity-development-mapping.md`'s evidence-
state framework had never been applied to a single real row of ORYN's live `opportunities` table
(369 rows, zero developmental characterization) — the counselor can match a student to opportunities
by declared interest, but cannot yet answer its own defining question ("which opportunity actually
closes this gap, and why this one?").

## What this branch contains

Read (never wrote to) the live `opportunities` table via Supabase MCP, project `qtcvcflzxbuagvvwahhu`
("oryn-qa-scratch" — despite the name, verified to be the correct/live database by cross-referencing
row counts against figures already known from elsewhere in tonight's work: `opportunities`=369,
`universities`=1019, both exact matches). Tagged all **166 `verification_state='verified_current'`**
rows against `02`'s framework (base + reinforced dimensions, achievement-tier ceiling,
`insufficient_description` flag), one entry per row, every tag traceable to specific description
text.

Two outputs:
- `data/research/opportunity-dimension-tagging/tags.json` — the machine-readable proposal, keyed by
  opportunity id, 166 entries.
- `docs/research/counseling-intelligence/19-opportunity-dimension-tagging-findings.md` — the
  findings doc: a confirmed catalog-skew finding (`community_impact` never appears as a base
  dimension across the sample; `leadership`/`entrepreneurship` barely do), five named ways the
  framework broke down against real data, a list of data-quality issues found while reading real
  rows (a likely duplicate, an eligibility contradiction inside one row's own text, several
  geographic-eligibility gates, apparent leaked annotation text in one description, and — not just
  negative findings — a positive verification example and several access-equity-positive programs
  worth surfacing). `RULE-COUNSEL-130-134`.

**134 rules** in this branch's registry (inherits 129 from the geography branch, adds 5).

## Verification performed before and during this work

Did not assume the assigning session's stated row counts were correct — independently queried
`status` and `verification_state` distributions and confirmed `verified_current`=166 exactly
matches the assignment's own figure, and the full-table `category` breakdown exactly matches the
assignment's own cited numbers (252 summer_program, 72 competition, 13 research, 8 internship, 2
fellowship). Caught and corrected one processing error before merging: batch 3's 40-row pull was
initially written up as only 39 tagged entries; a row-by-row ID diff against the actual query
result (a discipline applied after every batch from that point on, not just once) found the gap
(Battle Code MIT) and it was added before the final merge — recorded here rather than quietly fixed
and unremarked, consistent with this package's own transparency discipline applied to itself.

## Known limitations, stated in the findings doc itself but worth repeating here

- Single-session tagging of already-stored text, not independently cross-checked the way most of
  this package's other findings were (reciprocal peer verification, primary-source re-fetching).
  Confidence in the underlying framework (`02`) is high per the rest of this package; confidence in
  any *individual row's* tag is bounded by this session's own judgment applied once.
- Only the 166 `verified_current` rows were covered, per the assignment's own explicit scope — the
  202 `unverified` and 1 `conflicting` rows remain untagged, and this is not a one-time backfill:
  newly-added or newly-verified rows will need the same treatment going forward.
- The tier-ceiling default rule (competitions default toward `award`/`winner`; enrollment programs
  default toward `participated`, overridden per-row wherever the description gave specific
  evidence) is this document's own stated methodological choice, not itself an external fact.

## State

Read-only against production (`execute_sql` SELECT queries only, no `apply_migration`, no writes of
any kind). Findings doc, data file, and registry updates committed and pushed. Reported branch name,
commit SHA, and the tag/no-tag row counts to the assigning session per its own instruction.
