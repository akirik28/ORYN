# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 23 — 2026-08-27, ~01:00

### S5 fully closed — both A and B pushed final handoffs this tick

S5A: "lane complete for this pass, final numbers in workstreams map." S5B: final handoff pushed
4 minutes prior. Combined with S6 and S7's earlier closeouts, **three of the four
opportunity-research lanes (S5, S6, S7) are now fully done** — only S5B's sibling-scope work and
the university-photo lanes (S1-S4) remain actively producing.

### Roster change: S6 and S7's sessions have exited (7 peers now, was 9)

`ListAgents` no longer lists `oryn-71` (S6) or `oryn-4d` (S7) — both sessions appear to have
ended after pushing their final, clean closeout commits. Reading this as graceful completion,
not a problem: both had just finished substantial, well-documented work with no open blockers or
distress signals in their last messages. Not attempting to re-contact either — nothing pending
needs them, and their output is fully committed. Current live roster: S1, S2, S3, S4, S5A, CEO
(7 sessions total per ListAgents — S5's two sub-lanes may share one underlying session slot,
consistent with how S5A/S5B have operated as one coordinating session's two internal sub-lanes
throughout, similar to S1-A/S1-B etc.).

### CEO: 86 minutes silent, unchanged. Live-harm rows: unchanged.

### Reallocation

None forced, but worth CEO's attention once reachable: with S5/S6/S7 all closed, the fleet's
remaining active capacity is entirely on university photos (S1-S4) plus S8's review queue —
worth deciding whether any of that freed capacity should be redirected once CEO can make that
call, per the standing model (not mine to redirect unilaterally).

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, 86min unreachable.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.
4. Now 3 of 4 opportunity lanes closed — worth CEO deciding on capacity redirection once back.

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
`origin`, 2026-08-27 ~01:00.
