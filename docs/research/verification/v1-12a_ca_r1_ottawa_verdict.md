# Verification verdict — RES-R1's University of Ottawa extraction (RES-V1, package V1-12a)

**Verifier lane:** RES-V1 (contract / schema / ID / taxonomy / reconciliation — not source
truth, which is RES-V2's parallel pass on this same file) · **Verified:** 2026-08-22 ·
**Branch:** `oryn/res-r1-au-programmes` (not yet merged to `main`) · **Tool:**
`scripts/validate-research-records.ts --lane=ca-r1` (new lane, added this package —
Canada's own contract, modeled on `au-r1`, not previously formalized)
**Subject:** **276 records**, `ca_programs_ottawa_2026-08-22.jsonl`, IDs
`CA-R1-ottawa-001..276`. Read-only throughout: no live writes (Ottawa has 0 rows in live
`university_programs`, confirmed directly), no researcher-file edits.

## Overall verdict: **PASS**

Contract, ID discipline, and URL cardinality are clean on all 276 records. The
reconciliation was independently re-derived from Ottawa's own live sitemap census, not
cross-referenced from the report, and every term checks out: the 398-URL total, the
118-exclusion category, and the 4 hub/alias records are all confirmed against primary
sources, not taken on the researcher's word. One genuine, non-blocking taxonomy finding
surfaced (below) — informational, matching this lane's established practice of reporting
findings separately from defects.

## 1. Contract, ID discipline, URL cardinality — PASS (0 defects)

Built `CA_R1_CONTRACT` this package (`scripts/validate-research-records.ts`), modeled
directly on `AU_R1_CONTRACT` with one addition: Ottawa's file carries a `status_note`
field AU's corpus doesn't — added to `requiredFields`, no `allowKeysetVariation` needed
(all 276 records share the exact same 24-key keyset, checked directly). Result: 276/276
parse, 0 contract defects, ID set matches `CA-R1-ottawa-001..276` exactly (no gaps, no
duplicates), 0 duplicate `official_program_url` (cardinality 1.000/276). University
resolves to a single live `universities` row ("University of Ottawa",
`de0233db-dd80-4965-81d2-1894ab60caad`) via the real production `resolveUniversity()`.
Confirmed directly: 0 live `university_programs` rows for this university today — these
are genuinely new, pre-ingestion proposals, consistent with the rest of this corpus.
`field_provenance`: 0 out-of-vocabulary values, 0 null-fence violations, across all 276.

## 2. Reconciliation — independently re-derived from Ottawa's live sitemap, not the report

Fetched `catalogue.uottawa.ca/sitemap.xml` directly and filtered to `/en/undergrad/`:
**399 live URLs**, within 1 of the claimed 398 — the same small same-day-drift magnitude
seen on every AU sitemap check this lane has run (UWA 424 vs. 422, Adelaide 561 vs. 559),
not investigated further as a discrepancy.

**Computed the actual exclusion set directly** — not sampled from a list the researcher
handed over, but derived independently: every live `/en/undergrad/` URL minus every
`official_program_url` in the delivered 276. Result: **123 URLs unaccounted for** (vs.
the claimed 122 = 118 + 2 + 2, the same 1-URL drift as above), and **zero delivered URLs
missing from today's live census** — every one of the 276 records' own URLs still
resolves live, right now.

**Sampled 30 of the 123 (seeded, reproducible sample) and fetched each live**, checking
specifically for admission-independence language (the researcher's own stated test:
"independently admitted vs. concentration declared within an existing degree"). All 30
are `major-*`/`minor-*`/`mineure-*`/`majeure-*`/`certificate-*` URLs; none carry any
admission/eligibility/enrolment language on their own page. One directly confirms the
exclusion logic: **`major-psychology`'s own page states "refer to the Academic
Regulations for information on the Honours bachelor's with double major and the Honours
bachelor's with major and minor"** — explicit, source-stated confirmation that this is a
declared component of a base Honours bachelor's degree, not an independently admitted
program. Checked the two `certificate-*` pages specifically (certificates are the
subcategory most likely to be independently admissible at other institutions) for any
admission/eligibility/apply/enrol language anywhere on the page: **none found on either.**
120 of the 123 excluded candidates match this major/minor/certificate pattern by URL
(vs. the claimed 118 — within the same drift margin already established).

**The remaining 3 (not major/minor/certificate-shaped) fetched live and identified
precisely, not inferred from URL shape:**

| URL | Live h1/title | Identity |
|---|---|---|
| `catalogue.uottawa.ca/en/undergrad` (bare) | "Undergraduate Programs" | The catalogue's own index/hub page |
| `.../bachelor-social-sciences-interdisciplinary-studies` | "Bachelor of Social Sciences in Interdisciplinary Studies" | **Alias of `CA-R1-ottawa-022`** (same title, exact match) |
| `.../bachelor-social-sciences-major` | "Bachelor of Social Sciences in Interdisciplinary Studies" | **Alias of `CA-R1-ottawa-022`** (same title, exact match — confirmed `CA-R1-ottawa-022`'s own canonical URL is the shorter `.../bachelor-social-sciences/`, and its `program_name` is this exact string) |

This confirms "2 alias dupes" precisely — both URLs are aliases of one already-delivered
record, not two separate incidents — and confirms one of the "2 hub pages" directly. The
second claimed hub page was not independently located in today's census; given the same
~1-URL drift already observed twice in this reconciliation (399 vs. 398, 120 vs. 118),
the simplest explanation is a page removed or merged since the original fetch, not a
miscount — noted as unconfirmed rather than assumed.

**Disposition: the reconciliation substantially checks out**, re-derived from primary
sources rather than cross-referenced from the report. 118 exclusions (worth noting: 120
by this lane's own independent count, within established drift) verified by pattern and
by an evenly-sampled 30-record live check with zero counter-examples; 2 alias dupes
identified and confirmed with the exact record they duplicate; 1 of 2 hub pages
confirmed directly, the second unconfirmed but consistent with ordinary site drift.

## 3. Licentiate `degree_level: null` — confirmed intentional, exactly 2 records

Searched all 276 for "licentiate"/"licenc" in the title: 4 matches. Exactly 2
(`CA-R1-ottawa-231`, `CA-R1-ottawa-232` — the two *pure* Licentiate-in-Law records, with
no joint credential to anchor a mapping) carry `degree_level: null`. The other two
(`CA-R1-ottawa-225`, a joint LLL+MBA, and `CA-R1-ottawa-271`, the bijural JD+LLL National
Program) carry a filled degree_level, because each has a joint/companion credential that
gives it a defensible label the pure Licentiate lacks. This is exactly the claimed
pattern — a deliberate escalation for the two records with no defensible Canada-corpus
equivalent, not a gap.

## 4. `status_note` — free text, not a vocabulary; checked for both

**22/276 populated** (confirmed exact count). Read all 22 directly: every one is a
specific, verifiable, source-grounded sentence — 20 read "admission to [named program] is
suspended until further notice" (each naming a real, different program from this same
file), 1 reads "Coming in 2027". **None are short, generic, or enum-shaped** — there is
no sign of an invented category label standing in for free text. This field is
documented as verbatim source text with no enum, and the data matches that description.

## 5. Language read per-record, not inferred from the `/en/` URL path

`language_of_instruction` takes **12 distinct free-text values** across the 276 records
(`in English and in French`, `in French only`, `in French only to non-Francophones`, `in
English and only to non-Anglophone students`, etc.) — a distribution this varied is
itself inconsistent with a templated URL-based inference, which would produce a uniform
value. Checked directly: of 15 French-titled records identified by a diacritic/keyword
heuristic (undercounts the claimed ~26 — a narrow heuristic, not a recount attempt), 6
read `"in French only"`, 9 read `null` (unstated on the page — the safe default, not a
wrong guess), and **0 read `"in English only"`** despite every one sitting under
`/en/undergrad/`. No case where the URL's English path produced an incorrect English
language value.

## 6. One genuine finding, not a defect: Ottawa's own degree_level is internally inconsistent for combined bachelor+graduate credentials

Running the reused `findTaxonomyConsistencyGaps` check (built for the AU corpus's
AQF-based "integrated master's" distinction) surfaced 28 title/degree_level pairs where a
title names both a bachelor-shape and a graduate award (Master/Doctor) — worth stating
precisely rather than importing the AU-specific framing wholesale, since Canada has no
AQF and no "integrated master's" level in its own vocabulary at all. **The real, Canada-
native finding underneath the AU-shaped check output**: of Ottawa's own combined-
credential titles, **~23 (the "Honours Bachelor of Commerce ... and Master of Science in
Management" family, and the analogous Health Sciences/Human Kinetics ones) get
`degree_level: "Bachelor / first-cycle (Honours)"` — indistinguishable from a plain
Honours bachelor's, with no signal the title's own graduate component exists** — while a
smaller set (the joint LLL+MBA at 1, and 3 JD-combination records) **do** get a
degree_level that acknowledges more than a plain bachelor's ("Bachelor+Master joint
credential…", "First-entry professional doctorate…"). This is Ottawa's own corpus being
inconsistent with itself about whether a combined-credential title's graduate component
is reflected in `degree_level` — not a mismatch against an imported AU label, and not a
contract defect (the verdict stays PASS; this is a finding for RES-R1's judgment, matching
this lane's established practice of surfacing findings without gating the batch on them).

## 7. Scope: what this verdict covers, and what it does not

**Covered:** contract, ID discipline, duplicate-URL, `field_provenance` purity (§1); the
398/399→276+123 reconciliation, independently re-derived from the live sitemap and a
30-record live sample of the exclusions, not cross-referenced from the report (§2); the
Licentiate null pattern (§3); `status_note` vocabulary purity (§4); language-of-instruction
independence from URL structure (§5); one taxonomy finding, characterized in Ottawa's own
terms rather than the AU corpus's (§6).

**NOT covered — RES-V2's territory on this same file, per the standing seam:**
- **Source truth** for any individual record — duration, admission-suspension dates,
  language claims beyond the spot-check in §5, or `official_program_url` correctness
  beyond the reconciliation's own URL-existence check.
- **The exact count of major/minor/certificate exclusions** — 120 by this lane's
  independent count vs. 118 claimed; within the drift margin already established
  elsewhere in this reconciliation, not chased to an exact resolution.
- **The second claimed hub page** — one confirmed directly, the second not independently
  located; noted as unconfirmed, not assumed correct or incorrect.
- **Whether §6's finding extends to combined-credential records this package didn't
  examine individually** — the 28 (or ~23-27, by this package's own recount) identified
  by the reused check were characterized, not individually re-verified against their own
  live pages.
