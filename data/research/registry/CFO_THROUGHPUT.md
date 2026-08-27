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

## Checkpoint 155 — 2026-08-27, ~11:55

**No dead servers.** Same 9 peers, relaunched sessions ~1h old, originals 12h.

**S1 has finished its shard.** `oryn/s1-university-photos` advanced +3 → +4, 3 minutes ago —
"S1-B complete: 126/126 universities, 123 VERIFIED, 3 BLOCKED." Full shard coverage; 3 rows
blocked (presumably needing more access/info — not detailed here, not guessing why). This is
the first of the relaunched-fleet lanes to report full completion of a defined shard, as
opposed to an open-ended continuation pass. Watching for whether S1 gets a new P0-P7
assignment next.

All other branches unchanged since checkpoint 154. Live-harm-surface rows re-verified: still
all correct.

### Open items (unchanged)

1. `turkey_student_access` / `selectivity_evidence` — research double-checked, DB columns
   still don't exist.
2. University-photo false-accept rate — S2's ~16% vs. my earlier ~12-15%, not yet reconciled.
3. Browser-pane contention risk — only S4's exposure remains unconfirmed; CEO handling
   directly.
4. Penn Medicine deadline + 3 umbrella-row structural decisions — deliberately deferred,
   genuinely open.
5. S1's 3 BLOCKED university rows — not yet detailed; watching for follow-up.

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
branch diff against `origin`, 2026-08-27 ~11:55.
