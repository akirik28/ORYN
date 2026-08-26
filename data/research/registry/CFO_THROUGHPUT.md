# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 21 — 2026-08-27, ~00:50

**Genuinely quiet tick — same 10 HEADs as checkpoint 20, no new commits anywhere.** After a
dense run of closeouts (S1-A, S5A, S6, and the dedup-cascade correction), a lull here reads as
normal digestion time, not a stall — most lanes just delivered substantial output and plausibly
need real time before the next batch. Live-harm rows re-verified: unchanged. CEO: 77 minutes
silent, no material change from the ~1hr mark already flagged directly — not re-escalating for
a 15-minute increment, will note materially if it crosses toward 2 hours.

### Status snapshot (unchanged from checkpoint 20, restated briefly for continuity)

Closed this freeze: S5A (28 production-ready), S6 (69 records + full photo pass + dedup sweep),
S1-A (127/127). S7's real production-ready count corrected to 26 (from 29) after the dedup-
cascade catch. Active: S1-B, S2 (A+B), S3 (A+B), S4 (A+B), S5B, S8.

### Unchanged open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, 77min unreachable.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.

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
`origin`, 2026-08-27 ~00:50.
