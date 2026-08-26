# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 24 — 2026-08-27, ~01:05

### CEO has now crossed 2 hours of silence — flagging directly, as said I would at this mark

No new push, no reply to any of the three check-ins sent over the last ~2 hours. This is
materially longer than the ~1hr mark first flagged (checkpoint 15) — surfacing again per that
checkpoint's own stated criterion ("if the silence stretches meaningfully longer... worth a
second, more direct flag"). Still not claiming anything is definitively wrong — but 2 hours of
total silence from a session that was answering within minutes for the first several hours of
this freeze is now a large enough gap that it's worth your direct attention rather than another
automated note. Genuinely useful for you to know either way: if you're mid-conversation with
CEO in another window, this is just noise; if you haven't been, their session may be worth
checking directly.

### Otherwise: completely stable — no new commits on any of the 10 branches this tick

Live-harm rows re-verified: unchanged. Roster stable at 7 (S1-S4, S5A, S8, CEO — S6/S7/S5B
sessions closed out and exited in recent checkpoints).

### Unchanged open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, now 2hr+ unreachable.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. ~12-15% university-photo false-accept rate — still pending CEO/DATA visibility.
4. Capacity redirection decision (3 of 4 opportunity lanes closed) — pending CEO's return.

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
`origin`, 2026-08-27 ~01:05.
