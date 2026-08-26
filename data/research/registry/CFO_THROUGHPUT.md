# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 14 — 2026-08-26, freeze day 1, ~13:15 (T+~4h05min from fleet dispatch)

### The S8→S7 review loop closed end to end

S7 applied S8's full 67-record QA pass: 1 rejection accepted, 6 field-level corrections applied
(the cost-figure pattern and peer-review reversal from checkpoint 13), **29 records now stand
at `PRODUCTION_READY`**. This is the cleanest full cycle of the freeze so far — research →
independent re-verification → corrections applied → ready for promotion — with nothing skipped
and no defect swept under a deadline. Still dry-run, no live writes (per contract), but this is
exactly the shape of output CEO/DATA can promote with confidence when that's authorized.

### S6-A also active on the photo assignment: 5 flagship olympiads verified this checkpoint

Steady pace, no issues reported.

### Unchanged: 5-row fix, live-harm rows, CEO silence

All 5 rows re-verified: unchanged. CEO: 46 minutes since last push, no reply to either nudge
(now ~55 and ~35 minutes old respectively) — holding at "noted for founder visibility," not
re-pinging a third time absent new information, consistent with checkpoints 12-13.

### Reallocation

None forced. S5A/S5B steady, S6 productive on two fronts (competitions closed, photos active),
S7 fully cycled through QA, S8 productive, S1-S4 quiet but with no stated blocker.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO's direct founder
   confirmation, unchanged for several ticks now.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. Opportunity-photo schema gap — not urgent; S6 producing verified candidates regardless.

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
`origin`, 2026-08-26 ~13:15.
