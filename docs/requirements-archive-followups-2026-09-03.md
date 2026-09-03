# Requirements archive audit — three follow-ups

CEO's brief after the 2026-09-03 archive audit: reconcile the two overlapping Caltech batches
first (small, blocking); chase the 57 "accepted-and-unrepresentable" records and answer whether
the gate needs to reject them or the schema needs to hold them; run the `website_url` check
flagged as cheap-and-unverified rather than leaving it flagged.

## 1. Caltech reconciliation — done, supersedes both prior batches

19 rows (this session's own fresh research, `requirements_depth_2026-09-03.sql`) + 27 rows (the
archive's `us_requirements_caltech_2026-09-01.jsonl`, staged as
`archive-first-batch-caltech-2026-09-03.sql`) → **37 reconciled rows**. 9 dropped as duplicates
(7 from the depth-pass batch, 2 from the archive batch), full rationale as inline SQL comments in
`data/research/sql-dry-runs/university-requirements/caltech-reconciled-2026-09-03.sql`. Dry-run
validated live: `1,325 → 1,362` (+37), zero violations, fresh post-rollback count back at 1,325.

Two judgment calls, stated plainly rather than left implicit in the diff:

- **Kept six atomic curriculum rows over one merged paragraph.** The depth-pass batch split
  Caltech's "four years of math, one year of physics..." list into six per-subject rows; the
  archive kept it as one paragraph matching the source page's own list format. Kept the atomic
  version — the product's Requirement Check UI can show per-subject status that way, and a merged
  paragraph can't be partially satisfied in the UI without re-splitting it later anyway.
- **The archive corrected three of my own rows from earlier tonight, not just duplicated them.**
  My depth-pass row said Caltech successful applicants "traditionally" score "700+ on each SAT
  section" — a loose approximation. The archive's Sept-1 research found the actual mechanism:
  three named score buckets, and Bucket B (the middle tier) starts at 750, not 700. Also true of
  the plain "SAT/ACT required" statement (archive's version is fall-2027-scoped and states the
  subscore policy) and the calculus/chemistry/physics substitution policy (archive names the
  specific unavailability/conflict conditions my summary omitted). Kept the archive's version and
  dropped mine in all three cases — this is the archive correcting this session's own research,
  not merely restating it.

**This file supersedes both prior Caltech batches. Do not apply either of them alongside it —
apply only `caltech-reconciled-2026-09-03.sql`.**

## 2. The 57 dangerous records — what they are, what gets dropped, and the design answer

Wrote a throwaway analysis script (not committed — reused the real, unmodified
`decideRequirementIngestion()`/`decideDeadlineIngestion()` and `classifyRequirementShapes()`/
`classifyDeadlineShapes()` from `lib/requirements/ingest.ts`, `lib/deadlines/ingest.ts`,
`lib/requirements/shape-audit.ts`, same read-only surface as the committed dry-run tool) to print
every record that is both `accepted` and carries an unrepresentable shape, with the exact
evidence and the exact `lossIfWritten` text for each. 29 requirement records, 28 deadline
records, 57 total — matches the earlier aggregate exactly.

### The headline finding: 18 of the 29 dangerous requirement records are a stale check, not a real gap

21 of the 29 carry `scale_qualifier_dropped` — by far the largest single category. Its
`lossIfWritten` text reads: *"university_requirements has no test_scale column, so the qualifier
is discarded and the number is stored bare."* **That is false as of today.** `test_scale` is a
real, live column (migration 0056), and `buildQualifierColumns()` in `lib/requirements/ingest.ts`
already maps `record.test_scale` directly into the accepted row (`ingest.ts:465`). The dry-run
tool's own shape classifier just wasn't updated when the column landed — and the code says so,
in its own words: `lib/requirements/shape-audit.ts:305-307`, on why `scale_qualifier_dropped` is
deliberately absent from the list of shapes that block evaluation, *"a scale the schema merely
has nowhere to put is recoverable once 0056 lands, and gating on it would block every TOEFL row
that the research lane actually resolved correctly."* Migration 0056 landed. The detection logic
at `shape-audit.ts:236-244` was never told.

Of the 21 `scale_qualifier_dropped` records, 3 also carry `score_provenance` (a real, separate,
still-open issue) and stay dangerous regardless. **The other 18 are not dangerous at all** — MIT
English proficiency (×2), LMU, University of Amsterdam, Vrije Universiteit Amsterdam (×7,
English-proficiency score tables), LSE and Warwick's TMUA rows (×4), Lund, KU Leuven (×2). Every
one of these already has its exact scale (`IELTS_0_9`, `TOEFL_IBT_1_6`, `TMUA_1.0_9.0`,
`SAT_1600`, `CAMBRIDGE_ENGLISH_SCALE`, etc.) captured correctly by the real ingestion path today.

**This directly answers the design question for this category: the schema already holds it. The
fix is a stale-code cleanup in `shape-audit.ts`, not a migration and not a gate decision.**
Recommending it, not doing it in this pass — `lib/requirements/shape-audit.ts` is real
application code with its own test coverage I haven't inspected, and this pass was scoped as
docs/investigation. If CEO wants it: remove (or correctly gate) the `scale_qualifier_dropped`
finding now that `test_scale` is live, and update its `lossIfWritten` text, which is actively
wrong. Would shrink the dangerous-cell count from 57 to 39 immediately, with no data or research
work required — the research was already right.

### What's left after removing the stale-check false positives (39 records)

The remaining shapes are real gaps, not stale checks — the schema genuinely has nowhere to put
these yet:

| Shape | Count | What a student would wrongly see |
|---|---|---|
| `score_provenance` (2 standalone + 3 combined above) | 5 | A qualifying score shown as "met" regardless of how it was obtained. MIT superscores; Copenhagen's quota-1 GPA must be from the *original* exam sitting, not a retake — the rule has no way to say so, so a retaken-and-improved score would read as satisfying a requirement it was specifically written to exclude. |
| `historical_as_current` (requirements) | 2 | A requirement page's `VERIFIED_HISTORICAL` state (a real fact about a closed cycle, kept deliberately per the research contract) has no live-schema equivalent — `UNSAFE_VERIFICATION_STATES` in `ingest.ts` doesn't list it, so it's accepted and shown as current. University of Helsinki's SAT/ACT admission-group rule and University of Amsterdam's psychology ranking mechanism are both closed-cycle facts that would display as this year's rule. |
| `inverted_recency` | 1 | Aalto's tuition-fee rule keys off when a student's *study right begins*, not an application cycle — one case, correctly caught, not the METU IELTS shape but structurally adjacent to it. |
| `recency_window` | 3 | University of Oslo's tuition figures are "wrong within twelve months" per the source's own wording — no max-age column exists to expire them. |
| `undated_cycle` (deadlines) | ~24 | The largest deadline-side category. A day-and-month with no year (`"15 March"`, `"November 1"`) — `deadline_date` is a real `date` column that cannot hold a recurring rule. This is the exact gap `research-handoff-university-requirements.md` already named and recommended a schema fix for (a nullable `recurrence_rule` beside `deadline_date`) — not new, but this run puts a live number on how many *specific* records are sitting on it today. |
| `historical_as_current` (deadlines) | ~6 | Same shape as the requirements version, applied to closed-cycle deadline dates (Lund's 2025-26 application window, Vienna's 2026/27 window already past). |
| `binding_semantics` | 1 | MIT's Early Action deadline: `deadline_type` is free text with no restriction semantics, so a student can't be told this deadline forecloses other early applications elsewhere — the type itself doesn't carry that meaning in the schema. |

**For these 39, the answer is closer to "the schema needs to hold them" than "the gate needs to
reject them"** — several are exactly the gaps the research corpus's own handoff docs already
named in August (the `recurrence_rule` proposal for undated deadlines; the historical-cycle
labeling gap). The gate rejecting them instead would mean discarding real, correctly-researched
facts (Oslo's tuition figures, MIT's actual deadlines) rather than losing only the qualifier — a
worse trade than accepting them with the nuance intact once the schema can hold it. Not
recommending gate changes in this pass; flagging the shape breakdown as the input to that design
decision, which is genuinely a schema/migration question for whoever owns that roadmap next.

Full per-record detail — all 57, each with its `research_requirement_id`/`research_deadline_id`,
full text, source URL, and every shape's exact evidence and `lossIfWritten` text — is in
[`requirements-dangerous-cell-detail-2026-09-03.txt`](requirements-dangerous-cell-detail-2026-09-03.txt),
raw output from the analysis script described above, alongside this doc rather than only in this
session's own scratchpad.

## 3. `website_url` check — run, confirms no data gap

Checked the four institutions CEO named (KTH, TU Delft, Erasmus, Groningen) plus every other
institution that surfaced in the dangerous-cell run with a non-`.edu`/`.ac.`/`.gov` domain (VU
Amsterdam, UvA, Lund, Copenhagen, DTU, KU Leuven, Aalto, Helsinki, NTNU, Oslo, Vienna, LMU) — 16
institutions total, queried live against the `universities` table.

**Every one of them has `website_url` populated correctly, matching (directly or via subdomain
suffix) the domain their research actually cited as a source.** KTH→`kth.se`,
TU Delft→`tudelft.nl`, Erasmus→`eur.nl`, Groningen→`rug.nl`, and so on — no stale or missing
values found. Two institutions turned out already covered by a suffix rule rather than needing
special-casing at all: NTNU's domain is `ntnu.edu` (passes `looksOfficial()`'s generic `.edu`
suffix directly) and Vienna's is `univie.ac.at` (passes via `.ac.`). LMU's second domain
(`uni-muenchen.de`) is already in `ADDITIONAL_OFFICIAL_DOMAINS`, confirmed live.

This isn't just a domain-string comparison — it's confirmed by the strongest possible evidence:
**every one of these institutions' records appears in the dangerous-cell run as `accepted`,
produced by the real `decideRequirementIngestion()` running against these exact live
`website_url` values.** If source authority were still blocking any of them, that decision
function would have returned `malformed_source`, not `accepted`. It didn't, for any of them.

**Conclusion: the source-authority gap these institutions' archive records were flagged with
(`source_authority_passes_gate: false`) is stale, not current.** It reflects the code's state at
research time (2026-08-21/22), before `ADDITIONAL_OFFICIAL_DOMAINS` and the application-system/
test-operator tiers landed. Today, the gate already passes for all 16 checked. No code change and
no data fix needed — the flagged risk from the original archive audit doc doesn't hold up under
direct verification, and I'm updating that conclusion here rather than leaving the earlier
"flagged, not run" framing standing now that it's actually been run.

## Files

- `data/research/sql-dry-runs/university-requirements/caltech-reconciled-2026-09-03.sql` — 37
  `INSERT` statements, staged, not applied, supersedes the two prior Caltech batches.
- This doc.
