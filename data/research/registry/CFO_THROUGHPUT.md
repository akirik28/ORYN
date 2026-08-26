# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 20 — 2026-08-27, ~00:45

### The dedup-blind-spot finding just closed its own loop — caught 3 already-issued verdicts

The full cascade, worth seeing end to end: S5B found the blind spot (category-scoped dedup
misses cross-category duplicates) → relayed to S6/S5A/S7 → **S7 applied the same methodology to
its own already-QA'd output and found 5 records that duplicate pre-existing live rows** → 3 of
those had already been marked `PRODUCTION_READY` in S8's Wave 1 report (checkpoint 13). S8
corrected its own report immediately rather than let the wrong verdict stand, and named the real
lesson precisely: **"fact-verification and duplicate-detection are distinct checks" — a record
can be perfectly accurate and still be a duplicate that shouldn't exist.** Corrected count: S7
Wave 1's real production-ready tally is **26, not 29** (checkpoint 13's number). This is the
clearest example this session of one relayed finding compounding in value as it propagates —
not just avoiding new duplicate work, but retroactively catching an already-closed defect.

### Other closeouts this tick

**S6 fully closed on every front** (competitions + photo-sourcing pass + cross-category dedup
sweep). S5B addressed S5A's cross-review feedback (mutual review working as designed). S1-A
holds at 127/127 complete.

### CEO: ~1h30min silence, unchanged. Live-harm rows: unchanged.

### Reallocation

None forced. Fleet is now producing corrections on its own already-completed work, which is a
sign of real quality-control depth, not something to redirect capacity away from.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~1h30min unreachable.
2. S7's other 2 of the 5 newly-found duplicates (not previously marked PRODUCTION_READY) — worth
   confirming they're excluded from any future promotion, not just the 3 that needed correcting.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. ~12-15% university-photo false-accept rate (checkpoint 18) — still pending CEO/DATA visibility.

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
`origin`, 2026-08-27 ~00:45.
