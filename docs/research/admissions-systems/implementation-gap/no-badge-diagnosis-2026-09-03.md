# Why 42 institutions show no selectivity badge — and why the real number is bigger, on purpose

**Status: diagnosis only, nothing built.** Written 2026-09-03, re-confirming and extending the
42-institution finding from this session's own corridor re-measurement. Two questions asked
separately, as scoped: is the 42 still accurate and still firing for the intended reason, and
does anything outside those five countries produce the same no-badge experience for a different,
possibly unintended reason. Checked against `origin/main`@`e3942181` — re-verify if `main` has
moved.

## Part 1 — the 42, re-confirmed live

```sql
select u.country, count(*) as institutions
from universities u
where u.country in ('Sweden','Greece','Poland','Austria','Belgium')
group by u.country order by institutions desc;
-- Austria 10, Belgium 10, Poland 9, Sweden 8, Greece 5 = 42, unchanged
```

Still exactly 42, unchanged since the original measurement. Each of the five resolves to
`academic_rank_competitive` or `academic_threshold` on at least one pathway — confirmed by
re-reading each entry's shape declarations directly in `lib/admissions/system-shape.ts`, not
assumed from memory. `notApplicableKindForShape` (`outlook.ts:247-249`) still fires for exactly
those two shapes, unconditionally, before `classifyOutlook` runs. This is a deliberate
suppression, not a symptom — a `not_applicable` outcome for these 42 is the *correct* behavior:
each country's admission mechanism was researched and confirmed to have no reach/competitive/
likely-style reviewer step, so showing that scale would misdescribe the target. Nothing found
here contradicts the original finding.

## Part 2 — a second, genuinely independent, also-deliberate suppression pathway

`lib/admissions/field-availability.ts` (`checkUndergraduateFieldAvailability`) is a second route
to `isNotApplicable` (`outlook.ts:271-279`, first in the precedence chain, ahead of Gate 1's
shape check) — and it has nothing to do with the 42. It fires for exactly four (country, field)
pairs, precisely scoped and well-documented (RULE-ADMISSIONS-021): Medicine and Law are
graduate-entry-only in the **United States** and **Canada**. Neither country is among the 42's
five. This pathway is **field-dependent, not institution-fixed** — it only fires when a specific
student states Medicine or Law as their target field at a US or Canadian institution, so it isn't
a fixed count of institutions the way the 42 is; it's a fixed set of (country, field) pairs
applied per-student. The module's own design deliberately does not extend this to any other field
or country: "it does not return `offered` for fields it has not checked... every other (country,
field) pair is `unknown`, which suppresses nothing" (`field-availability.ts:22-27`). Confirmed via
its own dedicated test file that this stays narrow. Real, correctly scoped, not a bug — and not
part of the 42.

## Part 3 — the number that actually matters is not 42, and that's worth saying plainly

**"42" was always specifically the incremental contribution from tonight's ten-country expansion
— it was never the total population of institutions a realistic international applicant sees
suppressed.** The original 15-country registry already contained several
`academic_rank_competitive`/`academic_threshold` entries before tonight started. Re-checked every
registry entry's shape directly (not from memory) and queried live for the ones where the
**international pathway specifically** — the realistic default for most ORYN users, per AGENTS.md
§0's own target-user framing — resolves to a suppressing shape:

```sql
select u.country, count(*) from universities u
where u.country in ('Turkey','Germany','Netherlands','Italy','France','Switzerland','Spain',
  'Australia','New Zealand','Sweden','Greece','Poland','Austria','Belgium')
group by u.country order by 2 desc;
```

| Country | Institutions | Country | Institutions |
|---|---|---|---|
| Germany | 49 | Austria | 10 |
| Italy | 38 | Belgium | 10 |
| Australia | 37 | Poland | 9 |
| France | 30 | Sweden | 8 |
| Spain | 29 | New Zealand | 8 |
| Netherlands | 13 | Greece | 5 |
| Turkey | 12 | | |
| Switzerland | 11 | | |

**Total: 269 institutions, across 14 countries**, where a realistic international applicant sees
`not_applicable` rather than a confident-scale badge — not 42. The 42 is a real, correctly-scoped
subset (tonight's five new countries specifically); it was never the whole picture, and reporting
it as if it were would understate by a factor of roughly six how much of the catalogue this
mechanism already affects. Two further named, narrower cases exist independent of country-level
shape: `institutionOverrides` for **NTNU** (Norway) and **University of Toronto** (Canada) each
suppress regardless of the general country shape, for exactly those two named institutions.

This is not a defect distinct from Part 1 — it is the *same* deliberate mechanism doing the same
correct thing at the scale it was always designed to operate at. The only thing wrong was letting
"42" stand in as if it were the total, rather than naming it as the increment it actually was.

## What was not found

No evidence of an accidental, unintended, or bug-driven cause of a missing badge. Every
`not_applicable` outcome traced to one of exactly two deliberate, sourced, tested mechanisms
(shape-based, field-availability-based) or a small number of named institution overrides — never
to a silent failure, a missing lookup, or an unhandled case. Separately checked: the deprecated
`admissionSystemType: "credential_gate"` path (`outlook.ts:140-152,278`) is confirmed dead for
both real production callers (`lib/admissions/persist.ts`, `lib/universities/counseling-adapter.ts`
— neither references `admissionSystemType` anywhere, confirmed by grep) — inert legacy code, not
a live source of unexplained suppression.

Live `target_universities.outlook` data (`oryn-qa-scratch`) currently shows only two distinct
values across 20 rows — 17 `null`, 3 `extreme_reach` — with zero `not_applicable` rows on file
yet. This is a sample-size artifact of a scratch database with very few real targets, not
evidence the mechanism doesn't work; the 42/269 figures above come from checking the *logic and
the institution population* directly, not from searching for a `not_applicable` row that
happens not to exist yet in this small dataset. The 17 `null` rows are a genuinely different
question (per-student profile-confidence gating, or a target never yet viewed on its detail
page) — not investigated here, since it's a different axis from "which institutions" this task
was scoped to.

## Sources

- Direct reading of `lib/admissions/outlook.ts` (`notApplicableKindForShape`, the precedence
  chain, the deprecated `admissionSystemType` path), `lib/admissions/field-availability.ts` in
  full, and every registry entry's shape declarations in `lib/admissions/system-shape.ts` —
  confirmed against the file, not recalled from earlier in this session.
- Live queries against `oryn-qa-scratch` for all institution counts cited (the 42, the 269-total
  breakdown, and the `target_universities.outlook` distribution) — every number above was run,
  not estimated.

## Unresolved questions

Whether the 17 `null`-outlook `target_universities` rows represent a real gap (a target that
should have been refreshed but wasn't) or the expected state (never viewed, or a genuinely
thin profile) — a different diagnostic question from this one, not investigated. Whether the
269-institution figure should itself be surfaced anywhere product-facing (a catalogue-composition
question, similar in kind to the corridor-scope and applied-sciences-coverage items already in
front of the founder) — not this document's call to make.
