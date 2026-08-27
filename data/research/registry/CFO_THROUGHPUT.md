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

## Checkpoint 165 — 2026-08-27, ~12:45

**No dead servers.** Same 9 peers, relaunched sessions ~2h old, originals 13h.

**S5A's batch cadence continues.** `oryn/s5a-summer-academic-enrichment` advanced +22 → +23,
2 minutes ago: "S5A batch14: 9 PRODUCTION_READY, 3 structural flags." Fourth consecutive batch
since picking up new work at checkpoint 161 (batches 11-14).

All other branches unchanged since checkpoint 164. No remediation activity yet on the 42%
official-tier content-defect rate. Live-harm-surface rows re-verified: still all correct.

### Open items (unchanged)

1. `official`-tier photo **defect rate (~42%, content correctness)** — no remediation work
   observed yet.
2. `official`-tier **license/reuse-rights (0/194)** — S4/P2 classification pass in progress.
3. `turkey_student_access` / `selectivity_evidence` — DB columns still don't exist.
4. Browser-pane contention risk — only S4's exposure remains unconfirmed; CEO handling
   directly.
5. Penn Medicine deadline + 3 umbrella-row structural decisions — deliberately deferred.
6. S1's 3 BLOCKED + S5A's accumulating BLOCKED/REJECTED/structural-flag counts — not yet
   detailed; watching for a consolidated follow-up.

## How these numbers were produced (re-run to refresh — as separate calls, not batched)

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

select column_name from information_schema.columns
where table_name = 'opportunities' and column_name in ('turkey_student_access', 'selectivity_evidence');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql` (as separate calls), and `git fetch`/
branch diff against `origin`, 2026-08-27 ~12:45.
