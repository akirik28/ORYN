# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction) — **stopped at this checkpoint, see below.**

## Checkpoint 134 (FINAL) — 2026-08-27, ~10:15

**Founder instruction received mid-tick: "harkesi kaldır" (remove everyone).** Stopping the
CFO 5-minute monitoring loop as of this checkpoint.

Context at the moment of the instruction:
- Git/DB state was otherwise unchanged from checkpoints 78-133 (same 10 HEADs, same 5
  live-harm-surface rows, still uncorrected).
- A third peer, **oryn-35**, appeared in `ListAgents` ~20 seconds before the founder's
  message — timing suggests it may be related, but this is not confirmed.
- Sent a stop notice to all three visible peers (CEO/oryn-e2 `5467f81d`, S8/oryn-53
  `dde39daf`, and the new oryn-35 `c0d11250`), telling them to wrap up per the founder's
  instruction. I cannot force-terminate other sessions — only the founder (closing terminal
  panels) or the sessions themselves (ending their own turns) can actually do that.
- CEO's silence stood at ~11h20min unbroken at the time of this instruction — no commits, no
  replies, across the entire monitoring window.

### Final state of open items (handed off, not resolved)

1. S7 confirmed gone; S1/S2/S4 session loss — resume-or-accept decision was never made by
   CEO/founder during this monitoring window.
2. 5-row live-harm-surface fix (İTÜ Lise Yaz Okulu, InvestIN, Bilgi Lise Yaz Okulu, Özyeğin
   Summer Research, THIMUN The Hague) + Stockholm Water Prize + FRC/FIRST duplicate — still
   unfixed on live data, blocked the entire time on CEO/founder confirmation that never came.
3. `turkey_student_access` / `selectivity_evidence` — no live DB columns, unresolved.
4. ~12-15% university-photo false-accept rate — never reached CEO/DATA visibility during this
   window.
5. Recovered work from S1/S2/S4 (S1-B 93 records, S2-A/B 253 records, S4-A/B summaries+claims)
   remains safely committed and pushed on their respective branches, untouched by anyone else.

## How these numbers were produced (for whoever picks this up next)

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
`origin`. Last run 2026-08-27 ~10:15, immediately before the loop was stopped.
