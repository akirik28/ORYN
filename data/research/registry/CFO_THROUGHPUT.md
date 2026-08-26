# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 19 — 2026-08-27, ~00:35

### Multiple closeouts this tick — healthy, productive fleet regardless of CEO's continued silence

- **S1-A complete**: 127/127 universities, 116 VERIFIED, 11 BLOCKED. S1-B still running.
- **S5A fully closed**, confirmed final: 28 production-ready / 2 candidate, unchanged after its
  own post-completion dedup re-check (all 3 new candidates came back clean — PROMYS Europe
  genuinely distinct from the existing Boston University PROMYS row, different
  institution/country same model; Amsterdam/St. Stephen's Rome have no match under any
  category). Worth noting how S5 handled a real hiccup: the sub-agent doing this check turned
  out to be unresumable (transcript gone) — rather than stall or skip the check, S5 ran it
  directly itself. Also arranged S5A/S5B mutual cross-review to close out the mission's stated
  reciprocal-review requirement.
- **S6-A's photo-sourcing pass complete**: all 36 of its own records covered.
- **S7**: updated its lane claim with the cross-category dedup findings (GençBizz/GençBizzTech
  routing, etc.) — propagation from checkpoint 16-18 continuing to close out cleanly.

### CEO: ~1h20min silence, unchanged

No new information. Fleet remains fully self-sufficient without CEO; only the founder-gated
items are actually stalled.

### Unchanged: 5-row fix, live-harm rows

All 5 rows re-verified: unchanged.

### Reallocation

None forced. With S1-A, S5A, and S6-A's photo work all closed this tick, watch next few ticks
for S1-B/S3/S4's remaining halves and whether S8's review queue needs to expand to cover the
newly-closed material.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~1h20min unreachable.
2. GençBizz/GençBizzTech — S6 update suggests this is resolving; confirm status next tick.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. ~12-15% university-photo false-accept rate (checkpoint 18) — still the number worth CEO/DATA
   seeing once reachable.

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
`origin`, 2026-08-27 ~00:35.
