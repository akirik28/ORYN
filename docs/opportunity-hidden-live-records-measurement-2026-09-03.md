# The missing direction: how many hidden records are actually live

**Date:** 2026-09-03. **Author lane:** this session. **oryn-a7's dispatch**, after
`docs/opportunity-stale-identity-measurement-2026-09-03.md` found the job's own design tracks
only one of two possible mismatch directions: *"how many records currently stored as `closed`,
`historical` or `date_not_announced` are actually open today? If the answer is a handful, the
missing half is a nice-to-have. If it's forty, the catalogue is hiding real opportunities from
students today."* Measurement only — nothing written, nothing promoted.

## The population is smaller than the dispatch assumed, and that's checked, not argued

The dispatch expected this population to be "much larger than the 208" swept before. Queried
live before building anything:

```sql
select status, cycle_status, count(*) from opportunities
where cycle_status in ('closed','historical','date_not_announced')
group by status, cycle_status;
-- active/closed: 63, active/date_not_announced: 52, active/historical: 8,
-- under_review/closed: 1, disabled/historical: 2
```

**126 total — smaller than 208, not larger.** The three target cycle_status values are a
*subset* of the six this session already swept by cycle_status (open/upcoming excluded, since
a stored-open record can't be a candidate for "secretly open"). Extending beyond `status='active'`
adds exactly **3** more rows (1 `under_review`, 2 `disabled`) — the non-active population is
real but small. Stating the corrected number plainly rather than reshaping the measurement to
fit the dispatch's assumption.

## Method: reuse the 123 already-fetched rows, don't re-spend on them

123 of the 126 are a strict subset of the 208-row population already fetched for real tonight
(`docs/opportunity-stale-identity-measurement-2026-09-03.md`). Cross-referenced by title against
that run's own output rather than re-fetching — matched **119 directly**; the other **4** needed
a small supplementary pass (2 lost to that run's per-domain cap sharing a hostname with a
sibling program — both Wharton Global Youth entries on `globalyouth.wharton.upenn.edu` — plus
the 1 row that hit the Anthropic schema-validation error last time, plus 1 more domain-capped
row). Ran only those 4 through the same `runReverificationPass({dryRun:true, candidateIds})`
path.

**A real structural finding surfaced getting the last 3.** `candidateIds` did not reach the 3
truly non-active rows even when explicitly listed — `loadCandidatePool` in `run-job.ts` hard-codes
`.eq("status", "active")` before the candidate-id filter is ever applied, by design (the comment
there says so: non-active rows "never reach a student regardless of verification state"). Correct
for the job's own normal purpose, but it means **this job's own machinery cannot check a non-active
row at all**, structurally, not just by priority — oryn-a7's "include the ones a student cannot
currently see" can't be answered by running the job differently, only by going around it. Rather
than edit `run-job.ts`'s pool query (a real behavior change to production code, out of scope for
a measurement pass), called `runFetchLadder` + `classifyAgainstStoredState` directly for these 3 —
same real primitives the job itself uses, orchestrated by a throwaway script, deleted after use,
never committed.

## A real, previously-unflagged finding: Tavily has been off all night

Getting those 3 rows surfaced something bigger than the 3 rows themselves. All three hit
**`"TAVILY_API_KEY is not set."`** on rung 1. Checked whether this was specific to this
worktree's copy of `.env.local` — it isn't:

```
main ORYN checkout .env.local: TAVILY_API_KEY present: true | length: 0
```

The variable exists in the file; its value is an empty string. Checked how far this reaches:
**zero of the 196 rows in tonight's earlier full run succeeded at rung 1** (174 at rung 2, 10 at
rung 3, 12 unreadable) — not a low rate, a *zero* rate. `provider_health` has no row for
`tavily` at all, so this failure mode — a configured-but-empty key, not an outage — has been
invisible to the app's own health monitoring the entire time. Every fetch tonight, across both
this pass and the 113-row dry run before it, has run on rung 2/3 fallback only. This doesn't
overturn tonight's "real host walls are rare" finding (rung 2 demonstrably works for the large
majority of pages), but every prior claim about Tavily-specific behavior tonight was made with
Tavily never actually running — worth the founder's attention as its own item, not something an
agent session can fix (an empty value needs a real key, a credential this session doesn't have
and per standing rules would never enter itself).

## The census: 8 of 126 (6.3%) — and this time, "changed" got the same skepticism as "confirmed"

| Outcome | Count |
|---|---|
| `p2_unreadable` | 75 |
| `p1_confirmed` | 19 |
| `p4_contradicted` | 18 |
| **`p1_changed`** | **8** |
| `transport_error` | 3 |
| unreadable (Tavily-absent, direct-check only) | 2 |
| `liveness_silent` (direct-check only) | 1 |

Every one of the 8 is, by construction, the exact shape asked for: stored `closed`/`historical`/
`date_not_announced`, live page reading as open. **oryn-a7 asked for the same discipline already
applied to "confirmed" rows to extend to this bucket too** ("where the classifier says 'no
change' but the excerpt looks stale or off-topic, count that separately") — applying that same
read to "changed" rows changes the honest count materially:

**3 solid** — an explicit 2027 (or later) date or unambiguous current-cycle language, nothing
in the excerpt undercutting it: International Psychology Olympiad (*"Register for 2027...
Qualification deadline: before June 30, 2027"*, stored `closed`), Stanford Anesthesia Summer
Institute (*"Summer 2027 · SASI Applications Now Open"*, stored `closed`), Ron Brown Scholar
Program (*"APPLY NOW - 2027 Application is now open!"*, stored `date_not_announced`).

**5 uncertain — including two rows this pass is seeing for the first time, and both fail the
same test the first three already flagged.** Harvard Secondary School Program (SSP)'s matched
excerpt — *"Application Opens: Monday, December 1, 2025... Deadline: Wednesday, January 7,
2026"* — names dates that are **both already in the past relative to today** (2026-09-03).
Girl Up Global Teen Advisor Board's excerpt — *"Applications for the 2025-2026 Global Teen
Advisor Board are now open! Apply by January 26"* — describes a 2025–2026 cycle whose own named
deadline has also already elapsed. Both read exactly like ODTÜ/METU and EYP Türkiye already did
in the prior pass: real, specific, dated language, and the date is stale, not current — evidence
of *a* cycle having been open, not evidence that a cycle is open *now*. BRI Student Fellowship's
excerpt carries no year at all, same as before. **So: not 8 confirmed hidden-live records. 3
confirmed, 5 that need a human to actually open the page**, exactly the measurement this
session is scoped to, not resolved past what the evidence supports.

**The `p1_confirmed` bucket got the same check and came back clean.** Of 19 rows the classifier
called "still closed/historical/date_not_announced, no change," 15 carry an explicit 2026 or
2027 year in the matched excerpt, 4 carry no year at all, and **zero carry an old year** — no
row in this population was confirmed-unchanged on the strength of stale-looking evidence. This
is the negative-control this measurement needed: the excerpt-currency check isn't just finding
problems everywhere it looks; it found five real ones in the `changed` bucket and zero in the
`confirmed` bucket.

## A fourth solid case, already known, missed again — the same mechanism, twice

Summer at Stanford Program for High School 2025 is in this population (`historical`). This
pass classified it `p4_contradicted` — not confirmed changed — for the same reason
`docs/opportunity-stale-identity-measurement-2026-09-03.md` already named a few hours ago: the
matched excerpt landed on *"Summer Session 2024 Apply Now"* rather than the *"program runs June
20–August 16, 2026"* sentence this session read by hand, on the same page, for a different
purpose, earlier tonight. **The same known-true, independently-confirmed live opportunity was
missed by this mechanism twice in one night, on two different passes.** Counting it honestly:
**the real floor is 4 solid, not 3** — one from outside the automated census entirely, which is
itself the clearest illustration yet that this pipeline's false-negative rate is not
theoretical.

## The answer, in the terms the dispatch asked for

**A handful, not forty.** 3–4 records with strong, specific, current evidence of being open
while stored as closed/historical/unannounced, out of 126 checked (2.4–3.2%). 5 more are
genuinely unresolved — real, dated language, but the date itself reads as stale, and this
measurement's own instrument (an excerpt window, not a full-page read) cannot settle which is
true without a human opening the page. **This is not a "reorder the morning" number on its own
terms.** It is, however, a demonstrated undercount by at least one confirmed case (Stanford,
found by accident, missed by the pipeline twice) and by an entire fetch rung that never ran all
night (Tavily) — so "a handful" describes what this measurement could see, stated alongside two
concrete, named reasons the true number could be somewhat higher, not stated as a ceiling.

## What this measurement does not do

Nothing written. No `cycle_status` changed on any of the 126 rows, confirmed or not. The one
throwaway script used to reach the 3 non-active rows directly was deleted after use, never
committed — this pass added no code to the repository.

## Gates

`npm run typecheck` / `npm run lint` to run before push. Real Tavily-attempted (uniformly
failing)/browser-UA/Wayback/Anthropic calls throughout the 7-row supplementary pass and the
3-row direct check; the 119-row core reused already-real data from the prior pass rather than
re-spending API calls on it. Zero database writes anywhere in this pass.
