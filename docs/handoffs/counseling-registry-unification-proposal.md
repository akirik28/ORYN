# Counseling-Intelligence Registry Unification — Proposal Report

**Status: PROPOSAL ONLY. Nothing executed.** This branch (`oryn/counseling-registry-unification`)
does not modify, replace, or merge into either `oryn/counseling-intelligence-research` or
`oryn/counseling-intelligence-research-013956`. It adds two new, clearly-provisional files:
`data/research/counseling-intelligence/rules.canonical-proposal.json` and
`sources.canonical-proposal.json`. The peer branch was touched only via read-only `git show`.

Assigned by: ORYN multi-agent coordination ("Org Leader"), acting under founder-delegated
coordination authority, 2026-08-21.

## 1. Collision map summary

| | Count |
|---|---|
| Rule IDs only on `oryn/counseling-intelligence-research` (this branch) | 49 (`RULE-COUNSEL-200`–`246`, `901`–`902`) |
| Rule IDs only on `oryn/counseling-intelligence-research-013956` (peer) | 90 (`RULE-COUNSEL-034`–`123`) |
| Rule IDs present on **both** branches | **33** (`RULE-COUNSEL-001`–`033`) |
| Source IDs colliding between branches | **0** |

**Every one of the 33 overlapping rule IDs was read and compared statement-by-statement, not
assumed from the ID alone.** Result: all 33 are genuinely different, unrelated rules that happen
to share a number — zero are the same claim, and zero are close-enough-to-merge near-duplicates.
Full pairwise text is in `rules.canonical-proposal.json`'s `collision_map` array. Example:

- `RULE-COUNSEL-002` on this branch: *"Titles ('captain', 'president', 'founder') are near-zero
  evidence alone..."* (leadership-title-inflation caution)
- `RULE-COUNSEL-002` on peer's branch: *"Weight academic rigor/grades above any single
  extracurricular dimension when both compete for a student's limited time."* (academics-vs-EC
  weighting)

Because none of the 33 are true duplicates, this is a pure numbering collision, not a substantive
factual disagreement — there was nothing to adjudicate "which is more correct" for these 33 pairs.

## 2. Canonical numbering proposed

- **Peer's 001–123: unchanged.** Actively cited throughout roughly 15 peer documents; renumbering
  would invalidate all of them for zero benefit, since peer's own 001–123 range has no *internal*
  collision.
- **This branch's 200–246 / 901–902: unchanged.** Same reasoning — actively cited throughout
  roughly 17 documents on this branch, no internal collision.
- **This branch's colliding 001–033 (33 rules): excluded from the canonical set**, not silently
  renumbered and folded in. See §3 — a deeper problem was found that a numbering fix alone doesn't
  resolve honestly. Full original content is preserved verbatim in the proposal file's
  `excluded_rules_pending_review` array, not discarded.

**Net result: 172 canonical rules, zero collisions, zero silent content loss** (nothing deleted,
one block explicitly quarantined with reasons stated).

## 3. Substantive conflict found — escalated, not resolved

Per the coordination assignment's own instruction not to silently pick a winner: this is not a
"my source vs. their source, which is right" conflict. It's a provenance/reliability problem
specific to this branch's own file, found while building the collision map:

**This branch's `08-unsafe-inference-rules.md` cites `RULE-COUNSEL-001`–`033` numbers, labeled
`(peer)`, with inline paraphrases — and those paraphrases were checked against peer's *actual
current* `rules.json` content for the same IDs. Roughly half match closely (e.g. `023`, `024`,
`025`, `029` are accurate, in places near-verbatim); roughly half do not (e.g. `002`, `027`, `028`
describe content peer's current entries for those IDs don't contain).** Full checked sample in the
proposal file's exclusion notes.

Separately, and consistently with that: this branch's own `rules.json` entries for `001`–`033`
match *neither* peer's current content *nor*, in the mismatched cases, what this branch's own prose
claims those numbers mean. Combined with 7 sources (`SRC-001`–`007`) in this branch's own
`sources.json` that share the same numbering block and have empty `used_in` — not actually cited
by any document on this branch — the most defensible read is that this whole block traces to an
earlier, unidentified session's file, found already present in the repo before this branch's
research began, never independently verified, and partially (not wholly) accurate as a paraphrase
of peer's early-night state.

**Escalating rather than fixing**, because correcting it requires an editorial judgment call this
proposal task shouldn't make unilaterally: for each of the 33/7, is the right fix (a) rewrite this
branch's `08` citations to match peer's actual current content, (b) treat this branch's version as
a legitimately distinct finding deserving its own new ID, or (c) discard it as unreliable? Each of
the 33 may need a different answer. Recommend a dedicated review pass, not a bulk decision here.

## 4. Referential integrity check

- **Schema difference found**: peer's rules each carry a structured `sources: [...]` array
  (123/123 populated); this branch's rules have no equivalent structured field (0/82) — citations
  live only in prose (`source_doc`/`source_section`/inline `note` text). Not a defect in either
  file individually, but something a real merge needs to decide on (retrofit this branch's rules
  with a `sources` array, or accept two different citation conventions).
- **Broken references**: zero. Every source ID actually cited via a structured `sources` array
  resolves to a real entry in the combined 130-source pool.
- **Orphaned sources** (not referenced by any rule's structured `sources` array, and with empty/
  missing `used_in`): **8** — the 7 already-flagged `SRC-001`–`007` on this branch, plus
  **`SRC-CS-038` on peer's branch**, not previously flagged by either session as far as this pass
  found. Not investigated further here (peer's file, read-only access only) — flagging for peer's
  own attention or the founder's.

## 5. What's safe to build on right now

The 172-rule canonical set (peer's 001–123 + this branch's 200–246/901–902) and the 130-source
canonical set are internally consistent, collision-free, and referentially sound modulo the one
schema-convention difference noted above. The 33 excluded rules and 7 flagged sources are the only
part of this proposal that need human review before being trusted at the same confidence as the
rest — everything else can be treated as reconciled.

## 6. Files in this proposal

- `data/research/counseling-intelligence/rules.canonical-proposal.json` — 172 canonical rules +
  33 excluded-pending-review + full collision map.
- `data/research/counseling-intelligence/sources.canonical-proposal.json` — 130 canonical sources,
  7 flagged.
- This file.
