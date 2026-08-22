# Dedup-key convention-drift audit — package V1-2 (RES-V1)

**Verifier lane:** RES-V1 · **Audited:** 2026-08-22 · **Assigned by:** ORYN-BASORG, following
the Glasgow near-miss (RES-I1 dry-ran `acquire-programs-batch2`, got 101 net-new / 0
duplicate for Glasgow — anomalous, opened before assigning the apply).
**Tool:** `scripts/audit-dedup-convention-drift.ts` (new, reusable).
**Posture:** report only. No files edited, no live writes, no dedup-key changes, no merges.
Every finding below is a **review candidate**, not a resolution (org rule 10).

## Headline result

**Uningested-vs-live: the blind spot is real, but — checked against the entire
not-yet-ingested research corpus (19,657 records across 131 files) — it currently
manifests in exactly one place: University of Glasgow's
`acquire-programs-batch2_2026-08-20.jsonl`, 69 of its 101 records (68 high-confidence, 1
medium).** No other university's uningested research shows this failure mode today. That
is a complete, corpus-wide answer to "where else does this exist," not a partial scan —
see §3 for the reconciliation that backs the "complete" claim. Of those 69, **62 are
enrichment candidates, not pure duplicates** — the research file populates a `degree_type`
the live rows currently lack (§5); only 7 add nothing live doesn't already have.

**Already-ingested-vs-live-internally: 114 raw candidates surfaced corpus-wide, 0 in the
CA lane — and 0 of the 114 survive manual inspection.** Already-live rows differing only
by a trailing qualifier are overwhelmingly genuine distinct programmes (citizenship-quota
codes, teaching-track degrees, campuses, specializations, delivery modes — §6), not
accidental duplicates; the method that works research-vs-live does not safely generalize
live-vs-live. Reporting that negative result, and the false-positive pattern behind it,
is itself the finding for this half of the package.

This is not a reason to stop checking: the tool is built to run on every future batch
(§9), and §4 argues the underlying problem is bigger than this one dedup key. §7 states
explicitly which failure classes this audit covers and which remain open.

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

### 2c. URL-exact-match is a prerequisite gate, not a corroborating signal — and why that distinction matters

ORYN-BASORG's original method spec for this package was name-first: *"strip trailing
bracketed/parenthesized degree codes, compare against live names... `degree_type`
NULL-vs-populated is the corroborating signal."* That is a method with no URL check in
it at all. What got built instead — described in §1 — makes an exact
`official_program_url` match a **hard prerequisite**: no code path in this tool ever
compares a record's name against a live row at a *different* URL. That distinction
turned out to matter concretely, not just in principle.

ORYN-CFO independently re-derived the Glasgow case and surfaced the worked counter-
example the name-first spec is vulnerable to: `"Music [BMus]"`
(`.../undergraduate/degrees/musicbmus/`) strips to `"Music"`, which live Glasgow
carries — but live's `"Music"` is the *MA* programme, at a *different* URL
(`.../musicma/`); `/musicbmus/` doesn't exist live at all. Two real, separately-admitted
degrees. A name-first method really would merge them.

Checked directly against this tool's own output rather than assumed either way:
`ACQ-PRG-2026-08-20-b2-2-70` ("Music [BMus]") is **not** among the 69 findings — it
correctly falls into the "no live row shares this URL" bucket (§3), alongside Glasgow's
other 32 out-of-scope records, and is never compared by name against anything. This is
cheap to re-verify independently — two greps and a JSON lookup, no judgment calls:

```bash
grep '"program_name": "Music \[BMus\]"' data/research/university-programs/acquire-programs-batch2_2026-08-20.jsonl
python3 -c "import json; print('ACQ-PRG-2026-08-20-b2-2-70' in [f['research_program_id'] for f in json.load(open('/tmp/audit-dedup-convention-drift-report.json'))['findings']])"
```

Recording this as a **validated negative case**, not a bug this tool needed patching
for: worked evidence the URL-first design already satisfies "a name-match without a
URL-match is a review candidate, never a merge" (now binding org-wide per BASORG,
constraining RES-I1's supersede design too). The general lesson generalizes past this
one tool either way: **suffix-stripping discards exactly the information that
distinguishes two real awards** — the same-shaped mistake as Glasgow itself (a key
*ignoring* a distinguishing field), just one level up (a normalization step *destroying*
one). Anyone implementing name-based matching without a URL (or equivalent hard
identity) prerequisite gate first is exposed to this; this tool isn't, and §6/§7 restate
that explicitly as a covered/not-covered boundary.

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

## 5. Enrich-vs-duplicate classification — I revise my own earlier framing here

**Correction to what I first wrote in this section**: my first pass called all 69 pure
duplicates ("the live rows already carry everything they carry — applying the batch
would just duplicate rows, not improve them"). That's wrong for most of them, and
BASORG caught it: live `degree_type` is **NULL on all 101 Glasgow rows**; the research
file *populates* it on most of what it proposes. Under RULE-INGEST-003, populating an
empty field is the **permitted** case — filling a live-null `degree_type` from a
record that has one is an UPDATE, not a discard, and skipping these outright would throw
away real information already in hand.

Reclassified all 69 findings on that basis — does the record carry a non-null value for
`degree_type` or `language_of_instruction` where the matched live row is currently null:

| classification | count | meaning |
|---|---|---|
| **enrich-shaped** | 62 | record's `degree_type` is populated, live's is null — an UPDATE target (populate-empty-field, RULE-INGEST-003-permitted) |
| **true-duplicate-shaped** | 7 | record adds nothing live doesn't already have — a genuine skip target |

All 62 enrichment cases are on `degree_type` specifically (Glasgow's `language_of_
instruction` is uniformly `"English"` live across all 101 rows, so it was never the
null side in this batch — `language_of_instruction` enrichment is a real category the
classification checks for corpus-wide, just empty here).

**This reclassifies the 62 from an insert-avoidance problem into an update-shaped one —
structurally the same missing pipeline path as RES-I1's 1,437 `url_repair_*`/
`tr_bilingual_names_*` records** (keyed by an existing `program_id`, can't go through
`decideIngestion` at all per RES-I1's own supersede-gap characterization). Two problems
that looked separate are the same missing capability: the pipeline can insert, not
update or supersede an existing row. If RES-I1's update/supersede path gets built, these
62 `degree_type` values are real, evidenced, ready-to-apply enrichment content for it —
not dead weight to discard.

The 1 medium-confidence pair (Dumfries campus) and Glasgow's other 32 (URL-unmatched)
records stay in §6's review queue, unclassified — the Dumfries case adds a campus
qualifier the live row lacks, which could itself be enrichment (append the qualifier) or
a genuinely separate offering; a human call, not this audit's to make either way.

## 6. Live-internal scan: already-ingested batches (new scope, added mid-package)

ORYN-BASORG asked whether the SAME convention-drift shape already exists **inside** the
live table — did a past ingestion insert the same programme twice, under two different
composite keys, because it already went through this failure mode before Glasgow's
batch was ever dry-run? Named the CA lane specifically (Montréal/Queen's/Alberta/
Western — RES-I2's already-applied 1,657) as the priority.

**Method**: group all 16,119 live rows by `(university_id, official_program_url)`;
within any group of 2+, check every pair with the same cosmetic-tolerant test §1 uses
(name after stripping one trailing bracket/paren group either direction, `degree_level`
exact, `degree_type`/`language_of_instruction` null-tolerant).

**Raw result: 114 candidate pairs corpus-wide, 0 in the CA lane.**

**Manually inspected all 114 — not a sample — before reporting a number, same discipline
as §2. Zero survive as genuine duplicates.** The method that correctly separated
convention-drift from real distinctions in research-vs-live data does not safely
generalize to live-vs-live: already-curated live rows differing only by a trailing
qualifier are overwhelmingly **real, separately-meaningful variants**, not accidental
duplicates from formatting drift. What the trailing qualifiers actually encode, by
volume:

| pattern | example | what it really means |
|---|---|---|
| Turkish citizenship/quota codes (61 pairs: METU, Ankara, Istanbul, ITU) | `"İnşaat Mühendisliği"` vs `"İnşaat Mühendisliği (KKTC Uyruklu)"` | different admission quota (TRNC-citizen track), different cutoff — genuinely separate placements, not the same programme |
| German teacher-training track (17 pairs, Freie Universität Berlin) | `"Physik"` vs `"Physik (Lehramt)"` | `Lehramt` = teaching-qualification degree — a different degree entirely, the exact shape of Glasgow's own `"Education with Teaching Qualification (Primary)"` lesson from §2a |
| Campus/location (9 pairs) | `"Civil Engineering"` vs `"Civil Engineering (METU Northern Cyprus Campus)"` | different physical campus |
| Specialization/entry-route (18 pairs: Southampton, Limerick, CMU, Toronto, Durham) | `"B.S. in Mathematical Sciences"` vs `"...(Discrete Mathematics and Logic)"`; `"...(Direct entry)"` | genuinely distinct concentration or admission route |
| Delivery mode (9 pairs, Istanbul/Ankara) | `"Sosyoloji"` vs `"Sosyoloji (Açıköğretim)"` | on-campus vs distance/open education — different programme |

The 2 remaining "exact name, no qualifier at all" pairs (Harvard `"Computer Science"` and
`"Government"`, each appearing twice) looked like the strongest candidates — checked
those individually against the live table directly, past what the tool itself compares.
Each pair is Harvard College's regular programme against **Harvard Extension School's**
ALB programme of the same subject name: different `faculty_or_school`
("Harvard Extension School (Division of Continuing Education)"), different `degree_type`
(`"ALB"` vs null), different `campus` string — a field this tool's comparison doesn't
use at all, and neither does `programDedupKey`. Genuinely different schools within
Harvard, not a duplicate. **0 of 114 survive.**

**Incidental finding, outside this audit's scope but worth routing**: those same 2
Harvard pairs share the identical `official_program_url`
(`https://www.harvard.edu/programs/computer-science/`,
`https://www.harvard.edu/programs/government/`) across two different schools — plausibly
a real URL-provenance defect (the Extension School likely has its own distinct URL,
not harvard.edu/programs/…), not a duplicate-programme question. Flagging for whoever
owns URL correctness (the `url_repair_*` lane's territory), not fixing here.

**On the CA lane specifically**: 0 raw candidates. Given this method's 0/114 survival
rate everywhere else it was tested, treat that as **weak, not strong, evidence** that
the CA lane is clean — the honest statement is "this check found nothing there, and
this check has a demonstrated near-100% false-positive rate on already-live data," not
"the CA lane is confirmed duplicate-free."

**What this means for the live-internal scan going forward**: it is not currently a
usable automated signal — every raw candidate needs the kind of manual, multi-field
inspection (`faculty_or_school`, `campus`, language-specific qualifier vocabulary) this
pass did by hand. The tool runs this scan automatically on every corpus-wide invocation
(no separate flag — it's cheap once the live table is already loaded for §1–§3) and
writes the raw candidate list to `liveInternalDuplicates` in the JSON report for anyone
who wants to re-run the manual check themselves; it should not be trusted as a
standalone duplicate detector without a materially different method (e.g. requiring
agreement on `faculty_or_school`/`campus` too, or a maintained list of "these qualifier
words are never cosmetic" per language/institution) — an escalation-worthy design
question, not something to build unilaterally here.

## 7. Scope: what this audit covers, and what it does not

Per the standing rule ORYN-CEO/BASORG established today (state failure classes covered
and NOT covered explicitly, rather than let a PASS/clean result imply more than what was
checked):

**Covered:**
- Uningested research records (not in `program_research_queue`) vs. live rows at the
  same university, same exact `official_program_url` — §1–§3.
- Cosmetic-drift axes checked: program name (after stripping exactly one trailing
  bracket/paren group), `degree_type` (null-tolerant), `language_of_instruction`
  (null-tolerant, an extension beyond the original spec — §2). `degree_level` held
  exact throughout, never cosmetic.
- Enrich-vs-duplicate classification on the `degree_type`/`language_of_instruction` axes
  — §5.
- A live-internal scan for the same shape already landed in already-ingested batches —
  §6 (manually resolved to zero survivors; not a reliable automated check as built).

**NOT covered — open classes, not confirmed-absent:**
- **Records with no URL match at all** (1,284 corpus-wide, including Glasgow's other 32)
  — genuinely-new-vs-mis-researched is a research/adjudication question, not checked
  here.
- **Cross-file research-vs-research duplication**: two different uningested files
  proposing the same programme under different research_program_ids. Not checked —
  only research-vs-*live* was in scope.
- **Fields beyond the dedup key's own four** (`faculty_or_school`, `campus`,
  `admissions_url`, tuition, etc.) as either a matching signal or an enrichment target.
  §6's Harvard case shows `faculty_or_school` can be the actual distinguishing fact a
  URL+name match misses — not audited systematically anywhere in this corpus.
- **Convention drift that isn't name/degree_type/language shaped** — e.g. a genuinely
  different URL for the same real-world programme (a site redirect, a re-slugged page)
  would not be caught by this audit at all; that is the `url_repair_*` lane's territory,
  a different failure mode with a different fix.
- **Whether any of the 1,356 "strict-key new" records are themselves internally
  duplicated against each other** *within* their own file (a same-batch dedup question,
  distinct from same-batch-vs-live) — not this audit's question; `decideIngestion`'s own
  within-batch key tracking already covers that at ingestion time regardless.

## 8. Review queue

Full detail (`research_program_id`, both names, university, URL, confidence, reason,
`classification`, `enrichableFields`) in `/tmp/audit-dedup-convention-drift-report.json`
from this run — not committed (a regenerable artifact, not a source document; re-run the
tool for a fresh copy against whatever's live at review time). Summary:

| university | high | medium | enrich-shaped | true-duplicate-shaped |
|---|---|---|---|---|
| University of Glasgow | 68 | 1 | 62 | 7 |

**Recommendation, not a decision** (§5/§6 change this from my first draft): the 62
enrich-shaped records are candidates for an UPDATE path once one exists (populate
`degree_type` on the matching live rows, per RULE-INGEST-003) rather than either a
straight ingest (would duplicate 62 rows) or a straight skip (would discard 62 real,
sourced facts); the 7 true-duplicate-shaped records are clean skip candidates; the 1
medium pair and Glasgow's other 32 (URL-unmatched) records need research/founder-level
review before any decision. This audit does not and should not make the update-vs-skip
call itself — flagging it for whoever does (BASORG / RES-I1 / founder).

## 9. The reusable tool

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
