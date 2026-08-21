# Turkish Exams and Credentials — Research Package

Research-only package on the exams and credentials that govern a Turkish secondary student's path to university. Produced 2026-08-21.

**Rule ID range: `RULE-TR-EXAM-001` … `RULE-TR-EXAM-025`** (with `-B`/`-C`/`-D` sub-IDs for related claims at different verification levels). This range belongs to this package alone.

## Contents

| File | Covers |
|---|---|
| `01-udsp-identification.md` | **TASK 1** — what "UDSP" is, verified from MEB primary sources |
| `02-yks-and-obp.md` | YKS (TYT/AYT/YDT), scoring, weights, rank thresholds, OBP |
| `03-lgs-and-school-placement.md` | LGS exam, scoring, and high-school placement |
| `04-foreign-language-exams.md` | YDS / e-YDS / YÖKDİL, the ÜDS question, IELTS/TOEFL equivalence |
| `05-international-routes-and-credentials.md` | TR-YÖS, ALES/DGS scoping, MEB diploma abroad |
| `06-counseling-implications.md` | **TASK 3** — what a student should actually do, and what not to |
| `../../../data/research/turkish-exams/exams.json` | Machine-readable, 34 claims with per-claim provenance |

## Headline answer to TASK 1

**"UDSP" is real, current, and correctly remembered.** It is not a garbling of ÜDS, YDS or YÖKDİL.

**Uluslararası Diploma ve Sertifika Programı (UDSP) Yabancı Dil Yeterlilik Sınavı**, run by MEB, is a foreign-language exam that gates admission to IB, AP and IGCSE/AS-A-Level programs inside Turkish schools. Its governing directive was signed **7 August 2025** and its first centrally-run sitting was **27 June 2026** — which is why it postdates most reference material about Turkish exams.

It is also, arguably, **the most directly relevant exam in this entire package to ORYN's core user**: every other exam here concerns university entry, while UDSP decides whether a 14–16 year-old can enter the international-curriculum track at all.

## What is verified

Sourced to primary official documents that were retrieved and read in full — the MEB UDSP guide and directive, the ÖSYM YKS guides and official statistics, the MEB LGS guides, the ÖSYM equivalence document, the YÖKDİL and TR-YÖS guides, and Nuffic.

- **UDSP**: identity, legal basis, the ≥70 admission gate, score-ranked quota allocation, transfer *taban puan* condition, the transitional article making the central exam binding only from 2026-2027, full 2026 operational detail, scoring (no negative marking), eligibility routes, accessibility provisions.
- **YKS**: session structure and dates, question counts, the ¼ wrong-answer penalty, standardisation against the final-year cohort, TYT/AYT/YDT weights, minimum-score conditions, rank thresholds by field, DKAB substitution mechanics.
- **OBP**: formula, 250–500 range, the 0.12 coefficient, the explicit prohibition on school-level adjustment, and the halved-coefficient penalty for previously-placed candidates.
- **2026 YKS statistics**: official candidate counts and per-test means/SDs.
- **LGS**: two-session structure, the ⅓ penalty, Tablo-2 weights, three placement routes, full tie-break order.
- **Language exams**: the KPDS/ÜDS/YDS/e-YDS mutual equivalence, the closed list of accepted English exams, the TOEFL iBT conversion table, one-way equivalence, YÖKDİL's split validity.
- **TR-YÖS**: eligibility (including the exclusion of anyone schooled in Turkey), format, scoring.
- **Netherlands** credential recognition of the Turkish *Lise Diploması*.

## What is uncertain or unverified

Recorded honestly rather than filled in:

| Item | Status | Why |
|---|---|---|
| **UDSP gates Abitur** | `UNVERIFIED` | Claimed by secondary sources; **absent from every MEB primary source**. The German-language option is not evidence for it. |
| **UDSP skills breakdown / CEFR level** | `NEEDS_REVIEW` | MEB publishes neither. Post-exam question booklets exist and would settle it, but were not analysed. |
| **ÜDS/KPDS abolished by the 2013 Yönetmelik** | `NEEDS_REVIEW` | Regulation identified (RG 4/1/2013, No. 28518) but **both `resmigazete.gov.tr` and `mevzuat.gov.tr` failed TLS verification** here, so the repeal article was never read. What *is* verified: ÖSYM no longer administers ÜDS, and ÜDS scores remain equivalent to YDS. |
| **Whether Turkish universities accept IELTS** | `UNVERIFIED` | Verified only that IELTS is absent from ÖSYM's equivalence list. Institutional admission policy is separate and per-university. |
| **Diploma recognition outside the Netherlands** | `UNVERIFIED` | Only Nuffic checked. UK ENIC is subscription-gated; Germany is more complex; the US has no national authority. |
| **2027 cycles** (all exams) | `CURRENT_CYCLE_NOT_PUBLISHED` | Nothing published as of 2026-08-21. |
| **ALES/DGS detail** | `medium` confidence | Read from official exam-group and announcement pages, not extracted from their kılavuz PDFs. The operative point — both are structurally impossible for a secondary student — is not in doubt. |

## Not researched

Out of scope for this pass, and flagged rather than guessed:

- Per-school UDSP quotas and *taban puan* values (not published centrally; must be sourced per school).
- Per-university international-admission requirements for Turkish universities.
- Per-university English-proficiency and prep-year-exemption policies.
- MEB Denklik Yönetmeliği detail for students returning to Turkey from abroad.
- Bursluluk (scholarship) exams, TÜBİTAK olympiad structure, and özel yetenek (ÖZYES) mechanics beyond the placement formula.
- Open Education High School (Açık Öğretim Lisesi) route and its interaction with OBP.
- The MEB/TTKB syllabus document for YKS (cited by ÖSYM as authoritative; referenced, not analysed).
- 2026 UDSP outcome statistics (pass rates, score distribution) — MEB published question booklets and answer keys but no statistical report was located.

## Method and evidence standard

Applied throughout: **ACCURACY > PROVENANCE > FRESHNESS > COMPLETENESS > VOLUME.**

- Only official government/regulator sources (ÖSYM, MEB, mevzuat.meb.gov.tr) and one national credential-recognition body (Nuffic) were recorded as evidence.
- **Search results, prep-company pages, news outlets, forums and a politician's social-media post were used solely as discovery leads** and are listed in `exams.json` under `discovery_leads_not_used_as_evidence`. Every lead was checked against primary sources before anything was recorded.
- PDFs were downloaded and text-extracted locally so claims rest on the actual document text, not on a summariser's paraphrase. Where two copies of a document existed (the UDSP guide, published once as "Güncel"), both were downloaded and **SHA-256 compared** to rule out a silent version difference.
- Time-sensitive facts are labelled by cycle. The 2026 UDSP date moved by a week after first publication — that supersession is recorded explicitly rather than silently resolved.
- Retrieval failures are recorded in `exams.json` under `retrieval_failures`, with the rules they affect.

## Caveats for anyone building on this

1. **Nothing here should be carried into 2027 without re-verification.** Dates, fees, weights, question counts and rank thresholds all change between cycles.
2. **The two "OBP"s are different quantities** (`RULE-TR-EXAM-016`). Do not share a data model between them.
3. **Three exams, three wrong-answer rules** — UDSP none, LGS ÷3, YKS ÷4. Do not generalise guessing advice.
4. **Turkish central placement has no holistic component.** For a YKS-track student, ORYN's default "build a well-rounded profile" advice is not merely unhelpful — it competes for the only hours that move the outcome. See `06-counseling-implications.md`.
5. `06-counseling-implications.md` §"What ORYN must never infer" consolidates the 14 specific fabrication risks this research surfaced. It is the shortest useful checklist for anyone implementing against this data.
