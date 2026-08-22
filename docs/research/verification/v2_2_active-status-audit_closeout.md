# Package V2-2 — close-out: final 5 rows

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`

Closing the last 5 of the 66-row `open`/`upcoming` audit: Geleceği Eşitle, CyberPatriot,
NFTE, The Concord Review, THIMUN. Two of these (CyberPatriot, Concord Review) are in
RES-I2's held set — RES-R2's own DLOPP research recorded `cycle_status_found: "open"`
against the live `upcoming`, and neither auto-apply nor auto-skip was safe.

## Scope of this verdict — what it covers and what it doesn't

Per the standing addition (ORYN-CEO via BASORG): naming the axes explicitly rather than
leaving them implicit.

**Covered**: for each row, does the cited official source (as fetched directly by me
today, robots.txt-gated) affirm, contradict, or stay silent on the live
`cycle_status`/`deadline` claim. That's it — the same single question this whole package
has answered for all 66 rows.

**Not covered, deliberately, and not claimed**: identity/entity match (already
established when these rows were pulled from the live DB into the master 66-row list —
not re-verified here), eligibility or country-restriction fields (a different lane's
axis entirely, see the DLOPP package's ECW2 work), `application_url` reachability beyond
what was needed to reach the deadline evidence itself, and — this package's edge case —
**whether the CyberPatriot/Concord Review status-label question (`open` vs `upcoming`)
is itself the right ontology**. I'm reporting what the source says the state IS; whether
"open" and "upcoming" are the correct two buckets for a rolling-submission model is a
schema question, not a verification one, and I'm flagging it rather than deciding it.

## The 5

| Row | Claimed | Verdict | Evidence |
|---|---|---|---|
| **Geleceği Eşitle** | `open`, deadline 2026-08-26 | **CLEAN** | "Application Deadline: August 26, 2026, at 23:59 (Türkiye time)" — exact. Training dates (Sept 11-13, 2026) also confirmed. Deadline is 4 days out from today — genuinely, currently open. |
| **NFTE Youth Entrepreneurship Showcase Series** | `upcoming`, Showcase Nov 18 2026 + World Finals Nov 19 2026 | **CLEAN, one unconfirmed sub-detail** | "Events - November 18, 2026 / 2026 Youth Entrepreneurship Showcase" confirmed exact; WSI "Launch: September 9, 2026" confirmed exact. The DB's second claimed date, "World Finals Nov 19, 2026," does **not** appear anywhere on the page in my fetch — same absence RES-R2 already flagged as a truncated fetch. Two independent fetches (theirs and mine) now both fail to surface it, which is stronger evidence of absence than one truncated attempt, though I can't rule out it living on a page neither of us reached. Not treating this as a defect on the row's core `upcoming`/Nov 18 claim, which is well-supported — flagging the extra date as unconfirmed by two passes now, worth a source-specific look if anyone owns this row next. |
| **The Concord Review — Emerson Prize** | live `upcoming`, deadline 2026-11-01 · RES-R2 found `open` | **RESOLVED — RES-R2 was right, recommend correcting the label** | Independently confirmed RES-R2's exact quote: "Essays are accepted on a 'rolling admissions' basis and are eligible for the next three issues... Deadlines to be considered for specific issues are August 1 (Winter), November 1 (Spring), February 1 (Summer) and May 1 (Fall)." This is a rolling-submission journal — the same shape as IJHSR/JRHS, both already confirmed `open` elsewhere in this package — not a cyclical competition that is "not yet open." November 1 is a batching cutoff for one issue grouping, not a gate a student is currently locked out of. The live `upcoming` undersells this: a student reading "upcoming" might wait to submit when they could submit today. Recommend `open`, matching RES-R2's finding and the rolling-journal precedent already established in this package. |
| **THIMUN The Hague Conference** | `upcoming`, 59th conf 25-29 Jan 2027, FORM I deadline 25 Sep 2026 | **CLEAN** | "59th Annual THIMUN The Hague Conference / 25 – 29 January 2027" exact. FORM I deadline confirmed **four separate times** on the same page, all agreeing: "Friday 25 September 2026" — as clean and over-determined a confirmation as this package has produced. |
| **CyberPatriot** | live `upcoming`, deadline 2026-10-01 · RES-R2 found `open` | **UNVERIFIABLE — genuine total block, not resolved either way** | `www.uscyberpatriot.org/robots.txt` is exactly `User-agent: * / Disallow: /` — a **blanket disallow of the entire site for every crawler**, not an AI-specific rule. This is a new class of block in this whole verification effort: every prior policy block found (Technovation, CSHL, Tufts, Boston University) named specific AI agents; this one excludes everyone, indiscriminately. I did not fetch any page on this domain, by curl or by browser. **Flag on RES-R2's own research record** (`DLOPP-B1-12`): its `robots_check` field says "no AI-crawler block," which is true in the narrow sense (no named AI bot) but misses the wildcard `Disallow: /`, which blocks AI crawlers too, being a superset. Worth a standing check — "no AI-crawler block" should also fail on a bare `Disallow: /`. Since I cannot check any official source at all, I'm not recommending a change in either direction — the honest result is "unable to verify," which per the 120-Hours convention means the live value stays, not that RES-R2's proposal gets applied on the strength of their earlier (now-unrepeatable) fetch. |

## Package result

**63/66 rows now have a verdict** (58 before this close-out + 5 here), **3 remain
correctly deferred** (Wall Street 101, Tufts, Boston University — genuine
AI-crawler-specific policy blocks) **+ CyberPatriot now makes a 4th deferred row**,
though on different grounds (a total block, not an AI-specific one) — so precisely:
**62 verified + 4 deferred = 66.**

One label correction recommended (Concord Review: `upcoming` → `open`), one recurring
projection-class issue now confirmed twice in this package (Ron Brown, Interlochen) and
already routed to RES-I2, one new block-taxonomy finding (the blanket-`Disallow: /`
class, distinct from AI-named blocks), and a research-record process note (RES-R2's
`robots_check` field can pass a site that's actually fully blocked).

This closes package V2-2's audit pass. Full package summary — all 66 rows, both rounds,
this close-out — available across `v2_2_active-status-audit_subbatch1.md`,
`_round2.md`, and this file.
