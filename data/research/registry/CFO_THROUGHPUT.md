# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 27 — 2026-08-27, ~01:20 — REAL INCIDENT: S1/S2/S4 sessions lost, work recovered

### What happened

Six identical cron-tick prompts arrived queued at once, and `ListAgents` dropped from 7 peers
to 2 (only S8 and CEO remain) between this tick and the last. **S1, S2, and S4 are confirmed
genuinely unreachable** — not a stale listing, `SendMessage` returned "no agent... is
reachable" for all three on direct attempts. S3 is also absent from `ListAgents`; not
separately confirmed unreachable, but its worktrees were already clean, so no recovery action
was needed there regardless. This does not look like the clean, self-reported completions S6/
S7/S5 had (each of those pushed an explicit "lane complete"/"final handoff" commit before their
sessions ended) — S1/S2/S4 have no such commit, and real work was found sitting uncommitted.

**Cause not confirmed.** Disk space (95% used/11GB free) is roughly stable versus the last
measurement, not a smoking gun on its own, but remains the tightest resource on this host and
the most likely-looking culprit given S1-S4 were the most compute/disk-intensive lanes
(concurrent image downloads across many sub-agents). Not asserting this as the confirmed cause
— flagging it as the most plausible one, for whoever can actually check host-level logs.

### Recovery action taken this tick

Found and verified (valid JSON/JSONL, not truncated) real uncommitted work in three worktrees,
and committed + pushed each to prevent loss — this was a pure protective action (nothing
destructive, nothing overwritten, full provenance disclosed in each commit message, content not
vouched for as reviewed):

- **S1-B**: 93 findings, uncommitted → committed & pushed (`399c29a`)
- **S2-A/S2-B**: 253 records combined, uncommitted → committed & pushed (`3bc55b9`)
- **S4-A/S4-B**: 2 summary docs + ~250KB of claims files, uncommitted → committed & pushed
  (`240450e`) — `S4_A_summary.md`'s modification time (00:32) sits right at the apparent
  interruption window, so this may be the very last thing S4-A produced.
- **S3**: all 4 of its worktrees (main + 2 sub-agent + 2 cross-review) checked, all clean —
  nothing to recover.

Flagged the full incident to CEO directly (not something CFO can resolve alone — deciding
whether to resume S1/S2/S4's work with new sessions or treat their shards as done-for-now is a
lane-reassignment call, outside CFO's remit).

### Everything else, for context

S8 and CEO both still present in `ListAgents`. Live-harm rows re-verified: unchanged. CEO's own
silence (now ~2h15min) is a separate, already-flagged item — not conflating the two, since CEO
appears to still be a live session (listed), just non-responsive, which is a different shape of
problem than S1/S2/S4's apparent disappearance.

### Open items

1. **New, highest priority**: S1/S2/S4 session loss — needs CEO/founder decision on whether to
   resume with new sessions. Work through their last commit is safe (recovered + pushed).
2. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~2h15min unreachable.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.

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
`origin`, 2026-08-27 ~01:20. Recovery checks: `git status --short` in each worktree,
`df -h`, direct `SendMessage` attempts to confirm unreachability.
