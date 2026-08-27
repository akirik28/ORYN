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

## Checkpoint 144 — 2026-08-27, ~11:05 (peer-message triggered, not a scheduled tick)

**New operational risk: shared/contested Browser pane during concurrent visual verification.**
CEO relayed from S7: 2 of 3 sub-agents on S7's photo-verification pass found another
concurrent session driving the same Browser pane mid-task. Both caught it and re-verified from
a dedicated tab before trusting anything on screen — **no bad data resulted this time** — but
this is a live risk for any lane doing concurrent visual verification: S1-S4's university-
photo work, S6/S7's opportunity-photo work. Recording this as a tracked operational risk,
same category as the earlier disk-space/session-loss correlation from checkpoint ~20-something.
Mitigation that already works and should become standard practice fleet-wide: **always confirm
you're driving your own dedicated tab before trusting what's rendered on screen.** Asked CEO to
relay this to the current S1-S4/S6/S7 sessions directly, since I only have confirmed role-to-
name mappings for S2 and S4 among the relaunched sessions (via their own self-identification)
— not confident enough in the others to message them directly without risking a
misdirected relay, especially given CEO's note that display names have been churning all
night (I was apparently `oryn-99` at some point tonight and am now `oryn-ac`, per S7 — did not
notice the change myself; my own outbound `SendMessage` calls have kept resolving correctly
regardless).

**No dead servers.** `ListAgents` still shows the same 9 peers as checkpoint 143, uptimes now
~1h for the relaunched sessions, 12h for the two originals.

### Open items (unchanged)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns; S6 assigned to
   fleet-wide Turkey-access verification (P4).
2. University-photo false-accept rate — S2's ~16% vs. my earlier ~12-15%, not yet reconciled.
3. New: Browser-pane contention risk during concurrent visual verification — mitigation known
   and working, needs to become common knowledge across all photo-verification lanes.

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
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`. Branch/DB numbers not re-run this tick (peer-message-triggered, not a scheduled
check) — last confirmed at checkpoint 143, 2026-08-27 ~11:00.
