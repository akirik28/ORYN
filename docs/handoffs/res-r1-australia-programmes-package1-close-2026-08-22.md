# RES-R1 — Australia Programme Catalogues, Package 1 Close-Out (2026-08-22)

**Status: complete.** All 8 target Australian universities resolved — 5 extracted, 3 deferred by
policy. Reported to BASORG via chat; BASORG's session became unreachable shortly after (matching
the wave of unexpected session endings BASORG itself flagged earlier this package), so this
handoff exists as the durable record per this org's own protocol: "a report that only exists in
a chat window doesn't exist." Escalating a copy to ORYN-CEO as well, since the direct report line
is currently unreachable.

**Branch:** `oryn/res-r1-au-programmes`, HEAD `afa3093`, pushed to `origin`. Isolated worktree
throughout, never touched the shared primary checkout.

**Full detail lives in `docs/research/university-programs-au/README.md`** — every method note,
every negative finding, every self-caught bug and its fix, structured to be resumable at any
section by a successor who has never seen this conversation. This handoff is a summary, not a
replacement for that document.

## What was produced

**770 records, corpus-wide validated (zero duplicate IDs, zero duplicate URLs, zero schema
failures), across 5 universities:**

| University | Rank (QS 2027) | Records | File |
|---|---|---|---|
| UNSW Sydney | 19 | 217 | `data/research/university-programs/au_programs_unsw_2026-08-22.jsonl` |
| Sydney | 28 | 149 | `au_programs_sydney_2026-08-22.jsonl` |
| Monash | 31 | 178 | `au_programs_monash_2026-08-22.jsonl` |
| UWA | 77 | 107 | `au_programs_uwa_2026-08-22.jsonl` |
| Adelaide University | 79 | 119 | `au_programs_adelaide_2026-08-22.jsonl` |

**3 deferred by policy** (Melbourne rank 22, ANU rank 29, Queensland rank 40) — each a different
access-control mechanism (Cloudflare bot-mitigation, explicit `robots.txt` disallow naming
`ClaudeBot`, AWS WAF CAPTCHA respectively), each with the marketing/main institutional domain
open while the specific host carrying the programme catalogue is gated. Full technical basis for
each in the README's named "Three of the top eight are structurally inaccessible" section. Sydney/
Monash/UWA were substituted into the package in their place, all BASORG-approved at the time.

Ingestion into the live DB was never in scope for this lane (research-only; write territory
belongs to RES-I1/RES-I2, per the org structure doc) and was not attempted.

## What went wrong, and what fixed it — the part most worth reading before trusting the numbers

Two real classification bugs surfaced mid-package, both self-caught, both corrected:

1. **Sydney's `degree_level`** initially had no path to detect "Master of"/"Doctor of" in
   combined titles (checked only "Honours"/"Diploma"), misclassifying 10 records one tier low.
   Caught by RES-V1's independent verification; fixed after a comprehensive token audit
   confirmed the gap was exactly those 10 and nothing wider.
2. **UWA's inclusion gate** initially required a `Course Code` HTML card to be present, wrongly
   excluding 93 genuine degree pages that simply don't publish that card. The first "fix"
   corrected the classifier but applied it only to the 93 re-fetched URLs — the untouched
   original 217 kept the old classifier's three further defects (null `degree_level` records
   written to the file anyway, genuine postgraduate "Graduate Diploma" titles mislabeled as
   undergraduate, ~109 standalone Master/Doctor titles wrongly promoted to integrated-master's).
   The real fix was a full clean rebuild from a classifier audited against the complete
   422-title census before running — landing on 107, correctly *lower* than either prior number,
   since UWA's catalogue turned out to be majority-postgraduate.

The named root cause for #2, in BASORG's words: **"a fix applied at the boundary rather than to
the population."** A derivation's correction has to be re-applied to everything that derivation
ever produced, not just the records known to be affected — verified by re-running the same audit
method against the actual output afterward, not by trusting the corrected logic on paper.

Adelaide (the final university) applied this lesson from the start: a two-stage fetch-then-
classify with zero classification decisions until the complete 559-title census was in hand,
which caught a genuine non-award-pathway category and a plain-Diploma category *before* they
could become defects rather than after.

## Standing findings promoted beyond this package (already relayed to BASORG, repeating here for durability)

- `research_program_id` is not globally unique across `data/research/university-programs/*.jsonl`
  by design — 536 recurring IDs, 522 of them deliberate cross-file re-pass/repair pairs. A naive
  global-uniqueness validator will false-positive on legitimate revision history.
- A null field's meaning is platform-specific and must be established from the record's own
  classification field each time, never inherited from the last platform (UNSW's 3 null-AQF
  records were genuine non-award pathways; Monash's 12 null-AQF records were only 3 genuine
  pathways and 9 unrelated postgraduate credentials with an unpopulated field).
- `robots.txt` fetches must be their own isolated tool call, evaluated before any other request
  to a new host — never batched with anything else. (Three independent lanes hit the ordering
  slip this applies to on the same day this package ran.)
- Corpus-wide schema/ID validation does not catch semantic correctness of field values. Both UWA
  classification bugs produced well-formed, schema-valid, wrong records that a validator checking
  only structure would never flag. The token-census method (enumerate every award-type token
  across a university's full title set, explicitly assign every category before classifying) is
  the actual bar this lane now applies before calling any title-token-classified university done.

## What a successor would need to do next

Nothing is blocking — the package's original scope is closed. Natural next increments, none
started here since they'd be new scope:

- Extend beyond the top 8 (rank 9+) if the product wants deeper Australian coverage.
- Complete Adelaide's domestic-variant `entry_requirements`/`study_mode` beyond the current
  18-programme sample to full coverage, if a consumer needs domestic-specific data.
- Retry Melbourne (via Course Seeker with browser tooling, not yet exhausted) or ANU (Wayback,
  rate-limited during this package, not exhausted) if a policy path opens up. Queensland's CAPTCHA
  has no such path under the base operating rules.
- Postgraduate/research-level coverage was out of scope throughout; every university's catalogue
  in this package indexes postgraduate programmes untouched here.

Ingestion of these 770 records into the live DB is a separate lane's work, not this one's.
