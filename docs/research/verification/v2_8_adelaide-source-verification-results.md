# Package V2-8 — results: independent source verification of RES-R1's Adelaide corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Design and seeds: `v2_8_adelaide-source-verification-design.md`
(pushed before any individual-page fetch). All 77 fetches returned HTTP 200 — Adelaide's fully
permissive robots.txt (`Disallow:`, confirmed fresh) meant no deferrals of any kind this package.

## Headline: the labeling-accuracy question BASORG asked me to check for is real, and I found it — isolated to one category, low practical impact

**All three of RES-R1's committed non-award pathway records (`001` ATSIP, `085` CASM Foundation
Year, `089` Foundation Studies) have their `international`-keyed content actually sourced from
Adelaide's domestic-only page — there is no genuine international variant of these pages at
all.** Tested directly: for CASM Foundation Year, the bare URL, `/int/`, and `/dom/` all three
return byte-identical content, every one titled "...Information for Domestic students." Same
result on ATSIP and Foundation Studies, tested the same way. This is exactly the failure shape
BASORG named as the thing to check for — "a field recorded as international that actually came
from the domestic page" — and it's real, not hypothetical.

**Why R1's own invariance check didn't catch it**: their check compares the `international` and
`domestic` fields *to each other* and confirms title/code/duration match — which they do here,
trivially, because both fields are sourced from the same actual page. The check verifies
internal consistency, not the claim that side A is genuinely international-sourced. That's the
precise gap a same-page comparison can't close, and why an external check (does the page itself
say what it claims to be) was the right instrument to add.

**Practical impact, stated plainly rather than either dismissed or inflated**: low. All three
records already carry `international_eligible: null` (not falsely `true`), and the researcher
notes independently explain why ("no CRICOS code found on the international variant") — a
conclusion that happens to still be correct, since the domestic page has no CRICOS code either.
The mislabeling didn't propagate into a wrong downstream fact for these three records. What it
does mean: the `international` key's *provenance claim* is false for this category, and any
future feature that trusts that key at face value (rather than treating these three as
effectively single-variant) would be relying on a label that doesn't describe what it says it
describes.

**A fourth, structurally identical case outside the committed 119**: the classification sample
(below) independently found "UniStart" — a real, live program (`XUNIS`, 0.5 year full-time,
Adelaide's own site calls it "UniStart Pre-degree") — which is the same shape as the three
above (a foundation/pathway-type offering) and also serves only domestic content at every URL
suffix. It isn't one of R1's 119, and doesn't fit any of R1's four stated exclusion reasons
either (not a majoring-in variant, not standalone postgrad, not Grad Dip/Cert, not blank) —
named separately below since it's a scope question, not a labeling one, but it reinforces the
same underlying fact: **the "bare URL = international by default" rule that holds cleanly
everywhere else in this corpus (confirmed correct on ~60+ other fetches this package) does not
hold for this one category of pathway/foundation-year program**, consistently, on every example
of that category this package touched.

## Component 1 — reconciliation (560/559/119 funnel), checked against a fresh fetch, not the report

Per BASORG's instruction, and because R1's raw stage-1 census (all 559 pre-classification
titles) was never committed as a file — only the 119 in-scope records were — the only
independent handle on this is a fresh fetch of Adelaide's own sitemap, not a re-read of R1's own
output.

- **My fresh fetch**: 562 raw `/study/degrees/*` sitemap URLs. Minus one identifiable utility
  page (`/compare-degrees/`, a comparison tool, not a program — presumably pre-filtered out of
  R1's candidate set before their stated "560" figure, the same way my count excludes it) = 561.
  R1's stated stage-1 fetch: 560. **The one-URL residual is not chased further**: this is a
  live, actively-maintained sitemap — several entries carry `lastmod` timestamps from the last
  24 hours, including a `master-of-philosophy/` page modified yesterday — and normal site drift
  between R1's fetch and mine, hours-to-a-day later, is the mundane explanation. Chasing it to a
  specific URL isn't possible without R1's own raw stage-1 URL list, which isn't a committed
  artifact.
- **Both of R1's individually-named exclusions independently reconfirmed present, exactly as
  described**: `/study/degrees/2027/` (the stated 404 stray year-navigation URL — confirmed a
  real, oddly-placed sitemap entry) and `/study/degrees/legacy/` (the stated single blank-title
  record) both exist in my fresh fetch precisely as named.
- **All 119 committed `official_program_url` values are present in my fresh fetch** — zero
  missing, no evidence of a stale or since-removed program page anywhere in the committed set.

**Classification sample, n=25/561, seed `20260822014`** — the only way to test whether the
215/126/98 internal split among the *excluded* 440 holds up, since no file of the excluded
records exists to check against directly. Fetched all 25, classified each by R1's own stated
rules (title contains "majoring in"; standalone Master/Doctor/IMBA with no Bachelor pairing;
Graduate Diploma/Certificate; blank title), cross-checked against the committed-119 list:

| Result | Count |
|---|---|
| Correctly in the 119 (Bachelor titles, no exclusion signal) | 4 |
| Correctly excluded — "majoring in" title signal | 11 |
| Correctly excluded — standalone postgrad (Master/Doctor/IMBA) | 6 |
| Correctly excluded — Graduate Diploma/Certificate | 3 |
| **Doesn't fit any of the 4 stated exclusion rules, and isn't in the 119** | **1 (UniStart)** |

**24/25 exactly as R1's documented method would classify them.** The one exception, "UniStart"
(`https://adelaide.edu.au/study/degrees/online/unistart/`), is a real, individually-verified
program — `Program code XUNIS`, "0.5 year(s) full-time," the page's own body text calls it
"UniStart Pre-degree" — that doesn't match "majoring in," isn't a standalone Master/Doctor,
isn't a Graduate Diploma/Certificate, and isn't blank. By R1's own stated rules it should have
been in-scope (most likely as a 4th non-award pathway program, the same category as ATSIP/CASM/
Foundation Studies), but it isn't in the committed 119, and the README's four-category
exclusion table doesn't have a slot for it either. **Checked whether this is a symptom of a
larger missed bucket**: searched the full 561-URL population for any other `*start*`,
`*pre-degree*`, `*bridging*`, or `*enabling*` slug — UniStart is the only one. This is a
specific, isolated gap-of-one, not evidence the reconciliation's other categories are wrong —
the other 24/25 classifications landed exactly where R1's stated method says they should.

## Component 2 — field-content accuracy on the 119 in-scope records

**41 unique records** (25 random, seed `20260822015`, + 19 targeted, 3 overlap not resampled)
checked against the live page for `program_name`, `degree_level` (via `Program code`),
`degree_type`, and `duration`. **Automated check: 0/41 flagged** on code match, duration
match, or title-word overlap.

Manual spot-checks on the load-bearing edge cases, all exact:
- **All 4 sampled on-campus/online duplicate-title pairs** (Criminology, Construction
  Management, Construction Management (Honours), Information Technology): confirmed genuinely
  different `Program code`s on each side, exactly as R1's file states (e.g. Construction
  Management: `BCONM` on-campus vs `XBCMG` online) — R1's "not duplicates, two distinct
  delivery-coded offerings" conclusion holds on independent re-fetch.
- **All 3 non-award pathway + 1 diploma + 1 associate degree spot-reads**: exact match on
  `Program code` and duration for every one (e.g. ATSIP: `ATSIP`/"1 year(s) full-time" on both
  the record and the live page).

No defects found on this component. Clean result, consistent with V2-5's finding on the sibling
UNSW/Sydney/Monash corpus — RES-R1's *field-extraction* accuracy (as opposed to the
*variant-labeling* question above) continues to hold up under independent re-fetch.

## Component 3 — the domestic/international invariance and labeling-accuracy check

**Sub-sample of R1's 18-programme domestic sample, n=8, seed `20260822017`**: `031`, `013`,
`007`, `025`, `085`, `061`, `049`, `091`. Fetched both the bare URL and the `/dom/` variant for
each.

- **Invariance (title / `Program code` / base duration identical across variants)**: **8/8
  confirmed, zero mismatches** — reinforcing R1's own 18/18 claim on an independently-drawn
  sub-sample rather than assuming it holds because the larger claim says so.
- **Genuine-difference confirmation**: read the live `study_mode` prose directly on two records
  (`031` Bachelor of IT, `061` Bachelor of Podiatry (Honours)) — bare/international page reads
  "Full-time" only; `/dom/` page reads "Full time or part time." Confirmed real, on-page text,
  not a categorical assumption.
- **Labeling accuracy: 7/8 clean, 1/8 (`085`, CASM Foundation Year) is the mislabeling described
  in the headline above** — the bare URL doesn't say "Information for International students"
  like every other record's bare URL does; it says "Information for Domestic students," same as
  its own `/dom/` variant. Widened to check the other two committed non-award records not in
  this random draw (`001` ATSIP, `089` Foundation Studies) specifically because `085`'s result
  looked categorical rather than incidental — both show the identical pattern.

## Bottom line

**Content accuracy holds up cleanly** (Component 2: 41/41, zero defects) and so does the
**reconciliation's top line** (Component 1: 560 confirmed independently, both named exclusions
confirmed, all 119 committed URLs confirmed live) — RES-R1's Adelaide package is in materially
better shape than the UWA batch that prompted this assignment. The two real findings are both
narrow and both worth carrying forward precisely rather than either buried or overstated:

1. **A specific, isolated classification gap** — "UniStart," a real pathway-shaped program that
   fits none of R1's four stated exclusion rules and isn't in the 119. One record, not a
   symptom of a larger miss (confirmed no siblings exist in the full URL population).
2. **A real, categorical labeling-accuracy defect, confirmed on every example of its category
   this package touched** — Adelaide's non-award/pathway/foundation programs (at least 3 of
   R1's own committed records, plus UniStart as a 4th outside the 119) have no genuine
   international-facing page at all, so content keyed `international` for this category is
   actually domestic-sourced. Low practical impact today (the one downstream field that could
   have gone wrong, `international_eligible`, is already correctly `null` on all three), but the
   field-provenance claim itself is false for this category, and worth a decision on how (or
   whether) to record "no international variant exists" as a distinct, honest state for a
   pathway program, rather than silently reusing the same `international`/`domestic` structure
   built for programs that actually have both.

Recommend: route both findings back to RES-R1/BASORG for a decision (add UniStart as a 4th
non-award pathway record; decide how to represent "domestic-only, no international variant
exists" for this category) rather than resolving either unilaterally — consistent with this
lane's standing practice of not editing researcher files directly.
