# Waterloo/CEMC split — measured impact + plan (not executed)

## The problem, restated precisely

`opportunities` row `51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8` ("Waterloo Mathematics and
Computing Contests") represents CEMC's whole contest catalogue as one row with one
`eligible_grades` value. The catalogue itself spans multiple, genuinely distinct contests
with different grade bands (Beaver Computing Challenge: grades 5-10; Gauss: 7-8; Team Up
Challenge: 6-8; the Senior/Intermediate Mathematics Contests, Canadian Computing
Competition, Pascal/Cayley/Fermat, Fryer/Galois/Hypatia, Canadian Team Mathematics Contest:
9-12; Euclid: grade 12 only). No single `eligible_grades` array can represent this
honestly — whatever value is chosen either wrongly includes a grade that's shut out of the
narrower contests (a 10th grader shown as eligible for Euclid) or wrongly excludes a grade
that's genuinely eligible for the broader ones (a 6th grader shut out of Beaver).

## Measured, before any change

Queried directly against `qtcvcflzxbuagvvwahhu`:

- **`saved_opportunities`**: 0 rows reference this id. No student has saved it.
- **`opportunity_matches`, real top-5-per-student ranking** (mirroring `home-strip.ts`'s own
  selection): this row appears in exactly **1 student's** top 5 — not zero, not many.

So this is not a row nobody will ever notice, but it's also not heavily depended on. One
real student's current view includes it.

## Why the plan matters, not just the split

CEO's own instruction: a split that just deletes or renames the bundled row would break
that one student's list — the row they see today would simply vanish with nothing to
replace it in the interim (matches are recomputed on read, but only if a new row exists to
rank into its place).

## Proposed plan (not executed this pass)

1. **Research and create real, separate opportunity rows**, one per contest or per
   coherent grade-band group (e.g., a "CEMC Junior Contests" row covering the 5-10 band and
   a "CEMC Senior Contests" row covering 9-12/Euclid specifically, or finer-grained if the
   official contest pages support it) — each with its own accurate `eligible_grades`,
   pointing at that specific contest's own official page (`cemc.uwaterloo.ca/contests`
   links to each contest's own subpage), not the general contests listing. This is real
   research work, not a schema change — scoping it, not doing it, in this pass.
2. **Retire the bundled row, don't delete it.** Set its `status` away from `'active'`
   (matching this codebase's own established retirement pattern — `isOpportunityActionable`
   already excludes non-active rows from every recommendation surface) rather than a hard
   delete, so historical references (any future audit, any cached client state) don't hit a
   foreign-key gap.
3. **No manual migration needed for the one affected student.** `times_saved = 0` means
   there's no `saved_opportunities` row to redirect. The match-ranking concern self-heals
   through the existing recompute-on-read mechanism this codebase already relies on for
   exactly this kind of change (the same mechanism 0060's own migration comment names) —
   once the bundled row stops being `active`, it drops out of ranking on the next
   recompute, and one of the new, correctly-scoped rows should rank in if the student's
   profile matches it. Worth a live spot-check after the new rows exist and the old one is
   retired, not assumed silently.
4. **Sequencing**: create the new rows and confirm they're live-queryable BEFORE retiring
   the bundled row, not the other way around — a brief window where both the accurate new
   rows and the bundled old one coexist is safe (the old one is simply redundant/less
   accurate for that window); a window where neither exists is not.

## Not done in this pass

No new opportunity rows created, no `status` change applied to the bundled row. This is
the plan CEO asked for before any of that — bringing it back for a decision, not treating
"measure it" as implicit authorization to execute.
