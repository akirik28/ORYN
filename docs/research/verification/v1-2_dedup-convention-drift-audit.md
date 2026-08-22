# Dedup-key convention-drift audit — package V1-2 (RES-V1)

**Verifier lane:** RES-V1 · **Audited:** 2026-08-22 · **Assigned by:** ORYN-BASORG, following
the Glasgow near-miss (RES-I1 dry-ran `acquire-programs-batch2`, got 101 net-new / 0
duplicate for Glasgow — anomalous, opened before assigning the apply).
**Tool:** `scripts/audit-dedup-convention-drift.ts` (new, reusable).
**Posture:** report only. No files edited, no live writes, no dedup-key changes, no merges.
Every finding below is a **review candidate**, not a resolution (org rule 10).

## Headline result

**The blind spot is real, but — checked against the entire not-yet-ingested research
corpus (19,657 records across 131 files) — it currently manifests in exactly one place:
University of Glasgow's `acquire-programs-batch2_2026-08-20.jsonl`, 69 of its 101 records
(68 high-confidence, 1 medium).** No other university's uningested research shows this
failure mode today. That is a complete, corpus-wide answer to "where else does this exist,"
not a partial scan — see §3 for the reconciliation that backs the "complete" claim.

This is not a reason to stop checking: the tool is built to run on every future batch
(§6), and §4 argues the underlying problem is bigger than this one dedup key.

## 1. What the tool checks

For every record in the corpus whose `research_program_id` has **never been attempted**
(absent from `program_research_queue` — 16,427 of 19,657 records, 83.6%, already have a
queue outcome and are out of scope):

1. Resolve the record's university via `resolveUniversity()` — the real, unmodified
   production function (`lib/programs/ingest.ts`), fed the real university/alias/
   external-id pool. **0 of 3,230 uningested records failed to resolve** — identity
   resolution is not contributing to this problem anywhere in the corpus.
2. Compute the record's real, unmodified strict dedup key
   (`programDedupKey()` + `normalizeProgramName()`, same functions the live ingester
   calls) and check it against the full set of live keys. If it matches, the real
   pipeline already treats it as a duplicate — not this audit's concern, skip.
3. For the 1,356 records the strict key currently calls "new": look for a live row at the
   **same university with the exact same `official_program_url`** (the one required,
   always-populated, substantive key component — see `programDedupKey`'s own header on
   why a standalone URL check was tried and rejected: wrong 53 of 54 times, because ~45
   universities publish one shared catalogue-listing URL for their entire distinct
   programme list, not because URL is a weak signal in general).
4. If a same-URL live row exists, check whether the ONLY things differing are cosmetic:
   - **name**, after stripping exactly the outermost trailing bracket/paren group
     (a degree-code annotation) and normalizing — calibrated directly against Glasgow's
     known 69/101 split (§2);
   - **`degree_type`**: equal, or either side null (the axis BASORG named);
   - **`language_of_instruction`**: equal, or either side null — an extension beyond
     BASORG's named axes, added after calibration showed holding it to exact equality
     reproduced **zero** of Glasgow's 69 known duplicates (§2); reported separately via
     `--strict-language` so this choice is visible, not silently assumed.
   - **`degree_level`** is never treated as cosmetic — held to exact match throughout.
5. When a URL is shared by more than one live row (a listing-page university), require an
   **exact** name match after stripping before flagging anything at all — see §2b for why
   a looser rule there produced pure noise.

## 2. Calibration against the known case

Ran against `acquire-programs-batch2_2026-08-20.jsonl` alone first, before trusting the
tool on the rest of the corpus (same discipline as the DLOPP validator:
`docs/research/verification/v1_dlopp_verdict.md`).

**Result: 68 high + 1 medium = 69, University of Glasgow.** Matches BASORG's reported
number exactly, using the real production `resolveUniversity`/`programDedupKey`/
`normalizeProgramName` — not an approximation.

### 2a. Two real bugs found and fixed during calibration, before trusting the output

- **Nested-bracket stripping.** A first version's strip regex failed on
  `"Archaeology [BSc/MA/MA(SocSci)]"` — the inner `(SocSci)` broke the naive
  "no-brackets-inside" pattern, so the whole trailing annotation survived and polluted
  the normalized name. Fixed to tolerate one level of nesting.
- **Strip depth.** Stripping *every* trailing bracket/paren group recursively
  over-corrects: `"Education with Teaching Qualification (Primary) [MEduc]"` lost
  `"(Primary)"` too — a real, distinguishing qualifier, not a degree code — and stopped
  matching live's `"Education with Teaching Qualification (Primary)"`. Fixed to strip
  only the single outermost group.

### 2b. A third bug, found only after extending past the calibration file

Running the (at-the-time-passing) tool corpus-wide surfaced Radboud University:
`"Economics and Business Economics"` (a Dutch-track record) got compared against and
flagged near `"Notarial Law"` — a completely unrelated live programme. Cause: Radboud
publishes one shared bachelor's-catalogue URL used by **49** distinct live programmes,
and the tool's first design kept only one arbitrary same-URL row per university (a
`Map` overwritten on every insert) to compare against.

Fixing the lookup to check *all* 49 candidates still wasn't enough: without requiring an
actual name match, "medium" confidence matched `"Arts and Culture Studies"` against
`"Computing Science"` and `"Psychology"` against `"Computing Science"` too — same URL,
compatible degree_level/type/language, zero name relationship. **On a shared
catalogue-listing URL, "same URL" carries almost no identifying signal on its own** —
exactly what `programDedupKey`'s own header already established when the standalone URL
check was rejected — so the fix requires an *exact* name match after stripping whenever
more than one live row shares the URL, and flags nothing when no live candidate clears
the name bar. Re-run after each fix; Glasgow's 68/1 never moved.

Worth noting for its own sake: the Radboud "Dutch track" record this bug surfaced is a
**correct negative**, not a hidden duplicate — the researcher's own notes explain Radboud
genuinely runs separate Dutch- and English-taught tracks of the same subject name, and
only the English track exists live. Different language, both populated, correctly held
as substantive rather than cosmetic. The composite key's `language_of_instruction`
component is doing exactly the job its own header describes it for.

## 3. Full corpus reconciliation (why "one university" is a complete answer, not a gap)

| | records |
|---|---|
| Total corpus | 19,657 |
| Already attempted (in `program_research_queue`) — out of scope | 16,427 (83.6%) |
| Unresolved university | **0** |
| Uningested + resolved | 3,230 |
| Strict key already matches live — not this audit's concern | 1,874 |
| Strict key says "new" | 1,356 |
| — no live row shares the URL at all (genuinely novel or a different problem — out of this audit's scope) | 1,284 |
| — same URL, high-confidence convention-drift match | **68** |
| — same URL, medium-confidence convention-drift match | **1** |
| — same URL, but a real (non-cosmetic) field disagreement — correctly not flagged | 2 |

Every one of the 1,356 "strict-key new" records is accounted for in one of the rows
above; nothing is silently dropped. The 1,284 no-URL-match records include the large
first-time-coverage batches (McGill 288, McMaster 432, ASU 479, Dartmouth 53, …) —
these have no live rows to collide with at all, so this audit correctly has nothing to
say about them; whether they're good research is a different question for a different
pass, not a convention-drift question.

**Glasgow's other 32 records** (URL doesn't match any live row) are explicitly excluded
per BASORG's framing — plausibly genuine coverage (partnership, dual-degree, graduate-
entry, accelerated variants) needing adjudication against the official catalogue, which
is research work, not verification.

## 4. The general disease, not just this dedup key

BASORG's own framing, worth restating precisely because it changes what "fixed" means:
Glasgow is convention drift inside `normalizedName`/`degree_type` that a *matching* key
can't see. The `international_eligible` case RES-R1 surfaced (UNSW's value inferred from
CRICOS-code presence, Sydney's read from an explicit field — both sound, not
interchangeable, indistinguishable downstream once written) is the same disease in a
*meaning* rather than a *name* — no key comparison would ever catch that one, because
both values already agree on the wire; the drift is in what produced them. The
`field_provenance` closed-vocabulary field BASORG approved is the right shape of fix for
that version of the problem, and this audit's own experience argues for the general
principle it's built on: **a dedup key, or any other downstream check, can only compare
what two records assert — it cannot recover what was lost when two different collection
passes normalized the same fact two different ways before either record was written.**
The fix that actually closes the gap is provenance discipline upstream (declare how a
value was obtained, in a closed vocabulary, at write time), not a smarter comparison
downstream. This audit's tool is useful and should keep running every batch, but it is a
detector, not a cure — same relationship a linter has to a type system.

## 5. Update-vs-duplicate: relevant to RES-I1's supersede-gap package

BASORG asked me to say explicitly if any finding looks like an *update* to an existing
row (new/better information under a changed convention) rather than a pure duplicate,
since that's I1's separate supersede-gap problem (insert-only pipeline, can't retire or
revise an existing row) to design for.

**None of these 69 are updates.** Every high-confidence pair is the same fact, twice,
with a formatting difference on the researching side — the live rows are not stale or
missing information the research file has; applying the batch as-is would just duplicate
69 rows, not improve them. The one medium-confidence case (Dumfries campus) is the
closest thing to a content difference — the record adds a campus qualifier the live row
lacks — but it's a genuinely ambiguous case (same programme with an added detail, or a
distinct campus-specific offering that happens to share a URL) that needs a human
judgment call, not an automatic route to either "duplicate" or "update."

## 6. Review queue

Full detail (`research_program_id`, both names, university, URL, confidence, reason) in
`/tmp/audit-dedup-convention-drift-report.json` from this run — not committed (a
regenerable artifact, not a source document; re-run the tool for a fresh copy against
whatever's live at review time). Summary:

| university | high | medium | total |
|---|---|---|---|
| University of Glasgow | 68 | 1 | 69 |

68 high-confidence pairs: exact name match (after stripping one trailing degree-code
group), exact `degree_level`, `degree_type`/`language_of_instruction` differing only by
one side being null. 1 medium-confidence pair (Dumfries campus, §5) needs a human look.

**Recommendation, not a decision:** the 68 high-confidence pairs are strong candidates to
simply **not ingest** from `acquire-programs-batch2_2026-08-20.jsonl` (the live rows
already carry everything they carry); the 1 medium pair and Glasgow's other 32
(URL-unmatched) records need research/founder-level review before any ingestion
decision. This audit does not and should not make that call — flagging it for whoever
does (BASORG / RES-I1 / founder, per the org's own escalation path).

## 7. The reusable tool

`scripts/audit-dedup-convention-drift.ts` — read-only throughout (Supabase reads only;
`.env.local` / `SUPABASE_SECRET_KEY`). Reuses the real `resolveUniversity`,
`programDedupKey`, `normalizeProgramName` from `lib/programs/ingest.ts` /
`lib/programs/normalize.ts` rather than reimplementing them, so "would the real pipeline
currently call this a duplicate" is always answered by production logic, not a copy that
can drift from it.

```bash
npm run audit:dedup-convention-drift                          # whole corpus
npm run audit:dedup-convention-drift -- --file=<path.jsonl>    # one file
npm run audit:dedup-convention-drift -- --strict-language      # BASORG's original two axes only, no language tolerance
```

Intended to run on every future not-yet-ingested batch as a standing check, the same
ratchet discipline as `scripts/validate-research-records.ts` — a check that caught
something once should run on every batch thereafter.
