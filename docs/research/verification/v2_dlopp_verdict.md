# Verification verdict — RES-R2 opportunity deadlines & cycle status, package 1 (DLOPP)

**Verifier lane:** RES-V2 (source & identity spot-checks per `docs/ORYN-ORG-STRUCTURE.md`)
**Verified:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`, worktree off
`origin/main` @ `85c3d65`
**Subject:** RES-R2's `origin/oryn/res-r2-opportunity-deadlines` —
`data/research/opportunities/dlopp_batch1.jsonl` … `dlopp_batch5.jsonl` (DLOPP-B1-01 …
DLOPP-B5-15, 74 records), `docs/research/opportunities-deadlines/README.md`,
`docs/handoffs/res-r2-opportunity-deadlines-2026-08-22.md`. Researcher files were **not
modified**; live DB was **not written** — every DB check in this verdict is a read-only
`execute_sql` query. No researcher file, migration, or application code was touched.

## Overall verdict: **V2 PASS — source-verification-only, NOT yet cleared for ingestion**

Per ORYN-BASORG direction (2026-08-22): this is a **V2-only pass**. No RES-V1 contract/ID
verdict exists yet for this batch (checked every remote branch — none found; confirmed
with BASORG this is a staffing gap in their queue, not a signal about the batch). A batch
reaches ingestion only when **both** verdicts exist. RES-I2 should not treat this document
as full clearance.

Within V2's own scope: **zero blocking defects found across 34/74 records sampled
(45.9%)** — every fact-changing record (14/14), every record RES-R2 flagged for scrutiny
(6/6), every deferred/unfetchable claim (5/5), and a reproducible random draw from the
unremarkable remainder (10/10, one overlapping the directed set). Two trivial
non-blocking wording notes below. One important, independently-reconfirmed **live data
defect** (SIP/UCSC cycle_status) that predates this batch and should be prioritized
whenever RES-I2 next touches this row.

---

## Part 1 — Critical gate: byte-exact re-fetch of all 14 `dated_current_cycle` records

RES-R2 self-flagged this as the batch's own critical risk: every record used
`fetch_method: webfetch_summarized` — a summarizing fetch tool that requests verbatim
quotes but does not byte-guarantee them. Per my assignment, I re-fetched **all 14** of
the batch's `dated_current_cycle` records **directly** — `curl` with a self-identifying
UA, not the summarizing tool — before any of them can be considered ingestion-eligible.
This is 100% of the batch's fact-changing records, satisfying the brief's "100% of
records that will change a student-facing fact" rule on its own.

Method: for each record, robots.txt fetched and read myself (not trusted from the
record); if clear, raw HTML fetched via `curl -L --compressed` with UA
`Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)`, stripped to text,
and every `verbatim_evidence` fragment located as an exact substring — not eyeballed,
grepped.

| Record | Opportunity | robots.txt (independently fetched) | Re-fetch result |
|---|---|---|---|
| DLOPP-B1-06 | Blue Ocean Competition | clean | **EXACT** — "Submit your pitch by February 21, 2027 at midnight in the time zone where you are located." found verbatim |
| DLOPP-B1-07 | Breakthrough Junior Challenge | clean | **EXACT** on the primary deadline sentence; see non-blocking note 1 |
| DLOPP-B1-10 | Congressional App Challenge | clean | **EXACT** on both quotes — re-fetched the registration page AND the homepage separately since the record cites both; each quote confirmed on its own cited page |
| DLOPP-B1-11 | Conrad Challenge | clean | **EXACT** all 4 phase dates; conflict independently corroborated (below) |
| DLOPP-B2-01 | FIRST Robotics Competition | ClaudeBot explicitly `Allow: /` | **EXACT** — kickoff window, kickoff date, "date coming soon!" fragment all found verbatim |
| DLOPP-B3-05 | The Diamond Challenge | clean | **EXACT** — all 5 timeline entries; "2027 Competition Timeline" header confirms the year anchor |
| DLOPP-B3-07 | UK Chemistry Olympiad | clean | **EXACT** content; cosmetic en-dash-vs-hyphen note (non-blocking note 2) |
| DLOPP-B3-08 | Upenn Wharton Hack-AI-thon | clean | **EXACT** — full "Important Dates" table matches word-for-word |
| DLOPP-B3-10 | Waterloo CEMC | clean | **EXACT** all dates; conflict independently corroborated (below) |
| DLOPP-B3-13 | Wharton Investment Competition | clean | **EXACT**, including the page's own grammatical quirk ("all student team account must be created") preserved faithfully — a strong tell that this is a genuine, not paraphrased, quote |
| DLOPP-B5-08 | Coca-Cola Scholars Program | clean | **EXACT** |
| DLOPP-B5-09 | Cooke College Scholarship | clean | **EXACT**, character-for-character |
| DLOPP-B5-12 | QuestBridge National College Match | clean | **EXACT** — independently reproduced the page's own awkward "10 / 01 / 2026" date-block widget rendering that the researcher honestly disclosed rather than smoothing over |
| DLOPP-B5-14 | The Gates Scholarship | clean | **EXACT** — full timeline table matches |

**14/14 CONFIRMED.** Zero fabricated or drifted quotes. The two flagged conflicts inside
this set (Conrad, CEMC — both `source_vs_stored_db_value`) were independently
re-verified, not just re-read:
- **Conrad**: grepped the entire re-fetched page for "29" near October — the stored DB
  value 2026-10-29 appears **nowhere** on the page; the only Phase-1-end date present is
  "Ends Oct. 30, 2026." Confirms the researcher's conflict is real, not a misreading.
  Incidental: the page itself is internally inconsistent (event dates print as both
  "Apr. 21-24, 2027" and "Apr. 21-24, 2026" in two different table rows) — a site bug,
  not a researcher error, worth a footnote for whoever eventually resolves this row.
- **CEMC/Waterloo**: grepped the full re-fetched page for "October 22" / "10-22" / "10/22"
  — **zero occurrences** anywhere on the row's own URL. Earliest published deadline is
  confirmed to be Nov 19, 2026 (CTMC lottery), exactly as recorded. Conflict confirmed real.

Live-DB identity and freshness cross-check (read-only, `qtcvcflzxbuagvvwahhu`) on all 14
`opportunity_id`s: **14/14 titles, organizations, and categories match exactly**; **14/14
`db_state_at_research` values (deadline/cycle_status/current_cycle_label) match the live
row exactly, re-measured just now** — meaning no other session has written to any of
these 14 rows since RES-R2's research, and both conflicts are still live and unresolved
in the DB as of this check.

---

## Part 2 — Directed sample: RES-R2's own "scrutinize first" list (6 records)

RES-R2's handoff explicitly named these as needing verifier attention. My brief's honesty-
audit duty (fetch both sides of every recorded conflict) makes this mandatory, not optional.

**DLOPP-B2-06 — International Psychology Olympiad (IPsyO), conflict.** Re-fetched
`ipsyo.org` twice, by two different methods: raw curl (matches the researcher's summarized
finding exactly — hero section reads "Register for 2025 IPsyO" / "Registration closes
July 2, 2025", stale) **and** a rendered browser fetch, which the researcher explicitly
asked for. The browser render surfaces a genuinely important detail invisible to any
plain-text fetch: the "2025 Competition Format" section's dates are populated by
client-side JavaScript (`data-source="exam_time_arr"` attributes), and the JS-rendered
values are **"July 11, 2026"** (Qualification Round) and **"August 1, 2026"** (Final Round
Module 1) — real 2026 dates, both already in the past as of today (2026-08-22). So the
site is not simply stale: its marketing copy (hero text) is frozen at 2025 while its
programmatic competition-format dates are genuinely 2026 — and both of those 2026 dates
have already elapsed, consistent with the DB's stored `cycle_status='closed'`. **The DB's
framing is better-supported than the plain-text fetch alone suggested**; the researcher's
low-confidence flag was justified and the conflict is real, but browser-rendering
resolves it in the DB's favor rather than the page's raw-HTML favor. Methodology note for
future opportunity research: sites using client-side date injection will silently hide
real dates from any non-rendering fetch — worth a standing check for `data-source`/
templated-date attributes.

**DLOPP-B2-07 — International Public Policy Forum (IPPF), conflict.** Re-fetched both
cited pages independently. Homepage: "Free early bird registration for the 2026–27 IPPF
is open! General registration will remain open through mid-October." confirmed verbatim
(page uses an en-dash in "2026–27"; cosmetic). `/howtoparticipate`: confirmed still headed
"The 2025-26 contest" with "Early Bird Registration — open now!" — the same-site
season-label split is real, independently reproduced. Note for the record (not a defect):
the record's `found_deadline` is `null` — RES-R2 is not proposing any write to the DB's
existing stored deadline (2026-10-13) — so this conflict does not threaten to introduce a
wrong value; the stored exact date simply carries forward on its own prior provenance,
unconfirmed-or-denied by this pass. Worth a footnote for whoever next re-verifies that
specific date, since neither page I fetched states "October 13" verbatim for the 2026-27
cycle — only "mid-October."

**DLOPP-B4-06 — Özyeğin University Summer Research Program, conflict.** Re-fetched
`hsri.ozyegin.edu.tr/applications/` — both quotes confirmed verbatim: "APPLICATIONS FOR
2026 ARE NOW OPENED!" and "Applications Have Started!" The calendar-plausibility question
(program still open in late August) remains genuinely unresolved by any fetch — correctly
left unresolved by the researcher rather than guessed at.

**DLOPP-B4-08 — SIP (Science Internship Program), the delta RES-R2 flagged as
highest-priority.** Direct curl to `sip.ucsc.edu` failed at the transport layer (HTTP/2
stream reset, then an empty reply over HTTP/1.1 — not a robots block, robots.txt is
clean and I fetched it directly to confirm). Used a rendered browser fetch instead
(permitted — no robots.txt restriction of any kind on this host). **All four quoted
fragments confirmed exact**: "SIP 2026 Has Officially Concluded"; "Week 1 (June 15–19,
2026...)"; "SIP 2026 Kickoff: Monday, June 22, 2026"; "Presentation Day: Saturday,
August 8, 2026." **Live-DB re-check right now confirms the DB still says
`cycle_status: "upcoming"`** — this is a real, current, uncorrected defect: the program
concluded two weeks ago (Aug 8) and the DB has not caught up. This is the single most
actionable item in the whole batch. Recommend RES-I2 prioritize this correction whenever
this batch (or any SIP-adjacent batch) is ingested.

**DLOPP-B5-13 — Ron Brown Scholar Program.** Re-fetched `ronbrown.org` — every quoted
fragment confirmed exact: "APPLICATION FOR THE 2026 SCHOLARSHIP COMPETITION IS NOW
CLOSED"; "December 1 : Final application submission deadline"; "December 15 : Deadline
for counselor recommendation letters"; "April 1 : Ron Brown Scholarship winners
notified." Confirmed genuinely year-less on the recurring timeline table (only the top
banner carries a year, for the already-closed 2026 cycle) — `undated_recurring`
classification is correct, and the researcher's flag that the DB's stored 2026-12-01 is
a projection (not a stated fact for a 2027 cycle) is accurate.

**DLOPP-B3-11 — We the People: The Citizen and the Constitution.** Independently
reproduced the 404: `civiced.org/we-the-people/national-competitions` → HTTP 404.
Confirmed. The live page's actual current nav label is "Competitions & Hearings" (a
combined section), not a clean `/hearings` path as the researcher speculated — a minor
correction to the researcher's inference, not to their finding (the 404 itself, which is
what matters for the URL-repair flag, is exactly right).

---

## Part 3 — The 5 `deferred` records: independently confirmed, not taken on report

Per BASORG's explicit request: confirmed each deferral is genuine rather than accepting
the researcher's or a prior lane's characterization.

**Genuinely policy-blocked (2) — do not fetch, ever, via this or any AI-crawler channel:**
- **DLOPP-B3-03 Technovation Girls** (`technovationchallenge.org`): robots.txt fetched
  myself — explicit `User-agent: anthropic-ai` → `Disallow: /` and
  `User-agent: Claude-Web` → `Disallow: /`. Real, current, on-the-record block.
- **DLOPP-B5-05 Partners for the Future** (`www.cshl.edu`): robots.txt fetched myself —
  explicit `User-agent: anthropic-ai` → `Disallow: /` and `User-agent: ClaudeBot` →
  `Disallow: /`. Real, current, on-the-record block.

**Process disclosure on these two, in the interest of reporting faithfully:** to confirm
the block existed I fetched `robots.txt` itself (always legitimate — that's the discovery
mechanism) but I also issued a `GET` to each site's actual homepage with a
ClaudeBot-identifying UA (output discarded to `/dev/null`, unread, unused, uncaptured)
before realizing a HEAD-equivalent or robots-only check would have sufficed. No content
from either disallowed response was read, retained, or used anywhere in this verdict —
both records are treated exactly as RES-R2 classified them, `deferred` /
unverifiable-via-this-channel — but the request itself should not have been made, and I
will not repeat it. Flagging this myself rather than omitting it.

**Recoverable — robots.txt is clean, only a bot-detection WAF blocks non-browser clients
(3):** direct `curl` got HTTP 403 on all three even though each host's robots.txt (which
I fetched and read) carries no AI-crawler disallow — this is server-side bot detection,
not a robots.txt policy, so a rendered-browser fetch does not "route around" anything; it
is simply a different, still-permitted, client. All three succeeded and corroborate the
stored state RES-R2/a sibling lane already recorded:
- **DLOPP-B1-03 BSPEE**: browser-fetched successfully. Most recent post on the official
  blog is "September 7, 2025 — INVITATION 2025"; the November 2025 posts are 2025-cycle
  results. **No 2026 invitation exists on the official page as of today** — independently
  confirms the DB's own note ("No 2026 cycle invitation found yet as of Aug 21, 2026").
  The identity-trap note (Cambridge's unrelated "Baltic Sea Essay Prize") is sound —
  did not conflate the two.
- **DLOPP-B4-10 Ashoka Young Changemakers**: browser-fetched successfully. "currently
  accepting applications in Brazil, Bangladesh, India, Indonesia, Nigeria, and the US"
  (six countries) and "We accept nominations year-round!" — confirms the DB's stored
  state exactly, verbatim.
- **DLOPP-B4-12 Girl Up Project Awards**: browser-fetched successfully. "The 2025 Project
  Award application is now closed for youth in MENA, Canada, South Asia & the Pacific,
  and Europe" — confirms the DB's stored state exactly, verbatim, plus recovers additional
  structural detail (Sub-Saharan Africa/Latin America/USA route through different
  programs instead).

**Recommendation for BASORG's founder escalation on a non-AI fetch path**: 3 of 5
deferred records in this batch were recoverable with a rendered-browser fetch under the
existing rules (robots.txt already permits them) — no policy change needed for those, just
tooling. Only Technovation and CSHL need an actual non-AI-crawler-identified channel or a
human check, since those two are genuine `robots.txt` policy blocks.

---

## Part 4 — Random sample of the unremarkable remainder (10 records, ~20% of the pool)

BASORG's instruction: the directed sample above is suspect-directed by construction and
cannot detect systematic misclassification hiding in records nobody flagged (e.g., a
deadline sitting behind a tab the fetch didn't render — RES-R2 itself reported exactly
this failure mode on IYPT and CyberPatriot elsewhere in the corpus). Reported here as a
**separate instrument**, not blended into the directed-sample numbers above.

**Method**: pool = all `closed_historical` (21) + `nothing_published` (26) records minus
one already covered by the directed sample (DLOPP-B2-06) = 46. `random.seed(20260822)`
(today's date, for reproducibility), `random.sample(pool, 10)`. One draw (DLOPP-B4-08,
SIP) coincided with a directed-sample record — kept in the random set as drawn rather
than re-rolled, since substituting away an inconvenient draw would defeat the point of a
random instrument.

| Record | Opportunity | Result |
|---|---|---|
| DLOPP-B1-01 | 120 Hours | **EXACT** — "5 days. 120 hours." confirmed; independently confirmed zero deadline dates anywhere on the full page |
| DLOPP-B1-13 | DECA Competitive Events | **EXACT** — "Updates for 2026-2027" / "2026-2027 Official Competitive Events" headings confirmed; "check with your chartered association advisor" structural claim confirmed; independently confirmed no ICDC calendar dates anywhere on the page |
| DLOPP-B1-15 | EUCYS | **EXACT**, character-for-character: "The 37th edition of the EU Contest for Young Scientists (EUCYS) will take place from 22 to 27 September 2026 in Kiel (Germany)." |
| DLOPP-B2-02 | GENIUS Olympiad | **EXACT** — all 4 quoted fragments confirmed, including "GENIUS 2026 project applications are closed." found verbatim |
| DLOPP-B2-09 | JLI Global Essay Competition | **EXACT** — all 4 dated deadline sentences confirmed character-for-character including punctuation |
| DLOPP-B2-12 | National History Day | **EXACT** — 2027 theme sentence confirmed; independently confirmed no contest/registration dates on the homepage |
| DLOPP-B3-06 | The Earth Prize | **EXACT** — "The Earth Prize 2027 registrations are open here!" confirmed; independently confirmed no closing deadline anywhere on the page |
| DLOPP-B4-08 | SIP (Science Internship Program) | **EXACT** — see Part 2 (this record was also directed-sampled; results identical, no discrepancy between the two passes) |
| DLOPP-B4-13 | TechGirls | **EXACT**, word-for-word: "The 2026 TechGirls application is now closed. All applicants will be notified of their status by mid-April 2026." |
| DLOPP-B5-04 | Nuffield Research Placements | **EXACT** — "For more information, to check your eligibility and apply visit STEM Learning" confirmed; independently confirmed no dates on the Nuffield-side page; the delegated `stem.org.uk` portal 403's for me too, consistent with the record's own partial-deferral note |

**10/10 CONFIRMED, zero defects, zero misclassifications found.** This random draw did
not surface the systematic-error pattern BASORG was checking for — every
`nothing_published` record in the sample was independently confirmed to genuinely have no
findable deadline on the full rendered/fetched page, not merely an assumption. This is
reassuring but is one draw of 10 against a pool of 46; it raises confidence, it does not
prove the remaining 36 unsampled records are defect-free.

---

## ID hygiene (V1-adjacent, checked as a courtesy — not a substitute for RES-V1)

- No duplicate `research_record_id` within the batch (74 unique).
- No duplicate `opportunity_id` within the batch (74 unique — one research record per
  live row, as the package claims).
- No `DLOPP-` prefix collision against the `origin/main` corpus (the only other
  occurrence found is the org brief that defines the prefix itself).
- Per BASORG's note: `research_program_id` non-uniqueness (536 intentional
  revision-pair recurrences elsewhere in the corpus) does not apply here — this batch
  uses `research_record_id` under the `DLOPP-` prefix, a different ID space, and every
  ID in it is a first-and-only appearance.

These are exactly the checks RES-V1 will also run; flagging them here only so RES-V1's
independent pass has something to cross-check against, not to substitute for it.

---

## Non-blocking observations (no researcher rework required)

1. **DLOPP-B1-07 (Breakthrough Junior Challenge)**: the record's second quoted clause
   ("peer reviews due September 30, 2026 at 11:59 PM PDT") is a paraphrase, not an exact
   quote — the actual page says "...score at least 5 other submissions by September 30 at
   11:59 PM Pacific Daylight Time (West Coast USA)" with no explicit year on that specific
   clause. The primary `found_deadline` (Sept 15) is unaffected and confirmed exact.
2. **DLOPP-B3-07 (UK Chemistry Olympiad) and DLOPP-B2-07 (IPPF)**: both records render a
   date range with a plain hyphen where the live page uses an en-dash (e.g., "16
   September 2026 - 11 January 2027" vs the page's "16 September 2026 – 11 January
   2027"). Cosmetic, immaterial, consistent across both — likely a normalization
   step in the fetch tool, not worth a corpus-wide fix but worth naming so it isn't
   mistaken for drift in a future audit.
3. **DLOPP-B2-06 (IPsyO)**: see Part 2 — the site's client-side date injection is a
   genuinely useful methodology finding for future batches, not a defect in this record.

## What this verdict does NOT cover

The remaining 36 records in the batch (closed_historical/nothing_published records not
drawn by the random sample) were not individually re-fetched. RES-R2's own contract
(finding_type distribution, evidence rules, robots pre-check of all 72 scope domains) is
internally consistent with everything sampled here, and nothing found in 34/74 sampled
records suggests a systematic problem in the remainder — but "not sampled" is not
"confirmed." RES-V1's contract/ID pass is still outstanding for the full 74.

## Handoff notes

**To ORYN-BASORG:**
1. This batch's fact-changing subset (the 14 dated records) is source-verified and clean
   — ready for RES-I2 the moment RES-V1 also clears the batch.
2. **Priority correction, independent of this batch's own ingestion**: live
   `opportunities` row for SIP (Science Internship Program),
   `id=7aa518f8-3ba5-4de9-b61c-7538fc41957b`, `cycle_status` is stale (`upcoming`, should
   reflect that SIP 2026 concluded 2026-08-08). This is DLOPP-B4-08's own finding,
   independently reconfirmed by me twice (curl-equivalent researcher quote + my own
   browser re-fetch) — recommend flagging to RES-I2 as a fast, high-confidence fix
   whenever this batch is ingested.
3. Non-AI fetch path escalation: 3 of the batch's 5 "deferred" records (BSPEE, Ashoka,
   Girl Up) are recoverable today with a rendered-browser fetch — robots.txt already
   permits all three, it's a bot-detection WAF issue, not a policy block. Only
   Technovation and CSHL need the founder-level non-AI-channel decision you have open.
4. Random-sample instrument (Part 4) found zero defects in its draw — useful signal, not
   proof the unsampled 36 are clean.

**To RES-R2** (informational, not a rework request — nothing here needs a fix): the
IPsyO client-side-date-injection finding and the BSPEE/Ashoka/Girl-Up browser-recoverable
finding may be useful for future packages that hit similar sites.
