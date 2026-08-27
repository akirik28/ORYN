# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction), resumed after the checkpoint 135 fleet-relaunch event.

## Checkpoint 138 — 2026-08-27, ~10:35

**S8's final commit before wind-down — expected, matches what it told me earlier.**
`oryn/s8-qa-gate` advanced +6 → +7, 4 minutes ago: "S8 QA: subagent's independent Wave 2 pass
(final piece before wind-down)" — this is the 2 in-flight records S8 said it would let its
subagent finish before stopping (see checkpoint 135). No concerns. S7's closeout-consistency
commit from last tick is unchanged (still +12). All other 8 branches unchanged. Live-harm-
surface rows re-verified: still all 5 correct, unchanged. `ListAgents` still the same 9 peers,
relaunched sessions now 20-21min old. No new peer messages this tick.

### Open items (unchanged)

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
`origin`, 2026-08-27 ~10:35.
