# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `SESSION_CLOSEOUT_2026-08-
26_to_27.md` (CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per
founder instruction) — fleet is under dynamic reassignment (P0-P7), not stopping; watching
for dead sessions per founder's explicit ask at checkpoint 139.

## Checkpoint 143 — 2026-08-27, ~11:00

**No dead servers.** All 9 peers still present, relaunched sessions now 56-57min old, the two
originals (S8, old CEO) still 12h — nothing dropped out.

**New commit:** `oryn/s6-competitions-research` advanced +25 → +26, 33 seconds ago —
"research(s6a): environment/medicine discovery -- 3 new records, 4 documented negatives." Real
new-candidate discovery work, not a closeout doc. Not yet clear whether this is S6 finishing
its own lane before shifting fully to the fleet-wide Turkey-access reassignment (P4) from last
tick's directive, or work already folded into that reassignment — not guessing which.

All other branches unchanged from checkpoint 142. Both fix sets re-verified again: the
original 5 live-harm-surface rows and the 4 Stockholm/FRC rows all remain at their confirmed-
correct values, no regressions.

### Open items (unchanged)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns; S6 assigned to
   fleet-wide Turkey-access verification (P4), progress not yet visible in a way I can verify.
2. University-photo false-accept rate — S2's ~16% vs. my earlier ~12-15%, not yet reconciled.

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

select id, title, status, verification_state, updated_at from opportunities
where id::text like 'c8eb3d40%' or id::text like '17aeb772%'
   or id::text like 'dfb94075%' or id::text like 'db25d327%';
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-27 ~11:00.
