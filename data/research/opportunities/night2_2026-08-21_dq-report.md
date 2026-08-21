# Data-quality remediation — deadline + country on existing rows

Requested by the ORYN multi-agent coordination session, 2026-08-21, as a higher-priority
follow-on to new-record discovery: the live `opportunities.deadline` was null on 87.5% of
rows and `country` null on 63.7%, degrading the counselor's core "apply now, X days left" /
geography-filter value more than more rows would help. Scope: the 166 `verified_current`
rows (highest-value, most likely to be surfaced to a student), highest-priority first.

## APPLIED 2026-08-21 (production write, direct founder authorization)

The 35-row dry-run batch below was executed for real against the live `qtcvcflzxbuagvvwahhu`
project, after: (1) direct founder confirmation in-chat (not a peer relay -- the founder
was asked directly and answered directly), and (2) a fresh re-query of live state
immediately before writing, confirming every target field was still genuinely NULL (found
and correctly excluded 3 rows -- Notre Dame Pre-College, Inspirit AI, FIRST Robotics --
whose SQL only ever touched `deadline`, never `country`, so no actual overwrite risk
existed once checked). Every statement carried its own `AND country IS NULL`/
`AND deadline IS NULL` guard as a second layer of protection.

**Landed exactly as predicted by the SQL** (not by an earlier prose miscount in this same
report, corrected here): `missing_deadline` 121 → 115 (**6 filled**, matching all 6 deadline
`UPDATE`s), `missing_country` 34 → 2 (**32 filled**, matching all 32 country `UPDATE`s --
this report's earlier prose said "30," an arithmetic slip when summarizing, not an execution
discrepancy; the SQL itself always specified 32). Verified directly: the only 2
`verified_current` rows still missing `country` are exactly the 2 flagged NEEDS_REVIEW
(Global Achievers Academy, International Psychology Olympiad) -- correctly left unresolved,
not guessed.

Two transient tool-classifier blocks were hit and resolved by simple retry (confirmed
transient by the tool's own error text on the second occurrence: "usually transient --
retrying often succeeds") -- not a content-based denial, no workaround was used, see this
session's chat log for the full exchange with the founder and coordination session on this.

## Method

Measured the real gap directly (read-only): of 166 `verified_current` rows, 121 missing
`deadline`, 34 missing `country`, 27 missing both — **128 unique rows** needed at least one
field. Pulled the full list (id/title/official_url/category/existing country/existing
deadline) and split it across **6 parallel background research agents**, ~20-22 rows each,
covering all 128. Same verification discipline as the original discovery campaign: official
page fetched directly, every date manually checked against today (2026-08-21) rather than
trusted from a page's own framing, explicit "not yet announced" recorded rather than a
guessed forward date, third-party/aggregator-only dates excluded unless corroborated by an
official page. Each agent was also told explicitly to keep moving past any single
hard row rather than get stuck — a direct response to the earlier discovery-phase agent that
ran 9h without completing.

All 6 batches completed in 7-14 minutes each (vs. 22-25 min for the discovery-phase agents) —
consistent with this being a narrower per-row task. All 128 rows accounted for, no drops, no
duplicate ids.

## Classification (128 rows)

| Classification | Count |
|---|---|
| READY_TO_UPDATE | 35 |
| NEEDS_REVIEW | 22 |
| NO_NEW_INFO (researched, official source confirms nothing new is available yet) | 68 |
| PAGE_UNREACHABLE | 3 |

## The dominant finding: most gaps are a genuine seasonal-timing gap, not a research failure

The single biggest pattern across all 6 batches: **today (2026-08-21) falls in the dead
period between cycles** for the large majority of these opportunities. Their 2026
application windows (typically Jan-June 2026 for US/UK/EU academic-year programs) have
already closed, and their 2027 cycles have not been announced yet — official pages
consistently say things like "Applications Now Closed," "2027 dates coming soon," "check
back in January," or simply show no forward-looking date at all. This is the correct,
honest state to record (`deadline: null`, `cycle_status: closed` or `date_not_announced`)
— **not** a case of insufficient research effort, and specifically not a case for guessing
a plausible 2027 date. Every batch independently found and rejected pattern-matched/
third-party-only forward dates that weren't confirmed on an official page (e.g. a
third-party site's "Clark Scholars Feb 16, 2027," MITES's "Jan 15, 2027" — neither
appeared on the actual program's own site, so neither was recorded).

## READY_TO_UPDATE (35) — SQL generated, not executed

`night2_2026-08-21_dq-dry-run-update.sql` — 35 `UPDATE` statements, `BEGIN`/`ROLLBACK`-
wrapped, never run. Each only sets a column that was genuinely `NULL` in the live row
(never overwrites an existing value) — `country` and/or `deadline`, plus a `cycle_status`/
`current_cycle_label` refinement using the same evidence already gathered (e.g. correcting
a generic `unverified` to an evidence-backed `closed`).

30 rows got a new `country`, 6 got a new `deadline` (Upenn Wharton Hack-AI-thon → 2027-04-01;
Notre Dame Pre-College Summer Scholars → 2027-02-17; Inspirit AI Scholars Live Online →
2026-09-01; Blue Ocean Competition → 2027-02-21; FIRST Robotics Competition → 2026-11-17;
International Public Policy Forum → 2026-10-13) — some rows got both.

## NEEDS_REVIEW (22) — genuine ambiguity or a specific defect, not a dead end

Full list with evidence in `dq_classified.json` (scratch, not committed) and this file's
git history. Highlights worth a human/future-session look:

- **International Psychology Olympiad (IPsyO)**: official site shows a stale "Registration
  closes July 2, **2025**" notice on both its homepage and `/apply` page — doesn't match
  secondary sources describing a 2026 cycle closing July 1, 2026. Flagged rather than
  guessing which is authoritative; the org's own site may simply not have updated its
  wording, but that's a judgment call outside a research agent's authority to make.
- **ODTÜ (METU) Engineering Summer School**: organizer transitioned to a different operator
  ("Radyo ODTÜ") for 2026; official site still only shows 2025 dates. Worth confirming this
  program is continuing as described, not just re-dated.
- **Global Achievers Academy**: runs programmes in Boston/London/Dubai; its own "About Us"
  page never states a legal home country. A third-party firmographic database suggests
  Brighton, UK, but that's uncorroborated by the org itself — left `null` rather than guess.
- The other 19 are the "genuinely not-yet-announced, but the evidence is worth a second
  look" cases — e.g. GENIUS Olympiad, EUCYS, National History Day, HOSA, DECA, UK Chemistry
  Olympiad all have confirmed **event dates** (some even 2027 event dates) but no confirmed
  **application deadline** — a future pass specifically hunting for the deadline (not just
  re-confirming the event) might succeed where this pass's single fetch didn't.

## PAGE_UNREACHABLE (3) — technical block, not disproof

- Johns Hopkins CTY (`cty.jhu.edu` — 403)
- Koç University Summer Academy (`ku.edu.tr/en/highschoolprograms/summer-academy/` — 403
  across 3 subpages)
- UWC Short Courses (`uwc.org/short-courses/` — 403 across 2 attempts)

## Adjacent finding, out of this pass's scope but worth flagging: some *already-populated* fields are also stale

Not touched (only nulls were in scope), but surfaced along the way: **JLI Global Essay
Competition**'s existing `deadline` (2026-05-31) has already passed as of today with no
2027 cycle posted on the official page yet — the existing value may itself need a refresh.
**DNA Day Essay Contest** similarly. A useful signal that the "87.5% missing deadline"
figure likely understates the true staleness rate — some populated deadlines are stale too.

## Exact next-step handoff

1. Review `night2_2026-08-21_dq-dry-run-update.sql`, run for real against the live table
   (re-verify live state fresh immediately before, per this repo's own standing practice —
   other sessions may have changed rows tonight).
2. The 22 NEEDS_REVIEW and 3 PAGE_UNREACHABLE rows are good targets for a short, focused
   follow-up pass (not full re-discovery) — most just need one more fetch attempt or a
   deadline-specific search rather than the broader research this pass did.
3. Consider a similar pass on the 202 non-`verified_current` rows once this higher-priority
   `verified_current` slice is applied — same method, lower expected per-row value.
