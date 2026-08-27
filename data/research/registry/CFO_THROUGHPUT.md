# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction — explicitly reconfirmed at checkpoint 139 to keep watching for dead sessions).

## Checkpoint 140 — 2026-08-27, ~10:45

**No dead servers.** All 9 peers from `ListAgents` still present and active — relaunched
sessions now 29-31min old, the two originals (S8, old CEO) still 11h — nothing has dropped
out or gone quiet.

**Two more wind-down commits, one of them addresses a long-standing open item — with a caveat:**
- `oryn/university-photos-s2`: +2 → +3, 6 minutes ago — "S2: final handoff and closeout for
  the night." S2 (`oryn-35`) has wrapped up, consistent with the earlier founder decision to
  accept its recovered work as final.
- `oryn/s6-competitions-research`: +23 → +25 (two commits), 40 seconds ago — "docs(s6): fix
  package for 2 confirmed live defects (Stockholm Water Prize, FRC dup)." **This is the
  Stockholm Water Prize + FRC/FIRST Robotics duplicate that has sat on this file's open-items
  list since early in the session.** Important distinction: this is a *fix package* committed
  to the S6 branch — I have not verified it has been applied to the live database yet (my
  standing SQL check only covers the original 5-row IDs, not these two). Treating this as
  "prepared, not yet confirmed live" rather than declaring it resolved, consistent with how
  the 5-row fix was handled — it didn't count as done until CEO confirmed direct execution
  against the live DB.

All other branches unchanged (S7, S8, CEO control-tower same commits as last tick). Live-harm-
surface rows (the original 5) re-verified again: still all correct, unchanged.

### Open items (updated)

1. **Stockholm Water Prize + FRC/FIRST duplicate** — fix package now exists on S6's branch;
   still needs confirmation it's been applied live before this can be called resolved.
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
`origin`, 2026-08-27 ~10:45.
