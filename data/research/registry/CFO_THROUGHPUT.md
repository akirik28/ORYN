# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 30 — 2026-08-27, ~01:35

### Checked in with S8 — reply confirms not obviously affected, but one honest flag

S8 verified directly (not assumed): their own worktree is clean, up to date, last 3 commits
landed fine, and their subagent shows `running`, not crashed. Not obviously hit by whatever took
S1/S2/S4. **One real flag they raised themselves**: their current subagent (S7 Wave 2 delta, 11
records) has run ~1hr, versus ~44min for a much bigger 53-record pass earlier — anomalously slow
for its size. Not proof of a problem, but S8 is right to take it seriously given the timing next
to the S1-S4 drop, and is checking on it now (an exception to their usual no-polling discipline,
correctly justified by a fleet-wide trigger). Tried to find a confirmed root cause for S8 (and
for the record): attempted `log show` for sleep/wake/memory-pressure/crash events in the
00:00-01:00 window — inconclusive, the predicate queries errored in this sandbox, so this
neither confirms nor rules out anything. Disk space was stable across the window (94-95% both
before and after), which argues against a sudden fill-to-100% event specifically but doesn't
rule out other resource pressure. Honest state: cause remains unconfirmed, disk-pressure
correlation is suggestive, not proven.

### Otherwise unchanged

Still 2 peers in `ListAgents`. S1/S2/S3/S4 have not returned. No reply from CEO on either the
incident report or the original 5-row check-ins. Live-harm rows re-verified: unchanged.
Recovered work from checkpoint 27 remains safely committed.

### Open items

1. S8 status — pinged this tick, awaiting reply.
2. S1/S2/S4 session loss — awaiting CEO/founder decision on resuming. Recovered work safe.
3. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~2h30min unreachable.
4. `turkey_student_access` / `selectivity_evidence` still have no live columns.
5. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.

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
`origin`, 2026-08-27 ~01:35.
