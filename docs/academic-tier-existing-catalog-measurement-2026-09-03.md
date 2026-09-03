# How much of the existing 1,019-row catalogue could get academic_tier, and how confidently

Follow-up to `supabase/migrations/0108_academic_tier.sql` (written, not applied) and
`docs/academic-tier-backfill-2026-09-03.md`'s six staged files. This is a measurement,
not a build — no SQL is staged here. CEO's brief: how many of the pre-existing 1,019
`universities` rows could be classified from evidence already in the row or from a
registry already established, how many can't (and why), and what NULL should mean
once the classifiable ones are done.

## Headline

**89 of 1,019 (8.7%) are classifiable now, with sourced confidence. The other 930
(91.3%) are not classifiable for one structural reason: no registry has been built
for their country.** This isn't 930 individually hard cases — it's 82 countries with
zero applied-sciences/research-tier research behind them yet. Only 5 countries
(the corridor: DE/NL/FI/AT/IE) have that research done at all.

Country breakdown of the live table (queried live, 2026-09-03): US 131, UK 79, China
64, Germany 49, Italy 38, India 37, Australia 37, South Korea 31, France 30, Spain 29,
Canada 27, … down to single-country counts, 87 countries total. The 5 corridor
countries are a small slice of the catalogue: DE 49, NL 13, AT 10, FI 9, IE 8 = 89 rows.
Every other row (930) sits in a country with no registry mapped — that absence is the
entire explanation for why they're not in the classifiable bucket. None of the 930
were individually assessed as "hard"; they were never in scope for the corridor work
in the first place.

## The 89, by country, with actual confidence tiers

Not all five countries earned their classification the same way. Ranking by how the
confidence was actually established, strongest first:

### Netherlands — 13/13, Tier A (direct reuse of already-completed registry work)

All 13 existing Dutch rows (Delft, Eindhoven, Erasmus, Leiden, Maastricht, Radboud,
Tilburg, UvA, Groningen, Twente, Utrecht, VU Amsterdam, Wageningen) are exactly the
pre-existing WO baseline that `docs/netherlands-wo-gaps-2026-09-03.md` already
cross-referenced against DUO's WO list (which names 18; these 13 plus the 2 already
staged in `netherlands-wo-gaps-2026-09-03.sql` account for 15, with 3 excluded on
product-fit grounds). This isn't new inference — it's the same registry check already
done for a different package, applied here. All 13 → `research_university`.

### Ireland — 8/8, but split: 7 Tier A, 1 needs a consistency fix not a classification

Dublin City University, Maynooth University, Trinity College Dublin, University
College Cork, University College Dublin, University of Galway, University of
Limerick — 7 institutions, all on HEA's statutory HEI list as ordinary universities,
none with TU/Institute-of-Technology lineage. → `research_university`.

**Technological University Dublin is the 8th and it's not a new call.** It's the exact
same TU sector as the 4 new Irish rows already staged in `ireland-tu-2026-09-03.sql`
as `applied_sciences`, FLAGGED — it's the institution that file's own header names as
"already exists in the live DB… NOT re-inserted here." If TU Dublin is left NULL while
the other 4 TUs carry the flagged `applied_sciences` value, the catalogue holds one
TU classified and four of the identical type unclassified, for no principled reason.
This should get the same value and the same flag as the other 4, not a fresh
classification decision.

### Germany — 49/49, Tier B (a sourced legal rule, not name recognition)

All 49 existing German rows carry "Universität," "Technische Universität," or
"University of X" naming, with zero Fachhochschule/HAW-pattern names — consistent
with none of them appearing in the separately-sourced 192-row HAW extraction already
staged. That pattern isn't a coincidence I'm reading into it: German
*Bezeichnungsschutz* (designation protection) legally bars a Fachhochschule from using
"Universität" in its name — confirmed live, not recalled from training data (see
[HRK: Hochschultypen](https://www.hrk.de/themen/hochschulsystem/hochschulrecht/hochschultypen/)
and the Bezeichnungsschutz explainer surfaced in the same search). A German
institution named "Universität X" is, by law, not a Fachhochschule.

Two rows have `institution_type IS NULL`, which made them worth checking rather than
pattern-matching on name alone: **Constructor University** (Bremen) and **Frankfurt
School of Finance and Management**. Both checked live — Constructor is a private,
state-recognized university with doctoral-degree-granting rights (state recognition
made unlimited in 2021); Frankfurt School holds Hochschultyp "Universität" and has
held Promotionsrecht since 2004. Neither is a disguised Fachhochschule. All 49 →
`research_university`.

### Austria — 10/10, Tier B (same legal-naming logic, one specific check)

Nine of the 10 (Graz UT, JKU Linz, Karl-Franzens-Universität Graz, Montanuniversität
Leoben, Paris Lodron Salzburg, TU Wien, Universität Innsbruck, Klagenfurt, Vienna) are
unambiguous öffentliche Universität names under the same designation-protection logic
— not independently re-confirmed for Austria's specific statute the way Germany's was,
so call this one notch below Germany's confidence, not equal to it.

**Central European University** is the row worth naming specifically: confirmed live
as Austria's 16th *Privatuniversität*, accredited by AQ Austria under the Private
Universities Act (PrivHG) since 2019, with doctoral programs. Austria's institutional
law actually has four categories (öffentliche Universität, Privatuniversität,
Fachhochschule, Pädagogische Hochschule) where `academic_tier` has two — CEU is a
private university, not a public one, but that distinction belongs to
`institution_type`, not `academic_tier`. On the tier axis, a doctoral-granting private
university is `research_university`, same bucket as the public nine. All 10 →
`research_university`.

### Finland — 9/9, Tier C (real registry anchor, but not individually enumerated)

Aalto, Åbo Akademi, LUT, Tampere, UEF, Helsinki, Jyväskylä, Oulu, Turku — all
"yliopisto"/"University" named, zero AMK-pattern names. OPH (Opetushallitus) publishes
"Ammattikorkeakoulut ja yliopistot" as one joint page/dataset — the same ministry
system already used to source the 22-institution AMK list sits over yliopistot too,
which is a real anchor, not a guess. But unlike the AMK pass — where Vipunen and
UASinfo.fi were checked independently and named the identical 22 — I did not enumerate
Finland's full yliopisto list and check these 9 names against it one by one. This is
the one country in the 89 I'd call medium-high rather than high: correct with very
high likelihood, but one notch short of NL/IE/DE/AT's sourcing bar. Closing that gap
is one more live pass, not a re-architecture.

## What I explicitly went looking for and didn't find

CEO's brief asked for the third bucket too: institutions where neither value fits.
I checked the two live candidates most likely to produce that outcome — Germany's two
`institution_type IS NULL` rows — on the theory that an unexplained gap on one column
might signal a genuine categorization problem rather than a data-entry gap. Both
resolved cleanly to `research_university` with a real source. **Zero rows in the 89
landed in "ambiguous, neither value fits."** That's worth stating plainly rather than
quietly, since it directly bears on the next question.

## What NULL should mean, and whether 0108 needs a third value

**Recommendation: don't add one — not yet, because nothing in this pass needed it.**

The case for a third value (`not_applicable`, `unclassified`) is that NULL currently
carries two meanings that will drift apart: "not yet classified, coming soon" and
"not yet classified, no work planned." Six months from now, 930 of these rows will
still be NULL for the same structural reason they are now — no registry — and
`institution_type`'s own 17 NULLs are the standing precedent for how quietly that
turns from "gap" into "presumed default." That risk is real. But it's a
*documentation and roadmap* problem, not a *modeling* problem — I went looking for a
row that genuinely doesn't fit either enum value and found none. Adding schema
surface for a case with zero observed instances is the same failure this fleet has
been avoiding elsewhere: don't manufacture certainty (or, here, structure) the data
hasn't earned yet. `0108`'s existing column comment already states the correct rule
("NULL means not yet classified, not 'is a research university'") — the gap is that
nothing enforces or surfaces that rule to someone querying the column cold.

If a genuinely unclassifiable row turns up in a future country pass — a hybrid
institute, a conservatory, something that isn't cleanly either tier — that's the
concrete case that should trigger adding a third value, and CEO's point stands that
doing it then is more expensive than doing it before 0108 ships. I'm not closing the
door on it; I'm saying the evidence for it doesn't exist yet, and I'd rather report
that plainly than pad the schema pre-emptively.

One incidental finding worth a line: every one of the 89 classifies as
`research_university`. Zero existing rows are secretly applied-sciences institutions
under a generic label. The original 1,019-row catalogue reads as research-university-
shaped by construction (consistent with a rankings-style seed dataset) — the
applied-sciences tier is new territory this corridor introduced, not a mislabeling
this measurement is correcting.

## Summary table

| Country | Existing rows | Classifiable | Tier | Basis |
|---|---|---|---|---|
| Netherlands | 13 | 13 | A | DUO WO list, already cross-referenced |
| Ireland | 8 | 8 (7 new + 1 consistency fix) | A | HEA HEI list, already used |
| Germany | 49 | 49 | B | Bezeichnungsschutz (sourced live) + 2 spot-checks |
| Austria | 10 | 10 | B | Same naming-law logic, 1 specific check (CEU) |
| Finland | 9 | 9 | C | Shared OPH/Vipunen system, not individually enumerated |
| All other countries | 930 | 0 | — | No registry built for that country |
| **Total** | **1,019** | **89** | | |

## Sources checked live this pass (2026-09-03)

- [HRK — Hochschultypen](https://www.hrk.de/themen/hochschulsystem/hochschulrecht/hochschultypen/) — Bezeichnungsschutz basis for the German naming rule
- Frankfurt School of Finance & Management — Hochschultyp "Universität," Promotionsrecht since 2004 (multiple corroborating results: studycheck.de, private-hochschulen.net, mygermanuniversity.com)
- Constructor University — state-recognized (unlimited, since 2021), doctoral-degree-granting rights (Wikipedia, studis-online.de, constructor.university/accreditation)
- Central European University Private University — accredited by AQ Austria since 2019 as Austria's 16th private university, under PrivHG (derStandard.at, ceu.edu/ceupu/akkreditierung, studyinaustria.at)
- OPH — "Ammattikorkeakoulut ja yliopistot" joint page (oph.fi), confirming yliopistot sit in the same ministry system as the AMK list already used
