# RES-V2 lane handoff — six packages, method, and every instrument bug caught this session

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Written per BASORG's request, as insurance against sessions ending without warning. Audience:
whoever picks up this lane next — most likely for Adelaide, once RES-R1's extraction lands.

**Count correction up front**: BASORG's handoff request referred to "seven packages." This
session ran **six** — DLOPP, V2-2, V2-3, V2-4, V2-5, V2-6 (V2-2 produced three dated sub-documents
across two rounds plus a closeout, but is one package, one row in `ORYN_WORKSTREAMS.md`). Not
forcing a seventh into existence to match the number — flagged back to BASORG in my report
rather than silently padding this document or silently dropping the discrepancy.

## What this lane is, in one paragraph

RES-V2 verifies source accuracy and institutional identity on batches that have already passed
RES-V1 (contract/ID/monotonicity). Never edits researcher files — defects go back as an
itemized report through BASORG. Never writes to the live DB — every check is read-only
`execute_sql` or a direct fetch. Respects robots.txt AI-crawler blocks absolutely: a blocked
host is "unverifiable via this channel," never routed around, regardless of how the fetch is
attempted (curl, browser, or otherwise).

## The six packages — what each covered, and what each explicitly did not

### Package 1 — DLOPP source verification (`v2_dlopp_verdict.md`)
**Covered**: 34/74 records (45.9%) from RES-R2's opportunity-deadlines package. All 14
`dated_current_cycle` records independently re-fetched byte-exact (not the summarizing tool
RES-R2 flagged as unverified-verbatim). All 6 records RES-R2 self-flagged for scrutiny. All 5
`deferred` robots/403 claims independently confirmed. A `random.seed(20260822)` 10-record draw
from the unflagged remainder as a second, separately-reported instrument.
**Result**: PASS, zero blocking defects. One live defect independently reconfirmed (SIP/UCSC
row stuck on `cycle_status='upcoming'` after the program concluded) — not introduced by this
batch, flagged to BASORG as a priority fix.
**Explicitly did not cover**: the other 40/74 records outside both the flagged set and the
random draw — never claimed as verified. Did not itself carry an ingestion verdict (that
needed RES-V1's separate contract/ID pass, which landed later).

### Package V2-2 — active-status audit (`v2_2_active-status-audit_{subbatch1,round2,closeout}.md`)
**Covered**: all 66 live `opportunities` rows with `status='active' AND cycle_status IN
('open','upcoming')` — the rows making an actionable claim to a student. Two instruments across
three rounds: oldest-`updated_at` sub-batches (round 1: 15 rows, 40% defect rate; round 2: a
further 15, 6.7%) plus a genuinely random draw (seed `2026082202`, n=12, 8.3% — the population
estimate). Closeout swept the final 5 untouched rows plus resolved 2 records RES-I2's
monotonicity guard had held.
**Result**: 62 verified + 4 deferred (3 AI-specific robots.txt blocks + one CyberPatriot total
wildcard block) = 66/66 accounted for. Pattern found: most defects share one shape — a page
whose only dates are already-elapsed, a freshness-cadence gap rather than a research-quality
problem.
**Explicitly did not cover**: rows outside the `active`+`open/upcoming` filter — a different,
larger population that V2-6 later sampled from a different angle (all active rows with a URL,
regardless of cycle_status).

### Package V2-3 — url_repair + Glasgow degree_type (`v2_3_url-repair-and-glasgow.md`)
**Covered**: **Target 1**: 1,429 records that would replace a live `official_program_url` —
stratified sample n=80 (seed `20260822003`) by `correction_type`, checking both Type A (dead
link) and Type B (resolves to the wrong programme) for the first time this session. **Target
2**: Glasgow's 62 `degree_type` candidates, independently re-derived from source as a third
check (after I1 and CFO, all three matched) — stratified sample n=30 (seed `20260822002`,
48%), forcing in all 3 singleton degree types rather than risking a random miss on them.
**Result**: url_repair 0/80 Type A, 0/80 Type B — PASS, safe to apply wholesale. Glasgow 30/30
factually correct — PASS on accuracy, but flagged that 83% of sampled programmes are
multi-award (`BSc/MSci` etc.) where a single-column field can't represent 2-4 valid options —
a schema/scope question routed to BASORG/CFO, not resolved unilaterally.
**Explicitly did not cover**: the other 1,349 url_repair records and 32 Glasgow candidates
outside the samples — the PASS verdict is a sample-based recommendation to apply wholesale, not
a claim that every remaining record was individually checked.

### Package V2-4 — RES-I2's 34 held DLOPP fields (`v2_4_dlopp-held-fields.md`)
**Covered**: re-derived the held set from first principles (no committed file had the itemized
34) by diffing fresh live state against each of the 74 DLOPP proposals. Net 18 genuine
populated-vs-differently-populated `cycle_status` records after excluding false positives (see
instrument-bug catalogue below) — 7 already covered by earlier packages, 11 freshly checked.
**Result**: IPPF resolved (`upcoming`→`open`), 3 more resolved toward the original proposal on
fresh evidence, 1 resolved toward neither prior value (BIYSC — situation moved since original
research), 3 resolved toward keeping live unchanged, 1 unreachable (DNA Day — genuine
connection refusal, not a block). Pattern flagged: 11/18 share a shape where "current cycle
just closed" and "next cycle unannounced" are both simultaneously true, and a single-value
field can't hold both — the fourth instance this session of "the field may be the wrong shape
for the fact."
**Explicitly did not cover**: `current_cycle_label` holds, by design — resolving that free-text
field as a blanket list would reproduce the same false-positive risk this package's own
instrument bug (below) demonstrated, at scale. Flagged that a targeted, specific-field-pair ask
would be the way to get those checked if BASORG wants them.

### Package V2-5 — RES-R1's AU corpus, UNSW/Sydney/Monash (`v2_5_au-corpus-{design,results}.md`)
**Covered**: 544 records, checked against BASORG's report that R1's UWA batch ran ~30% wrong on
`degree_level` (schema-valid, semantically wrong). 37 targeted (every rare/edge `degree_level`
category per university, seeds `20260822004-011`) + 45 random proportional, 82/544 (15.1%),
zero overlap between instruments.
**Result**: 82/82 clean on all 5 checked fields, including the specific title-shapes UWA's
defect class hit hardest (Sydney's dual "Bachelor...and Master..." titles, correctly not
misclassified by the "Master" substring). One dated process finding: R1's documented
`.model.json` fetch method (149/149 success same-day in their own README) returned 400 on all
21 of my attempts hours later — worked around via rendered-DOM extraction, flagged as a live
endpoint break for anyone re-verifying Sydney.
**Explicitly did not cover, stated as partial rather than rounded up**: Monash's 9 excluded
postgraduate records' specific IDs — the 9 aren't identifiable from any committed file, and a
15-code random draw (finding 3 real Graduate Certificates, all correctly non-null) confirmed
the exclusion *mechanism's plausibility* but had only ~35% odds of hitting the actual 12-record
null-`aqf_level` population, and didn't. Named as a mechanism check, not a verification of the
9 IDs — a larger draw (60-90+) or R1 committing the excluded set would be needed to close it.

### Package V2-6 — wrong-target `official_url`s (`v2_6_wrong-target-urls-{design,results}.md`)
**Covered**: prevalence of Type A/B defects among 271 live active rows with a URL. Random arm
n=70 (seed `20260822012`, the sole rate instrument) + Drive-corpus characterization arm n=15
(seed `20260822013`, never blended).
**Result**: full detail in the results doc — 2.9% combined Type A+B in the random draw (well
under BUG-1's 31% description-signature floor, a different failure surface, not stacked on
it); every Type A/B/ambiguous finding in the random arm traced to Drive-corpus provenance
(23.1% vs 2.3% any-flag rate by subset). Re-verified the package's seed example with full
identity detail: a "Boston University" row whose `official_url` resolves to an unrelated
Pennsylvania school district while the correct `bu.edu` URL sits unused in the row's own
description field.
**Explicitly did not cover**: the 201 active-URL rows outside the random sample — 2.9%±CI is a
population estimate, not a claim every row was checked. Also did not attempt to reconcile
*why* the Drive import specifically produced this shape of error (BASORG's diagnosis, not
mine to re-derive) — my package measured prevalence and provenance-correlation, not root cause.

## Instrument and tooling near-misses — every one caught before it reached BASORG as a finding

The recurring lesson across all six packages: **a pattern-match score is a candidate, not a
finding** — the same principle BASORG named after their own domain-heuristic attempts ran
93%/100% false-positive. Every case below was caught by going back to the actual source content
before reporting, not by trusting the automated signal.

1. **V2-3, Southampton** — a title-only comparison flagged ~8 records as mismatches because
   `<title>` carries a shortened form of the program name; the full name is in the body
   heading. Checking body content resolved all 8 as genuine matches.
2. **V2-3, St Andrews** — a regex requiring `</title>` missed all 10 St Andrews records because
   their actual closing tag is `</title >` (trailing space). Fixed the regex, reconfirmed all 10.
3. **V2-4, `current_cycle_label`** — a literal string-inequality check against live state
   produced 56 "holds," almost all fake, because live is often already a fuller written version
   of the same proposed fact (exactly the RULE-INGEST-004 risk). A second, separate trap in the
   same pass: `cycle_status_found: "unknown"` is the researcher's own "couldn't determine"
   marker, not a proposal — 6 records using it were wrongly counted as holds until excluded.
   Net after both corrections: 18 genuine holds, not 56.
4. **V2-5, Monash campus field** — a field-extraction script checked the top-level `campus`
   field, empty for Monash's multi-campus (Malaysia/Indonesia/Melbourne-city) programs, and
   flagged 8 false "mismatches." The real value lives nested at `offering[].display_name`. Found
   the correct path, reconfirmed all 8 exact before reporting anything.
5. **V2-6, NYT block page (under-matching → caught)** — `r9`'s curl fetch returned a 403 page
   titled "Not Authorized - The New York Times." A word-overlap script scored this 0.43 against
   the row's title "New York Times Audio Stories Podcast Contest" — comfortably past the 0.35
   flagging threshold, purely from "new/york/times" being common to both strings. Would have
   silently passed as clean. Caught only because curl's raw status codes were cross-referenced
   against the content-flag list independently, not because the score itself looked wrong — the
   score agreed with a clean read; the status code disagreed, and the status code was right.
6. **V2-6, `t6`/`t9` (the mirror-image failure — over-matching, also caught)** — worth naming
   separately from #5 because it's the opposite direction of the same root cause. `t6` "The
   Pioneer Academics Research Program" landed on a page titled "Is Pioneer Academics Worth It?
   Review of a Former Research Scholar" — a testimonial post, not the program's own page — and
   scored a **perfect** 1.0 token overlap, because "pioneer," "academics," and "research" all
   legitimately appear in the review's own title too. `t9` "Garcia Summer Scholars" hit the same
   shape against a Stony Brook news article about the program rather than the program's page.
   High overlap is exactly as unreliable a signal as low overlap when the wrong page shares the
   program's own vocabulary — both directions need a human read of what the page actually says
   it is, not just whether its words match.

**On BASORG's reference to "43 false label findings you chased to zero"**: no record of this
figure exists anywhere in this lane's commit history (checked directly — grepped every
verification doc and the workstreams log for "43" and "false label," zero hits). The closest
match in shape is #3 above (56 flagged, mostly fake, resolved to 18 genuine — not zero, and not
43). Flagging this rather than writing an unverified number into a document meant to be
authoritative for a successor — either BASORG is recalling a different lane's finding, or this
one got garbled in relay. Worth BASORG's own clarification before it propagates further.

## Sampling method, reusable as-is for Adelaide or any future package

- **Seed every random draw explicitly** (`random.seed(<value>)`), record the seed in the
  design doc, commit the design and both sample files **before the first fetch** — a standing
  rule adopted mid-session (V2-5 onward) specifically so the sample can't be second-guessed or
  adjusted after seeing results.
- **Two instruments, reported separately, never blended**: targeted (aimed at load-bearing or
  suspect cases — biased by design, cannot produce a population rate) and random (seeded,
  proportional, the only instrument that can). Default to running both; **the exception is
  V2-6**, where BASORG's own correction of their two failed domain-heuristic attempts led to
  dropping the targeted arm's rate-producing role entirely — when a defect class has no
  signature to target toward (a wrong-target URL looks exactly as unsuspicious as a right one),
  a targeted arm can still *characterize* a known subset, but only random can produce a rate.
  Recognize which situation you're in before designing the sample.
- **State fail/pass thresholds before fetching, and report plainly when the result falls
  outside what the thresholds anticipated** rather than retrofitting the framing — V2-6's
  thresholds both assumed Type B would add to BUG-1's 31%; the result came in at 2.9%, and the
  right move was saying the pre-registered assumption was wrong, not reinterpreting "2.9%" as a
  disguised confirmation of something the thresholds didn't actually ask.
- **Re-derive population counts and itemized lists from live state**, never from a prose
  figure in a brief, even BASORG's own — this session: DLOPP's "34 held fields" (no file had
  the actual list), Glasgow's "62" (re-derived as a third independent check), V2-6's Drive-corpus
  population (96 active, not the brief's ~214 — an all-status figure relayed into an
  active-only-scoped ask).
- **Type A / Type B classification** (first used V2-3, reused V2-6): does the URL resolve at
  all (A), and if so, does the landing page identify itself as the row's own named entity (B) —
  not "is this a plausible page," but "does this page say it is the thing the row claims."
  A third, real category showed up repeatedly and deserves a name rather than a forced fit:
  **right organization, generic hub/rotating-catalog or dated review/news page instead of the
  specific program** (V2-6: CTY/Princeton, USC/"Dive Into Engineering," Pioneer Academics,
  Garcia Summer Scholars) — not Type A, not classic Type B, named explicitly each time rather
  than rounded into either bucket.
- **Deferral rules, absolute, never routed around**: RULE-FETCH-001's shapes — a named-bot
  robots.txt disallow (shape 1) or a bare wildcard `Disallow: /` (RULE-FETCH-005, blocks
  everyone, not just AI bots — check for this specifically, since a record's own `robots_check`
  field can be narrowly true and still miss it) defers on policy grounds; a live challenge
  page (Cloudflare "Just a moment...", shape 3) defers regardless of robots.txt, because solving
  or evading it is itself prohibited, not just impractical; tooling-level bot-detection with a
  clean robots.txt (shape 2) is the one case where a rendered-browser retry is a legitimate,
  different method rather than routing around a policy.

## Handoff status

RES-V2 idle, standing by for Adelaide per BASORG's note that it isn't ready yet. This document
and all six package results are committed and pushed to `oryn/res-v2-source-verification`.
