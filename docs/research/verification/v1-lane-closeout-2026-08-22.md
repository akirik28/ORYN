# RES-V1 lane closeout — 2026-08-22

**Written by:** RES-V1, at ORYN-BASORG's request, as insurance against session loss (6
sessions ended without warning today) — not a stopping point. RES-V1 remains available
for RES-R1's UWA rebuild once it lands.

**Purpose:** everything a successor verifier — or BASORG picking this back up cold —
would need without re-deriving it: what five packages actually certified, the validator
tool as a reusable artifact, every bug this lane's own tooling shipped with (found before
or after the fact), and the one open, unowned defect set with no researcher left to fix
it.

---

## 1. Five packages — what each certified, what each did not

Every verdict document has its own full §7/§8/§10 "scope: covered / not covered"
section — this is a consolidation, not a replacement. Read the source verdict for a
specific record's disposition; read this for "has anyone looked at X at all."

### P1 — DLOPP package 1 (`docs/research/verification/v1_dlopp_verdict.md`)
RES-R2 · 74 records · opportunity deadlines & cycle status · **PASS, ingestion GATED**

- **Certified:** contract (0 defects); ID discipline (0 defects); live identity (74/74
  exist, title/category match, `verification_state`/`status` as expected,
  `db_state_at_research` unchanged since capture); live-vocabulary gap (9 records use
  `cycle_status_found="unknown"`, no live-schema equivalent); monotonicity **erasure
  direction only** across 3 fields — 21 findings, none hypothetical (6/9 would have
  stripped a determined live `cycle_status`, including "open" on a student-visible row).
  This package is what got RULE-INGEST-003 ratified.
- **Did not cover:** source truth (RES-V2's remit — its 14/14 byte-verification was
  compared only after this verdict formed, per BASORG's instruction); monotonicity's
  **replacement** direction (both-populated-different) — this gap is exactly what RES-I2's
  guard later caught 79 holds of on this same batch, which is why every package from V1-3
  onward was instructed to check both directions; the ingestion decision itself on 4
  flagged records (Ron Brown, 120 Hours, IPsyO, STEM Racing) — routed for explicit
  sign-off, not resolved here.

### V1-2 — dedup-key convention-drift audit (`docs/research/verification/v1-2_dedup-convention-drift-audit.md`)
Whole uningested corpus · 19,657 records / 131 files · **audit, not a batch verdict**

- **Certified:** corpus-wide scan for the Glasgow-shaped blind spot (name/`degree_type`/
  `language_of_instruction` convention drift a matching dedup key can't see, gated behind
  an exact `official_program_url` match so it can't repeat the "Music [BMus]" name-only
  failure mode) — exists in exactly one place, University of Glasgow, 69/101 records (62
  reclassified as enrichment candidates, not duplicates, after catching my own first-pass
  mischaracterization); a live-internal scan for the same shape already inside ingested
  data — 114 raw candidates corpus-wide, 0 survive manual inspection (reported as a
  negative-but-weak result, not a clean bill of health, since the method doesn't safely
  generalize to live-vs-live).
- **Did not cover:** records with no URL match at all (1,284 corpus-wide, including
  Glasgow's other 32); cross-file research-vs-research duplication (two uningested files
  proposing the same programme); fields beyond the dedup key's own four
  (`faculty_or_school`, `campus`, `admissions_url`, tuition — §6's Harvard case shows
  `faculty_or_school` can be the actual distinguishing fact a URL+name match misses);
  convention drift that isn't name/`degree_type`/language shaped (a re-slugged URL for the
  same real programme — the `url_repair_*` lane's territory); within-file same-batch
  duplication (left to `decideIngestion`'s own key tracking).

### V1-3 — ECW3/ECW4 (`docs/research/verification/v1-3_ecw3_ecw4_verdict.md`)
RES-R3 · 77 records (55 + 22) · `eligible_countries` · **PASS**

- **Certified:** contract (0 defects, one consistent 16-key set across both waves despite
  a category change); ID discipline (0 defects); live identity (76/77 exact title match —
  1 explained researcher annotation, not a defect; 77/77 category/existence); monotonicity
  **both directions**, checked from the start per BASORG's instruction after the P1 gap —
  0 findings, and confirmed structurally (nothing was proposed to write in 76/77 records,
  so there was nothing to be a false-clean result); the specific named research
  distinctions BASORG asked about, spot-checked against full record content, not the
  `finding` label alone.
- **Did not cover:** source/content verification (RES-V2's half entirely); whether
  `no_statement_found`/`unresolved` classifications are themselves correct (a genuinely-
  open statement the researcher missed would not be caught here); the remaining ~191
  unresearched ECW4 candidates (this verdict covers only `ecw4_batch1.jsonl`'s 22); cross-
  file duplication outside the `ECW`-prefixed set; the `under_review`-status scope question
  (§6 — flagged, not resolved, though BASORG has since scoped future waves to active-only
  on the strength of this flag); ECW3-004's duplicate-pair lead (routed, not adjudicated).

### V1-4 — AU-R1 (`docs/research/verification/v1-4_au_r1_verdict.md`)
RES-R1 · 544 records (UNSW 217 / Sydney 149 / Monash 178) · Australian programme catalogue,
zero prior verification · **PASS**

- **Certified:** contract (0 defects, Monash's additive `atar` field correctly handled as
  documented variation via `allowKeysetVariation`, not drift); ID discipline (0 defects);
  zero duplicate `official_program_url` corpus-wide, **independently re-verified**, not
  taken from R1's own README; university-identity resolution (544/544 via the real
  production `resolveUniversity()`, 3/3 distinct universities, 0 failures); cross-
  university taxonomy consistency for `degree_level` — the check BASORG most wanted, and
  it found one real gap (10 Sydney combined bachelor's-plus-graduate-award records
  under-classified because Sydney's title-token method has no path to detect "Master
  of"/"Doctor of" — a disclosed method's coverage gap, not a concealed one); null
  discipline (0 leaked postgraduate credentials outside Monash's already-excluded 9);
  `field_provenance` closed-vocabulary and null-fence compliance (0 violations).
- **Did not cover:** source truth (durations, CRICOS codes, AQF values, titles — not
  fact-checked against the cited pages); whether Sydney's title-token method has *other*
  gaps beyond the Master/Doctor one found; Queensland, UWA, Adelaide (not yet researched —
  nothing to verify); Melbourne/ANU (deferred by R1 for bot-mitigation/robots.txt reasons);
  the Adelaide University canonical-identity question; whether the `field_provenance`
  closed vocabulary is itself the right taxonomy.
- **Post-verdict note:** RES-R1 has since pushed `1593e04` directly fixing the Sydney
  Master/Doctor gap this verdict reported. The verdict itself is left unchanged — it
  correctly certified what was true when it ran; rewriting it to match later reality would
  destroy the audit trail. Anyone re-running the `au-r1` lane today will correctly see a
  smaller (or zero) finding count on this specific class — that is expected drift, not a
  regression in this document.

### V1-5 — DLOPP P2/P3 (`docs/research/verification/v1-5_dlopp_p2_p3_verdict.md`)
RES-R2 (orphaned — session ended before this could be verified) · 116 records (87
`summer_program` + 27 remaining-category) · **one-way check, no researcher to return
defects to** · **FAIL on contract conformance; research itself checks out**

- **Certified:** ID discipline (0 defects, supersession-aware); `finding_type` taxonomy
  integrity (100% clean across all 116, same 4-of-5 values as P1, no drift); `status`
  breakdown (115 active / 1 disabled, independently confirmed); `academic_program`'s
  zero-row absence (independently confirmed genuinely absent — 3 candidate rows exist, all
  `unverified`, correctly out of this lane's scope, not silently unmentioned); supersession
  handling (2 rcheck records correctly recognized as intentional corrections, not
  duplicate research). See §4 below for the two contract-format defect classes this
  package's own FAIL rests on.
- **Did not cover:** source truth (the 92 prose `cycle_status_found` values, or any other
  quoted fact — RES-V2's half entirely); the Interlochen year conflict's actual resolution
  (§6 of the verdict — flagged with maximum precision, needs a direct non-summarizing
  re-fetch, not resolved here); whether the same format drift affects other DLOPP-lane
  free-text fields not checked (`confidence_reason`, `year_convention_note`); the correct
  ingestion-mapping design for the 92 prose values (explicitly not this verifier's call).

---

## 2. `scripts/validate-research-records.ts` as an artifact

975 lines, one file, zero dependencies on any other script in this repo except real
production code it deliberately reuses (`lib/programs/ingest.ts`'s `resolveUniversity`,
`lib/acquisition/paginate.ts`'s `fetchAllRowsVerified`/`PostgrestTarget`,
`lib/universities/canonical.ts`'s supersession helpers) — so "does the real pipeline
already treat this as X" is always answered by production logic, never a copy that can
drift from it.

**Posture, structurally enforced, not just documented:** read-only. It has no `--fix` or
`--apply` flag and must never grow one — `fetchLiveRows`/`checkLiveIdentityAndVocab`/
`customLiveChecks` all only ever issue `GET` requests. Per
`docs/ORYN-ORG-STRUCTURE.md`'s verifier/researcher separation, this script reports
defects; a human or an ingester acts on them.

**Four generic engine passes**, shared across every lane — a new lane is a config object,
never new engine branching, unless the lane needs a genuinely new check *shape* (see the
two escape hatches below, which is how that need has been handled twice already):

1. **`checkContract`** — every record parses; every field in `requiredFields` is present;
   exactly one field keyset across the batch, unless `allowKeysetVariation` is set.
2. **`checkIdDiscipline`** — within-batch: unique `idField`, unique `foreignKeyField`
   (supersession-aware — a record with `supersedes_record_id` is excluded from the
   duplicate-FK count on both sides of the pairing, not flagged as a same-row-researched-
   twice defect). Corpus-wide: does any of this batch's own IDs already exist, byte-
   identical, as someone else's ID anywhere in `data/research/**`? Scoped per
   RULE-CORPUS-ID-001 (exact-ID-string reuse, never blanket global uniqueness — the corpus
   has ~536 intentional revision-pair ID recurrences a naive global check would
   misreport). Requires `git`; skipped with a warning, not a failure, if git isn't usable.
3. **`checkLiveIdentityAndVocab`** — only runs when the contract sets both `liveTable` and
   `foreignKeyField` (the "verify against an existing live row" shape — DLOPP, ECW).
   Checks FK existence, `identityReconciliation` field-pair matches, optional
   `requiredLiveVerificationState`/`requiredLiveStatus`, and `enumVocabChecks` against
   each live CHECK constraint's *actual* vocabulary (hardcoded and dated in the contract,
   re-verify whenever a migration touches that column — this script does not introspect
   CHECK constraints live, since there's no single stable call for that across lanes
   without per-column plumbing).
4. **Monotonicity (RULE-INGEST-003)** — per-field `isRegression`/`describe` pairs in
   `monotonicityChecks`, run inside pass 3 against the same fetched live row. These land
   in `monotonicityFindings`, **not** `hardDefects` — they gate ingestion-mapping design,
   they do not fail the batch itself.

**Two generic escape hatches**, both added under real pressure from a specific lane and
both immediately reusable by any future one:

- **`allowKeysetVariation: true`** — skips the single-keyset check for a lane with a
  legitimate, documented additive field (Monash's `atar`; DLOPP P2/P3's rcheck-only
  `supersedes_record_id`). `requiredFields` is still enforced regardless — this only
  relaxes "exactly one keyset," not "these fields must exist."
- **`customLiveChecks?: (records, target) => Promise<{defects, findings}>`** — for a lane
  whose live-verification shape isn't "check one existing row by FK" at all. Built for
  AU-R1, whose 544 records propose brand-new rows with nothing live to reconcile against
  (university-identity resolution + corpus-internal duplicate-URL/taxonomy checks
  instead); reused as-is for DLOPP P2/P3's status-breakdown and supersession reporting,
  proving the hatch generalizes past its original motivating case.

**The three lanes currently registered** in `LANE_CONTRACTS`:

| lane id | researcher | live shape | records certified |
|---|---|---|---|
| `dlopp` | RES-R2 | FK-reconcile (`opportunities`) | 74 (P1) + 116 (P2/P3) |
| `ecw` | RES-R3 | FK-reconcile (`opportunities`) | 77 |
| `au-r1` | RES-R1 | `customLiveChecks` (new rows) | 544 |

**Adding a fourth lane:** write one `LaneContract` object (id, description, idField,
idPrefix, requiredFields, and whichever of the optional live-check/monotonicity/custom
fields the lane actually needs), add one line to `LANE_CONTRACTS`. Nothing else in the
file should need to change. If the new lane needs a check shape neither existing hatch
covers, add it as a new optional field on the `LaneContract` interface itself (the same
way `allowKeysetVariation` and `customLiveChecks` were added) — not as an `if (contract.id
=== "whatever")` branch inside the shared engine functions. That branching-vs-interface
distinction is the whole reason three structurally different lanes (FK-reconcile ×2,
new-rows ×1) have shared one engine without engine code forking.

**Standing condition, unresolved as of this writing — confirmed directly, not assumed:**
`find . -iname "*validate-research*" -not -path "*/node_modules/*"` returns only the
script itself. **This tool has no unit tests of its own.** Every validation to date has
been "run it, manually inspect a sample of the actual output before trusting a count,
calibrate against at least one known case" — a real discipline (it caught 4 of the 9 bugs
in §3 before they shipped), but one that depends on whoever runs the tool doing it by
hand, every time, correctly. §3's bug list is the concrete argument for why that's a real
risk and not a formality: this session hit two variants of the exact same failure shape —
a matching rule too loose or too strict — on three separate features (name-stripping
depth, `found_deadline`'s finding-type gate, the ID-collision substring match) despite
deliberate calibration each time. **Do not wire this script into any automatic path (a CI
gate, an auto-ingestion precondition, a scheduled re-run that acts on its output without a
human reading it) before it has its own test suite** — at minimum: the blob-hash
dedupe + JSON-field-value matching in `checkIdDiscipline` (already fixed twice for
different reasons, see §3.1/§3.8), the supersession-exclusion logic, one `isRegression`
test per existing `monotonicityCheck` per lane (the discarded `current_cycle_label`
check, §3.9, is exactly the failure class a test would have caught before it ever produced
43 findings), and `allowKeysetVariation`'s interaction with `requiredFields` (that a
relaxed keyset check still enforces required-field presence).

```bash
npm run validate:research -- --lane=<dlopp|ecw|au-r1> <file1.jsonl> [file2.jsonl ...]
```

Full JSON report (every defect/finding, machine-readable) writes to
`/tmp/validate-research-records-<lane>-report.json` — regenerable, not committed; re-run
before acting on any prior report's contents, since live values move.

---

## 3. Every bug this lane's own tooling shipped with, symptom first

Ordered by when it surfaced. The first three are `validate-research-records.ts`/DLOPP-P1;
4–7 are `audit-dedup-convention-drift.ts`/V1-2; 8–9 are `validate-research-records.ts`/V1-5
and, for #8, retroactively fixed in every lane at once. This list is deliberately more
valuable than any single verdict: it's the map of where *this kind of tool* goes wrong,
independent of which lane is being checked.

1. **Bare `origin` ref polluting the branch listing.** `git branch -r` lists the
   `origin/HEAD` symref as a bare `origin` entry alongside real `origin/<branch>` entries.
   An unfiltered listing fed that bogus entry into the collision-check's branch loop.
   **Fix:** filter requires `b.includes("/")`.
2. **Path-string same-file exclusion breaking on a mid-verification merge.** DLOPP P1
   merged to `main` via PR #13 while this verification was in progress. A path-string or
   branch-name exclusion doesn't recognize "same content, now reachable via a second ref"
   as the same file — produced **74 false-positive "collisions"** against the batch's own
   content. **Fix:** dedupe by git blob hash (`git hash-object` on source files,
   `git rev-parse <branch>:<path>` on candidates) — content identity is unambiguous
   regardless of how many refs point at the same bytes.
3. **Over-strict `found_deadline` finding-type gate.** First version of the logical rule
   assumed only `finding_type=dated_current_cycle` could carry a non-null `found_deadline`.
   `closed_historical` legitimately can too — a concluded cycle's deadline is a real,
   recordable historical fact, not a blank, per the DLOPP README. Left unfixed, this would
   have failed **8 correct P1 records** — verified directly against
   `data/research/opportunities/dlopp_batch*.jsonl` while writing this document, not taken
   on memory: `DLOPP-B1-08, B1-14, B2-02, B2-09, B3-15, B4-01, B4-02, B4-09`. **Fix:**
   `CAN_CARRY_DATED_DEADLINE` extended from `{dated_current_cycle}` to
   `{dated_current_cycle, closed_historical}`.
4. **Nested-bracket stripping (name-normalization).** A title like
   `"Archaeology [BSc/MA/MA(SocSci)]"` broke the first strip regex — the inner `(SocSci)`
   meant the whole trailing annotation survived unstripped, polluting the normalized name
   used for comparison. **Fix:** tolerate one level of nesting.
5. **Over-aggressive strip depth.** Fixing #4 by stripping *every* trailing bracket/paren
   group recursively over-corrected: `"Education with Teaching Qualification (Primary)
   [MEduc]"` lost `"(Primary)"` too — a real distinguishing qualifier, not a degree code —
   and stopped matching live's own `"...( Primary)"` name. **Fix:** strip only the single
   outermost trailing group.
6. **Same-URL last-write-wins `Map`.** Radboud University publishes one shared
   bachelor's-catalogue URL for 49 distinct live programmes. The first design kept only
   one arbitrary same-URL live row per university (a `Map`, overwritten on every insert),
   so 48 of 49 real candidates were silently unavailable for comparison — surfaced when
   `"Economics and Business Economics"` got compared against and flagged near
   `"Notarial Law"`, an unrelated live programme that happened to be the one row the `Map`
   still held. **Fix:** check *all* same-URL live rows, not last-write-wins.
7. **Loose same-URL name matching.** Fixing #6 wasn't sufficient on its own: without
   requiring an actual name match, "medium confidence" matched `"Arts and Culture
   Studies"` against `"Computing Science"`, and `"Psychology"` against `"Computing
   Science"` too — same shared URL, compatible `degree_level`/`degree_type`/
   `language_of_instruction`, zero name relationship. **Fix:** whenever a URL is shared by
   more than one live row, require an *exact* name match (post-stripping) before flagging
   anything at all; flag nothing when no candidate clears that bar. This is also what
   correctly keeps `"Music [BMus]"` out of the findings (§1's V1-2 entry, and the ORYN-CFO
   worked counter-example) — a name match without a URL match is never enough on its own,
   and after this fix, an URL match without a name match isn't either.
8. **Corpus-collision check matching raw substring text, not ID values — generic, fixed
   in every lane at once.** `ECW4-021` was flagged as colliding with two unrelated new
   RES-R3 batch files during a V1-5-triggered regression run. Cause: the collision check
   did `content.includes(id)` — a raw substring search across each candidate file's whole
   text — and `"ECW4-021"` appeared inside a *different* record's `notes` field as a
   legitimate prose cross-reference (`"...the CTY Residential Program, ECW4-021,
   succeeding earlier this wave"`), not as any record's actual ID. **Fix:** parse each
   candidate line as JSON, match only against known id-field *values*
   (`research_record_id`/`record_id`/`research_program_id`) — a prose mention of an ID can
   never trigger this check again, in any lane, since the fix lives in the shared
   `checkIdDiscipline` engine function, not a per-lane config.
9. **A monotonicity check built, found unsound, and removed — same risk class as a bug,
   worth cataloging alongside them.** A `current_cycle_label` (replacement) check
   (both-populated-different) produced 43 findings on its first run against DLOPP P2/P3.
   Two-part cause: (a) `current_cycle_label` is free text — exact-string inequality is a
   bad proxy for "meaningfully different"; 37/43 were pure paraphrase of the same fact
   (RULE-INGEST-004 puts free-text content judgment outside this guard's domain entirely);
   (b) the remaining 6 looked like genuine year disagreements but were a *structural* false
   signal, not just noisy phrasing — checked one directly (`DLOPP-SP-B2-23`): its own
   `db_state_at_research` and `researcher_notes` already showed live's value was correct,
   because `cycle_label_found` on a `closed_historical` record describes the *historical*
   cycle being reported on, never a proposed replacement for the live *current* label — no
   string-diff check can see that distinction. **Resolution:** removed the check; the
   reasoning is kept in the tool's own code comments (`validate-research-records.ts`,
   `DLOPP_CONTRACT.monotonicityChecks`) so a future lane extending this contract doesn't
   rebuild the identical mistake. The `deadline` (replacement) check built in the same
   package was *kept* — a date is structured and exact-comparable, so this specific failure
   mode doesn't apply to it.

**Pattern across all nine:** every one is a matching/classification rule that was either
too loose (4, 6, 7, 8 — treated two different things as the same) or too strict (3 — treated
one legitimate thing as two different things), and every one was caught only by reading a
sample of actual output before trusting a count, never by the rule looking correct on
paper. That discipline is exactly what §2's "no unit tests yet" gap is asking to stop
depending on any one person doing by hand.

---

## 4. The 325 unowned DLOPP P2/P3 defects, as a specification

Subject: `origin/oryn/res-r2-summer-programs` (PR #32, `dlopp_sp_batch1.jsonl` through
`dlopp_sp_batch6.jsonl` + `dlopp_sp_rcheck1.jsonl`, 89 records) and
`origin/oryn/res-r2-remaining-categories` (PR #41, `dlopp_p3_batch1.jsonl` +
`dlopp_p3_batch2.jsonl`, 27 records). RES-R2 is gone; nobody in this org's verifier lane
can fix these (verifiers don't edit researcher files); both ingesters are gone too. Per
BASORG: this does not block PR #32/#41 merging (merging lands research *proposals* on
`main`, not live facts) but must stay visible to whoever eventually ingests, or the
failure moves from loud to silent. Full defect detail, regenerated fresh, not from a
stale copy:

```bash
npm run validate:research -- --lane=dlopp data/research/opportunities/dlopp_sp_batch*.jsonl data/research/opportunities/dlopp_sp_rcheck1.jsonl data/research/opportunities/dlopp_p3_batch*.jsonl
```

### Defect A — 232 instances (2 fields × 116 records): missing `record_type`/`lane`

- **What's missing:** every one of 116 records lacks `record_type` and `lane`, fields
  P1's own contract required and P1's own 74 records all carried.
- **What they should be:** both values are **constant** in P1 — `record_type` is always
  the literal string `"opportunity_deadline_cycle_status"`; `lane` is always the literal
  string `"RES-R2"`. Confirmed constant across all 74 P1 records, not merely typical.
- **The fix is mechanical, not research:** since both target values are fixed constants
  matching the researcher and record type this whole DLOPP lane already is, backfilling
  both fields onto all 116 P2/P3 records requires no judgment call and no re-reading of any
  source page.
- **Blast radius if left undone:** zero live-data risk — these are administrative/lane-
  provenance fields, never mapped to a live `opportunities` column. The risk is entirely
  to future tooling: this validator's own `requiredFields` list (correctly) keeps failing
  every P2/P3 record on this contract check until it's backfilled, so anyone re-running
  `--lane=dlopp` against these files will keep seeing 232 defects that carry zero new
  information after the first read of this document.

### Defect B — 92 instances (79% of 116 records): `cycle_status_found` format drift

- **What's wrong:** P1's README defines this field as a short, 5-value controlled
  vocabulary (`open`/`closed`/`upcoming`/`date_not_announced`/`unknown`). 92 of 116 P2/P3
  records instead write full descriptive sentences (average 60 characters, max 206) — e.g.
  `"mixed — in-person high school sessions full/closed; the separate Pre-College Online
  Program remains open"`.
- **This is not a research-quality defect** — every one of the 92 prose values is a
  careful, evidence-dense, well-sourced description of what its page actually said, and
  several (the "mixed" example) are *more* accurate than any single one of the 5 enum
  values could express. Full text of every one of the 92: `verbatim_evidence` on the
  record itself, already quoted — nothing needs re-fetching to read what was found.
- **The actual open decision, one of two paths, genuinely not this verifier's to pick:**
  1. **Contract path** — decide whether `cycle_status_found` should be restored to a
     strict 5-value vocabulary (would require re-classifying all 92 records' *existing*
     evidence into the nearest of the 5 buckets — no new fetching, just a mapping pass) or
     the live vocabulary itself should grow to admit compound/qualified states (the
     "mixed" shape is a real, recurring page state a 5-value enum structurally can't
     hold).
  2. **Ingestion-mapping path** — leave the prose as authored, and derive live
     `cycle_status` at ingestion time from `finding_type` + a read (human or LLM) of the
     `cycle_status_found` prose, record by record, instead of a direct field copy.
  Whoever inherits this territory needs to make this call before any of these 92 records'
  `cycle_status_found` value can reach the live `opportunities.cycle_status` column — a
  direct field-mapping write is not possible today regardless of which path is chosen, since
  none of the 92 values parse against the live CHECK constraint as-is.

### Defect C — 1 instance: `DLOPP-SP-B2-28` (Interlochen Arts Camp), the highest-priority row in the batch

- Trips the `dated_current_cycle`-requires-`found_deadline` logical rule, but the
  underlying issue is a genuine, already-self-flagged, unresolved conflict, not a
  contract slip: live `deadline=2027-01-15` against the source page's own heading, "Key
  dates for **Camp 2026**... Priority Application Deadline: Jan. 15." Either the live
  value is a full year ahead of a possibly-stale page, or the page means the deadline
  already elapsed (2026-08-22 retrieval date) and live's 2027 is wrong. The record's own
  `conflicts` array states both readings and explicitly declines to guess.
- **What it needs:** a direct, non-summarizing re-fetch of the Interlochen page to resolve
  which year is correct — not a mechanical fix, not a mapping decision, a fact-check. Full
  detail: `v1-5_dlopp_p2_p3_verdict.md` §6.

---

RES-V1 status: idle, available for RES-R1's UWA rebuild once it lands.
