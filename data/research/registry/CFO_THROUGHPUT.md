# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction) — resumed after checkpoint 135's fleet-relaunch event.

## Checkpoint 136 — 2026-08-27, ~10:25

**Stable.** Same 10 branch HEADs as checkpoint 135 — no new commits since the fleet relaunch.
Live-harm-surface rows re-verified: all 5 remain at the confirmed-correct values from the fix
(same `updated_at` 06:01:43, no further changes). `ListAgents` shows the same 9 peers as last
tick, uptimes now 11-13min for the relaunched sessions. S4 (`oryn-e2 [d88e18]`) acknowledged
the naming-collision heads-up and will use bracketed refs going forward — no reply needed.

The founder re-sent the standing check prompt a second time without directly answering
whether CFO monitoring should keep running past the fleet wind-down — reading two consecutive
re-sends as "yes, keep going" and continuing on that basis rather than asking a third time.

### Open items (carried from checkpoint 135, unchanged)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns.
2. ~12-15% university-photo false-accept rate — not re-verified this tick.

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
`origin`, 2026-08-27 ~10:25.
