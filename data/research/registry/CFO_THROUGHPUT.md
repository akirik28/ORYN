# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 35 — 2026-08-27, ~02:00

**No branch-git change this tick, but S8 delivered real output via direct verification** —
3 PRODUCTION_READY, 5 VERIFIED, 1 REJECTED, 2 BLOCKED (`e8bc550`). The rejection is worth
knowing: **Üçok Family Scholarship**'s "no US residency requirement" framing hid the actual
gate — enrollment at a California university specifically, a materially different (and much
narrower) eligibility bar than the framing implied. Same shape as prior findings this session:
a technically-true statement obscuring the real restriction. Of the 2 BLOCKED, one is genuinely
unreachable, one needs a source pointer from S7 rather than more searching (routing item, not
a dead end).

**New operational pattern, worth keeping**: S8's first parallel WebFetch batch (5-way) failed
5/5 with "socket hang up" — identical shape to yesterday's curl-burst artifact (the S4/S9
finding), but this time on `WebFetch`, not `curl`. Sequential/paired retries worked fine, and
where a failure persisted alone it correctly distinguished a real block from the burst artifact.
**Generalizes the lesson beyond one tool**: a wall of simultaneous request failures on this
shared environment is more likely a concurrency artifact than the target sites actually being
down — worth remembering if anyone else hits this. S8's original stuck subagent: still no word,
not blocking on it.

### Correcting checkpoint 23: S6/S7 did NOT gracefully exit — reassessing the whole incident

**S7 just went dark mid-conversation with S8** — S8 was actively exchanging messages with it
(delivering Wave 2 findings) and got the same "no agent... is reachable" response S1/S2/S4
gave earlier. This means S7 was alive and reachable well past checkpoint 23, where I concluded
"gracefully exited" from a `ListAgents` count drop alone — **I never actually tested reachability
for S6/S7 the way I later did for S1/S2/S4. That conclusion was an unverified assumption, not a
confirmed fact, and it was wrong.** Correcting the record rather than letting it stand.

This reframes the incident's shape. Real timeline: S1/S2/S4 went dark ~00:15-00:45, S7 just went
dark ~02:00+ — **staggered by 75+ minutes, not simultaneous.** A shared-resource crash (disk
fill, OOM) would more plausibly hit several sessions at once; a long stagger fits a different,
less alarming hypothesis better: each session naturally reaching a length/context limit after
many hours of continuous heavy tool use, roughly in order of how much work it did — S1/S2/S4 ran
the heaviest continuous work (concurrent per-university image downloads) and died first; S7 was
doing lighter, intermittent QA-response work and lasted much longer. S8's own subagent, still
`running` at 2h+ with no completion, fits the same shape. **Not certain — flagging as the more
likely alternative to "crash," not a replacement conclusion.** Whichever it is, the practical
response is unchanged: recover uncommitted work when found, don't treat it as urgent-unless-new-
evidence-says-otherwise.

**Also new**: S8 delivered real output via direct verification (unblocked from its own stuck
subagent) — 3 PRODUCTION_READY, 5 VERIFIED, 1 REJECTED, 2 BLOCKED (`e8bc550`). The rejection:
**Üçok Family Scholarship**'s "no US residency requirement" framing hid the actual gate —
enrollment at a California university specifically, a materially narrower bar than the framing
implied. Same shape as prior findings: a technically-true statement obscuring the real
restriction. New operational pattern: S8's first parallel WebFetch batch (5-way) failed 5/5 with
"socket hang up" — identical to yesterday's curl-burst artifact (S4/S9 finding), now confirmed
on a second tool. Sequential/paired retries worked fine. **Generalized lesson**: a wall of
simultaneous request failures on this shared environment is more likely a concurrency artifact
than the target sites being down.

Live-harm rows re-verified: unchanged. CEO's silence continues, now ~2h55min.

### Open items

1. S7 also gone (correcting checkpoint 23) — same open question as S1/S2/S4: resume or accept
   as done-for-now, pending CEO/founder. S7's own branch is unaffected and intact either way;
   S8's Wave 2 findings for it just sit undelivered until S7 resurfaces or someone else picks
   up that thread.
2. S8's original subagent — still unresurfaced, will reconcile if it ever returns. Not blocking.
3. S1/S2/S4 session loss — awaiting CEO/founder decision on resuming. Recovered work safe.
4. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~2h55min unreachable.
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
`origin`, 2026-08-27 ~02:00.
