# YÖK kilavuzKodu distribution across all 779 Turkish `university_programs` rows

**Status: measurement only.** No database write. No migration applied. Answers the question
B6 of `docs/handoffs/schema-gaps-design-2026-08-22.md` raised and deliberately left open: *how
many of Oryn's Turkish programmes carry more than one real YÖK admission track, and what
distinguishes the multi-track ones?*

**Method, stated before the numbers so the numbers can be checked.** Reused the already-tested
`matchYokPlacements()` (`lib/programs/yok-atlas-matching.ts`) and `buildKilavuzBridge()`
(`lib/programs/tr-bilingual-name-bridge.ts`) exactly as `scripts/ingest-yok-atlas-placements.ts`
does — this pass writes no new matching logic, only aggregates the existing, validated
function's output differently. Source data: the full raw YÖK Atlas snapshot already fetched
2026-08-21 (`data/research/yok-atlas-placements-2026-08-21.json`, 1,005 records across all 12
universities — no new API calls made), the six sourced bilingual-name bridge files (306
kilavuzKodu pairings), and all 779 live `university_programs` rows for the 12 Turkish
universities (read via Supabase MCP `execute_sql`, read-only, snapshotted to
`data/research/tr-university-programs-2026-08-22.json`). Script:
`scripts/measure-yok-kilavuz-distribution.ts`.

---

## The distribution

| Distinct kilavuzKodu cleanly attributed | Programmes |
|---:|---:|
| 0 | 171 |
| 1 | 523 |
| 2 | 35 |
| 3 | 49 |
| 4 | 1 |
| **Total** | **779** |

**85 of 779 programmes (10.9%) carry 2 or more distinct YÖK admission tracks.** This is a long
tail, not a large share — most Turkish programmes (523/779, 67.1%) map cleanly to exactly one
kilavuzKodu, consistent with widening the index rather than a wholesale re-architecture.

**136 raw YÖK LISANS records have no `university_programs` name-counterpart at all** —
programmes YÖK publishes that this catalogue doesn't yet hold as a row, a separate and larger
gap than this measurement's scope, noted for whoever next works on Turkish programme-catalogue
completeness.

**3 ambiguous groups** could not be cleanly attributed to one programme by the current matcher:
two are the already-documented Istanbul University case (`docs/handoffs/
yok-atlas-placements-scale-12-universities.md` Finding 2) — "Siyaset Bilimi ve Uluslararası
İlişkiler," offered independently by both the Faculty of Political Science and the Faculty of
Economics, 2 real YÖK records against Oryn's 1 DB row; the third is a 2-DB-row group.

---

## What actually distinguishes the 85 multi-track programmes

**Not what the original B6 hypothesis guessed.** The write-up in the design doc guessed
"Turkish-medium against English-medium, or day against evening (İÖ)" from the single Yıldız
Teknik example that triggered the original collision. Measuring the full population shows a
different, sharper split:

| Cause | Programmes | Already safe under the pre-B6 key? |
|---|---:|---|
| Scholarship/fee tier (Burslu / %50 İndirimli / Ücretli) | 67 | **Yes — already distinguished by `burs_orani_adi`, already a key column** |
| Turkish-medium vs. English-medium split | 8 | No — needs B6 |
| KKTC (Northern Cyprus citizen) reserved-quota track | 6 | No — needs B6 |
| Both language and KKTC-quota variance | 4 | No — needs B6 |
| Day/evening ("İÖ") variant | **0** | — not observed anywhere in this population |

**The dominant cause (67/85, 79%) is fee tier, and the existing schema already handles it
correctly.** `university_program_placement_cycles_key_idx`'s current key —
`(program_id, cycle_year, burs_orani_adi, fymk_id)` — already includes `burs_orani_adi`, so
these 67 programmes' multiple kilavuzKodu records already produce distinct keys and would not
have collided even without B6. This population is overwhelmingly Koç and Bilkent (private,
foundation universities with 2–3 fee tiers per programme) — see the design doc's own worked
example (Koç Medicine: Burslu / %50 İndirimli, two tracks, zero collision risk under the
existing key).

**Only 18 of 779 programmes (2.3%) genuinely need something the current key doesn't have.** All
18 are concentrated at Yıldız Teknik Üniversitesi (14) and Gebze Technical University (4) — both
state technical universities running parallel-track LISANS admission, not the private
universities the fee-tier pattern comes from. None differ by `burs_orani_adi` (state
universities in this sample have no fee tiers at all — `tier=(none)` on every one); all differ
in `birimAdi`'s own text, specifically by:

- **Language of instruction** — e.g. Yıldız Teknik's "İşletme" (Turkish) vs. "İşletme
  (İngilizce)" (English), same faculty, same `puanTuru`, genuinely separate national ranking
  pools and cut-off scores.
- **KKTC-reserved quota** — a citizenship-gated seat pool for Turkish Republic of Northern
  Cyprus nationals, run alongside the general-pool track for the same programme and medium.

Full per-programme detail (all 18, every kilavuzKodu, faculty, and score-type value) is in the
script's own stdout — reproducible by re-running `npx tsx scripts/
measure-yok-kilavuz-distribution.ts`, not re-copied verbatim into this document to avoid a
second, driftable copy of the same data.

---

## What this means for B6's open question — reported as characterization, not a final decision

The design doc's B6 asked: *is the missing row in `university_programs`, or the missing column
in the placement-cycle index?* The measurement suggests the honest answer is **both, for
different subsets, and neither uniformly**:

- **The KKTC-quota cases (6, or 10 counting the 4 "both" cases partially)** are structurally
  closest to the fee-tier pattern already in the schema — a reserved seat-pool variant of one
  underlying educational product, not a second product a student would search for separately.
  Widening the placement-cycle key (B6's proposed migration) is a sufficient, correct fix for
  this subset on its own.
- **The language-of-instruction cases (8, or 12 counting "both")** are a different kind of
  fact. `university_programs.language_of_instruction` already exists as a first-class,
  product-facing column — Oryn already treats "taught in English" vs. "taught in Turkish" as a
  real distinguishing fact for every *other* university in this catalogue (the whole DE/NL/UK
  research corpus routinely records both tracks as separate rows when a university offers a
  programme in two languages). A Yıldız Teknik student choosing between the Turkish-medium and
  English-medium "İşletme" is choosing between two genuinely different qualifications, with
  independent quotas and cut-off scores, the same shape as any other bilingual-track programme
  this product already models as two rows elsewhere. This is real, if modest, evidence that for
  *this specific subset*, the missing row may genuinely be in `university_programs` — but 12
  programmes across 2 of 12 Turkish universities is not yet a population large enough to commit
  to a bulk-split migration without checking whether the same pattern recurs at the other 10
  universities' unmatched or ambiguous records too (this measurement did not check that).

**This document does not choose between the two paths — that decision, and whether to treat the
KKTC and language subsets differently rather than uniformly, is the founder's/coordinator's
call, informed by the numbers above rather than the single-example guess B6 started from.**
