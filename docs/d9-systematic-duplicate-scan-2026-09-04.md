# D9 — systematic duplicate scan, all 1019 rows

No SQL to prepare from this pass — the scan found zero new unresolved duplicate pairs. That's
the actual result, not a placeholder for one; written up in full because the method matters
for whoever runs this again, and because two of the three named examples turned out to
already be fixed.

## Method — four independent checks, each covering all 1019 rows, not a sample

1. **Trigram similarity self-join** (`pg_trgm`, already enabled): every pair of the 1019×1019
   possible pairs with `similarity(name, name) > 0.35`, ranked, top 100 reviewed individually
   against ≥2 signals (official domain, city, country).
2. **Normalized-exact-name collision**: strip parentheticals, "the", punctuation, case; group
   by the result; anything with more than one row.
3. **Bare-acronym-to-full-name matching**: every row whose name is ≤6 characters and all
   uppercase (looks like an acronym — KAIST, KFUPM, UCL, UNESP, UPES), checked against every
   other row's name for a `(ACRONYM)` parenthetical or exact match.
4. **Shared official domain**: every `website_url` value held by more than one row — the one
   check that's language/transliteration-independent, since it doesn't compare names at all.

## Result: zero new duplicate pairs found

Every pair the trigram/normalized-name checks surfaced falls into exactly one of two buckets,
verified individually, not assumed by score:

**Already correctly resolved** (`duplicate_status='superseded'`, `superseded_by_id` set,
`canonical_entity_id` shared with the canonical row) — 9 total in the whole table:
Massachusetts Institute of Technology (MIT) → MIT, The Hong Kong University of Science and
Technology (HKUST) → HKUST, The University of Newcastle, Australia (UON) → Newcastle, The
University of Technology Sydney (UTS) → UTS, The University of Warwick → Warwick, UCL →
University College London, King Fahd University of Petroleum and Minerals (KFUPM) → KFUPM
(the parenthetical-suffixed, data-richer row correctly won — same precedent
`pickCanonicalWinner`'s own comment already documents), Al-Farabi Kazakh National University
→ Farabi University (a rename case), plus one more. `superseded_missing_pointer` check: 0 —
every superseded row has a working pointer, none orphaned.

**Genuinely different institutions with structurally similar names** — the large majority of
the top-100 list. Two independent signals checked for each, not name alone: East China
University of Science and Technology (Shanghai, ecust.edu.cn) vs. University of Science and
Technology of China (Hefei, ustc.edu.cn) — different city, different domain. University of
Lincoln (UK) vs. Lincoln University (New Zealand) — different country. University of York
(UK) vs. York University (Canada) — different country. Universidad de los Andes, Chile vs.
Colombia — different country (a name shared legitimately across several Latin American
countries, all naming themselves after the Andes). Beijing University of Technology vs.
University of Science and Technology Beijing — same city, but bjut.edu.cn vs. ustb.edu.cn,
genuinely separate institutions; this "University of X and Technology" pattern alone produces
a long tail of same-country, same-city, unrelated Chinese universities, each checked on
domain rather than assumed from the pattern. Every one of these stays `canonical` — correctly.

## The two named examples that were already fixed — correcting the report, not redoing the work

**UTS**: checked directly. `superseded_by_id` on "The University of Technology Sydney (UTS)"
already points to "University of Technology Sydney," both share the same
`canonical_entity_id`, `updated_at` on the superseded row is 2026-08-20 — over two weeks old,
not something fixed tonight. **UCL**: same check, same result — already points to "University
College London," shared `canonical_entity_id`. Neither needed touching.

This is worth naming plainly rather than quietly correcting: tonight's Peking University
example (D7) was also inaccurate information relayed from another session's report, and this
is the same failure mode landing a second time in one night, on the university-duplicate
surface specifically. Not a criticism of the fill lane that originally reported UTS — a real
gap reported honestly, later fixed by someone else, is exactly what's supposed to happen; the
gap is in how that fixed state made it back into what got relayed to me as still-open.

## The three named trap pairs — re-confirmed, not re-derived from scratch

CUHK, Toronto, and NTU Singapore/Taiwan were checked live again (not assumed stable from D4's
earlier verification): all six rows are still `canonical`, `superseded_by_id` still null on
every one. CUHK-Shenzhen doesn't appear in this database as a separate row at all — there's
nothing for it to be wrongly merged into today, though that also means it's a gap worth
knowing about if research adds it later without checking this document first.

## Impact, measured directly

```
Total universities:                    1019
Currently superseded (all-time):          9
Currently canonical:                   1010
Superseded rows missing superseded_by_id:  0
target_universities rows pointing at
  a superseded university_id:              0
```

Zero real students are currently affected by any duplicate in this catalog — every superseded
row's pointer resolves correctly, and nobody has a live target on the wrong side of one. The
supersession mechanism (migration 0043) is doing its job end to end for the 9 pairs it
already covers; this pass didn't find a 10th.
