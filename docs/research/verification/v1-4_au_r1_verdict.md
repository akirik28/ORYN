# Verification verdict — RES-R1 Australian programme catalogue (RES-V1, package V1-4)

**Verifier lane:** RES-V1 (contract / schema / ID / taxonomy — NOT source truth)
**Verified:** 2026-08-22 · **Branch:** `oryn/res-v1-validation` · **Tool:**
`scripts/validate-research-records.ts --lane=au-r1`
**Subject:** RES-R1's `origin/oryn/res-r1-au-programmes` — `au_programs_unsw_2026-08-22.jsonl`
(217), `au_programs_sydney_2026-08-22.jsonl` (149), `au_programs_monash_2026-08-22.jsonl`
(178) — **544 records, zero prior verification passes**, the largest unverified body of
work in the org. Nothing in this corpus is live or scheduled for ingestion; researcher
files were **not modified**, live DB was **not written**, every check is read-only.

## Overall verdict: **PASS**

544/544 records pass contract, ID discipline, duplicate-URL, and university-resolution
checks — including independent confirmation of every self-reported claim in R1's own
README, not a re-statement of them. **One real, well-evidenced taxonomy-consistency gap
found**: 10 Sydney records — combined bachelor's-plus-graduate-award programmes — carry a
less-specific `degree_level` than the equivalent real-world shape gets at UNSW/Monash,
because Sydney's classification method structurally can't see the difference. This is
exactly the check BASORG asked for most; §5 has the full mechanism, not just the count.

---

## 1. Contract validation — PASS (0 defects)

544/544 records parse. **23 fields common to all three files** (UNSW and Sydney are
byte-identical keysets; Monash is a strict superset, +1 field: `atar`, a structured
additive field the README documents as Monash-only — "Not retrofitted onto UNSW or
Sydney — neither platform publishes an equivalent field at all"). Validated as
intentional variation (`allowKeysetVariation`), not contract drift — the engine's
single-keyset check would otherwise have misreported a documented, deliberate design
choice as 544 records failing the same imaginary rule.

All 23 required fields present on all 544 records — confirmed programmatically, not
sampled.

## 2. ID discipline — PASS (0 defects)

544/544 unique `research_program_id` (`AU-R1-<university>-NNN`). **Corpus-wide collision
check against the `AU-R1-` prefix, scoped per RULE-CORPUS-ID-001** (exact-ID-string reuse
across the whole `data/research/**` tree, never a blanket global-uniqueness assertion —
the scoping this rule exists to prevent misfiring on): zero real collisions.

## 3. Zero duplicate `official_program_url` — verified independently, PASS

R1's README claims this for each file individually ("Zero duplicate `official_program_url`
across all 217" for UNSW; similar for Sydney/Monash) and once for the combined corpus.
**Checked directly rather than taken on the report's word**: built a URL→record-id map
across all 544 records from all three files together and confirmed every URL maps to
exactly one record. **0 duplicates, corpus-wide, independently confirmed.**

## 4. University-identity resolution — PASS (3/3, 0 failures)

Every record's `university_name`/`university_country` run through the real, unmodified
`resolveUniversity()` (`lib/programs/ingest.ts` — the same production function DLOPP/ECW
and the V1-2 dedup audit all use, not a reimplementation). **All 544 records resolve to
exactly 3 distinct live `universities` rows** (UNSW Sydney, University of Sydney, Monash
University), 0 unresolved. This is the check that would have caught a misspelled name, a
wrong-country pairing, or a university this corpus thinks exists but doesn't — none of
those occurred.

## 5. Taxonomy consistency — the check BASORG asked for most. Found one real gap.

**Method**: for every `degree_level` value used by more than one university, spot-checked
full record content (not just the label) to confirm the underlying real-world
qualification is genuinely the same across universities. Positive confirmations first,
since the one real gap is easier to trust in context:

- **"Bachelor / first-cycle (integrated master's)"** (UNSW 4, Monash 4): read all 8.
  UNSW's four (Medicine; Nutrition/Dietetics and Food Innovation; Pharmaceutical
  Medicine/Pharmacy; Exercise Science/Physiotherapy) and Monash's four (Actuarial
  Science+Master's; Architectural Design+Master's; Medical Science+Doctor of Medicine;
  Pharmacy(Hons)+Master's) are all genuinely undergraduate-entry, extended-duration
  professional programmes culminating in a master's-equivalent award — the same real
  shape, correctly labelled the same at both universities, via different but equally
  valid evidentiary bases (UNSW: AQF code `9_masters_extended`; Monash: `_combo` codes
  whose own `type` field reads `"Vertical double"`).
- **"Non-award enabling/pathway program (pre-bachelor's)"** (UNSW 3, Monash 3): read all
  6 — UNSW's University Preparation/Humanities Pathway/Indigenous Preparatory programs and
  Monash's Transition/Access/Advanced Preparation programs are genuinely distinct,
  institution-specific pathway programmes, correctly sharing the taxonomic concept.
- **"Bachelor / first-cycle (Honours)"** (UNSW 75, Sydney 54, Monash 57): spot-checked —
  Sydney's titles genuinely contain "(Honours)"/"Honours" as literal text (title-token
  method working as documented); Monash's `degree_type` values end in "(Hons)" (AQF
  `8_bach_hon_deg`/`8_7_combo`, consistent with the method's own stated basis).

**The gap: 10 Sydney records.** Sydney has no structured award/AQF field at all (per the
README, verified against the raw JSON key tree) — `degree_level` is derived by checking
each title for the literal tokens **"Honours" or "Diploma" only**. That two-token
classifier has no path to detect "Master of" or "Doctor of" in a title, so Sydney's own
combined bachelor's-plus-graduate-award programmes — the exact same real-world shape as
UNSW's/Monash's `integrated master's` records — fall through into the generic `"Bachelor
/ first-cycle"` or `"Bachelor / first-cycle (Honours)"` buckets instead:

| record | title | got | should plausibly be |
|---|---|---|---|
| AU-R1-sydney-026 | Bachelor of Arts and Doctor of Medicine | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-027 | Bachelor of Arts and Master of Nursing | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-048 | Bachelor of Design in Architecture (Honours) and Master of Architecture | `Bachelor / first-cycle (Honours)` | `...(integrated master's)` |
| AU-R1-sydney-113 | Bachelor of Pharmacy and Management (Honours) and Master of Pharmacy Practice | `Bachelor / first-cycle (Honours)` | `...(integrated master's)` |
| AU-R1-sydney-114 | Bachelor of Pharmacy (Honours) and Master of Pharmacy Practice | `Bachelor / first-cycle (Honours)` | `...(integrated master's)` |
| AU-R1-sydney-130 | Bachelor of Science and Doctor of Medicine | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-131 | Bachelor of Science and Master of Nursing | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-132 | Bachelor of Science and Master of Nutrition and Dietetics | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-135 | Bachelor of Science (Health) and Master of Nursing | `Bachelor / first-cycle` | `...(integrated master's)` |
| AU-R1-sydney-141 | Bachelor of Veterinary Biology and Doctor of Veterinary Medicine | `Bachelor / first-cycle` | `...(integrated master's)` |

**This is not a fact error.** Every underlying fact on these 10 records — title, duration
(6-7 years, consistent with a combined program), URL, evidence — is intact and, as far as
this audit can tell without doing V2's job, correctly sourced. It is a **classification-
consistency gap**: the same real-world programme shape is silently less specific at
Sydney than at UNSW/Monash, purely because Sydney's own disclosed method (title-token
matching for two specific words) was never extended to catch "Master"/"Doctor" tokens.
The researcher was transparent about the method's exact scope in every affected record's
own `researcher_notes` ("degree_level derived from title-text pattern matching
('Honours'/'Diploma' keyword presence)... Lower-confidence than the UNSW AQF-code
mapping") — this is a **coverage gap in a disclosed method**, not a concealed one, and
BASORG's framing ("same label must mean the same thing, or the corpus can't be counted")
is the right bar: right now, for these 10, it doesn't.

**Not found**: any equivalent gap running the other direction (an AQF-code-classified
UNSW/Monash record that should be LESS specific than it is). Structurally less likely
given AQF codes are a stronger evidentiary basis than title-token matching, and not found
in this pass.

## 6. Null discipline — PASS, nothing equivalent to Monash's 9 slipped through

Monash's README documents excluding 9 postgraduate credentials (Postgraduate
Diploma/Certificate/"Professional Certificate") that had a null `aqf_level` field,
correctly distinguished from the 3 genuine pathway programmes with the same null-field
shape. Scanned all 544 records (not just Monash's) for `program_name`/`degree_type`
containing "Graduate Certificate," "Graduate Diploma," or "Postgraduate," excluding the
already-accounted-for `integrated master's` bucket: **zero additional hits at UNSW or
Sydney.** UNSW's 217 and Sydney's 149 show no sign of an equivalent postgraduate-credential
leak.

## 7. `field_provenance` — closed vocabulary and null-fence, both PASS

Checked every `field_provenance` entry across all 544 records against the closed
vocabulary (`explicit_source_field` / `explicit_title_token` / `structured_code_mapping`
/ `regulatory_inference`, BASORG-owned): **zero values outside the set.** Checked the
README's own stated fence — a null-valued `degree_level`/`international_eligible` must
carry no `field_provenance` entry for that key ("nothing to attribute provenance to on an
unknown value"): **zero violations** (in fact `degree_level` is non-null on all 544
records — Sydney's own claim of exhaustively checking all 149 titles for the absence of
both tokens, independently reproduced here at 0 null values found).

Basis distribution matches the README's documented method exactly: UNSW 212
`structured_code_mapping` (AQF-derived) + 5 `explicit_source_field` (the `award_type_single`
records); Sydney 149 `explicit_title_token` (100%, consistent with "no AQF field exists
here"); Monash 175 `structured_code_mapping` + 3 `explicit_source_field` (the 3 genuine
pathway programmes, classified from `type` rather than `aqf_level`).

## 8. Scope: what this verdict covers, and what it does not

**Covered:**
- Contract: parse, required fields, documented keyset variation vs. real drift (§1).
- ID discipline: within-batch and corpus-wide new-ID uniqueness, `AU-R1-`-scoped (§2).
- Duplicate `official_program_url`, independently verified corpus-wide, not trusted from
  R1's own report (§3).
- University-identity resolution via the real production resolver (§4).
- Cross-university taxonomy consistency for `degree_level` — the check BASORG most
  wanted, with one real gap found and evidenced (§5).
- Null discipline / postgraduate-leakage scan across the whole corpus (§6).
- `field_provenance` closed-vocabulary and null-fence compliance (§7).

**NOT covered — open, not confirmed-absent:**
- **Source truth.** Whether the quoted facts (duration, CRICOS codes, AQF values, titles)
  are actually correct on the cited pages is not checked here — that's a source-
  verification pass this package explicitly excluded.
- **Whether Sydney's other title-token calls are complete beyond the Master/Doctor gap**
  — e.g., whether some other award type exists that neither "Honours," "Diploma,"
  "Master," nor "Doctor" would catch. Not checked; §5's finding is the specific gap
  found, not a proof no other gap exists in the same method.
- **Queensland, UWA, Adelaide University** — not yet researched by R1; nothing to verify.
- **Melbourne and ANU** — deferred by R1 for documented access reasons (bot-mitigation,
  robots.txt); this verdict has nothing to say about them.
- **The Adelaide University identity question** (README §3) — a canonical-entity
  resolution question for a future batch, not this one.
- **Whether the `field_provenance` closed vocabulary itself is the right taxonomy** — only
  whether the corpus complies with the vocabulary as currently defined.

## 9. The reusable tool, extended a second time

`scripts/validate-research-records.ts` gains a third lane (`au-r1`), and a real
engine extension this lane needed: `customLiveChecks`, for lanes whose records propose
genuinely new rows with nothing live to reconcile against yet (0 live
`university_programs` exist for these 3 universities) — a structurally different shape
from DLOPP/ECW's "verify against an existing live row." Also added
`allowKeysetVariation` for lanes with legitimate, documented per-source field
differences. Both are generic engine additions, available to any future lane, not
one-offs bolted on for this package.

```bash
npm run validate:research -- --lane=au-r1 data/research/university-programs/au_programs_unsw_2026-08-22.jsonl data/research/university-programs/au_programs_sydney_2026-08-22.jsonl data/research/university-programs/au_programs_monash_2026-08-22.jsonl
```

Re-run against Queensland/UWA/Adelaide as they land, and against Melbourne/ANU if
either deferral resolves.
