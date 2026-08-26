# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`), never stacked below in the live file. I do not research opportunity facts, source
photos, alter records, or override evidence — this file tracks fleet capacity and flags
backlogs/misallocations only. Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and
`CONTROL_TOWER_REPORT_*.md` (CEO's consolidated fleet report). On a 5-minute recurring check
(`/loop`, per founder instruction).

## Checkpoint 12 — 2026-08-26, freeze day 1, ~12:50 (T+~3h40min from fleet dispatch)

### Steady real progress, review loop still working

S5A batch6 (+2), S5B batch4 (+3 strong candidates, and — worth noting as a good sign, not a
gap — **1 confirmed do-not-add**, i.e. real rejection discipline, not just accumulation). S7
reopened briefly to directly browser-verify UWC Türkiye and Zonta (both upgraded as a result) —
consistent with the S8-finds → S7-fixes loop that's been working all session, not a sign S7's
closeout was premature. Live-harm rows re-verified again: all 5 unchanged.

### S8: 63 minutes since last push — not re-pinging, applying my own checkpoint-11 lesson

Got a full, clear explanation one tick ago (long-running 41-record verification subagent, no
ETA, correctly not polled mid-run). Nothing has changed that would make re-asking now anything
but a repeat of the same question with a less patient tone. Holding until either the subagent's
completion notification surfaces or a materially longer gap (not just one more tick) passes.

### CEO: two consecutive status-check nudges now unanswered — noting, not alarmed

~30 minutes since the first "have you heard back" check, ~10 since the follow-up "are you stuck
on something else." Neither has drawn a reply, which is a genuine change from CEO's pattern all
session (every other message got a response within minutes). Most likely explanation: heads-down
on the consolidated report the founder asked for, or genuinely still waiting with nothing new to
say. Not treating this as broken — CEO set a correct, deliberate bar (direct founder
confirmation only) and going quiet while waiting on that is consistent, not alarming on its own.
Flagging the pattern explicitly for the founder's own visibility rather than pinging a third
time with no new information to add.

### Still open: 5-row fix, Stockholm Water Prize, FRC/FIRST duplicate pair

All three genuinely blocked on the same founder decision, no movement this tick.

### Reallocation

None forced.

### Open items

1. 5-row fix + 2 related defects — pending CEO's direct founder confirmation.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. Opportunity-photo schema gap (confirmed genuinely zero, checkpoint 10) — not urgent tonight.

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
`origin`, 2026-08-26 ~12:50.
