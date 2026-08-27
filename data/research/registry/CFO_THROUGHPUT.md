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

## Checkpoint 147 — 2026-08-27, ~11:15

**Strong throughput tick — real work landing across four branches.**

- `oryn/s6-competitions-research`: +26 → +27, 31 seconds ago — **"S6-B: fleet-wide Turkey-
  eligibility sweep complete (15/15, conference/student_program/online_program)."** This is
  the P4 reassignment from checkpoint 142 finishing. **Checked directly: the underlying
  `turkey_student_access`/`selectivity_evidence` DB columns still do not exist** —
  `information_schema.columns` returns zero rows for either name on `opportunities`. So this
  is real, complete research/verification output, but it has not (yet) landed as schema —
  don't conflate "sweep complete" with "the open DB-column item resolved." Keeping that item
  open until I see it land as an actual column or field.
- `oryn/s5a-summer-academic-enrichment`: +13 → +14, 3 minutes ago — "S5A batch8: gap-closure
  for 9 more verified_current summer_program rows."
- `oryn/s7-other-high-value-opportunities`: +12 → +13, 7 minutes ago — "photo-sourcing dry run
  on 42 priority records — 13 verified."
- `oryn/research-freeze-ceo-control-tower`, `s8-qa-gate`, `s5b`: unchanged since checkpoint
  143-144.

Both fix sets (original 5 + Stockholm/FRC 4) re-verified again: all correct, no regressions.
**No dead servers** — same 9 peers, relaunched sessions ~1h old, originals 12h.

### Open items (updated)

1. `turkey_student_access` / `selectivity_evidence` — **research sweep now complete (15/15)
   per S6-B, but the DB columns themselves still don't exist** (confirmed via
   `information_schema.columns` this tick). This is now a "data ready, schema pending" gap,
   not a "no work done" gap — worth CEO's attention on whether/how this gets written.
2. University-photo false-accept rate — S2's ~16% vs. my earlier ~12-15%, not yet reconciled.
3. Browser-pane contention risk — narrowed to S7 (and other Browser-tool-based lanes) only;
   S1 and S3 confirmed clear; S4 still the one open case, CEO handling directly.

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

select column_name from information_schema.columns
where table_name = 'opportunities' and column_name in ('turkey_student_access', 'selectivity_evidence');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-27 ~11:15.
