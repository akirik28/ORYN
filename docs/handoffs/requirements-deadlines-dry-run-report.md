# Requirements & deadlines — safe-subset dry-run report

**Nothing written to any database.** This is the dry-run + classification pass; per procedure,
waiting for a go before building the actual write step. Branch `oryn/requirements-deadlines`,
forked from `main@7dc3019` (which already includes the requirements/deadlines research merge at
`b5522d8`).

**Result: 77 of 131 requirement records and 19 of 49 deadline records are safe to stage —
96/180 (53%) overall.** Read `docs/research/university-requirements/scalar-thresholds-are-not-enough.md`
and `research-handoff-university-requirements.md` in full before writing any classification
logic, per instruction.

## Two real bugs caught during this pass, not after

Both would have staged something actively wrong if I'd trusted my first cut of the classifier.
Disclosing both, same standard as the source-authority near-miss earlier today.

**1. Missed the `supersedes` field entirely on the first pass.** 7 records in the batch5
scale-audit are explicitly marked as superseding an earlier record's `research_requirement_id`.
Two of those seven targets were already excluded for other reasons (`CONFLICTING_EVIDENCE`), but
**five were not** — including Boğaziçi's original TOEFL threshold (`REQ-2026-08-21-0020`, "79
total, 22 writing"), which the scale-audit itself found to be a now-partially-unsatisfiable fact
and explicitly superseded with a corrected, `NEEDS_REVIEW`-flagged version. My classifier's first
pass had no `scale_ambiguity` value to check on the *original* record (that field didn't exist
until the audit batch), so it read as clean and landed in "safe." Fixed by excluding every record
any other record's `supersedes` field names, uniformly — the superseding version already carries
the up-to-date fields, so nothing of value is lost.

**2. Missed `VERIFIED_HISTORICAL` as an unsafe deadline state.** This one is bigger: **11 of 49
deadline records** are `VERIFIED_HISTORICAL` — a real, correctly-fetched date for a cycle that
has already closed (e.g. Erasmus Rotterdam's page still showed 15 January 2026 as of today,
2026-08-21 — a deadline seven months in the past, with the researcher's own note explicit that
deriving "15 January 2027" from it would be exactly the year-conversion the founder brief
forbids). The handoff doc frames `VERIFIED_HISTORICAL` as "kept deliberately" — true for the
*research corpus*, where it prevents a future pass from rediscovering the same date and mistaking
it for current. That is a different claim from "safe to insert into the live
`university_deadlines` table," which has no column to mark a row as closed/non-actionable — the
exact same shape of gap as `is_exclusion`. A bare `deadline_date: 2026-01-15` sitting in the table
with nothing distinguishing it from a live deadline is precisely the kind of fact that misleads
in the confident direction. My first classifier pass didn't check `verification_state` for
deadlines at all; fixed by adding `VERIFIED_HISTORICAL` to the same unsafe-state set already
used for requirements.

Both catches came from deliberately printing every record touching the specific things the source
docs flagged (Glasgow/Boğaziçi/Edinburgh TOEFL, every `is_exclusion=true` row, every non-null
`scale_ambiguity`) and eyeballing them individually, rather than trusting bucket counts alone —
see `scripts/verify-safe-subset.ts`.

## Requirements: 77 safe / 54 excluded

| Bucket | Count |
|---|---:|
| unresolved_university | 23 |
| verification_state=NEEDS_REVIEW | 10 |
| superseded by a newer record | 7 |
| source_authority fails live gate | 4 |
| duplicate (existing row or within-batch) | 10 |
| **SAFE TO STAGE** | **77** |

**unresolved_university (23) is not a defect — 20 of the 23 are Turkish national-level YÖK
rules with no `university_name` at all** (they apply across all of Türkiye, not to one
institution) and 3 are context/reference records (e.g. ETS's own scale-change announcement,
`university_name: null`). Neither shape fits `university_requirements`' per-university model;
correctly out of scope for this pass, not a resolution failure.

**Your concern #2 (exclusions), checked directly, not assumed moot:** 6 records have
`is_exclusion: true` — all 6 are among the 20 unresolved Turkish national-level records above, so
they're already excluded via `unresolved_university` before the `is_exclusion` check even runs.
Confirmed this isn't accidental: I traced each of the 6 individually (see the script output) —
none would slip through some other path. The `is_exclusion` field itself only exists on batch9
(17 of that batch's records carry it; 0 records in batches 1-8 have the field at all).

**mitadmissions.org still fails (4 requirement records), even after today's source-authority
fix.** Expected and consistent with how I scoped that fix this morning: the application-
system/test-operator tiers I added cover *operators* (UCAS, ETS), not an institution's own
*second* domain — that's the one-to-many institution-domain-provenance gap I explicitly left to
the identity lane. This is independent confirmation that scoping was right, not a new problem.

**The doc's own headline case, verified record-by-record:** every Glasgow/Boğaziçi/Edinburgh
English-proficiency record was traced individually. All three `CONFLICTING_EVIDENCE`/
`NEEDS_REVIEW`/superseded TOEFL records (Glasgow's two, Edinburgh's original, Boğaziçi's) are
excluded. The two records the doc explicitly confirms as *resolved and safe* — Edinburgh's
post-cutover "4.5 total, 4.0 per component" (`scale_ambiguity: resolved_unambiguous`) and
Edinburgh's pre-cutover "92 total, 20 per component" (bounded to its own date range,
`scale_ambiguity: none`) — are correctly staged. IELTS and Cambridge English rows (unaffected by
the TOEFL rescale) are correctly staged throughout.

**Two minor, non-blocking observations, not gated on:**
- 2 safe records carry genuinely vague text ("standard university requirement", "a formal
  qualification" with no instrument named) — true but low-value, not misleading, left in.
- 3 safe records are `text_fidelity: extracted_summary` (paraphrased, not verbatim) — all three
  read as faithful paraphrases of straightforward facts, source_url preserved for verification
  either way, left in.

## Deadlines: 19 safe / 30 excluded

| Bucket | Count |
|---|---:|
| recurring_annual_undated | 12 |
| verification_state=VERIFIED_HISTORICAL | 11 |
| not_published_centrally | 5 |
| unresolved_university | 2 |
| duplicate | 0 |
| **SAFE TO STAGE** | **19** |

**recurring_annual_undated (12) — genuinely not representable today**, per the handoff doc's own
analysis: `university_deadlines.deadline_date` is a `date` column, and TU Delft's "before 15
January every year," TUM's "15.07 or 15.01," MIT's "November 1," Glasgow's "15 October" have no
year at all. The doc's own recommended fix is a `recurrence_rule` column — an engineering
decision, not mine to make unilaterally inside a data-staging pass. Excluded, not forced.

## Files

- `scripts/analyze-requirements-deadlines.ts` — the dry-run classifier (reusable, read-only,
  no `--apply` mode yet — that comes after a go).
- `scripts/verify-safe-subset.ts` — targeted eyeball-verification for the specific
  doc-flagged cases and every `is_exclusion`/`scale_ambiguity` record.
- This file.

## What I'd build next, once you've seen this

A `--apply` path mirroring `scripts/ingest-university-programs.ts`'s shape: insert the 77 + 19
safe records with `structured_rule: null` throughout (per migration 0020's own documented intent
— populated later by an admin reviewing `lib/ai/interpret-requirement.ts`'s suggestion, never by
this ingestion), full audit trail for every decided record (accepted or excluded) the same way
`program_research_queue` works for programmes, re-querying live state immediately before writing.
Waiting for your go before building it.
