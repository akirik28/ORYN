# S7 cross-review of S7-B2 (online/year-round/Türkiye-based) — pass 1

Reviewer: S7 (parent session). Verified file validity (9 accepted, 17 rejected, both clean
JSONL). Did not independently re-fetch this pass — the standout finding below is itself the
main quality signal and made re-verification lower priority than getting it into the
consolidated closeout quickly.

## The standout finding: this lane caught something I missed setting up the dedup baseline

Before doing any external research, S7-B2 discovered this worktree's `data/research/
opportunities/` directory already holds ~200+ live-database opportunity titles referenced by
literal `opportunity_id` UUIDs inside files I had already listed (`dlopp_*`, `ecw2/3/4_*`) but
had NOT opened/mined for names when I built the pre-dispatch dedup baseline — I only mined
`leadership_batch*`/`thincat_*`/`discovery_*` for names, and separately queried the live DB
directly, but didn't cross-reference these particular files' embedded UUIDs against that live
data before dispatch. S7-B2 caught this independently and correctly avoided re-researching
Polygence, Lumiere, Pioneer, MIT PRIMES, Technovation, Duke Pre-College, Inspirit AI, TÜBİTAK
2202/2204, TEKNOFEST, iGEM, Girls Who Code, and more. **This is the main reason B2 landed at 9
rather than 30-40 — genuine pre-existing coverage, not a research shortfall — and it's a better
outcome than the alternative (9 real net-new records) vs. a padded batch full of near-duplicates
of already-covered ground.**

## Rejection quality

17 rejections reviewed at the summary level: includes a ProPublica-sourced conflict-of-interest
finding (Scholar Launch), a "prestigious-brand-but-actually-open-enrollment-certificate-mill"
catch (Harvard Medical School Pre-College Online), and several access-blocked-not-merits-
rejected entries explicitly flagged for retry rather than silently dropped (AoPS, Athena's
Advanced Academy, M3 Challenge) — good discipline distinguishing "this is bad" from "I
couldn't confirm this."

## Quality of the 9 accepted

Spot read: genuine substantive-output shape throughout (TKS, picoCTF, USACO, JHU CTY Online,
Science Mentorship Institute, Northwestern CTD Online, plus three Turkey-hosted-with-
international-relevance entries — Türkiye Ekonomi Olimpiyatları, Turkish National Linguistics
Olympiad, WRO Türkiye) — no passive-content-only programs slipped through, matching the
quality bar this lane was specifically warned about.

## Conclusion

9 accepted (6 VERIFIED, 3 CANDIDATE), 17 rejected. Smallest lane by count but arguably the
highest signal-to-noise given the pre-existing-coverage discovery. Held for final cross-lane
consolidation (now complete — see `s7_MASTER_CLOSEOUT.md`). No cross-lane duplicates found
against A1/A2/B1's output.
