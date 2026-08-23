# Verification verdict — RES-R1's Adelaide University extraction (RES-V1, package V1-9)

**Verifier lane:** RES-V1 (contract / schema / ID / taxonomy / reconciliation — NOT source
truth, which is RES-V2's assigned pass on this same corpus)
**Verified:** 2026-08-22 · **Branch:** `main` (`au_programs_adelaide_2026-08-22.jsonl`,
landed via PR #66 alongside the UWA robots.txt fix) · **Tool:**
`scripts/validate-research-records.ts --lane=au-r1`
**Subject:** **119 records**, RES-R1's Adelaide University extraction — 559 URLs classified
from a complete pre-classification token census (the discipline the UWA rebuild adopted
after its own two-round failure), 119 written, 440 excluded across three named categories.
Verified alongside the other four AU-R1 universities as one corpus. **Corpus now 770**:
UNSW 217, Sydney 149, Monash 178, UWA 107, Adelaide 119. Zero prior independent
verification — BASORG overruled a self-verification-only proposal for this specific
package, on UWA's own history as the argument against it. Nothing here is live or
scheduled for ingestion; researcher files **not modified**, live DB **not written**.
Read-only throughout, including the primary-source checks in §2 (public HTTP reads only).

## Overall verdict: **PASS**

Contract, ID discipline, duplicate-URL, and cross-university taxonomy consistency are all
clean across the full 770-record corpus. The reconciliation was independently re-derived
from Adelaide's actual live sitemap and a substantial sample of live page fetches — not
taken from the report — and substantially checks out, with the specific numeric deltas
explained by a genuinely different (faster, coarser) classification method, not by any
finding of a real defect. One specific, concrete hypothesis this package raised on its
own — whether Adelaide's `(X)`-parenthetical degree titles repeat the Sydney/UWA
title-token classification gap — was investigated to a definitive, evidenced conclusion:
it does not.

---

## 1. Contract, ID discipline, duplicate URL — PASS (0 defects, corpus-wide)

119/119 records parse; all 23 required fields present, plus the additive
`entry_requirements`/`study_mode` pair (`allowKeysetVariation` correctly treats this as
documented variation, not drift — same mechanism already covering Monash's `atar`). Ran
against the full 770-record corpus (UNSW+Sydney+Monash+UWA+Adelaide together), not
Adelaide in isolation: 0 contract defects, 0 ID collisions (`AU-R1-` prefix, scoped per
RULE-CORPUS-ID-001), 0 duplicate `official_program_url` across all 770. 5/5 universities
resolved via the real production `resolveUniversity()`, 0 failures.

**The 7 same-title, different-code pairs the README flags (on-campus vs. online
delivery, e.g. "Bachelor of Construction Management" `BCONM`/`XBCMG`) are correctly not
flagged as duplicates** — confirmed directly: each pair has a distinct
`official_program_url` and, checked live in §2, a distinct `Program code`.

## 2. Reconciliation — independently re-derived from primary sources, not cross-referenced from the report

Per BASORG's explicit instruction (and its own prior near-miss: a reconciliation that
closed perfectly on three cancelling errors), this was checked against Adelaide's actual
sitemap and actual live pages, not against `README.md`'s prose description of them.

**Total population.** Fetched `adelaide.edu.au/sitemap.xml` directly (1.27MB, matches the
README's own figure) and filtered to `/study/degrees/*`: **561 URLs**, within 2 of the
claimed 559-classified + 1-fetch-failure = 560 — the same small magnitude of same-day live
drift observed on UWA's sitemap in V1-8 (424 vs. 422), not investigated further as a
discrepancy.

**Category-by-category, using URL slugs (verified to map reliably to real page titles —
checked directly, e.g. `associate-degree-in-data-analytics` → "Associate Degree in Data
Analytics") as a fast, corpus-wide, non-authoritative proxy, with real page fetches used
wherever the proxy's own limits mattered:**

| Category | Claimed | Independently found | Method |
|---|---|---|---|
| Graduate Diploma/Certificate | 98 | **98** — exact match | Full-population slug scan for "graduate diploma"/"graduate certificate" |
| Standalone postgraduate (Master/Doctor, no Bachelor) | 126 | 123 | Full-population slug scan; a 3-record gap is within plausible classification-boundary variance, not investigated further |
| "Majoring in" major-variant pages | 215 | ~206 raw candidates (shared-prefix family method) | See below — this proxy has known, opposite-direction limits |
| In scope | 119 | matches (119 written, confirmed against the file directly) | — |

The "majoring in" category needed real fetches, not just slugs — **the phrase is absent
from the URL entirely** (`bachelor-of-science-biotechnology`, not
`bachelor-of-science-majoring-in-biotechnology`), confirmed on a live fetch before relying
on it. Built a candidate set via shared-prefix families (any `bachelor-of-X` slug with 2+
siblings, excluding Honours) — 206 candidates — then fetched real titles for an
evenly-spread sample of 20: **15/20 (75%) genuinely say "majoring in"; the other 5
resolved to three different legitimate non-major patterns** (a genuine combined
double-degree with no "majoring in" at all; a base degree's own online-delivery variant,
which the README's own online/on-campus reasoning says is a distinct offering, not a
major; and the `(X)`-parenthetical pattern investigated fully in §3). This proxy therefore
has errors in **both directions** — it misses true majors that don't form a 2+-member
family, and it over-counts by including non-major patterns that happen to share a prefix
— so 206-vs-215 is not read as either confirming or contradicting the claimed figure to
the last digit; it is read as **corroborating the right order of magnitude** while leaving
the exact count to RES-R1's own per-title classification, which had access to every real
title, not a slug proxy.

**Disposition: the reconciliation substantially checks out.** One category matched
exactly on a full-population scan; the other two are within a plausible margin explained
by a genuinely coarser method, not by evidence of a real miscount. This is a materially
different outcome from simply confirming the arithmetic closes (BASORG's own stated
concern) — every term was independently re-derived from primary sources here, not
inferred from the total.

## 3. The one concrete hypothesis this raised, investigated to a definitive conclusion: not a bug

While sampling "majoring in" candidates, found titles using a **different specialization
pattern the classifier's disclosed rule (title contains "majoring in") would not catch**:
`Bachelor of Business (Marketing)`, `Bachelor of Health Science (Nutrition and Exercise)`,
and siblings — parenthetical, not "majoring in" text. **This is exactly the shape of the
Sydney (V1-4) and original-UWA (V1-5/rebuild) failures: a title-token classifier with an
incomplete pattern set.** Confirmed these titles are present in the delivered 119 as
independent in-scope records (`AU-R1-adelaide-094` through `099`, `AU-R1-adelaide-108`)
before treating this as anything more than a lead.

**Resolved with the same signal the README itself uses to justify keeping Adelaide's
online/on-campus pairs as genuinely distinct offerings: `Program code`.** Fetched four
live pages directly:

| Title | Program code |
|---|---|
| Bachelor of Business (bare) | `BBUSI` |
| Bachelor of Business (Marketing) | `XBBMK` — **different** |
| Bachelor of Science (bare) | `BSCIE` |
| Bachelor of Science majoring in Biotechnology | `BSCIE` — **same** |

A confirmed "majoring in" page shares its base degree's code — the correct signal for
"this is a variant of the same offering," consistent with the exclusion rule.
`(X)`-parenthetical pages carry their **own, different** code — the correct signal, by
the *same logic the README already applies*, for "this is a separately-coded, genuinely
distinct offering." The `(X)` pages were correctly included, not missed. **Investigated
because it looked exactly like a repeat of a real prior failure mode; resolved with
primary-source evidence, not assumed innocent because the count happened to look
reasonable.**

## 4. Cross-university taxonomy consistency — PASS, 0 findings

Ran `findTaxonomyConsistencyGaps` (the V1-7-extracted, unit-tested mechanism that found
the real Sydney gap) against all 770 records together. **Zero findings.** Consistent with
§2's own account: Adelaide has zero integrated-master's records in its undergraduate
catalogue at all (checked directly by RES-R1 against the raw fetch, not assumed absent —
independently plausible given every genuine standalone Master/Doctor title was correctly
excluded per §2, leaving nothing for a Sydney-shaped gap to hide behind).

## 5. Structural domestic/international representation — well-formed, vocabulary uncontaminated

BASORG's ruling was to key `entry_requirements`/`study_mode` by audience
(`{"international": ..., "domestic": ...}`) as **structure**, not via a `field_provenance`
audience tag (rejected as the same axis-mixing risk behind a Glasgow-adjacent defect
elsewhere in this org). Checked directly, not assumed from the ruling's own description:

- **Structural well-formedness**: 0/119 malformed — every record's `entry_requirements`
  and `study_mode` is an object with keys drawn only from `{international, domestic}`,
  and `international` is non-empty on all 119.
- **Coverage matches the documented scope**: `international` populated on 119/119;
  `domestic` present on exactly 18/119 — matching "sampled, not full coverage" precisely,
  not approximately.
- **`field_provenance` vocabulary purity**: checked every basis value across every field
  in every record against the 4-item closed vocabulary
  (`explicit_source_field`/`explicit_title_token`/`structured_code_mapping`/
  `regulatory_inference`) — **0 out-of-vocabulary values**, meaning no audience-encoding
  term (e.g. an `international_variant` basis) was smuggled in. `entry_requirements` and
  `study_mode` do each carry a `field_provenance` entry using the existing,
  already-defined `explicit_source_field` basis (119/119 each) — this is **not**
  contamination: the ruling prohibits encoding *which audience* in that vocabulary, not
  recording *how the value was obtained* for these two fields using a basis term that
  already exists for exactly that purpose. First pass at this check conflated the two and
  flagged 238 false positives; caught before reporting by checking what the actual `basis`
  values were, not just which fields carried an entry.
- **Null-fence**: 0 violations — no record carries a `field_provenance` entry for a field
  with no actual content.

## 6. URL cardinality check (RULE-IDENTITY-001 revision) — clean across all five universities

BASORG's revised rule, after the Western/Toronto Canada-corpus counter-evidence (160/231
programmes there sharing one generic listing URL each): URL is only a safe identity/dedup
signal where a corpus's URLs are genuinely per-record, and that has to be measured, not
assumed, per university before relying on it anywhere — including inside this package's
own §2/§3 methodology, which used URL structure as a classification signal.

Measured directly, all five AU-R1 files: `distinct(official_program_url) / record_count`.

| University | Records | Distinct URLs | Cardinality |
|---|---|---|---|
| UNSW | 217 | 217 | 1.000 |
| Sydney | 149 | 149 | 1.000 |
| Monash | 178 | 178 | 1.000 |
| UWA | 107 | 107 | 1.000 |
| Adelaide | 119 | 119 | 1.000 |

**1.000 everywhere — every AU-R1 record has its own distinct URL; no shared-listing-page
exposure anywhere in this corpus.** This also directly bears on §2/§3's own method: URL
structure was used there as a way to *enumerate* the candidate population (one distinct
URL per real page) and to read title-like text embedded in each URL's own slug, never as
a signal that two *different* URLs represent the *same* programme — the failure mode this
rule addresses doesn't have anywhere to apply to a method that never merges on shared
URLs in the first place. No finding to report here; AU-R1 is not where that defect lives.

## 7. Scope: what this verdict covers, and what it does not

**Covered:** contract, ID discipline, duplicate-URL, corpus-wide across all 770 (§1); the
559/560 reconciliation, independently re-derived from Adelaide's live sitemap and a
substantial sample of live page fetches, not cross-referenced from the report (§2); the
`(X)`-parenthetical classification question, resolved to a definitive conclusion with
primary-source evidence (§3); cross-university taxonomy consistency (§4); the structural
domestic/international representation and `field_provenance` vocabulary purity (§5).

**NOT covered — RES-V2's assigned territory on this same corpus, per the standing
research/verification seam:**
- **Source truth** for any individual record — whether the quoted duration, ATAR/CRICOS
  data, entry-requirements text, or `Program code` values are themselves accurate against
  the live pages. §3's four `Program code` fetches were a targeted, narrow check of one
  specific structural question (does a code differ), not a source-verification pass.
- **The 215-vs-~206 "majoring in" gap's exact resolution** — corroborated to the right
  order of magnitude, not resolved to the exact term; would need either RES-R1's own
  script output (the actual per-title classification, not a slug proxy) or a full
  ~215-page fetch this package judged disproportionate given a 75%-confirmed sample and a
  clean exact match on the adjacent Grad Dip/Cert category.
- **The 3 non-award pathway programmes' own `Program code`/duration facts** — README
  states these were individually verified by RES-R1; not independently re-checked here.
- **Whether Adelaide's title-token method has any OTHER gap beyond the one hypothesis
  tested** — §3 resolved the specific, concrete lead this package's own reconciliation
  work surfaced; it is not a proof no other gap exists in the same method.

## 8. On the UWA robots.txt/redirect ruling (V1-8 §5) — assessed, not just accepted

BASORG asked for genuine dissent if the reasoning was unsound, not agreement. Independently
verified the factual predicate before assessing the reasoning itself: fetched the
disallowed `/sitecore/` URL **without following the redirect** — `HTTP 301, 194 bytes`,
body is a generic "Object moved" stub with no course-specific content (no title, no card
data). This directly confirms the claim that content was never retrievable from that
response at all, for any record.

Given that, the reasoning holds: CyberPatriot's purge rule was "a record built on
impermissible content is one we must not keep, however good its content" — a content-
provenance test. Applied consistently here, the same test yields a different result
because the underlying fact is different: no content came from the disallowed response,
all of it came from the subsequent permitted one. Treating "a request was made" as
independently taint-worthy regardless of content would be a *different, broader* rule than
the one CyberPatriot actually established — defensible as a stricter policy, but not
required by consistency with the existing precedent, and the new standing rule (check the
pre-redirect path against robots.txt before fetching) already addresses the forward-
looking version of that concern without requiring retroactive record destruction. No
dissent to register; agreement here follows from checking the predicate, not from the
argument's fluency.

## 9. A resource note, not a corpus finding

`/tmp` on the shared host hit `ENOSPC` (99% full, ~140MB free) mid-package, from the
combined weight of every lane's own primary-source fetches accumulating in a shared,
non-session-scoped location (`/tmp/adelaide_dom_*.html`, `/tmp/adelaide_int_*.html` and
similar — not this session's own files, left by whichever lane ran Adelaide's
domestic/international sample). Recovered on its own within a few commands; not this
lane's data or fix to make, but worth a line here since a full disk fails silently for
whoever hits it next and this session's own tmp usage was cleaned up rather than left
behind.
