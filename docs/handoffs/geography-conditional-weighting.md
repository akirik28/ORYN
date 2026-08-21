# Handoff — Geography-Conditional Scoring Design Spec

**Branch**: `oryn/geography-conditional-weighting`, forked from
`oryn/counseling-intelligence-research-013956` at `cebe8b9` (that branch's own final,
comprehensively-covered state — see `docs/handoffs/research-counseling-intelligence.md` for its
full history, inherited unchanged into this branch).

## Why this branch exists

Assigned by the "ORYN multi-agent coordination" session (self-identified "ORYN Organization
Leader," socket `98537`) after the founder directly confirmed (in this session's own chat channel,
not relayed) that session's coordinating authority. The assignment: build out this package's own
#1 finding (`RULE-COUNSEL-059`/`060` — ORYN's counseling evidence base is US-holistic-shaped while
Turkey/UK/most of continental Europe don't admit that way) into an implementation-facing design
specification, using a newly-available independent data source
(`docs/research/admissions-systems/**` on `oryn/admissions-intelligence-research`, 14 countries,
verified to exist before use) that did not exist when this package's own `17-dimension-weighting-
by-target.md` was written.

## What this branch contains

One new document: `docs/research/counseling-intelligence/18-geography-conditional-scoring-design-
spec.md`. Structure: a two-gate mechanism (does non-academic evidence get reviewed at all; if so,
which dimensions matter how much), per-system specs for US/UK/Turkey/Germany, an explicit
cross-lane-validation section naming exactly which claims were and weren't independently
re-confirmed against the admissions-intelligence lane, a sharpened medicine cross-cutting section
(now four distinct exception shapes across four countries, not two or three), extended unsafe-
inference rules for this specific axis, and named (not implemented) implications for the existing
scoring code. `RULE-COUNSEL-124-129`, two new sources (`SRC-CS-065/066`, the admissions-
intelligence lane's Germany and US files).

**129 rules / 66 sources** in this branch's registry (inherits the parent branch's 123/64, adds 6
rules and 2 sources this pass).

## Verification performed before relying on the new data source

Did not take the admissions-intelligence lane's existence or content on faith: confirmed the
branch and the specific cited commit (`931bcc0`) both exist via `git cat-file`/`git log`, confirmed
the claimed 14 country files are actually present via `git ls-tree`, and read the UK and Germany
files in enough depth to judge their sourcing discipline (explicit confidence flags, a noted
`ucas.com` 403, honest "not independently confirmed" caveats — same standard this package has
applied all night) before citing them. **Turkey is not among that lane's 14 countries** — this
document's Turkey section relies entirely on this session's own prior sourcing, flagged explicitly
in the document itself (`RULE-COUNSEL-124`) rather than silently assumed covered.

## Known gaps, stated honestly rather than glossed over

- **UK was only partially cross-validated** (`RULE-COUNSEL-126`) — the admissions-intelligence
  lane's UK file focuses on qualification-eligibility/predicted-grades mechanics, not the specific
  super-curricular-weighting question this package's own `RULE-COUNSEL-058` addresses. Not checked
  this pass; a real remaining task, not resolved here.
- **Netherlands was not used** despite being available in the admissions-intelligence lane — Germany
  was chosen instead specifically because this session already had primary-sourced material (DAAD,
  Bundesärztekammer, BRAK, BMG) to cross-check it against, a stronger validation opportunity than
  starting cold on the Netherlands. Documented as a deliberate choice, not an oversight.
- **This document proposes no numeric weights**, per the assignment's own explicit instruction and
  `AGENTS.md` Phase 6.1's standing prohibition on LLM-invented scoring parameters. An engineering
  lane converting §7's proposed contract into actual code will need a separate, deliberate design
  decision for the qualitative→numeric conversion — not pre-decided here.

## State

Committed and pushed. Reported branch name and commit SHA to the assigning session per its own
instruction. No further work self-directed on this branch beyond what's described above — the
assignment's stated scope (design spec, 4 systems minimum, qualitative only, unsafe-inference
extension, named-not-implemented code implications) is complete as scoped.
