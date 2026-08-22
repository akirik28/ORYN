# Verification verdict — ECW2 wave-2 eligible_countries batch (RES-V-R3W2)

**Verifier lane:** RES-V-R3W2 (combined RES-V1 + RES-V2 for this ≤22-record batch)
**Verified:** 2026-08-22 · **Branch:** `oryn/res-v-ecw2-verification`
**Subject:** RES-R3's `origin/oryn/res-r3-eligible-countries-w2` —
`data/research/opportunities/ecw2_batch1.jsonl` (ECW2-001..012),
`ecw2_batch2.jsonl` (ECW2-013..022),
`docs/research/opportunities-eligible-countries/WAVE2_ECW2_2026-08-22.md`.
Researcher files were **not modified**; live DB was **not written**. All live checks were
read-only (Supabase MCP, project `qtcvcflzxbuagvvwahhu`).

## Overall verdict: **PASS — cleared for ingestion (RES-I2)**

22/22 records pass contract, ID, identity, and source verification. Zero blocking
defects. Three non-blocking observations itemized at the end. One **URGENT
ingestion-priority flag** (Türkiye Scholarships, below).

Sampling: 100% — every record in the batch was source-checked, not just the ≥20%
minimum (batch ≤ 22, and the batch contains a student-facing-fact change proposal).

---

## URGENT ingestion priority — Türkiye Scholarships prose fix (ECW2-020)

**The researcher's finding is independently CONFIRMED.** Fetched
`https://www.turkiyeburslari.gov.tr/scholarshipsprograms` (official .gov.tr, fetched
cleanly 2026-08-22, no 403). The page's Criteria & Scholarship Programs section states
verbatim:

- Eligible: **"Citizens of all countries"**
- Ineligible: **"Turkish citizens and individuals who have lost Turkish citizenship"**
- Ineligible: **"Individuals who are currently enrolled in programs in Turkish universities"**

The live row (`34033f8a-51e1-4c73-9b7e-2e3819a348dc`) currently carries
`citizenship_restrictions = "Open to citizens of all countries."` and nothing else —
re-read live 2026-08-22 during this verification. For ORYN's core Turkish student
audience this row reads as eligible-to-them while its own official source says the
opposite. **Recommend RES-I2 apply the record's proposed `citizenship_restrictions`
prose ahead of everything else in this batch.** `eligible_countries` correctly stays
empty (inclusion-only field; an all-but-one enumeration would be fabrication).

## TechGirls (ECW2-017) — the batch's only DB-changing proposal: **37/37 EXACT**

Independently fetched `https://techgirlsglobal.org/apply/eligibility-and-application-2/`
(browser context; robots.txt checked first — no AI-crawler blocks, only `/wp-admin/`
disallowed) and compared the live 2026 list name-by-name against the proposal
mechanically (script, sorted character-level diff — not by eye):

- Live: AF 6 + EAP 6 + EUR 6 + NEA 7 + SCA 6 + WHA 5 + United States of America = **37**.
- Proposal: **37**, zero missing, zero extra, zero character-level mismatches.
- The single normalization — page prints "United States of America", proposal uses
  "United States" — matches the live table's own vocabulary (verified via
  `SELECT DISTINCT unnest(eligible_countries)`: `United States`, `Türkiye`,
  `United Kingdom` conventions confirmed; all other overlapping proposed names —
  Indonesia, Nigeria, Türkiye — already match the live vocabulary exactly) and is
  disclosed in the record's notes.
- Every caveat in the record is on the live page: citizenship AND residence gate,
  third-country-national contact requirement, 3-year ECA-travel exclusion,
  US-dual-citizen-abroad exclusion, family-member exclusions, 2026 application closed
  with mid-April decisions (cycle-specificity), girls-only framing ("young women").

**Populate proposal verified — safe to ingest** with the record's own cycle-refresh
caveat carried into freshness metadata.

---

## Contract / ID validation (V1) — all PASS

- **Parse & required fields:** 22/22 parse; all required fields present on every record
  (`record_id, lane, batch, opportunity_id, opportunity_title, category, finding,
  proposed_eligible_countries, proposed_action, verbatim_evidence, source_url,
  source_type, retrieved_at, fetch_method, confidence, notes`); `lane`/`batch`/
  `retrieved_at` internally consistent (all 2026-08-22, no synthesized dates).
- **ID discipline:** exactly ECW2-001..022, unique within and across batches; grepped
  the entire research corpus on `origin/main` (`data/research/**`, `docs/**`) — the only
  other "ECW2" occurrence is the org brief that defines the prefix. No cross-lane
  collision.
- **Live identity:** all 22 `opportunity_id`s exist in the live `opportunities` table;
  **all 22 titles match the records' claimed titles exactly** (not just ID presence);
  all 22 categories match. All 22 rows currently have empty `eligible_countries`,
  consistent with the batch's premise. The doc's category tally (research 12,
  internship 2, fellowship 4, scholarship 2, + Erasmus+ student_program + HOSA
  competition = 22) reconciles exactly with the records.
- **Only ECW2-017 proposes a populate** — all other 21 records propose no
  `eligible_countries` write, matching the doc's outcome table (14 confirmed-open /
  3 no-statement / 2 null-by-design / 1 unresolved / 1 prose-only / 1 populate).

## Source spot-checks (V2) — per-record results

All 14 confirmed-open records fetched at 100%; verbatim evidence checked against the
live page, not paraphrase. Legend: ✓ = quoted evidence found verbatim on the cited
official source, no restriction found, classification appropriate.

| Record | Opportunity | Source check | Verdict |
|---|---|---|---|
| ECW2-001 | AJSR | ✓ `ajosr.org/about/` — "from around the world" self-description; medium confidence appropriately reasoned | PASS |
| ECW2-002 | CJSJ | ✓ `columbiajuniorsciencejournal.org/faq` — worldwide sentence + graduate/gap-year gate both verbatim. Incidental URL-rot corroborated: `cjsjournal.org` returns no DNS answer while the new domain resolves and serves the site | PASS |
| ECW2-003 | Georgetown Pre-College | ✓ FAQ answer verbatim; only age-13+/English gates | PASS |
| ECW2-004 | Interlochen Review | ✓ submit-page invitation verbatim | PASS |
| ECW2-005 | IJHSR | ✓ "from any country" verbatim on submissions page | PASS |
| ECW2-006 | JEI | ✓ "YES! JEI takes submissions from outside of the United States." verbatim | PASS |
| ECW2-007 | JRHS | ✓ answer verbatim; the page has exactly the 12 FAQ headings the record claims were reviewed; medium confidence appropriately reasoned | PASS |
| ECW2-008 | Özyeğin HSRI | ✓ both quoted phrases verbatim; no country statement anywhere — RULE-ELIGIBILITY-010 correctly applied (no Turkey inference from on-campus format) | PASS |
| ECW2-009 | Pioneer Research Institute | ✓ FAQ sentence verbatim | PASS |
| ECW2-010 | RSI | ✓ both FAQ passages verbatim on `cee.org` (browser; robots.txt has no AI blocks) — including the page's own "Internationals students" typo, faithfully preserved. Sponsor-dependent annually-variable country set = RULE-ELIGIBILITY-009 exactly; null-by-design sound | PASS |
| ECW2-011 | SIP (UCSC) | ✓ applying page eligibility is age/graduation only; the quoted info-session label found on `/faqs/` (which the notes say was also read) — see observation 2 | PASS |
| ECW2-012 | STEM Fellowship Journal | ✓ "in any STEM field around the world" verbatim on /about (+ Aims corroboration as noted). robots.txt blocks only GPTBot by name; `*` rules permit /about — browser channel legitimate | PASS |
| ECW2-013 | InvestIN (provider) | ✓ 100-countries sentence + B2 requirement + visa note all verbatim; RULE-ELIGIBILITY-008 (visa ≠ restriction) correctly applied; medium confidence appropriate | PASS |
| ECW2-014 | InvestIN Young Lawyer/Political Leader | ✓ provider page governs (product page has no geographic eligibility, ages 15-18). Incidental stale-cycle claim confirmed exactly: product page still prints "31st July - 4th August 2021" | PASS |
| ECW2-015 | BRI Student Fellowship | ✓ eligibility sentence verbatim; no country statement; Philadelphia/DC capstone confirmed — RULE-ELIGIBILITY-010 correctly applied | PASS |
| ECW2-016 | Girl Up Project Awards | ✓ "allow anyone between the ages of 13-24 to apply" verbatim (browser; robots.txt no AI blocks); regional-administration structure on-page matches record | PASS |
| ECW2-017 | TechGirls | ✓ **37/37 exact** — see section above | PASS |
| ECW2-018 | Three Dot Dash | ✓ "75+ countries on 6 continents" verbatim; age 13-19 only gate; medium confidence appropriate | PASS |
| ECW2-019 | RISE for the World | ✓ mission sentence verbatim; dormancy claims independently reproduced: `apply.risefortheworld.org` → 301 to homepage, `/nominate` → 404. `unresolved` at low confidence is the honest classification | PASS |
| ECW2-020 | Türkiye Scholarships | ✓ **exclusion confirmed verbatim on official .gov.tr** — see URGENT section | PASS |
| ECW2-021 | Erasmus+ Youth Exchanges | ✓ all quoted statements verbatim across Programme Guide Part A + Part B (associated-country list, 13-30 residence rule, regions 1-4, Belarus/Russia, Georgia). Both claimed corrections are real against the live row prose: current prose frames country tiers without the residence-based participation mechanism and omits Georgia entirely. Null-by-design per RULE-ELIGIBILITY-009 sound | PASS |
| ECW2-022 | HOSA Competitive Events | ✓ `hosa.org/chartered-associations/` (browser; robots.txt no AI blocks) lists exactly 50 states + DC + Mississippi PS/C + American Samoa + Puerto Rico + Canada, China, Korea, Mexico. No Germany/Italy (row description confirmed stale live — it names them), no Turkey/Vietnam. "Korea HOSA" undisambiguated on-page, correctly not normalized. Supersession reasoning sound; null-by-design per RULE-ELIGIBILITY-009 sound | PASS |

## Honesty audit — PASS

- **HOSA conflict resolution (ECW2-022):** the resolving page is real, official, current,
  and genuinely supersedes both wave-1 lists; the researcher kept the record null anyway
  because the events→members→charters chain is inference — the conservative call, and
  correct under RULE-ELIGIBILITY-009. The stale-description incidental was verified live
  (description substring: "…including chapters in American Samoa, Canada, Germany,
  Italy, and Puerto Rico…").
- **RISE dormancy (ECW2-019):** every specific claim reproduced independently (301,
  404, no eligibility/application surface on the homepage). No prior-knowledge-as-
  evidence: the researcher explicitly refused to promote stale/secondary "ages 15-17
  worldwide" claims into a confirmed-open finding.
- **Null-by-design records vs RULE-ELIGIBILITY-009:** RSI (sponsor-mediated,
  organizer-determined, annually variable) and HOSA (affiliate/charter-mediated) are
  both squarely the rule's shape; Erasmus+ (tiered full/conditional eligibility)
  likewise. No record fabricates an all-countries list for a confirmed-open program
  (empty-means-unrestricted correctly preserved on all 14).
- **Confidence honesty:** the researcher's own medium-confidence flags (AJSR, JRHS,
  InvestIN ×2, Three Dot Dash) are all accurately reasoned — each is participation
  evidence or self-description rather than a formal rule, exactly as recorded. Nothing
  is over-claimed.

## Fetch discipline

robots.txt checked before every browser-context fetch: techgirlsglobal.org, hosa.org,
girlup.org, cee.org — none block AI crawlers (standard `/wp-admin/` / Drupal-path rules
only); journal.stemfellowship.org blocks **GPTBot only** by name, `*` rules permit
`/about`. No robots.txt AI-crawler block was routed around anywhere in this
verification. Turkish sources: `turkiyeburslari.gov.tr` fetched cleanly via WebFetch
(no 403 this time); `hsri.ozyegin.edu.tr` fetched cleanly.

## Non-blocking observations (no researcher rework required)

1. **ECW2-021 (Erasmus+) source attribution:** the `verbatim_evidence` concatenation
   spans two official pages (Part A eligible-countries + Part B youth-exchanges) while
   the single `source_url` field cites Part A only. The notes disclose both pages with
   dates, and every quoted sentence was verbatim-confirmed on one of the two. Also the
   Georgia quote drops the sentence tail "under this guide" without an ellipsis —
   meaning unchanged. Worth a two-URL evidence convention in future record contracts.
2. **ECW2-011 (SIP) quote location:** the quoted link label "SIP 2026 Recorded Info
   Session – International Applicants" was found on `sip.ucsc.edu/faqs/` (which the
   notes say was read), not on the cited `applying-to-sip/` page as fetched today.
   Could be page drift or a sidebar the markdown conversion dropped. Outcome (stays
   null under RULE-ELIGIBILITY-010) unaffected and correct.
3. **ECW2-006 (JEI):** the first evidence sentence is verbatim; the second ("Anyone is
   welcome to submit to JEI that meets our author eligibility criteria.") was confirmed
   in meaning by the fetch summary rather than re-read character-for-character. The
   operative worldwide statement is exact.

## Handoff notes for RES-I2 (via BASORG)

Ingestion order recommendation:
1. **ECW2-020 prose fix (URGENT — trust defect for the core Turkish audience).**
2. **ECW2-017 TechGirls populate** (37 entries verified; carry the cycle-refresh caveat
   + proposed `citizenship_restrictions` prose).
3. The optional prose proposals (ECW2-010 RSI, ECW2-021 Erasmus+, ECW2-022 HOSA
   residency tightening) — ingester/coordinator judgment, all verified accurate.
4. No other record changes the DB; the 14 confirmed-open findings belong in research
   notes/freshness metadata only (empty arrays stay empty — do not fabricate lists).

Incidental findings verified and worth routing (out of this batch's ingestion scope):
CJSJ URL rot (dead `cjsjournal.org` → `columbiajuniorsciencejournal.org`, for URL
provenance); InvestIN product-page 2021 dates + RISE dead application pathway (both for
RES-R2 cycle status); HOSA stale description naming Germany/Italy (data quality).
