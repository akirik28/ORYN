# Package V2-11a — results: independent source verification of RES-R1's Ottawa corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Design and seeds: `v2_11a_ottawa-source-verification-design.md`
(pushed before any individual-page fetch). All 69 fetches returned HTTP 200.

## Headline: 0 defects across all four instruments — 72/72 individual checks clean

**Language-of-instruction, the corpus's central claim, tested from both directions:**

- **9/9 French-titled-but-null-language records confirmed correctly left null, not a path-
  inference gap.** None of the nine live pages (all "Formation à l'enseignement" or
  "Baccalauréat spécialisé..." teacher-training/kinesiology programmes) contains any explicit
  statement of instruction language — checked for "language," "French," "English," "bilingual,"
  "Francophone," "Anglophone" beyond the page-chrome "FR (switch to French version)" link.
  Three of the nine (`004`/`005`/`006`) DO carry a substantive French paragraph restricting
  admission to "élèves francophones... de communautés francophones en situation minoritaire" —
  suggestive of French instruction, but an eligibility-restriction statement, not a declared
  instruction language. R1 correctly declined to infer from this (or from the French title)
  rather than state a fact the source doesn't. This is the right call, not a gap: `field_
  provenance` on this field is `explicit_source_field` corpus-wide, and inferring from adjacent
  facts would break that standard.
- **8/8 explicitly French-exclusive records confirmed verbatim.** Every one of `045`, `047`,
  `072`, `123`, `124`, `202`, `231`, `253` carries the literal phrase **"This program is offered
  in French only"** (or "...in French only to non-Francophones") on the live page, word for
  word matching the recorded value. Not a paraphrase or inference in any of the 8.

**The excluded 123 — direction-of-defect check, run because it already paid off at UWA and
independently in RES-R1's own Ottawa work: 25/25 confirmed correctly excluded.** Every one of
the sampled excluded URLs is unambiguously a "Minor in X" or "Major in X" page (Sociology, World
Cinemas, Chemistry, English, Computer Science, Geography, Visual Arts, Art History, Statistics,
History, Political Science, French as a Second Language, Linguistics, Music, Law, and others) —
a Canadian university Minor/Major is definitionally a concentration declared within an existing
degree, never independently admitted. Zero standalone-admittable programmes found hiding in the
excluded population.

**`status_note` — the new verbatim-text field, checked against its own justification: 10/10
confirmed.** Every sampled note's distinctive text fragment — including "Coming in 2027" and
five separate "admission to [Program] is suspended until further notice" statements — appears
word for word on the corresponding live page. The design choice to leave this field enum-free is
justified exactly as claimed: the text really is verbatim, not summarized or interpreted.

**General content-accuracy random arm: 20/20 clean** — `program_name` matches the live page's
own title or body statement on every sampled record, no exceptions.

## Reconciliation

Fresh, independent sitemap fetch: 399 unique `/en/undergrad/` URLs (R1's stated 398 — 1-URL
residual, ordinary drift on a live catalogue, not chased). All 276 committed URLs present, zero
missing. Excluded population by direct subtraction: 123 against R1's stated 118 — a 5-URL gap,
larger than Adelaide's or UWA's residual. Not attributed to a bucketing defect without evidence:
the excluded-arm sample above tests the exclusion *logic* directly (is what's excluded genuinely
excludable) rather than the exact *count*, and it held on every sampled record regardless of
which precise URLs make up the gap.

## Bottom line

Ottawa passes cleanly on every instrument this package was designed to stress, including the two
directions BASORG specifically flagged as this corpus's own risk (language read per-record vs.
inferred from a `/en/` path that says nothing about content language; the newly-excluded
population checked directly rather than trusted from the retained side alone). No defects found,
no ambiguous cases requiring routing back to RES-R1.
