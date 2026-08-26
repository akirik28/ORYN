# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`), never stacked below in the live file. (Two ticks in a row I drifted from this —
Edit-inserted a new section above the old one instead of replacing it. Fixed both times by
consolidating with a full rewrite. Noting the pattern here so it doesn't happen a third time:
default to reading the current file and replacing its checkpoint section wholesale, not
Edit-prepending.) I do not research opportunity facts, source photos, alter records, or
override evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 11 — 2026-08-26, freeze day 1, ~12:40 (T+~3h30min from fleet dispatch)

### Self-correction: S8 was never behind, and S6 was never S8's backlog

Checked in directly with S8 rather than keep extrapolating from push-silence, and my checkpoint
10 read was wrong. Actual picture, from S8 themselves: **S6's 69 records were already reviewed
and reported to CEO** (confirms/closes 2 of S8's own earlier Track A defects, no new problems
beyond S6's own internal cross-review) — I had inferred "closed lane = backlog for S8" without
checking, and that inference was wrong. The one long-running thread is a live fact-verification
subagent on S7's 41 `VERIFIED`-tier records, still going with no ETA — S8 correctly doesn't poll
it mid-run and will know exactly when it returns via completion notification. Sized against
S8's own precedent (Track A: ~26min/73 tool calls for 38 records; this one is 41 records plus a
Turkey-access dimension), a longer runtime isn't surprising on its own. S7 Wave 2's just-landed
77-total delta is noted, folding in once the current pass returns. S5A/S5B got a light spot-check
(good quality on a small sample), full pass deliberately deferred while they're still producing.

**Standing lesson for this role**: "minutes since last push" is a proxy for throughput, not a
measurement of it, especially for a review-type function where the real output is a decision,
not a commit. Checking directly beats extrapolating from git activity alone — apply this before
flagging silence as backlog again, not just this once.

### Still open: 5-row fix

Pinged CEO a second time after ~20 minutes of silence on the first check-in — status-only, not
pressure on the actual decision, which is genuinely the founder's timing to set. No new
information as of this tick. Same for the two lower-stakes items riding on the same
write-authority blocker: Stockholm Water Prize (wrong-entity, live) and the FRC/FIRST duplicate
pair — worth bundling into the same founder decision rather than three separate asks.

### Recent context still current (fuller detail in git history, commit `9f6d4cb` and earlier)

- **Opportunity-photo infrastructure confirmed genuinely zero** (checked directly: no column,
  no EAV-sibling table, unlike universities) — fleet-wide, ~421 rows. CEO assigned S6 (freed up
  after closing) to a bounded photo-sourcing pass on their own 69, reusing domain context.
- **S6 closeout**: 69 records, 12 self-graded production-ready, 45 verified. Found GençBizz
  (26-edition Turkish entrepreneurship competition, absent from the prior corpus entirely) and a
  second affiliation-inflation instance (UniHive, after Blackstone — flagged for a later
  cross-category sweep).
- **S7 closeout**: 77 reviewed records, 47 ready for S8 sign-off, 0 cross-lane duplicates,
  explicit dedup sweep against ~110 pre-existing uncommitted research files before starting.

### Reallocation

None forced. S6 → opportunity-photos (CEO's call, agree) is the only live reallocation.

### Open items

1. 5-row fix — pending CEO's direct founder confirmation, now with a status-check nudge in.
2. Stockholm Water Prize + FRC/FIRST duplicate pair — same blocker as #1, bundle together.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. Opportunity-photo schema — same shape as the university-photo gap, not urgent tonight.

## How these numbers were produced (re-run to refresh)

```bash
git fetch origin
for b in oryn/s1-university-photos oryn/university-photos-s2 oryn/s3-university-photos \
         oryn/s4-university-photos oryn/s5a-summer-academic-enrichment \
         oryn/s5b-research-mentored-internships oryn/s6-competitions-research \
         oryn/s7-other-high-value-opportunities oryn/s8-qa-gate \
         oryn/research-freeze-ceo-control-tower; do
  git rev-list --count origin/main.."origin/$b"; git log -1 --format='%h %ar: %s' "origin/$b"
done
```
```sql
select id, title, cycle_status, deadline, cost, updated_at from opportunities
where id in ('973b3bdd-59c2-4e99-a76b-2006b365d63a','2f0e0301-5dd4-4d25-91a4-8f73bf5584e9',
  'd780bc55-41e0-444b-8bcc-3f927b28c4b7','8a7c89e4-e63a-4f64-a76d-4bae1b31e889',
  '960dcf4d-322c-4e72-8c99-0a1d3368b2ea');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-26 ~12:40.
