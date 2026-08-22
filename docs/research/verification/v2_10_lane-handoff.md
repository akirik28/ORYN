# RES-V2 lane handoff v2 — eight packages, method, and every instrument bug caught this session

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Written per BASORG's request, superseding `v2_7_lane-handoff.md` (kept in place, not edited —
it's the historical record of where things stood after V2-6; this document is the current one).
Audience: whoever picks up this lane next — Ottawa's source pass once RES-R1's ~275 records
land, per BASORG's note.

**Two count corrections up front, and one of them is a repeat worth naming as its own finding.**

- **Package count**: this lane has run **eight** verification packages (DLOPP, V2-2, V2-3, V2-4,
  V2-5, V2-6, V2-8, V2-9), plus **two** lane-handoff documents (this one and V2-7) — not "ten."
  Same shape of miscount as the "seven" in the V2-7 request (six packages then, corrected the
  same way), off by roughly the same margin again.
- **The "43" figure — this is the second time, not the first.** BASORG's V2-10 assignment again
  cites "the 43 false `current_cycle_label` findings chased to zero." V2-7 already addressed
  this exact claim in the identical phrasing ("43 false label findings you chased to zero"),
  found zero evidence of it anywhere in the repo, and named the closest real match: V2-4's
  `current_cycle_label` check flagged 56 candidates, of which most were false positives, resolved
  to **18 genuine holds — not zero, not 43.** Re-ran the same check just now, including
  everything V2-8/V2-9 added: still zero hits for "43" anywhere in this lane's verification docs
  or `ORYN_WORKSTREAMS.md`, other than the NYT record's unrelated `0.43` overlap score and my own
  prior correction text. **The finding here isn't just "the number is wrong" — it's that an
  already-corrected, already-pushed correction didn't prevent the same figure from being
  reasserted verbatim in the next assignment.** Worth BASORG looking into on its own side (a
  stale cached instruction, a context gap that doesn't carry V2-7's correction forward, or
  something else) — flagging the pattern rather than quietly re-swatting the number a second
  time and letting a third instance pass unremarked.

## Instrument and tooling near-misses — every one caught before it reached BASORG as a finding

Requested first, and rightly — this is the part of the lane's work that outlives any single
verdict. Symptom-first, in the order found. The recurring lesson underneath all six: **a
pattern-match score, or a check run against the same classifier that produced the data, is a
candidate, not a finding** — the same principle BASORG named after their own domain-heuristic
attempts ran 93%/100% false-positive, and the one this session's own rule 27 now states formally
(a consistency check between two values that share an origin cannot detect a single-source
error). Every case below was caught by reading the actual source before reporting, not by
trusting the automated or self-referential signal.

1. **V2-3, Southampton** — a title-only comparison flagged ~8 records as mismatches because
   `<title>` carries a shortened form of the program name; the full name is in the body heading.
   Checking body content resolved all 8 as genuine matches.
2. **V2-3, St Andrews** — a regex requiring `</title>` missed all 10 St Andrews records because
   their actual closing tag is `</title >` (trailing space). Fixed the regex, reconfirmed all 10.
3. **V2-4, `current_cycle_label`** — a literal string-inequality check against live state
   produced **56** "holds," almost all fake, because live is often already a fuller written
   version of the same proposed fact (RULE-INGEST-004's exact risk). A second, separate trap in
   the same pass: `cycle_status_found: "unknown"` is the researcher's own "couldn't determine"
   marker, not a proposal — 6 records using it were wrongly counted as holds until excluded. Net
   after both corrections: **18 genuine holds.**
4. **V2-5, Monash campus field** — a field-extraction script checked the top-level `campus`
   field, empty for Monash's multi-campus (Malaysia/Indonesia/Melbourne-city) programs, and
   flagged 8 false "mismatches." The real value lives nested at `offering[].display_name`. Found
   the correct path, reconfirmed all 8 exact before reporting anything.
5. **V2-6, NYT block page (under-matching → caught)** — a curl fetch returned a 403 page titled
   "Not Authorized - The New York Times." A word-overlap script scored this 0.43 against the
   row's title "New York Times Audio Stories Podcast Contest" — past the 0.35 flagging threshold,
   purely from "new/york/times" being common to both strings. Would have silently passed as
   clean. Caught only because curl's raw status codes were cross-referenced against the
   content-flag list independently, not because the score itself looked wrong.
6. **V2-9, UWA's case-sensitive `Course Code` regex** — one excluded-population sample record
   (`software-engineering`) showed no title-text signal in either direction and no `Course Code`
   match, flagged internally as genuinely unclear rather than assumed clean either way. Reading
   the full page resolved it: the card rendered as all-caps `COURSE CODE MJD-ESOFT`, a
   page-template variant my case-sensitive regex missed. Re-ran case-insensitively, confirmed a
   genuine major page, correctly excluded — same as the other 10 `MJD-` records in that sample.

**Not on this list, disclosed but distinct in kind**: V2-6's `t6`/`t9` (Pioneer Academics,
Garcia Summer Scholars) are the *mirror image* of the pattern above — a wrong page scored a
**perfect** overlap because it shared the program's own vocabulary. Worth keeping conceptually
separate from the six: those six are "my tooling missed a real match"; `t6`/`t9` are "my tooling
found a fake match" — both are the same underlying lesson (a score is a candidate, not a
finding) but they fail in opposite directions, and a successor should watch for both, not assume
a high score is safer than a low one.

## The eight verification packages — what each covered, and what each explicitly did not

### Package 1 — DLOPP source verification (`v2_dlopp_verdict.md`)
**Covered**: 34/74 records (45.9%) — all 14 `dated_current_cycle` records byte-exact re-fetched,
all 6 RES-R2-flagged records, all 5 `deferred` robots/403 claims, plus a `random.seed(20260822)`
10-record draw from the unflagged remainder. **Result**: PASS, zero blocking defects; one live
defect independently reconfirmed (SIP/UCSC stuck on `cycle_status='upcoming'` post-conclusion).
**Did not cover**: the other 40/74 outside both the flagged set and the random draw.

### Package V2-2 — active-status audit (`v2_2_active-status-audit_*.md`)
**Covered**: all 66 live rows with `status='active' AND cycle_status IN ('open','upcoming')`,
across three rounds (oldest-`updated_at` sub-batches at 40% then 6.7% defect rates, plus a
random-seed population estimate at 8.3%). **Result**: 62 verified + 4 deferred = 66/66. Most
defects share one shape — a page whose only dates are already-elapsed, a freshness-cadence gap.
**Did not cover**: rows outside the `active`+`open/upcoming` filter (V2-6 later covered a
different, broader active-row population from a different angle).

### Package V2-3 — url_repair + Glasgow degree_type (`v2_3_url-repair-and-glasgow.md`)
**Covered**: url_repair (1,429 records), stratified n=80, checking Type A and Type B for the
first time this session — 0/80 both. Glasgow's 62 `degree_type` candidates, independently
re-derived as a third check, stratified n=30 (48%) — 30/30 factually correct.
**Did not cover**: the other 1,349 url_repair records and 32 Glasgow candidates individually —
PASS is a sample-based recommendation, not full coverage. Flagged, not resolved: 83% of sampled
Glasgow programmes are multi-award, a schema question routed to BASORG/CFO.

### Package V2-4 — RES-I2's held DLOPP fields (`v2_4_dlopp-held-fields.md`)
**Covered**: re-derived the held set from first principles (no file had the itemized list) — net
18 genuine holds after excluding the two false-positive traps above. IPPF resolved, 3 more
resolved toward the original proposal, 1 toward neither prior value, 3 toward keeping live
unchanged, 1 unreachable. **Did not cover**: `current_cycle_label` holds, by design — resolving
that free-text field as a blanket list would reproduce the false-positive risk at scale.

### Package V2-5 — AU corpus, UNSW/Sydney/Monash (`v2_5_au-corpus-*.md`)
**Covered**: 544 records against BASORG's UWA-driven ~30% `degree_level` warning. 37 targeted
(every rare/edge category) + 45 random, 82/544 (15.1%). **Result**: 82/82 clean, including the
specific title-shapes UWA's defect class hit hardest. **Did not cover, stated as partial**:
Monash's 9 excluded postgraduate records' specific IDs — a 15-code random draw confirmed the
exclusion mechanism's plausibility but had only ~35% odds of hitting the actual null-`aqf_level`
population, and didn't.

### Package V2-6 — wrong-target `official_url`s (`v2_6_wrong-target-urls-*.md`)
**Covered**: prevalence of Type A/B among 271 active rows with a URL. Random n=70 (sole rate
instrument) + Drive-corpus characterization n=15. **Result**: 2.9% combined Type A+B — well
under BUG-1's 31% description-signature floor, a different failure surface, not stacked on it;
100% of the random arm's findings trace to Drive-corpus provenance (23.1% vs 2.3% any-flag by
subset). **Did not cover**: the 201 active-URL rows outside the random sample — a population
estimate, not a full census.

### Package V2-8 — Adelaide independent verification (`v2_8_adelaide-source-verification-*.md`)
**Covered**: 119 in-scope records, assigned directly by BASORG since Adelaide had only
self-verification. Reconciliation via fresh independent sitemap fetch (560 confirmed, 1-URL
residual attributed to ordinary site drift); classification sample n=25/561; content arms n=41
(random + Adelaide's own edge categories at full coverage); dom/int invariance sub-sample n=8/18.
**Result**: **the labeling-accuracy defect** — all three of R1's non-award pathway records
(ATSIP, CASM, Foundation Studies) have `international`-keyed content actually sourced from
Adelaide's domestic-only page, no genuine international variant exists for any of them at any
URL suffix; a fourth example ("UniStart") found outside the 119, fitting none of R1's four
exclusion rules. Practical impact low (`international_eligible` already correctly `null` on all
three). **Did not cover**: resolving either finding unilaterally — both routed back to RES-R1 for
decision, per this lane's standing practice.

### Package V2-9 — UWA independent verification (`v2_9_uwa-source-verification-*.md`)
**Covered**: 107 in-scope records — the corpus that passed RES-R1's own title-token validation
*twice* while 63% (182/289) was misclassified. Reconciliation via fresh sitemap fetch (422
confirmed exactly, zero residual). Content arms n=40 (random + full coverage on Honours/Associate
+ targeted integrated-master's): 0/40 flagged. **The sharper instrument, run in the direction the
historical defect actually pointed**: random sample n=25 of the 315 *excluded* candidates,
testing whether the stricter rebuild cut something that should have stayed in — 25/25 confirmed
correctly excluded. **Did not cover**: this package explicitly is not a second confirmation of
RES-R1's or RES-V1's classifier-self-checks (rule 27, below) — it's the first check with an
independent origin this corpus has had.

## Sampling method, reusable as-is for Ottawa or any future package

- **Seed every random draw explicitly**, record the seed in the design doc, commit the design
  and every sample file **before the first fetch** — adopted mid-session (V2-5 onward)
  specifically so a sample can't be second-guessed after seeing results.
- **Two instruments, reported separately, never blended**: targeted (biased by design, cannot
  produce a population rate) and random (the only instrument that can). V2-6 is the standing
  exception worth remembering: when a defect class has no signature to target toward (a
  wrong-target URL looks exactly as unsuspicious as a correct one), a targeted arm can still
  *characterize* a known subset, but only random can produce a rate.
- **State fail/pass thresholds before fetching, and report plainly when the result falls outside
  what the thresholds anticipated** rather than retrofitting the framing — V2-6's thresholds both
  assumed Type B would add to BUG-1's 31%; the result came in at 2.9%, and the right move was
  saying the pre-registered assumption was wrong, not reinterpreting the number as a disguised
  confirmation of something the thresholds didn't ask.
- **Re-derive population counts and itemized lists from live state**, never from a prose figure
  in a brief — DLOPP's "34 held fields" (no file had the list), Glasgow's "62" (a third
  independent check), V2-6's Drive-corpus population (96 active, not the brief's ~214), V2-8's
  Adelaide sitemap (560, not assumed), V2-9's UWA sitemap (422, confirmed exactly).
- **Type A / Type B classification**, plus a named third category: does the URL resolve (A), and
  if so, does the landing page identify itself as the row's own named entity (B) — not "is this
  plausible," but "does this page say it is the thing the row claims." A recurring real third
  case: **right organization, generic hub/rotating-catalog or dated review/news page instead of
  the specific program** (V2-6's CTY/Princeton, USC/"Dive Into Engineering," Pioneer Academics,
  Garcia Summer Scholars) — named explicitly each time, never rounded into either bucket.
- **Deferral rules, absolute, never routed around**: a named-bot robots.txt disallow or a bare
  wildcard `Disallow: /` (blocks everyone, not just AI bots — check for this specifically) defers
  on policy grounds; a live challenge page defers regardless of robots.txt, since solving or
  evading it is itself prohibited; tooling-level bot-detection with a clean robots.txt is the one
  case where a rendered-browser retry is legitimate. **New this round**: robots.txt governs the
  path actually *requested*, not the destination a redirect lands on (RES-V1's UWA `/sitecore/`
  finding) — check the original path at every hop, not just the final one.
- **Rule 27, adopted this session from this lane's own Adelaide finding, stated in BASORG's
  wording**: *"A consistency check between two values cannot detect a single-source origin."*
  Before trusting any check as evidence, state the question it was meant to answer and confirm
  it answers that one, not a narrower one that passes trivially. Applied directly in V2-9: RES-R1
  re-running its own token census against its own rebuild's output, and RES-V1's contract pass
  doing the same, are both checks of the classifier against itself — no independent origin, and
  structurally incapable of catching an error the classifier would produce identically on both
  sides. A verification package's job, this lane's specifically, is to be the check that *does*
  have an independent origin — live source versus stored record — and to say so explicitly
  rather than let three passes read as three confirmations of one thing.
- **The direction-of-defect principle, found in V2-9 and now BASORG-standing**: *when a fix
  tightens a rule, verify the newly-excluded population, not only the retained one* — an
  exclusion is a silent deletion, and nothing downstream ever notices a record that isn't there.
  UWA's original defect was over-inclusion (postgraduate content kept as undergraduate); the
  rebuild fixed it by excluding harder, and the untested question was whether that new exclusion
  went too far. It hadn't (25/25 confirmed correctly excluded), but the check needed to exist
  regardless of the answer — a clean result from only checking the retained population would
  have been genuinely uninformative about this specific risk, not just less thorough.

## Handoff status

RES-V2 idle. Australian source verification is closed end to end (651 records, five
universities, both verifier lanes — V2-5 + V2-8 + V2-9). Next: Ottawa's source pass once RES-R1's
~275 records land — bilingual at the programme level, so `language_of_instruction` should be
checked as a real per-record field read from the source, not inferred from URL path, per
BASORG's note. This document and all eight package results are committed and pushed to
`oryn/res-v2-source-verification`.
