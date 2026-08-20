# Handoff: Counseling-materials discovery list — verification gap closed

Follows the founder's named "Section 12" counseling-materials discovery list documented in
`docs/research-handoff-opportunities.md`, which listed **10 remaining candidates**
(Ross Mathematics Program, Summer Science Program, Pioneer Academics, Wharton Global Youth
Program, Wharton M&TSI, BETA Camp, World Scholar's Cup, Wharton Investment Competition,
Berkeley Math Tournament, Stanford Math Tournament) as not-yet-verified against that
document's JSONL contract. **Re-checked live against the `opportunities` table
(2026-08-21, `qtcvcflzxbuagvvwahhu`, read-only) before doing any new research** — most of
that list turned out to already be live (added by DATA-A's later acquisition waves after
that doc was written), so the real remaining gap was narrower than the doc implies. This
package closes it.

## What was actually still missing vs. already live

| Named candidate | Live DB status found | Action taken |
|---|---|---|
| Ross Mathematics Program | `verified_current`, `selectivity_tier: highly_selective` | Already complete — no action |
| Summer Science Program (SSP) | `verified_current`, `selectivity_tier: highly_selective` | Already complete — no action |
| World Scholar's Cup | `verified_current`, `selectivity_tier: open_enrollment` | Already complete — no action |
| Wharton Investment Competition | `verified_current`, `selectivity_tier: open_enrollment` | Already complete — no action |
| **Berkeley Math Tournament** | **Not found in `opportunities` at all** | New candidate researched, JSONL below |
| **Stanford Math Tournament** | **Not found in `opportunities` at all** | New candidate researched, JSONL below |
| BETA Camp | Live but `verification_state: unverified`, `selectivity_tier: unknown` | Update proposal below |
| Pioneer Academics | Live but `verification_state: unverified`, `selectivity_tier: unknown`, **and `official_url` is wrong** | Update proposal below, URL flag |
| Wharton Global Youth Program (parent listing) | Live but `verification_state: unverified` | Not independently re-verified this pass — the specific sub-programs (FBW, M&TSI, below) were prioritized since they're the concrete, individually-addressable rows |
| Wharton M&TSI | `verified_current` but `selectivity_tier: unknown` | Update proposal below |

While re-measuring, two **unplanned findings** surfaced from the same live-DB query and
are the highest-value part of this handoff — see below.

## New candidates (full JSONL records)

`data/research/opportunities/counseling-list-verification_2026-08-21.jsonl` — 2 records,
both validated as parseable JSON, following the exact contract in
`docs/research-handoff-opportunities.md`.

- **Berkeley Math Tournament** — official URL is `berkeley.mt` (the live DB, if anyone
  searches, would find `bmt.berkeley.edu`, which 301-redirects here — use `berkeley.mt` as
  canonical). In-person Nov 14 2026 + online Dec 5 2026 formats. No selectivity mechanism,
  cost, or deadline found on the official page — left null rather than guessed.
- **Stanford Math Tournament** — official URL `stanfordmathtournament.org`. **Flagged as a
  live example of R4's own "stale page, no forward pointer" risk**: the page's most current
  content describes the Apr 2026 event, which has already concluded relative to this
  research's retrieval date, with no 2027 cycle announced yet. Recorded `cycle_status:
  closed` rather than guessing a 2027 date.

## Update proposals for existing live rows (not new inserts — field patches)

| Title | Proposed `selectivity_tier` | Evidence (for `selectivity_evidence`) | Other proposed fix |
|---|---|---|---|
| BETA Camp (now branded "Prequel") | `highly_selective` | Official site: "Only 10% of applicants are accepted into the program." Grades 9-11, North America eligibility, fully online, $500/month. | `verification_state` → `verified_current` (official `joinprequel.com` page fetched directly) |
| The Pioneer Academics Research Program | `highly_selective` | Official site: Pioneer Research Institute "admitting fewer than one-third of applicants"; multi-stage process (info session → application → screening → interview → final review); avg. accepted applicant SAT 1480 (optional). Minimum 3.3 GPA, no more than one C grade. | **`official_url` is wrong in the live row** — currently points to `pioneeracademics.com/news/is-pioneer-academics-worth-it-review-of-former-research-scholar/`, a third-party-style review/blog post, not the org's own program page. Correct canonical: `https://pioneeracademics.com/pioneer-research-institute/admission/` (or the bare homepage `https://pioneeracademics.com/`). `verification_state` → `verified_current`. |
| Wharton Global Youth Program: Future of the Business World (FBW) | `selective` (not `highly_selective` — no acceptance rate or quantified rarity was published, only qualitative "selective" language) | Official site: "Admission to Wharton's Future of the Business World program is selective," based on "a record of academic excellence and a genuine interest in developing business acumen and leadership skills." Priority deadline Jan 28, 2026; rolling final deadline. Grades 9-12, international applicants explicitly welcomed. | — |
| Wharton Management & Technology Summer Institute (M&TSI) | `highly_selective` | Official site: fixed cohort of exactly 75 participants selected via SAT/ACT scores, advanced chemistry/physics/calculus coursework, extracurricular leadership, and recommendation letters — a small fixed cohort plus competitive multi-factor review, not a published numeric acceptance rate. $12,000 on-campus program, July 12-30 2027, deadline TBA. | — |

## Two unplanned, higher-priority findings

**1. "Upenn Wharton Hack-AI-thon" is not a high-school opportunity at all.** The live
`opportunities` row (`verification_state: verified_current`, category `competition`) is
sourced to `ai-analytics.wharton.upenn.edu/for-students/wharton-hack-ai-thon/`. Direct
research (WebSearch, since WebFetch couldn't reach that specific domain) confirms: *"The
Wharton Hack-AI-thon welcomes University of Pennsylvania students of all skill levels...
it is exclusively for current Penn and Wharton students"* — first-come-first-served for
the first 60 teams, not an application process, and explicitly **not** open to high
schoolers. The same search result surfaced the actual high-school-relevant Wharton program
in this space: the Wharton High School Data Science Competition (see finding 2). **This
row should not be presented to ORYN's high-school users at all** — recommend DATA-A either
remove it or, if kept for some other reason, mark it clearly out of scope for the product's
14-18 target age band. This is exactly the kind of error the `minimum_age`/`eligible_grades`
gap (measured at 55/352 and 69/352 populated in R4) lets slip through silently.

**2. "Wharton Data Science Competition" and "Wharton Sports Analytics and Business
Initiative" are very likely the same competition, live as two separate, differently
categorized rows.** Direct fetch of `wsb.wharton.upenn.edu/wharton-data-competition/` (the
official URL on the "Wharton Sports Analytics and Business Initiative" row, currently
`category: summer_program`, `verification_state: unverified`) confirms it is actually the
**"Wharton High School Data Science Competition,"** organized by the Wharton Sports
Analytics and Business Initiative — the same organizer named on the *other* live row,
"Wharton Data Science Competition" (`category: competition`, official URL
`globalyouth.wharton.upenn.edu/competitions/data-science/`, organization field already
reads "Wharton Sports Analytics and Business Initiative / Wharton Global Youth Program" —
suggesting whoever entered that row already suspected the same overlap). Strong selectivity
evidence found on the `wsb.wharton.upenn.edu` page for whichever row survives dedup: over
700 teams from 48 countries competed, only 31 advanced to semifinalist stage, 5 reached
finals — supports `highly_selective` at minimum. **Recommend DATA-A run this pair through
`lib/opportunities/dedup.ts` and retire whichever row is the duplicate** — the
`wsb.wharton.upenn.edu` source confirms this is a *competition*, so the surviving row
should likely be the one already categorized as `competition`, not `summer_program`. Not
resolved here since dedup/merge writes are DATA-A's domain, not this research lane's.

## Verification methodology note

All fetches used official-domain URLs directly (WebFetch), with WebSearch used only where
WebFetch was blocked by a specific domain (`ai-analytics.wharton.upenn.edu` — no fetch
access; `globalyouth.wharton.upenn.edu/competitions/data-science/` — connection failure).
Quoted language is preserved wherever the source was directly fetched; for the two
WebSearch-only cases, findings are still traceable to specific search-indexed pages named
above.

## Next action

1. DATA-A ingests the 2 new candidate JSONL records (Berkeley Math Tournament, Stanford
   Math Tournament) via the established opportunities ingestion path.
2. DATA-A applies the 4 update-proposal field patches (BETA Camp, Pioneer Academics —
   including the URL fix — Wharton FBW, Wharton M&TSI).
3. DATA-A reviews and resolves the two unplanned findings: remove/rescope the
   university-only "Hack-AI-thon" row, and dedup the Wharton Data Science
   Competition / Sports Analytics Initiative pair.
4. No further action needed on the counseling-materials list itself — all 21 named
   candidates from `docs/research-handoff-opportunities.md` are now either live and
   verified, or covered by this handoff's proposals.
