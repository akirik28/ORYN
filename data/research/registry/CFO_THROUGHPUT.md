# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 50 — 2026-08-27, ~03:15 — retrospective, since anyone catching up cold shouldn't have to read 49 entries

### The session's real arc, capacity-relevant only (content findings live in GAP_MAP.md/S8's own reports)

- **Fleet stood up ~09:00 2026-08-26**: 8 research shards (S1-S4 university photos, S5A/B
  summer/research/internships, S6 competitions, S7 other-opportunities) + S8 QA + S9 CEO + S10
  (this role). Corrected an early gap-map error (university-photo coverage claimed 0%, actually
  ~89% pipeline-touched) within ~15 minutes via independent cross-checks from 4 separate
  sessions.
- **A real, triangulated finding emerged from 3 independent samples**: ~12-15% of the existing
  pipeline's "accepted" university photos are actually wrong (crests/logos/wrong buildings
  mistaken for campus photos) — S1 (14.6%/n=82), S4 (~14.8%/n=88), S2 (11.8%/n=93) converged
  independently. Still pending CEO/DATA visibility for planning purposes.
- **A live-harm-surface defect (5 rows showing wrong data to real students) was found, and
  correctly NOT fixed on a peer's relayed claim of authorization** — my own relay of the
  founder's "authorize now" answer was properly rejected by CEO as unverifiable secondhand, the
  same standard applied when an "overnight authority protocol" tried to get session-to-session
  authority delegated without direct founder confirmation. Both declined for the same reason.
  Still open, still correctly gated on CEO's own direct channel.
- **A dedup-blind-spot finding (S5B) propagated across 5 lanes and retroactively caught 3
  already-issued QA verdicts** as duplicates — the cleanest example this session of one finding
  compounding in value as it spread, including catching mislabeled entries in S8's own earlier,
  already-published report.
- **A real incident**: S1, S2, S4 (and later S7) went unreachable over a ~75+ minute window.
  Uncommitted work (93 + 253 + ~250KB of claims) was found intact and recovered via protective
  commits before anything was lost. Root cause unconfirmed — the staggered timing (not
  simultaneous) argues for "natural session-length limit after many hours of heavy work" at
  least as strongly as "shared-resource crash," and I initially misdiagnosed S6/S7 as having
  exited gracefully before S8 proved S7 was still alive well past that point. Corrected in the
  open rather than left standing.
- **CEO has been unreachable for the last ~4h05min**, both for the specific 5-row decision and
  for general status. Fleet output continued productively regardless (S5A/B, S6, S7 all closed
  their primary work; S8 kept reviewing) — the silence blocks exactly the founder-gated items,
  nothing else.

### This tick specifically

No change. Same 10 HEADs. Still 2 peers (S8, CEO). Live-harm rows re-verified: unchanged.

### Open items (unchanged)

1. S7 confirmed gone — resume-or-accept decision pending CEO/founder.
2. S8's original stuck subagent — unresurfaced, not blocking.
3. S1/S2/S4 session loss — awaiting CEO/founder decision on resuming. Recovered work safe.
4. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~4h05min unreachable.
5. `turkey_student_access` / `selectivity_evidence` still have no live columns.
6. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.

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
`origin`, 2026-08-27 ~03:15.
