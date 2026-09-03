# Netherlands WO gaps: 2 added, 3 excluded on purpose

Follow-up to [docs/netherlands-hbo-sector-2026-09-03.md](./netherlands-hbo-sector-2026-09-03.md),
which found DUO's dataset lists 18 Dutch research universities (WO) against the catalogue's 13,
and flagged the 5-institution gap as a secondary finding, out of scope for that pass. This is
that package.

**This one is different in kind from the applied-sciences batches.** These are research
universities -- the same sector as the existing 13 Dutch rows, not a new sector waiting on a
schema decision. `institution_type` is not left `NULL` here; it's set to `'Public'`, matching
the convention 11 of the 13 existing rows already use (confirmed by direct query before writing
anything -- 2 of the 13, Radboud and Tilburg, are on an older `'university'`/`medium`/
`needs_review` shape that looks like it predates the current convention; the 11 more current
rows are the pattern to match). No schema gate blocks this package.

## The 5, and why only 2 are staged

All 5 confirmed live against DUO's own listing and each institution's own official site:

| Institution | City | Website | Disposition |
|---|---|---|---|
| Open Universiteit | Heerlen | ou.nl | **Included** |
| Universiteit voor Humanistiek | Utrecht | uvh.nl | **Included** |
| Theologische Universiteit Apeldoorn | Apeldoorn | tua.nl | Excluded -- product fit |
| Protestantse Theologische Universiteit | Utrecht | pthu.nl | Excluded -- product fit |
| Theologische Universiteit Utrecht (formerly Kampen) | Utrecht | tuu.nl | Excluded -- product fit |

**The 3 excluded are single-subject theological seminaries, each training clergy for one
specific Dutch Protestant denomination** -- Theologische Universiteit Apeldoorn (Christian
Reformed Churches), Protestantse Theologische Universiteit (the PKN, the mainline Protestant
Church in the Netherlands, "400 years of theological education" per its own homepage),
Theologische Universiteit Utrecht (the Nederlandse Gereformeerde Kerken; DUO's listing still
shows the older "Kampen" name, the institution's own current site is at `tuu.nl`). Each offers
only a Theology Bachelor's and one or two Theology Master's -- no other subject. This is a
product-fit judgment, not a data-quality one, per this task's own instruction: a platform helping
14-18-year-olds explore competitive universities for a general academic or career path has no
real use for three single-purpose ordination pipelines, and surfacing them as "Dutch research
universities" alongside Utrecht or Leiden would be misleading about what a student would actually
find there. Worth naming directly: DUO's own data corroborates this grouping independently --
Universiteit voor Humanistiek's own site describes chairing a "consultation of non-religious
life-view universities" whose members are exactly these three theological institutions plus UVH
itself, meaning the Dutch higher-education sector already treats these as a distinct category,
not something this task invented.

**Universiteit voor Humanistiek is in that same self-described grouping, and is included
anyway.** The distinction: UVH is not denominational or vocational-religious -- Humanistic
Studies is a legitimate general academic discipline (philosophy-adjacent, not chaplaincy
training for one specific faith body), and it isn't a Bachelor's-only single-programme
institution the way the 3 theological ones are. It's small and specialized, but that alone
isn't the same kind of product-fit problem as training ministers for one denomination. Included
as data, flagged here so the founder can see the reasoning and override it if he reads it
differently.

**Open Universiteit is included, on a narrower basis than it might first appear.** Its
distance-learning, open-enrollment model is genuinely different from a normal campus
undergraduate experience, and doesn't fit "competitive university" positioning in the literal
sense (it has no competitive admission at all). But this task's own instruction named
*theological* institutions specifically as the judgment case to apply -- Open Universiteit isn't
one, it's a fully general-subject, DUO-recognized, publicly-funded Dutch university (one of the
fourteen VSNU-represented institutions), just with a different delivery model. Extending the
exclusion judgment to cover delivery-model fit as well as subject-matter fit would be a broader
call than what was asked for here, so it's included as data with the same flag: if "open,
non-selective, adult-oriented" turns out to be its own product-fit exclusion the founder wants
applied consistently (which would likely also affect how other countries' open universities get
treated later), that's a decision to make deliberately, not one to fold into this pass silently.

## Validation

- **Source cross-check**: all 5 names confirmed present on DUO's own 18-institution WO list
  (the same dataset the original hogescholen pass retrieved), not re-derived from a secondary
  source.
- **Per-row verification**: all 5 websites live-verified by direct navigation; all 5 confirmed
  to still exist and operate as of today (PThU notably relocated from Amsterdam/Groningen to
  Utrecht in September 2024 -- current city confirmed, not the pre-move one).
- **Duplicate check**: queried `select name, institution_type, ... from universities where
  country = 'Netherlands'` directly before writing anything -- 13 existing rows, neither new
  name among them.
- **Live dry-run**: single `begin;...rollback;` transaction, both inserts clean. Inside the
  transaction: 13 existing + 2 new = 15. Rolled back; a separate, fresh post-rollback query
  confirmed the count is back to 13.

## Staged SQL

`data/research/sql-dry-runs/universities/netherlands-wo-gaps-2026-09-03.sql` -- 2
`insert into universities (...)` statements, dry-run validated as above, not yet applied to the
live database. Unlike the five applied-sciences batches, this one is not blocked on a schema
decision -- it could be applied as soon as the founder is comfortable with the product-fit
reasoning above.
