# The YÖK placement key is one field short — 23 real programmes have nowhere to land

**Found 2026-08-22 while applying the bilingual-name bridge. Ingestion deliberately NOT run.
288 rows were predicted; 0 were written.**

## What happened

The bridge work was correct and the dry run matched its prediction exactly: 288 rows to insert,
277 filled, 184 carrying a fee tier, all four score types present, zero ambiguous groups.

The apply failed on `university_program_placement_cycles_key_idx` with **0 rows inserted** — the
batch is atomic, so nothing was written and nothing needs undoing.

Two separate defects, one in the script and one in the schema. The first hid the second.

## Defect 1 — the script only checked the database, not itself

`scripts/ingest-yok-atlas-placements.ts` filtered candidate rows against a set built from
**live** placement rows, and never checked whether two rows *within the same batch* produced the
same key. Two records with an identical `(program_id, cycle_year, burs_orani_adi, fymk_id)` both
passed a filter that only knew about the database, and collided at insert.

Same shape as the `.map()`-over-a-static-snapshot bug the programmes pipeline hit: **claim the
key as you go; do not decide against a frozen view.**

Fixed. The within-batch check now runs alongside the live check, and a collision is *reported*
with both records rather than silently dropped — which is how defect 2 became visible.

## Defect 2 — the real one: 23 distinct YÖK programmes map onto one row each

Every one of the 23 collisions has **records that genuinely differ.** Not one is a duplicate.

Yıldız Teknik, İktisadi ve İdari Bilimler Fakültesi, same DB programme, same faculty, same score
type, same cycle:

| | kılavuz kodu | kontenjan | başarı sırası | taban puan |
|---|---|---|---|---|
| kept | 110190084 | 50 | 3,690 | 460.10 |
| dropped | 110110137 | 70 | 6,520 | 444.48 |

Two different quotas, a 2,830-place gap in ranking, and 15 points of cut-off between them. These
are **two real admission tracks** — almost certainly Turkish-medium against English-medium, or
day against evening (İÖ) — and `university_programs` holds a single row for both.

The unique index is `(program_id, cycle_year, COALESCE(burs_orani_adi,''), COALESCE(fymk_id,''))`.
It does not include `kilavuz_kodu`, which is **stored on the row and is YÖK's own stable
per-programme identifier** — the exact thing that distinguishes these two.

## Why this was not applied

Keeping the first of each pair and dropping the rest would silently discard 23 real admission
tracks, and a student looking at the surviving one would see the wrong quota and the wrong
cut-off for the track they actually intend to apply to. That is the failure this project has
spent two days removing everywhere else.

The dropped rows are not lost — they are in the fetched source file and reproduce on any re-run.

## What the fix probably is, and why it is not being made here

Add `kilavuz_kodu` to the unique index. It is already stored, it is an exact identifier, and it
is precisely the field that distinguishes the colliding pairs — the same reasoning that put
`degree_type` into the programme dedup key after Durham's BSc and MChem collapsed into one row.

That is a migration against a populated table, which needs the founder's authorisation. It is
also worth pausing on the deeper question rather than only widening the key: **if YÖK publishes
two admission tracks where we hold one programme, is the missing row in
`university_programs` rather than in the index?** Widening the key lets both placement records
land against one programme; splitting the programme would model what is actually true. The first
is cheaper and reversible; the second is more honest.

This belongs with the accumulated variant-field findings — Manchester's two UCAS codes under one
title, Wisconsin's Individual Major across three schools, NYU's accelerated versus traditional
Nursing, İstanbul Medipol's Burslu against Ücretli. **Five institutions, four countries, one
shape.**

## State

- Script fix committed. The within-batch check and its reporting stay regardless of the schema decision.
- `university_program_placement_cycles` unchanged at 456 rows.
- 288 rows remain unapplied. 265 would land cleanly today; 23 need the decision above.
