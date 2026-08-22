# Package V2-2 — audit of live `opportunities` rows claiming `open`/`upcoming`

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Scope:** live `status='active'` rows where `cycle_status IN ('open','upcoming')` —
re-measured live at package start: 31 `open` + 35 `upcoming` = **66 rows**, matching
ORYN-BASORG's count exactly. Per BASORG: these 66 make an actionable promise to a
student ("this is available to you right now or soon"), unlike `unverified`/
`date_not_announced`/`closed`/`historical`, so a wrong claim here costs a student real
time — "sends them to a closed door."

Method: robots.txt fetched and read myself before any content fetch (never trusted from
a prior record); direct `curl` first, rendered browser fetch when `curl` hit tooling-level
bot-detection (clean robots.txt, per RULE-FETCH-001 shape 2); genuine robots.txt
AI-crawler disallows treated as a hard policy block, deferred, not routed around
(shape 1). No live-DB writes — every check is read-only. Verdict per row: does the
official source, as it reads *today* (2026-08-22), support the claimed status.

**This is a STOP-AND-CHECK report, not a completed package.** Per standing instruction,
a high first-sub-batch defect rate gets reported before continuing rather than worked
through — this sub-batch cleared that bar, so the remaining ~48 rows are on hold pending
BASORG direction.

## Sub-batch 0 (carry-over, no new fetching — already verified in the DLOPP package)

14 of the 66 rows are the `dated_current_cycle` records already byte-exact-verified in
`v2_dlopp_verdict.md`, plus SIP (the seed finding). Restated here only so this audit's
ledger is complete against the full 66, not because they needed re-checking.

**14/15 clean** (Blue Ocean, Breakthrough Junior, Congressional App Challenge, FIRST
Robotics, The Diamond Challenge, UK Chemistry Olympiad, Wharton Hack-AI-thon, Wharton
Investment Competition, Coca-Cola Scholars, Cooke College Scholarship, QuestBridge, The
Gates Scholarship — status and deadline both source-confirmed; Conrad and CEMC — status
`upcoming` itself is correct, but each carries an already-reported unresolved deadline-
*value* discrepancy, restated here for completeness, not a new finding).
**1/15 confirmed defect: SIP** (`7aa518f8-...`) — `cycle_status='upcoming'` is wrong; the
program concluded 2026-08-08 per its own site. Already flagged to BASORG/RES-I2.

## Sub-batch 1 (fresh — 15 rows, new fetches this pass)

Selected from the 51 not yet touched, weighted toward the oldest `updated_at` timestamps
(2026-08-17/18, the least-recently-checked tier) plus a few from 2026-08-20/21, to make
this a genuinely representative first read on the unexamined majority rather than another
directed pick.

**Fetch note — 3 of 18 candidate rows genuinely blocked**, RULE-FETCH-001 shape 1 (robots.txt
itself disallows AI crawlers — confirmed by fetching robots.txt myself, not routed
around): **Wall Street 101** (`teachmewallstreet.com` — `ClaudeBot`/`GPTBot` disallowed),
**Tufts Pre-College** (`universitycollege.tufts.edu` — `anthropic-ai`/`Claude-Web`/
`ClaudeBot`/`GPTBot` disallowed), **Boston University** (`bu.edu` — `ClaudeBot` disallowed
specifically as a "training/bulk crawler"; the file's own comment states user-triggered
agents like `Claude-User`/`Claude-SearchBot` are "deliberately NOT listed" i.e. permitted).
I did not attempt a UA change to present as a different, technically-permitted identity —
my fetch mechanism genuinely is the disallowed bulk-crawler class, so re-presenting
myself as something else to get through reads as exactly the routing-around the rule
forbids, not a legitimate tooling fix. Flagging BU's explicit bulk-vs-interactive-agent
distinction for BASORG/founder — it's a real, citable precedent if ORYN ever wants a
formal policy on how its agents self-identify. Replaced these 3 with 3 fresh rows (IE
University, Notre Dame, FU Berlin) to keep the sub-batch at 15 audited rows.

**IE University fetch note**: direct `curl` hit a 50-redirect loop (not a robots block —
robots.txt is clean) — RULE-FETCH-001 shape 2 (tooling-level bot-detection), resolved with
a rendered browser fetch, which loaded normally with no challenge page. Not shape 3 (no
Cloudflare/JS-interstitial was ever shown) — correctly a pass-through, not a deferral.

| Row | Claimed | Source verdict | Evidence |
|---|---|---|---|
| Yale Young Global Scholars | `open`, deadline 2027-01-06 | **CLEAN** | "11:59pm ET on January 6, 2027" — exact |
| Pioneer Research Institute | `open`, 2027 cycle | **CLEAN** | "The application window for the 2027 cycle is officially open." — exact |
| World Scholar's Cup | `open`, Bangkok Aug28-Sep2 / Dubai Sep5-8 2026 | **CLEAN** | Both dates exact on the official calendar page |
| Case Western Online Pre-College | `open`, rolling year-round | **CLEAN** | "Courses are available year-round." — exact |
| NYLF Medicine & Health Care | `open`, 2027 | **CLEAN** | All session dates 2027, "Enroll Now" live, "Save my spot for 2027" repeated |
| IE University Pre-University | `upcoming`, Summer 2027 | **CLEAN** | "INTAKE: Summer 2027"; "APPLICATIONS FOR SUMMER 2027 WILL OPEN SOON" — `upcoming` (not `open`) is the *correct* distinction here, not a coin-flip label |
| Notre Dame Summer Scholars | `upcoming`, deadline 2027-02-17 | **CLEAN** | Dedicated Dates & Deadlines page: "Application Deadline: February 17, 2027" + "Financial Aid Request Form Deadline: February 17, 2027" + test scores "on or before February 28, 2027" — all exact |
| FU Berlin SommerUNI | `upcoming`, 2027 edition Aug 2-13 | **CLEAN** | "Die SommerUNI 2027 findet vom 02.08.2027-13.08.2027 statt... jetzt auf unserer Liste für Interessent*innen eintragen" — exact, interest-list framing confirmed |
| **Georgetown Summer Programs** | `upcoming`, 2026 | **FLAGGED, not a hard defect** | Homepage states "Hoya Summer High School Sessions are full, but our Pre-College Online Program is wide open" — contradicts an unqualified `upcoming`/available reading for the row's flagship program, but the same page's course browser still lists Summer 2026 as a selectable term and I could not confirm whether "full" is current or stale copy. Needs a second look (ideally the actual application portal, not the marketing page) before treating as confirmed. |
| **Global Achievers Academy** | `upcoming`, 2026 | **DEFECT** | Entire page (414 words) names only "Spring & Summer 2026" / "Spring 2026" course dates — already elapsing/elapsed as of today — with zero mention of any Fall/Winter/2027 cycle anywhere. Nothing on the page supports "upcoming." |
| **İTÜ Lise Yaz Okulu 2026** | `upcoming`, 2026 | **DEFECT (high confidence)** | Own page: both sessions ("6-17 Temmuz 2026" and "20-31 Temmuz 2026") and the stated registration cutoff ("SON KAYIT: 16 TEMMUZ") are more than five weeks in the past as of today. The entire 2026 cycle is over. |
| **Columbia NYC Commuter Summer** | `upcoming`, 2026 | **DEFECT** | All listed sessions run "June 22 – August 7, 2026" — concluded 2 weeks before today. Zero mention of 2027 anywhere on the page. "Apply Now" buttons appear to be stale CTAs, not evidence of an open cycle. |
| **Columbia Online Summer** | `upcoming`, 2026 | **DEFECT** | Same domain, same issue: every course date on the page falls within "June 22 – August 7, 2026," already concluded. Zero mention of 2027. |
| **Wharton M&TSI** | `upcoming`, **"2026"** | **DEFECT (year-label wrong)** | Official page: "Program Dates: July 12-30, **2027**"; "M&TSI APPLICATIONS FOR SUMMER 2027 TBA!"; "Deadline to Apply: TBA." The DB's `current_cycle_label` says "2026" — that is simply the wrong year. `upcoming` as a status word is defensible for a confirmed-but-not-yet-open 2027 cycle; the year label attached to it is not. |
| **Scholastic Art & Writing Awards** | **`open`**, "2026-27 cycle (opens fall 2026...)" | **DEFECT** | Official page: "The Scholastic Awards open for entries **in the fall**." Future tense — not open today. The DB's own `current_cycle_label` already said "opens fall 2026," directly contradicting its own `cycle_status='open'` before I even checked the source — an internal self-contradiction independent of the live-source check, which then confirmed the label's version is the correct one. |

### Sub-batch 1 tally

**8/15 clean, 6/15 confirmed or high-confidence defects, 1/15 flagged-for-second-look.**
Treating the flagged Georgetown row conservatively as *not* a confirmed defect, that is
still a **40% (6/15) confirmed defect rate** on a sample selected only by staleness of
`updated_at`, not by any other risk signal — i.e., this is close to the "genuinely
representative first read" BASORG asked for, and it is far above the ~0% rate the DLOPP
package's dated-record gate showed.

**Pattern worth naming**: 4 of the 6 confirmed defects (GAA, İTÜ, Columbia×2) share the
same shape — a page whose only stated dates are a *past* cycle, with no forward-looking
cycle posted, where the underlying claim was almost certainly true when first researched
(the row's `updated_at` clusters in the 2026-08-17/18/20 range, when a "Summer 2026"
cycle description would have been either current or the honest most-recent state) and has
since gone stale purely because the calendar moved past it without the row being
refreshed. This looks like a **freshness/re-verification-cadence gap**, not a research
lane making false claims at time of writing — worth saying plainly since the two have
very different fixes (a scheduled re-check job vs. a research-quality problem).

## Special adjudication — RES-I2 monotonicity guard held two DLOPP records for a source check

BASORG routed two records where RES-I2's guard correctly refused to auto-apply or
auto-skip: RES-R2 proposes `date_not_announced`, which is less informative than the live
value, so the default is to hold rather than guess. Both use evidence I already fetched
myself first-hand this session (120hours.no while building the random sample in the
DLOPP package; ronbrown.org while checking RES-R2's own "scrutinize first" list) — I am
re-applying that same self-obtained evidence to this specific question rather than
re-deciding from either record's prose description, which is the actual thing being
asked for.

**DLOPP-B5-13 — Ron Brown Scholar Program** (`abe62a46-...`, live `cycle_status='upcoming'`,
`deadline='2026-12-01'`, `current_cycle_label='2027'`). Source (`ronbrown.org`, fetched by
me): "APPLICATION FOR THE 2026 SCHOLARSHIP COMPETITION IS NOW CLOSED" — the most recent
named cycle is closed. The only forward-looking information is an undated recurring
pattern ("December 1" / "December 15" / "April 1", no year on any of them). **Nothing on
the page states that a 2027 competition is open, upcoming, or has a confirmed date.**
The live value's specific date (2026-12-01) is a *well-reasoned* projection — Ron Brown's
own award-year convention (the "2026 competition" closed with a December-2025 deadline,
one calendar year behind its award-year label) means 2026-12-01 is exactly where the
pattern predicts the "2027 competition" deadline will land — but a correct prediction is
still a prediction, not a statement the source makes today. Applying the evidence
standard this whole org runs on (a program's "usual" deadline is never itself evidence,
per the RES-R2 brief verbatim): **the source supports `date_not_announced`, not
`upcoming`.** Not ambiguous — recommend the correction.

**DLOPP-B1-01 — 120 Hours** (`345f64dd-...`, live `cycle_status='closed'`,
`deadline=null`). Source (`120hours.no`, fetched by me): the homepage describes the
competition format ("5 days. 120 hours.") and a "Sign up" link, with zero dates anywhere
on the page — no 2026 closing confirmation, no 2027 announcement, nothing. This is a
closer call than Ron Brown because `closed` is also a defensible reading (the DB's own
prior note that the 2026 deadline, March 14, 2026, already passed is a true, separate
fact this page doesn't contradict). But `closed` and `date_not_announced` are answering
different questions — "did the last cycle end" vs. "do we know when the next one opens"
— and what a student looking at this row *today* needs to know is the second one, which
the page genuinely doesn't answer. **Leaning `date_not_announced`, same reasoning as Ron
Brown**, but flagging the lower margin here since, unlike Ron Brown, there's no page
statement at all (not even a closed-cycle banner) to weigh against it — only silence.
If BASORG's convention treats `closed` as reserved for "a real dated cycle recently
concluded, nothing else known" rather than "actively displaying a closed banner right
now," `closed` remains equally defensible and I'd call this one a genuine tie.

## Recommendation

Per your standing instruction: **stopping here rather than continuing into the remaining
~48 rows.** Awaiting direction on: (1) whether to proceed sub-batch by sub-batch as
planned, given the confirmed rate so far; (2) whether Georgetown's ambiguity is worth a
second look now or a follow-up; (3) whether the "stale forward-cycle" pattern warrants a
scope change — e.g., prioritizing rows by `updated_at` age across the full 66 rather than
strict sub-batches of 15, since staleness age looks like a real predictor of defect risk
based on this one sample.
