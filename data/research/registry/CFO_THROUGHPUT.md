# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction — explicitly reconfirmed at checkpoint 139 to keep watching for dead sessions).

## Checkpoint 141 — 2026-08-27, ~10:50

**No dead servers.** All 9 peers still present, relaunched sessions now 34-35min old, the two
originals (S8, old CEO) still 11h — nothing dropped out.

**S5B is still doing real research work, not just closing out.** `oryn/s5b-research-
mentored-internships` advanced +9 → +10, 26 seconds ago: "S5B continuation: close 8 of 13
CANDIDATE gaps via re-fetch/proxy re-verification" — substantive verification work, not a
closeout doc. Worth noting since most branches this hour have been posting closing summaries
rather than new findings; this is a genuine exception and reads as healthy, not concerning.

All other branches unchanged from checkpoint 140 (S2, S6, S7, S8, CEO control-tower all same
commits). Live-harm-surface rows re-verified again: still all correct, unchanged. Stockholm
Water Prize / FRC fix package (S6, previous tick) still not independently confirmed applied to
the live DB — not re-checked this tick since it's outside my standing 5-row query, no new
information either way.

### Open items (unchanged)

1. Stockholm Water Prize + FRC/FIRST duplicate — fix package exists on S6's branch; live
   application still unconfirmed on my end.
2. `turkey_student_access` / `selectivity_evidence` — still no live DB columns.
3. ~12-15% university-photo false-accept rate — not re-verified this tick.

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
`origin`, 2026-08-27 ~10:50.
