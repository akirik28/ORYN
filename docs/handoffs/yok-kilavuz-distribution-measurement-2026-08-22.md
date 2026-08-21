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

## What this means for B6's open question

The design doc's B6 asked: *is the missing row in `university_programs`, or the missing column
in the placement-cycle index?* Reviewed by the coordinator against this measurement: **settled
in favor of widening the index.** Eighteen rows across two of twelve universities (2.3% of the
population) is not evidence of a modelling error, and a split migration on that basis would be
over-correcting from a sample too small to support it. B6's proposed migration
(`supabase/migrations/0059_schema_gaps_2026-08-22.sql`) stands as written.

That resolves the mechanical question. It does not resolve what the 18 rows' own composition
means, which is recorded below on purpose rather than folded into the recommendation above.

## A known inconsistency, recorded rather than acted on

**The 8 language-of-instruction rows (12 counting the 4 "both" cases) are a genuine
inconsistency in how this catalogue models Turkish programmes versus every other country in
it, independent of whether or how B6 ships.** `university_programs.language_of_instruction`
already exists as a first-class, product-facing column, and Oryn already treats "taught in
English" vs. "taught in Turkish" as a real distinguishing fact everywhere else in this
catalogue — the DE/NL and UK research lanes routinely model a bilingual track as two separate
`university_programs` rows, not one row with an internal admission-cycle-level split. A Yıldız
Teknik student choosing between the Turkish-medium and English-medium "İşletme" is choosing
between two genuinely different qualifications, with independent national ranking pools and
cut-off scores — the same shape this product already gives its own row to in every other
country's data.

Widening the placement-cycle index (B6, above) makes both of that programme's kilavuzKodu
records storable without a database error. It does not make them correctly modelled — a
student would still see one `university_programs` row named "İşletme" with two placement
cycles silently mixed inside it, with no `language_of_instruction` value on the row to tell
them apart, rather than two rows the way this same fact is presented for a bilingual
programme anywhere else in the catalogue.

**Twelve programmes across two of twelve Turkish universities is too thin a sample to migrate
on today.** It is not too thin to record as a known, specific inconsistency: a future Turkish
catalogue expansion — more universities, or closing the 136-record gap between what YÖK
publishes and what this catalogue currently names as a programme at all (see "The distribution"
above) — will very likely hit this pattern at a scale that does justify a split. Recorded here
so that expansion starts from a named, evidenced gap instead of rediscovering it from a fresh
collision.
