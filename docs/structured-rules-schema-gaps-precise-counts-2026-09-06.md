# Three schema/code gaps, precisely counted — 2026-09-06

Separate document, per CEO's explicit framing: these are product decisions, not fill
work. Each of the three gaps named in
[structured-rules-full-205-scope-2026-09-05.md](structured-rules-full-205-scope-2026-09-05.md)
is counted here by reading the actual `requirement_detail` text of every row it could
plausibly apply to — not estimated, not regex-guessed. Scope is the same CEO-confirmed
205 (`326`/`326`/`205`/`205`, re-verified exact).

## Correction to my own prior approximate number

The 205-scope report estimated finding 2 (letter-grade/IB-breakdown) as "Oxford's ~10 and
LSE's ~9" (and, in the per-university breakdown pass, loosely "~25" including Warwick) by
assuming every `minimum_grade` row at those three universities was letter/HL-breakdown
shaped. It isn't. Reading all 33 `minimum_grade` rows in the 205 scope individually, several
at Oxford and Warwick are GCSE-context language, holistic "we would not advise predicting
admission from this" prose, or "no universal offer stated" — not letter grades at all. The
verified precise count is **20**, not ~25. Correcting this here rather than letting the
rounder number stand.

## Finding 1 — Dutch VWO/HBO/propedeuse: no member in the `CURRICULA` enum

**16 rows.** Confirmed two ways: a `count()` against the exact 205-scope query with an
ILIKE match on `vwo|hbo|propedeuse` returns 16; an independent row-listing query with the
same filters returns the same 16 ids (12 Erasmus, 4 Amsterdam), reconciled.

- Erasmus (12): `6c8281dc`, `c6434bf1`, `956e3eac`, `1e861e72`, `25354278`, `9d1bd450`,
  `8d3f1ea1`, `daca85b7`, `10bc564f`, `e03da53b`, `192c2ad9`, `304c29d7`
- Amsterdam (4): `71a49965`, `78a01511`, `f90bdc65`, `93c6f093`

`CURRICULA` is `ap`/`ib`/`a_level`/`turkish_curriculum`/`national_curriculum`/`other`.
Mapping any of these 16 to `other` would match students who picked "other" as their own
curriculum type, not students who actually hold a VWO diploma or HBO propedeuse — a real
false-positive/false-negative risk in both directions, not a safe approximation.

**To close**: add a `dutch_vwo` (and, if the product wants HBO-propedeuse pathways
represented at all, a second) member to the enum, plus the matching onboarding/profile
UI option and the `curriculum` rule-kind comparison logic. Scope question for CEO, not an
engineering-only one: does the platform's profile model need to represent VWO/HBO at all,
or is this out of scope for the currently-targeted user base.

## Finding 2 — A-level letters / IB HL subject-breakdown: no numeric encoding

**20 rows**, precisely reclassified by reading the full text of all 33 `minimum_grade`
rows in the 205 scope (not by university total, which overcounts — see correction above).

| University | minimum_grade rows in scope | Letter/HL-breakdown shaped | Excluded (different reason) |
|---|---|---|---|
| Oxford | 11 | **8** | 3 — holistic "not for predicting admission" (`4b2be3a6`), GCSE context language ×2 (`608d7146`, `fa79ff4b`) |
| LSE | 9 | **8** | 1 — GCSE grade B(6) in two named subjects, a bundled-subject shape not a letter/HL-breakdown one (`2ca2092b`) |
| Warwick | 5 | **4** | 1 — "Warwick does not state one universal offer grade," no threshold on this row at all (`363d2109`) |
| Bocconi | 4 | 0 | AP numeric score, IB points-only, weighted test/GPA formula, portal-only GPA — none are letter/HL shaped |
| Caltech | 2 | 0 | Pure holistic prose, no numbers |
| Erasmus | 1 | 0 | Plain numeric GPA/points per curriculum (already counted under Finding 1 — Dutch curriculum row, not double-counted here) |
| MIT | 1 | 0 | "We accept whatever grades your school can make available" — holistic |
| **Total** | **33** | **20** | 13 |

Matching rows state things like `A*AA with an A* in Mathematics`, `39 (including core
points) with 766 at HL (the 7 must be in HL Mathematics)`, `A*A*A to include A* in
Mathematics`. `minimum_grade`'s schema is a flat `{minGpa: number, scale: string}` — there
is no field for a letter grade, no per-subject decomposition, and no way to require "7 in
this specific HL subject, 6 in these two others."

**To close**: needs either (a) a lookup table translating each letter/HL-breakdown string
to a comparable ordinal per curriculum (`A*AA`→ordinal, `766 w/ 7 in Maths`→ordinal +
subject constraint), or (b) a new structured-rule kind that holds a list of per-subject
minimums plus an overall floor. Either closes both the A-level and IB-breakdown shapes at
once, since they co-occur on the same rows at Oxford/LSE (a school states both its A-level
and IB equivalent offer on one requirement).

## Finding 3 — TOEFL Essentials misidentified as an iBT-family score by `needsScaleQualifier`

**1 row.** `3d327959-8cb8-4313-b82c-54eac0cb15a0`, Carnegie Mellon, `english_proficiency`:
"TOEFL Essentials: We require at least an 11 overall band score and give consideration to
those with subscores of 11 and above." `test_scale` is currently null on this row.

`needsScaleQualifier(testName)` matches on the bare substring "toefl," so a `minScore: 11`
structured rule for this row would be refused at evaluation time (`unstated_scale` review
reason) unless `test_scale` is also set to one of the `SCALE_FAMILY`-mapped iBT/PBT
values — but TOEFL Essentials is a genuinely different instrument, scored 8-16 per
section, not on the 0-120 iBT or 310-677 PBT scales at all. There is no correct value to
assign it among the existing families; forcing one would silently misrepresent the score.

**To close**: add a distinct `TOEFL_ESSENTIALS` family to `SCALE_FAMILY` (or exempt "TOEFL
Essentials" specifically from `needsScaleQualifier`'s bare-"toefl" match), so this one row
— and any future TOEFL Essentials row elsewhere in the catalog — can be structured
correctly instead of either misassigned or permanently blocked.

## Totals, for the threshold decision

37 of the 205 in-scope rows (18.0%) are blocked specifically by these three named
schema/code gaps — no overlap between the three (the one Erasmus row that is both
`minimum_grade`-typed and Dutch-curriculum-shaped is counted once, under Finding 1, and
correctly excluded from Finding 2's count since its content has no letters or HL
breakdown). The remaining 154 of the 191 unstructured rows are blocked by the other,
larger categories already named in the 205-scope report (per-component score subscore
floors, holistic-no-cutoff university policy, multi-instrument rows, procedural/no-
threshold text, multi-subject bundled coursework) — none of which are schema gaps; they
are either missing-fact-plumbing (subscores) or correctly-permanent `needs_manual_review`
verdicts.

Effort-to-impact, for the threshold call:
- **Finding 1 (Dutch curriculum, 16 rows)**: enum + UI + comparison-logic change, plus a
  product-scope call on whether to represent VWO/HBO at all.
- **Finding 2 (letter/HL-breakdown, 20 rows)**: the largest count, needs either a lookup
  table or a new rule-kind — the more structurally involved of the three.
- **Finding 3 (TOEFL Essentials, 1 row)**: smallest possible fix, one enum member or one
  regex exemption, unblocks this row and any future TOEFL Essentials row catalog-wide.
