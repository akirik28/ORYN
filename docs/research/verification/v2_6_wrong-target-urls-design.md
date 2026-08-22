# Package V2-6 — sampling design: wrong-target `official_url`s in `opportunities`

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`

Question: what fraction of live `opportunities.official_url` values resolve to a page
that is **not** the named entity (Type B) or that doesn't resolve at all (Type A).
BUG-1's 85/271 (31.4%) is a measured floor from description-signature defects
(restated titles, embedded URLs, mid-word truncation) — invisible-by-construction to
that method. This package measures the floor's ceiling.

## Population — re-measured, one correction to the brief

Live count, `status='active' AND official_url IS NOT NULL AND official_url <> ''`:
**271** — matches BASORG's figure exactly. The Drive-corpus subset
(`source ILIKE 'Founder school-counselor Drive corpus%'`) is **96, not ~214** as
stated in the assignment. Not chasing the discrepancy's origin (BUG-1's original
count may have been taken at a different time, or against a different filter) — using
the measured 96 for the secondary arm's sizing, flagging the gap so the ~214 figure
isn't carried forward uncorrected.

## Why random is the only instrument that can answer this, and there is no secondary rate

Agreed with the framing as given, not just accepted it: a targeted arm biases toward
whatever made a row look suspicious, and Type B's whole danger is that a wrong-target
row looks exactly as unsuspicious as a correct one from the row's own contents. There
is no signature to target. The Drive-corpus arm below characterizes the defect where
BUG-1 traced it — it cannot and does not produce a rate, and won't be blended into one.

## Sample size and the interval it buys

**Random arm: n=70/271 (25.8%), seed `20260822012`.** At 95% confidence, worst-case
variance (p=0.5), finite-population-corrected: margin of error ≈ **±10 percentage
points**. If the true combined (Type A + Type B) rate is nearer BUG-1's 31%, the
interval is similar width (variance is close to maximal in the 25-45% range). This
sizing was chosen to distinguish "consistent with the known 31% floor, Type B adds
little" from "meaningfully higher, Type B is a substantial additional problem" — not
to produce a publication-grade estimate. Exact IDs: `random_arm.json`.

**Secondary arm (characterization only, never blended): n=15/96 Drive-corpus rows,
seed `20260822013`,** drawn from the 44 not already in the random arm (zero overlap,
confirmed). 26 of the random arm's own 70 rows are independently Drive-corpus-sourced
— reported separately in the results so Drive-corpus-specific findings aren't lost
inside the population-wide number either.

## Fail thresholds, stated before fetching

- **Type A (doesn't resolve)**: reported as a plain rate; not judged pass/fail — a
  dead link is a maintenance question, no urgency framing needed beyond the number.
- **Type B (resolves to the wrong entity)**: **any nonzero rate is a live trust
  defect**, per the product's own non-negotiable rules (no fabricated/wrong data
  presented as verified). This package does not pass/fail a batch — it measures a
  rate with a confidence interval. Reading the result: **combined rate near BUG-1's
  31% floor** → Type B adds little on top of the already-known defects; **combined
  rate meaningfully above it** (say, 45%+, outside the ±10pp interval around 31%) →
  Type B is a materially larger, previously uncounted problem.

## Method

Per sampled row: fetch `official_url` (robots.txt first, standalone, before any other
request to that host — the standing rule, unbatched); does it resolve (Type A); if it
resolves, does the landing page identify itself as the row's own `title`/`organization`
(Type B) — not "is this a plausible page," but "does this page say it is the thing the
row claims." RULE-FETCH-005 (bare wildcard disallow) and shape 5 (explicit CAPTCHA
defers immediately, no tooling exception) apply throughout.

Pushing this design and both sample files now, before the first fetch.
