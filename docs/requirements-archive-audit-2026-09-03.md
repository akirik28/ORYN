# Raw-research archive audit — is `data/research/university-requirements/` usable?

CEO's brief: find out how many rows the archive holds, how many already exist live, what
fraction is genuinely unconverted — sample a few files by title before extrapolating, using the
same md5 cross-check from last night's depth pass. Then say whether it's usable: do the files
carry `source_url`/`retrieved_at` at the current pipeline's standard, and has the schema or its
enums moved since August. If usable, stage a first batch and stop there.

**Short answer: usable, but narrowly — 111 records out of 2,590 are safe to convert as-is today,
and the real yield is concentrated in a handful of very recent, very clean files rather than
spread evenly across the archive. Most of the archive is either already live (duplicate) or
describes a shape the current schema cannot represent correctly.** One of those 111-record files
— Caltech's, all 27 of it — is staged below as the first batch.

## What changed this pass: a real tool existed and I used it instead of my own heuristic

Last night's depth-pass collision check hand-rolled an `md5(title)` cross-reference in Python.
That was the right tool for 193 rows against one small set of existing keys. It would have been
the wrong tool here: this archive is 13x larger, uses a materially different record shape
(`requirement_text` instead of separate `title`/`requirement_detail`, `VERIFIED_CURRENT`-style
states instead of the DB's lowercase `verified_current` vocabulary, a `requirement_category_db`
field that needs no translation but a `category` field that does), and — critically — there is
already a **committed, genuinely read-only** tool built for exactly this question:
`scripts/ingest-university-requirements-batch.ts`. Its own header states the constraint plainly:
"THIS SCRIPT NEVER WRITES. There is no `--apply` branch, no write client, and no import of
anything that could construct one." It imports the real, unmodified `decideRequirementIngestion()`
from `lib/requirements/ingest.ts` — the same production decision logic the live pipeline would
use — and classifies every record in the corpus against the live `universities`,
`university_programs`, `university_requirements`, and `university_deadlines` tables via read-only
REST calls. Ran it once, full corpus, in one pass. Below are its numbers, not an estimate from a
sample.

(This also caught something a filename-based count would have missed: the corpus classifies
records by their **own identifier field** — `research_requirement_id` vs `research_deadline_id`
— not by which file they're sitting in. 19 files named "requirements" actually contain deadline
records misfiled by an earlier pass; the tool routes by shape and reports the mismatch rather
than silently trusting the filename.)

## The corpus, precisely

- **151 files, 2,590 records total** — larger than CEO's "roughly 100" estimate, which described
  the requirements-shaped half. By filename: 100 files / 1,836 rows say "requirements", 51 files
  / 754 rows say "deadlines" (a separate corpus mapping to `university_deadlines`, out of this
  task's scope). By the record's own identifier — the number that actually matters — it's 1,679
  requirement records and 911 deadline records; the gap between those two splits is exactly the
  misfiling above.

## How much already exists live

| Outcome | Requirements (of 1,679) | Deadlines (of 911) |
|---|---|---|
| **duplicate** (already live) | 1,331 (79.3%) | 621 (68.2%) |
| not_ingestible (schema/verification-state blocks it) | 113 (6.7%) | 219 (24.0%) |
| unresolved_university | 81 (4.8%) | 40 (4.4%) |
| superseded (a newer record in the corpus replaces it) | 17 (1.0%) | — |
| **accepted** (genuinely new, would insert) | 137 (8.2%) | 31 (3.4%) |

**Most of the archive is not sitting unconverted — it's already in the live table.** `41` rows on
2026-08-21 grew to `1,325` rows by tonight; the 79%/68% duplicate rates here are the trace of that
growth. This directly revises my own working assumption from last night's depth-pass doc, which
flagged the archive as a discovery worth chasing precisely because I didn't yet know this. It was
worth chasing — just not for the reason I guessed. The reason is below.

## The real gate: representability, not authority

The 8.2%/3.4% "accepted" isn't the number that decides usability, because acceptance alone
doesn't mean the fact would land *correctly*. The tool's own second pass — `classifyRequirementShapes`
/ `classifyDeadlineShapes` from `lib/requirements/shape-audit.ts` — checks whether the CURRENT
schema can hold what the record actually says:

```
Carry a shape the schema CANNOT HOLD                  : 1,125 of 2,590 (43.4%)
ACCEPTED *and* unrepresentable <-- the dangerous cell  : 57 (2.2%)
CLEAN LANDINGS (accepted, representable, slot-free)    : 111 (4.3%)
   of which requirements                               : 108 of 1,679
   of which deadlines                                  : 3 of 911
```

Requirement shapes the schema can't hold, by frequency: `scale_qualifier_dropped` (239),
`score_provenance` (102), `historical_as_current` (79), `recency_window` (75),
`incomparable_scale` (48), `eligibility_by_absence` (36), `unresolved_conflict` (9),
`unevaluable_age_bar` (7), `inverted_recency` (3). Deadline shapes: `undated_cycle` (442),
`historical_as_current` (150), `binding_semantics` (72), `no_date_published` (36),
`unresolved_conflict` (23).

This directly answers CEO's "has the schema moved since August" question: **yes, substantially.**
The archive's own research contract (`docs/research/university-requirements/research-handoff-university-requirements.md`)
documents a richer `verification_state` vocabulary than the live CHECK constraint holds
(`VERIFIED_UNDATED`, `VERIFIED_RECURRING_UNDATED`, `CURRENT_CYCLE_NOT_PUBLISHED`,
`CONFLICTING_EVIDENCE`, `NEEDS_REVIEW` against the DB's six lowercase values) — by design, so the
research stays auditable even where it's finer-grained than what gets stored. Separately,
migration 0056 (`evaluation_gate`, `recency_rule`, `excluded_provenances`, `test_scale`,
`scale_ambiguity`, `is_exclusion`) added representational capacity the August research predates
in places — `structured-shape-audit.ts`'s whole existence is the schema catching up to facts the
research already captured. The **"57 accepted-and-unrepresentable" cell is the one to actually
worry about**: those are records the naive path would insert successfully, looking complete, with
the qualifying nuance (a recency window, a scale caveat, a historical-cycle label) silently
dropped — exactly the failure mode `docs/research/university-requirements/research-handoff-university-requirements.md`
and `lib/requirements/shape-audit.ts` both warn is worse than a rejection.

**So: the archive is not "worth less than it looks" wholesale — it's worth exactly 111 records'
more than it looks, immediately, and worth substantially more later if someone builds the schema
capacity migration 0056 already started toward the shapes still missing.** Converting it further
without that capacity would either drop qualifiers silently (the dangerous cell) or require a
human re-verification pass per record — which, for 43% of the corpus, is close to redoing the
research.

## Source authority: partially fixed, and the remaining gap is a data question, not a code one

The known gap this archive itself documented (`docs/research/university-requirements/source-authority-gap.md`):
`looksOfficial()` in `lib/acquisition/source-authority.ts` recognized only `.edu`/`.ac.`/`.gov`
suffixes, so European institutions on `.nl`/`.de`/`.se`/`.fr` domains — real, correct, official
sources — failed the gate. Checked the current file directly (not the docs describing an old
version): this **was** partially fixed. `APPLICATION_SYSTEM_DOMAINS` and `TEST_OPERATOR_DOMAINS`
tiers exist now (ucas.com, studielink.nl, hochschulstart.de, ets.org, collegeboard.org, etc.,
HIGH for `policy` facts specifically), plus a per-institution `ADDITIONAL_OFFICIAL_DOMAINS` map
(MIT→mitadmissions.org, LMU→uni-muenchen.de, UvA→auc.nl) for institutions whose real content
lives on a second domain ROR doesn't know about. **KTH, TU Delft, Erasmus, and Groningen are not
in that map — but per `docs/handoffs/source-authority-fix-report.md`'s own explicit finding, they
don't need to be:** their `kth.se`/`tudelft.nl`/`eur.nl`/`rug.nl` domains are each institution's
own primary `website_url`, which already threads through `officialDomainsFor()` without a code
change **if that column is populated correctly for those rows.** That fix report flagged this
exact check as unverified and cheap for whoever has DB access to run. I have DB access; did not
run it this pass — it's a fast, scoped, single-purpose check (confirm `website_url` for these
four-plus institutions matches their real domain) that's worth doing before assuming any
remaining `source_authority_passes_gate: false` rows in the archive are still blocked today.

## Sampled directly, before the full-corpus tool confirmed the pattern

Read 6 files by hand before running the corpus tool (Harvard, Princeton, Caltech, Warwick, KTH,
a TU Delft/Erasmus/UvA/Groningen "refresh" batch) — every finding below held up against the
tool's full-corpus numbers:

- **`de_nl_requirements_refresh_2026-09-01.jsonl`** re-verifies eight named 2026-08-21 records
  live, confirms them "byte-identical," and explicitly labels several (TU Delft's Computer
  Science numerus fixus, Erasmus's economics selection) `VERIFIED_HISTORICAL` — real facts for a
  **closed** 2026-2027 admissions cycle, kept deliberately rather than discarded, per the
  research contract's own stated design. Converting these as current-looking rows today would be
  wrong regardless of the source-authority question; this is the `historical_as_current` shape
  the corpus-wide count above shows at 79 (requirements) / 150 (deadlines).
- **`us_requirements_caltech_2026-09-01.jsonl`** — the standout. 27/27 accepted, 0 unrepresentable,
  0 collisions, per both my own reading and the corpus tool. Already independently verified
  against the real `decideRequirementIngestion()` and Caltech's real live row in
  `docs/handoffs/caltech-requirements-research-2026-09-01.md`, which stopped short of applying it
  only for lack of `SUPABASE_SECRET_KEY` in that worktree. This worktree has the key. Staged
  below.

## First batch: Caltech, 27 rows

`data/research/sql-dry-runs/university-requirements/archive-first-batch-caltech-2026-09-03.sql`.
Field construction mirrors `decideRequirementIngestion()` exactly (`lib/requirements/ingest.ts:389-425`):
`title = requirement_text.slice(0,200)`, `requirement_detail` = full text, `is_required` always
`true`, `verification_state` mapped `VERIFIED_CURRENT → verified_current`, `research_record_id`
set to the archive's own `research_requirement_id` (e.g. `REQ-2026-09-01-CAL0001`) — a column
last night's own depth-pass batch left null throughout; this batch populates it, since the source
records carry a real, checkable identifier and the column exists for exactly this. Dry-run
validated live: `1,325 → 1,352` (+27) inside a `begin;`/`rollback;` transaction, zero constraint
violations, fresh post-rollback count confirmed back at 1,325.

**Cross-checked against my own last night's separately-staged, not-yet-applied Caltech batch**
(19 rows, `docs/university-requirements-depth-2026-09-03` branch, also not yet applied): exactly
one title string is character-for-character identical between the two ("If you have taken AP or
IB examinations, you will be asked to submit those scores as well.") — but the two batches gave
it different `requirement_type` (`standardized_test` there, `supplemental_requirement` here), so
it would not collide against the live unique index even if both land. Several other rows across
the two batches state overlapping facts in different words with no technical collision either
(the SAT-or-ACT requirement, the need-aware international-aid policy, the
calculus/chemistry/physics substitution mechanism) — real semantic duplication, not a database
problem. Flagging rather than reconciling: whoever applies these should look at both files
together, not assume clean independence just because neither dry-run failed.

## What this pass did not do

Did not attempt the `website_url` check for KTH/TU Delft/Erasmus/Groningen named above — flagged,
not run. Did not build or stage anything from the other 84 "clean landing" requirement records
(108 total, 27 of them Caltech) or the 3 clean deadline records — CEO's own instruction was to
stop at one batch. Did not touch the 51 deadline-named files' own conversion question beyond
sizing it (`university_deadlines`, a different table, different owner). Did not attempt to fix
`lib/requirements/shape-audit.ts`'s missing schema capacity for the 1,125 unrepresentable records
— that is a migration-and-evaluator-logic project, not a data-staging one.

## Files

- `data/research/sql-dry-runs/university-requirements/archive-first-batch-caltech-2026-09-03.sql`
  — 27 `INSERT` statements, staged, not applied.
- This doc.
