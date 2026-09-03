# Duplicate opportunity sweep (2026-09-03)

Assigned after Diamond Challenge turned up twice (`cb1ae3e2` as `entrepreneurship`,
`30a605ab` as `competition`) while researching the category-miscategorisation task. The
question here is different from category: not what one record is filed as, but how many
records one real opportunity has. Read-only against `oryn-qa-scratch`
(`qtcvcflzxbuagvvwahhu`) throughout — no writes.

## The pair that started this: already resolved before this sweep began

`cb1ae3e2` ("Diamond Challenge", `entrepreneurship`) is `status: disabled`, created
2026-08-17, last touched 2026-08-20 — nearly two weeks before tonight. Only `30a605ab`
("The Diamond Challenge", `competition`, `status: active`) is currently live. Whatever
disabled the first row predates this session and (with `admin_action_log` itself among the
still-unapplied migrations on this database) left no trail to read — but the practical
result is that a student sees this opportunity exactly once today, not twice. Nothing to
stage for this specific pair.

## Method

The dedup pipeline (`lib/opportunities/dedup.ts`) only catches two shapes: an exact
canonical-URL match, or the same organization string with title-word-Jaccard-similarity
≥ 0.6. Everything outside that boundary is what this sweep needed to find, so it ran two
passes deliberately wider than the code's own threshold:

1. **Pairwise title/domain/org similarity across all 421 rows**, scored and filtered well
   below the code's 0.6 cutoff (content-word Jaccard ≥ 0.5, or ≥ 0.3 when the two records
   also share a domain) specifically to catch near-misses the exact pipeline wouldn't. This
   is deliberately noisy on a first pass — a same-organization score alone produces many
   false positives from organizers (UK Mathematics Trust, Columbia, Wharton) that
   legitimately run many distinct, differently-named programmes — so every candidate above
   the noise floor was read in full before being kept or discarded, not scored and trusted.
2. **Exact-URL grouping across all 421 rows regardless of similarity score**, to catch
   pairs a text-similarity approach can miss entirely (same programme, completely different
   name). This is the exhaustive version of the check: `GROUP BY official_url HAVING
   count(*) > 1` returns every row sharing a URL with another, full stop.

## What both passes found, read and verified individually

**Eight more pairs share Diamond Challenge's exact shape — one thin/older record next to
one fuller/current one, already resolved by disabling the older side, all predating
tonight**: RSI (Research Science Institute) at MIT, Clark Scholars Program, Pioneer
Academics Research Program, FRC Türkiye (FIRST Robotics' own description already folds in
the Turkey national-organizer details that made the separate Turkey stub redundant), Summer
High School Programs at BU, TechGirls, Oxford Royale Summer Schools, and Secondary Student
Training Program (SSTP). Every one read side-by-side: the surviving record is more complete
(a real organization name, current dates, a working specific URL) and the disabled one is
thinner or sourced from a worse page (one disabled RSI record's URL is missing a path
segment; the disabled Pioneer record's `official_url` is a third-party review article, not
the programme's own page). Nothing to stage — this was already done, consistently, before
tonight.

**One pair had already been identity-checked by name, in the record's own text — the exact
discipline this task asked for, done once already**: Stockholm Junior Water Prize (active)
carries this sentence in its own description: *"Distinct from the 'Stockholm Water Prize'
already in this corpus, which is the professional/career award — not the same competition,
not student-eligible."* The professional-award record (`c8eb3d40`) is `disabled`. Whoever
wrote the active record did the identity verification, documented the reasoning inline, and
the corpus already reflects the right call. Confirmed, not re-litigated.

**The near-misses that looked like duplicates and were not, once actually read — the
"mirror case" this task named explicitly:**
- **Columbia University Pre-College Online Summer** vs **NYC Commuter Summer — Columbia
  University Pre-College Programs** — both active, same organization, same domain. Genuinely
  different delivery formats (fully online vs. in-person NYC commuter) with different
  session structures and their own specific URLs. Two real choices a student picks between,
  not one opportunity counted twice.
- **Garcia Summer Research Program** vs **Simons Summer Research Program** (both Stony
  Brook, both active) — Garcia is the Garcia Center for Polymers' own track (polymer/
  materials science specifically); Simons is a general cross-department match to any
  faculty mentor. Different structure, different scope, both real.
- **International Journal of High School Research (IJHSR)** vs **Journal of Research High
  School (JRHS)** — two different, real, competing student-research journals (different
  publishers, different fee structures, different submission requirements) that happen to
  share generic vocabulary in their names.
- **"University of Miami"** (`under_review`) vs **"Two-week UM Academies (non-credit)"**
  (active) — the closest call in this sweep, because they share the *exact same*
  `official_url` (a parent landing page listing several tracks), which is precisely the
  "record created from a listing page" shape this task named as a real risk. Read in full,
  they describe two different, real Miami tracks anyway: a 2-week non-credit set of
  academies (Upreneur, Crime Scene Investigation, Shark Research, two Intensive English
  tracks, an Innovation Data Lab) running June 27–July 10, versus a 3-week *credit-bearing*
  Summer Scholars Program (Architecture/Engineering, Business/Finance, Biomedical, Music
  Industry, and others) running June 27–July 17. Same URL, same organizer, genuinely two
  different programmes — an exact-URL match on its own would have been the wrong signal to
  trust here.

**UKMT and JHU CTY both have multiple real, different competitions/courses sharing one
official page** (three named Olympiads on one UKMT URL; two named courses on one JHU CTY
URL) — same shape as the Miami case, correctly not merged for the same reason.

## One pattern worth watching, not urgent — nothing currently duplicated live

A small cluster of `under_review` records titled as a bare institution name (`"Cornell
University"`, `"Harvard University (MA, USA)"`, `"Brown University (RI, USA)"`,
`"University of Chicago Chicago, IL"`) sit alongside already-active, more specific program
records at the same institution. None of these are live today, so nothing is currently
shown twice — but read closely, they range from genuinely broader-scope overviews (Cornell's
stub covers online options its active residential-only sibling doesn't) to one clear match:
University of Chicago's stub names the identical four-programme bundle
("Immersion/Stones and Bones/Summer Bridge/Summer College") already covered by the active
"Pre-College Summer Programs" record, word for word, and its own `official_url` is
internally malformed (`https://summer.uchicago.ehttps://summer.uchicago.edu/...`) — a data-
quality defect on top of the redundancy. Worth a look before any of this cluster is
approved out of `under_review`, not urgent today since none are visible to a student yet.

## FK check, done even though nothing here needed it

Confirmed before any of this could turn into a delete proposal, per the explicit
instruction: across the 8 already-disabled duplicate-sibling rows above, `0`
`saved_opportunities` rows reference them but `22` `opportunity_matches` rows do. Disabling
rather than deleting was the right call for exactly the reason named — an actual delete of
any of these rows would need those 22 match rows handled first. Nothing here proposes a
delete, so this is confirmation for whoever eventually considers one, not a blocker on
anything staged tonight.

## Bottom line

**No SQL is staged alongside this document.** Every candidate this sweep surfaced — from a
deliberately noisy similarity pass and an exhaustive exact-URL pass covering all 421 rows,
not a sample — resolved to one of: already fixed before tonight, already identity-verified
and documented as genuinely separate, or verified as genuinely separate by this pass after
reading full descriptions rather than trusting the surface match. The pair this task started
from was itself already resolved. Proven, not assumed: this is the same shape of result as
the category-miscategorisation sweep, and for the same reason — the catalog's own prior
maintenance had already found and closed the cases a text-similarity or exact-URL check
would surface.
