# S4 — P2: Official-Tier Image Rights Classification — Handoff

**Server:** S4 **Task:** P2 (assigned by S9/Research CEO after the shard handoff)
**Branch:** `oryn/s4-university-photos`
**Status:** COMPLETE — dry-run proposals only, nothing applied

## Scope

All 194 fleet-wide `university_profile_metrics` rows at `primary_image_status = 'official'` —
i.e. every university image the acquisition pipeline sourced from a homepage `og:image` scrape,
which structurally never has a recorded license or attribution (see the earlier shard handoff's
fleet-wide audit). This covers all four quarters, not just S4's own shard, since the question is
fleet-wide by nature. Two workers (P2-A: records 1–97, P2-B: 98–194, split by the input file's own
order) each visited the specific official site and checked for real, quotable evidence rather than
guessing from silence.

## Rubric

Applied in priority order, negative evidence checked before any permissive conclusion:

1. **NOT_SUITABLE_FOR_REUSE** — a specific, dedicated no-reproduction notice, a visible third-party
   stock watermark, or explicit "written permission required" language. Generic footer
   "© [year] University. All rights reserved." boilerplate does **not** qualify on its own — it
   appears on nearly every institutional website and treating it as disqualifying would have
   pushed almost all 194 records into this bucket, contradicting the operation's own expectation
   that unresolved review should be the default outcome, not a forced negative.
2. **OPEN_LICENSE_VERIFIED** — an explicit, quotable open license (Creative Commons, public
   domain, or equivalent) stated for the specific image or its source page.
3. **OFFICIAL_REUSE_PERMISSION** — a real, found media kit / press page / newsroom policy
   granting some real, quotable reuse permission short of a full open license.
4. **RIGHTS_REVIEW_REQUIRED** — the default when nothing conclusive was found after a real check.

## Results (194/194 classified)

| Classification | Count |
|---|---|
| RIGHTS_REVIEW_REQUIRED | 187 |
| OFFICIAL_REUSE_PERMISSION | 5 |
| NOT_SUITABLE_FOR_REUSE | 2 |
| OPEN_LICENSE_VERIFIED | 0 |

187/194 (96%) landing in the honest-default bucket is the expected, correct outcome, not a
shortfall — very few university websites publish an explicit, checkable photo-reuse policy at all.

### OFFICIAL_REUSE_PERMISSION (5) — spot-checked, University of Vienna's independently confirmed verbatim

- **University of Vienna** — dedicated press-images page states use is permitted "nur zu
  redaktionellen Zwecken und im Zusammenhang mit der Universität Wien" (editorial purposes only,
  in connection with the university), with a mandatory copyright notice. *(Independently
  re-fetched and confirmed verbatim by S4 before inclusion in this report.)*
- **Eindhoven University of Technology** — operates a public Image Bank (`imagebank.tue.nl`) with
  linked terms of use and a mandatory source-attribution policy.
- **Tomsk Polytechnic University** and **Tomsk State University** (two separate institutions,
  same pattern) — sitewide footer clause requiring an active link back to the source when using
  site materials. Phrasing says "materials" generically, not images specifically — worth
  confirming scope before treating as image-specific.
- **Universität Regensburg** — press office provides photos free of charge for editorial
  reporting, conditioned on using the specific credit line supplied per photo.

### NOT_SUITABLE_FOR_REUSE (2) — spot-checked, UCSD independently confirmed verbatim

- **UC San Diego** — dedicated Terms of Use page: "No material from any official UC San Diego
  website may be copied, reproduced, republished, uploaded, posted, transmitted, or distributed
  in any way, without explicit permission..." *(Independently re-fetched and confirmed verbatim
  by S4 before inclusion in this report.)* This university's `official`-tier image should not be
  used without pursuing explicit permission first.
- **Tecnológico de Monterrey** — official legal-notice page explicitly requires "autorización
  expresa y por escrito" (express written authorization) before reproducing site content.

## Flagged for a second look, not resolved unilaterally

- **Northumbria University** — footer reads "All material provided subject to copyright
  permission," more pointed than standard boilerplate but not a clean match for either bucket.
  Defaulted to `RIGHTS_REVIEW_REQUIRED`; worth a specific look.
- **EPFL** — mixed signal: footer says "tous droits réservés" but several homepage photo captions
  carry real CC-BY-SA 4.0 marks, while high-res downloads require an institutional login. Whether
  the specific `campus.webp` already on file is one of the CC-licensed photos or a rights-reserved
  one was not confirmed. Worth a targeted check before this one is treated either way.
- **TU Darmstadt** — a real, useful cross-validation, not a new problem: this pass independently
  found at least one homepage image explicitly credited "Adobe Stock - DC Studio / TU Darmstadt,"
  via a text/credit-line search with no knowledge of the earlier shard audit. That earlier audit
  had already visually flagged this exact university's photo as `FAIL_GENERIC_OR_UNRELATED`
  ("a stock photo of a hand playing chess... looks like a mis-scraped article thumbnail") from
  appearance alone. Two independent methods, two different sessions, same conclusion.
- **RWTH Aachen, Universität Bremen** — homepage images individually credited to named
  third-party photographers/studios rather than the university itself, suggesting an outside
  rights-holder for at least some of their campus photography. Not resolved either way.

## Data-quality issues surfaced (not rights findings — flagged, not silently fixed)

Several `website_url` values in the `universities` table are stale or redirect elsewhere:
`wustl.edu`→`washu.edu`, `en.ifmo.ru`→`en.itmo.ru`, `ucdenver.edu`→`cudenver.edu`,
`vub.ac.be`→`vub.be`, and a TLS certificate mismatch on `kyunghee.edu` (cert is actually issued
for `khu.ac.kr`) and on the PUCV record (`ucv.cl` vs. the certificate's `pucv.cl`). Also: Vietnam
National University Hanoi's site has an expired TLS certificate and was unreachable over HTTPS
entirely (an infrastructure issue on their end). None of this was corrected here — it belongs to
whichever lane owns the `universities` table's base identity fields, not this rights-classification
pass.

Five sites returned hard failures (403 blocking or JS-rendered empty shells) after two attempts
each and were honestly left at `RIGHTS_REVIEW_REQUIRED` with the failure noted rather than guessed
either way: Oregon State, Ankara Üniversitesi, University of Nicosia, Australian Catholic
University, IIT Gandhinagar.

## Files

- `data/research/registry/official_tier_images_fleetwide.jsonl` — the 194-record input list (id,
  name, website_url, rn, quarter, image_url, image_source_url), fetched directly via the Supabase
  REST API
- `data/research/registry/rights_classification_P2A.jsonl` (97 lines) and `_P2B.jsonl` (97 lines)
  — the classifications themselves, each with `evidence_url`/`evidence_quote`/`notes`

## What the next owner should do

1. UCSD and Tecnológico de Monterrey's images should not be used without pursuing explicit
   permission — this is a real constraint on the 89 candidates/replacements from the shard
   handoff if either institution's row is among them (it isn't — neither appears in S4's own
   shard; check S1–S3's candidate lists if this matters there).
2. The 5 `OFFICIAL_REUSE_PERMISSION` cases have real, actionable conditions (attribution/credit
   lines, editorial-use-only, link-back requirements) that would need to be captured alongside
   the image if it's ever formally promoted — not just a boolean "permission granted."
3. Northumbria and EPFL are worth 10 minutes of targeted follow-up before either is finalized.
4. The `website_url` data-quality issues are a short, mechanical cleanup for whichever lane owns
   base university identity fields.

## Commit / push

Committed to `oryn/s4-university-photos`, pushed to `origin/oryn/s4-university-photos`. Not
merged to `main`.
