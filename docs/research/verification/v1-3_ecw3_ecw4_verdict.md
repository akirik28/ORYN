# Verification verdict — ECW3 + ECW4 eligible_countries research (RES-V1, package V1-3)

**Verifier lane:** RES-V1 (contract / schema / ID / monotonicity — NOT source verification)
**Verified:** 2026-08-22 · **Branch:** `oryn/res-v1-validation` · **Tool:**
`scripts/validate-research-records.ts --lane=ecw`
**Subject:** RES-R3's `origin/oryn/res-r3-eligible-countries-w3` (`ecw3_batch1.jsonl`
ECW3-001..022, `ecw3_batch2.jsonl` ECW3-023..042, `ecw3_batch3.jsonl` ECW3-043..055 — the
complete wave-3 `competition`-category pool, 55/55) and
`origin/oryn/res-r3-eligible-countries-w4` (`ecw4_batch1.jsonl` ECW4-001..022, wave 4's
first batch of an in-progress ~213-candidate `summer_program`-category pool). **77
records total, both waves' first-ever V-pass** — nothing has verified RES-R3's output
since wave 2. Researcher files were **not modified**; live DB was **not written**; every
check below is read-only (Supabase MCP, project `qtcvcflzxbuagvvwahhu`).

## Overall verdict: **PASS**

77/77 records pass contract, ID, and live-identity validation. **Zero monotonicity
findings in either direction** (erasure or replacement) — a materially different risk
profile from the DLOPP batch, and §5 explains precisely why, not just that it's true.
One title-field annotation (ECW3-004) is explained, not a defect. One process
observation (§6, under_review-status scope) is flagged for BASORG, not ruled on.

---

## 1. Contract validation — PASS (0 defects)

77/77 records parse. **One consistent 16-key field set across every record in both
waves** — no drift introduced between ECW3 and ECW4 despite the category change
(`competition` → `summer_program`) and despite ECW4 introducing a new `fetch_method`
value (`database_prior_research` — a pre-existing DB field cited as evidence rather than
a fresh fetch; a legitimate addition to the vocabulary, not a contract break, since
`fetch_method` isn't checked against a closed live enum — it's a research-process label,
not a value written to any live column).

`finding` values: `confirmed_open_worldwide` (27), `no_statement_found` (40),
`compound_null_by_design` (5), `prose_proposal_only` (1), `unresolved` (4) — ECW4 uses a
strict subset of ECW3's five, no undocumented new category introduced.
`proposed_action` values: 7 distinct in ECW3, a subset in ECW4, every one either a
`none_*`/`defer_*` no-op or the single `propose_citizenship_restrictions_prose_only`
(ECW3-016) — checked for action/value consistency in logicalRules (0 defects: no record
claims a populate action without a populated array, and no populated array hides behind
a no-op action).

## 2. ID discipline — PASS (0 defects)

- 77/77 unique `record_id` within the combined set; 77/77 unique `opportunity_id` (no
  row researched twice, across either wave).
- **Corpus-wide collision check, run against the `ECW` prefix (deliberately broad — covers
  ECW2/ECW3/ECW4 together, per RULE-CORPUS-ID-001's scoping: exact-ID-string reuse, never
  a blanket global-uniqueness assertion)**: zero real collisions. ECW2's own IDs exist
  elsewhere in the corpus as expected (different records, different string values —
  `ECW2-NNN` never collides with `ECW3-NNN`/`ECW4-NNN`), correctly not flagged.

## 3. Live identity — PASS (1 explained, non-blocking finding)

76/77 exact `opportunity_title` matches; 77/77 exact `category` matches; 77/77
`opportunity_id`s exist live.

**ECW3-004** (`dfb94075…`, live title `"FRC (FIRST® Robotics Competition)"`) carries
`opportunity_title: "FRC (FIRST® Robotics Competition) [Turkiye chapter row]"` — the
researcher's own bracketed annotation, not a data error. Read the full record: RES-R3
found strong structural evidence (Turkish-language site, Fikret Yüksel Vakfı, regional
events named after Turkish cities) that this live row is specifically Turkey's national
FRC chapter, distinct from the already-confirmed-open global FIRST Robotics Competition
row (`db25d327…`, wave-1-closed). The researcher explicitly flagged this as **"likely a
near-duplicate... an incidental duplicate-pair candidate, not merged by this lane"** —
correct scope discipline (org rule 10: never fuzzy-merge). Worth a contract note for
future waves (the `opportunity_title` field's convention should say explicitly whether
researcher annotations are permitted in-field or belong in `notes` only), but not a
defect in this wave's research, and not blocking. The duplicate-pair lead itself is
routable to whoever owns opportunity dedup (a different concern from this lane's ECW
scope).

## 4. Monotonicity — checked BOTH directions (erasure AND replacement), 0 findings

BASORG's brief for this package was explicit that the DLOPP verdict scoped only erasure
(proposed-empty vs. live-populated) and that RES-I2's guard subsequently found
replacement cases (both-populated-different) the erasure-only check couldn't see. This
wave was checked for both from the start — and the honest reason it comes back clean is
structural, not because nothing was looked for:

- **`proposed_eligible_countries` is null on all 77 records — zero populate proposals in
  either wave.** There is nothing to write to this field anywhere in this batch, so
  neither erasure nor replacement is possible on the axis DLOPP's risk was concentrated
  on. (The monotonicity check for this field still runs and is retained in the tool —
  §7 notes this is a real, live-tested guard against a *future* wave that does propose a
  populate, not a check that happened to find nothing because it wasn't looking.)
- **Exactly one record proposes any write at all**: ECW3-016 (Breakthrough Junior
  Challenge), `propose_citizenship_restrictions_prose_only`. Checked live
  `citizenship_restrictions` for `0412d94f…` directly: **null.** This is a populate-
  empty-field write (RULE-INGEST-003's permitted case), not a replacement — confirmed,
  not assumed.
- Per **RULE-INGEST-004**, the monotonicity guard's domain is structural (is a live value
  already there), not content (is the proposed prose accurate). ECW3-016's actual prose
  quality/sourcing is explicitly **NOT adjudicated here** — that's V2's job. What's
  checked and clean: applying it cannot destroy or silently alter an existing live value,
  because there isn't one.

No other record in either wave proposes any DB write on any field this contract tracks.

## 5. Named-distinction spot-check — verified consistent, not just plausible

BASORG asked specifically whether R3's own documented distinctions are *applied*
consistently, not merely stated. Checked by reading the full record (evidence + notes),
not the `finding` label alone, for every named example:

**"International applicants as a defined eligible category with their own
requirements" (confirmed-open) vs. "has an international resources page" (no-statement):**

| record | opportunity | evidence (condensed) | finding |
|---|---|---|---|
| ECW4-011 | Duke Pre-College | "Applicants who are not U.S. Citizens must demonstrate English Language Proficiency [and need] a B-2 Tourist Visa" — non-citizens named as an addressed category with their own requirement, not excluded | `confirmed_open_worldwide` |
| ECW4-003 | Parsons Summer Intensive | differentiated international deadline + English-proficiency requirement, explicit non-exclusion | `confirmed_open_worldwide` |
| ECW4-010 | Cornell Precollege | dedicated international-applicants page exists, visa/SEVIS mechanics described, but **no affirmative "open to any country" sentence** — held to the forward-statement bar | `no_statement_found` |
| ECW4-015 | Georgetown | "meet classmates from around the world" + a resources-page reference; same bar, same gap | `no_statement_found` |
| ECW4-018 | Harvard SSP | visa-sponsorship mention (circumstantial) but no forward statement | `no_statement_found` |

The distinction holds exactly as described: a page that *addresses* international/non-
citizen applicants as a category with stated requirements gets credited; a page that
merely implies their presence (a resources link, a diversity-of-origin claim, visa-
support infrastructure) does not, consistently across all 5 checked records.

**RULE-ATTRIBUTION-001 (language attaches to the product, not the page):**

- **ECW4-020, Iowa Young Writers' Studio**: the fetched page's "anywhere in the world"
  language explicitly describes the *6-week online* track; this row is the *2-week
  in-person residential* track. The record explicitly declines to credit the online
  track's language to the residential row and records `no_statement_found` — flagged in
  its own notes as "IMPORTANT for the verifier," which it was.
- **ECW4-021, Johns Hopkins CTY**: same shape — "global community of peers" language
  identified as describing the *online* track, not the *residential* track this row
  represents; correctly not credited.

Both cases independently re-read against the record's own quoted evidence, not taken on
the `finding` label's word — the attribution discipline is real, not asserted.

## 6. Process observation (flagged, not ruled on): 15 of 55 ECW3 rows are `under_review`

**27% of ECW3's scope (ECW3-004, 005, 019, 021, 024, 026, 028, 030, 031, 032, 041, 042,
048, 052, 055) reference live opportunities whose `status` is `under_review`, not
`active`** — all 15 traced to the same `created_at` cluster (2026-08-18 23:57:51–
23:58:05), a single bulk-discovery batch that has not been through this product's admin
quality gate (AGENTS.md Phase 51). This is not a defect in RES-R3's records — each one
correctly researched what its own row currently says — but it is worth surfacing: if any
of these 15 rows are later disabled or merged away during their own pending review, the
eligibility research done on them here is spent on a row that may never reach a student.
Whether ECW's scope should exclude `under_review` rows (research after admin approval)
or intentionally run ahead of it (eligibility ready the moment a row is approved) is a
scope decision this audit surfaces but does not make.

## 7. Scope: what this verdict covers, and what it does not

Per the standing rule (state failure classes covered/not covered explicitly, established
after the DLOPP verdict's erasure-only gap went unstated):

**Covered:**
- Contract: parse, required fields, one consistent keyset across both waves (§1).
- ID discipline: within-batch and new-ID-vs-corpus uniqueness, `ECW`-prefix scoped
  correctly per RULE-CORPUS-ID-001 (§2).
- Live identity: existence, title, category for all 77 `opportunity_id`s (§3).
- Monotonicity, BOTH directions: erasure (proposed-empty-over-live-populated) AND
  replacement (proposed-populated-over-live-populated), on both `eligible_countries` and
  the one `citizenship_restrictions` prose proposal (§4).
- Internal logical consistency: finding/action/value agreement (§1).
- Spot-check of the specific named research distinctions BASORG asked about, verified
  against full record content, not the label alone (§5).

**NOT covered — open, not confirmed-absent:**
- **Source/content verification** — is the quoted `verbatim_evidence` actually on the
  cited page, verbatim, current. Explicitly RES-V2's half, not run here.
- **Whether `finding=no_statement_found`/`unresolved` classifications are themselves
  correct** (i.e., whether a genuinely-open statement exists that the researcher missed)
  — that's a source-verification question, not a contract one.
- **The remaining ~191 ECW4 candidates not yet researched** — this verdict covers only
  the 22 records in `ecw4_batch1.jsonl`; wave 4 is explicitly in progress and will need
  re-running this tool on subsequent batches.
- **Cross-file duplication** between ECW records and any other opportunities-touching
  research file outside the `ECW`-prefixed set (e.g., could a `wave5_*`/`independent_*`
  file propose a conflicting eligibility finding for the same opportunity_id) — not
  checked; out of this audit's declared scope.
- **The `under_review` status question (§6)** — surfaced, not resolved.
- **ECW3-004's duplicate-pair lead** (§3) — routed, not adjudicated; entity-merge
  decisions are explicitly not this lane's authority.

## 8. The reusable tool, extended

`scripts/validate-research-records.ts` gains a second lane (`ecw`), alongside `dlopp` —
proving the "one config object, not new engine code" design from package V1-2 holds
across a structurally different record contract (different field names, different live
table columns, a citizenship-restrictions prose-write path DLOPP never had). Same
posture: read-only, no `--fix`/`--apply` path, ever.

```bash
npm run validate:research -- --lane=ecw data/research/opportunities/ecw3_batch*.jsonl data/research/opportunities/ecw4_batch*.jsonl
```

Re-run this against every future ECW4 batch as it lands, and fold in ECW2 for a full
cross-wave pass if useful — the prefix scoping already supports it.
