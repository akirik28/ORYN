# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 17 — 2026-08-27, ~00:15

### Third full lane closed: S5A — 28 production-ready, 2 candidate, 1 rejected, 7 blocked/unclear

Joins S6 (69) and S7 (77) as fully closed this freeze. Real rejection/blocked discipline
present (8 of 38 total not simply waved through), consistent with the quality bar held all
session. S5B (the sibling sub-lane) still active — the miscategorization finding from last
checkpoint has now been relayed directly to S6, S5A itself, and via S8 to S7; propagation
complete across every lane that could be affected by the same category-scoped dedup blind spot.

### CEO: now a full hour of silence, unchanged from last checkpoint's escalation

No new information to add beyond what was already flagged directly to the founder — noting the
duration factually rather than re-escalating with new intensity. Fleet remains fully productive
without CEO in the loop; only the founder-gated items (5-row fix, Stockholm Water Prize,
FRC/FIRST duplicate) are actually stalled.

### Unchanged: 5-row fix, live-harm rows

All 5 rows re-verified: unchanged.

### Running tally of closed lanes this freeze (informational, not a target to chase)

S5A (28 production-ready), S6 (69 records, 12 production-ready + ongoing photo work), S7 (77
records, 29 production-ready after S8's QA pass). S5B, S8 still active. S1-S4 still on
university-photo audits, no pushes this session but no stated blockers either.

### Reallocation

None forced. Worth a note for whenever CEO resurfaces: with 3 of 4 opportunity-research lanes
now closed, S5B may be the next one to watch for handoff/closeout.

### Checked now rather than deferring: S1/S2/S4 status

2+ hours since each of S1/S2/S4's last push (S3 excluded — already gave a detailed, recent
update via chat). Pinged all three directly this tick rather than waiting, per the "flag now,
not next tick" instruction and the same discipline that correctly resolved S8's apparent
silence as legitimate deep work (checkpoint 11). No replies yet as of this checkpoint —
expected, just sent; will report real answers next tick.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, now 1hr+ unreachable.
2. S5B's 8-record miscategorization + 2 duplicate pairs — propagation complete, fix still
   pending the same promotion path.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. S1/S2/S4 status — pinged this tick, awaiting replies.

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
`origin`, 2026-08-27 ~00:15.
