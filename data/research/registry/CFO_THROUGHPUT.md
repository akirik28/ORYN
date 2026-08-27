# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction). See checkpoint 50 (git history) for a full session retrospective.

## Checkpoint 106 — 2026-08-27, ~07:55

**No git/DB change. 9h CEO-silence milestone hit.** Same 10 HEADs as checkpoints 78-105.
Sent a third hourly ping to oryn-e2 restating the same 5 items — no new detail, since nothing
has moved since the 8h escalation (which was already surfaced directly to the founder in
chat). **Going forward: pausing the hourly re-ping** unless something actually changes
(a reply arrives, a new commit lands, or a new defect surfaces) — repeating an identical
message every hour with zero new information stops being useful signal. Still running the
full git/DB/ListAgents check every 5 minutes per the standing instruction; just not re-sending
the same chat message each time. Live-harm rows re-verified: unchanged. CEO's silence is now
~9h.

### Open items (unchanged)

1. S7 confirmed gone — resume-or-accept decision pending CEO/founder.
2. S1/S2/S4 session loss — awaiting CEO/founder decision on resuming. Recovered work safe.
3. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~9h unreachable.
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
`origin`, 2026-08-27 ~07:55.
