# Marmara Üniversitesi — research staged for catalogue addition (scoped narrower than Galatasaray/TOBB ETÜ)

**Status:** analysis + partial staging. No DB writes. **Author lane:** oryn-60, continuing the
Gate F / Turkish-depth thread (third Tier-1 candidate). **Base:** local `main`.

**Catalogue addition, same shape as the other two** — no existing `universities` row. **Scoped
narrower than Galatasaray/TOBB ETÜ deliberately**: at 126 raw LISANS records across 19 faculties,
a full line-by-line staged catalogue at the same completeness as the smaller two would be a
meaningfully larger, more error-prone undertaking (Turkish diacritics and faculty assignment
across 90+ distinct rows) than this pass's time budget supports honestly. What follows is a
verified structural summary and the clean findings — not a padded-out full JSON. Full per-
programme staging is a well-scoped next increment, not attempted here.

## Gate and domain — checked, clean

`looksOfficial('marmara.edu.tr')` → `true`, HIGH/`official_primary`. Both `www` and bare domain
resolve cleanly (200, no cert issue either way).

## Scale, precisely counted

**126 raw LISANS records → 99 "core" distinct subject×language-medium offerings**, after
excluding three non-independent variant categories (counted exactly, not estimated):

- **11 KKTC Uyruklu** — Northern Cyprus national-quota variants of an already-counted core
  programme, same shape as Galatasaray's own 1-seat KKTC variant.
- **6 UOLP-Uluslararası Saraybosna Üniversitesi (%25 İndirimli)** — a joint/dual-degree
  arrangement with the University of Sarajevo, each paired with a 25%-discount tuition tier. A
  genuinely distinctive fact about Marmara specifically (none of the other three candidates
  researched tonight have anything like it) — not independently verified against Marmara's own
  site this pass, so noted as a live-data-observed fact, not yet source-confirmed prose.
- **10 "(M.T.O.K.)"** — appears consistently on Teknoloji Fakültesi and İlahiyat Fakültesi rows.
  **What this abbreviation expands to was not established this pass.** Not guessed at rather
  than risk a wrong expansion in the catalogue.

**19 faculties**, the widest of any candidate researched tonight (Galatasaray: 4, TOBB ETÜ: 6).
Notably includes **İlahiyat Fakültesi (Theology)** with genuinely Arabic-medium instruction
(`ogrenimDiliAdi='Arapça'`, not a translated label) — a language/subject combination none of
the other three candidates offer, alongside German- and French-medium tracks elsewhere in the
catalogue. Marmara's language diversity (Turkish, English, English-30%, German, French, Arabic,
Arabic-30%) is broader than any other candidate researched tonight.

## Selectivity — clean, no TOBB-ETÜ-style correction needed

**Confirmed directly: Marmara carries almost no fee-tier structure** (`bursOraniAdi` is `undefined`
on all but the 6 UOLP-Sarajevo rows, which carry `%25 İndirimli`) — consistent with `DEVLET`
status, and unlike TOBB ETÜ's three-tier vakıf structure. **This means Marmara's peak-selectivity
figure does not carry the same fee-tier-artifact risk this project's own correction just found for
TOBB ETÜ.** Verified directly rather than assumed clean by devlet status alone: floored to
`kontenjan≥10`, the true best is **Özel Eğitim Öğretmenliği (Special Education Teaching), rank
2230, kontenjan 50** — exactly matching this project's original candidate-list citation (§2 of
`tr-university-candidate-list-2026-09-01.md`), so no correction is needed here.

## Admission facts

Domestic pathway: nothing institution-specific needed, `system-shape.ts`'s existing entry covers
it. International pathway page exists (`uluslararasi.marmara.edu.tr`) but was not fetched this
pass — named as unresolved rather than guessed, same discipline as TOBB ETÜ's unresolved
entrance-exam question.

## What this does NOT do

- No `universities`/`university_programs`/`university_program_placement_cycles` rows inserted.
- No full 99-row programme catalogue staged as structured JSON this pass — the scale genuinely
  warrants its own dedicated pass rather than a rushed one riding on tonight's momentum. The raw
  99-row list (faculty, name, language) is reproducible directly from
  `yokatlas.yok.gov.tr/api/tercih-kilavuz/search` filtered to `universiteAdi='MARMARA
  ÜNİVERSİTESİ (İSTANBUL)'` — not re-attached here to avoid a large, unreviewed data dump.
- No expansion of "M.T.O.K." guessed at.
- No verification of the UOLP-Sarajevo joint-degree arrangement against Marmara's own official
  description of it — flagged as observed-in-data, not yet source-confirmed.
- No international-pathway admission facts — page identified, not fetched.
