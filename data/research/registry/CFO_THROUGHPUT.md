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

## Checkpoint 154 — 2026-08-27, ~11:50

**No dead servers.** Same 9 peers, relaunched sessions ~1h old, originals 12h.

**Both of last tick's pending items resolved — one independently verified.**
- `oryn/research-freeze-ceo-control-tower`: +15 → +16, 4 minutes ago — "S5 fix package applied
  (12 writes) + UNO grade fix." Read the actual commit content rather than trusting the
  headline number: **12 writes** = 2 currency-label clarifications (values were already
  correct, only USD-ambiguity text fixed), 8 category recategorizations into `research`/
  `internship`, 2 duplicate pairs retired (found incidentally, unrelated to what S5 was
  asked to do). **Deliberately not resolved**: Penn Medicine's deadline (no clean source —
  flagged, not guessed) and 3 umbrella-row structural calls (WYSE/BRAND-ED/Johns Hopkins CTY)
  — held as genuine product decisions rather than rushed. **Independently verified the UNO fix
  directly**: `31856863` (UNO - United Nations Online) now shows `eligible_grades: [10, 11,
  12]`, matching the described correction (was wrongly excluding 10th graders), fresh
  `updated_at` (07:07:02, distinct from the earlier fix batches).
- `oryn/s4-university-photos`: +2 → +3, 4 minutes ago — "S4: reciprocal review complete — 25
  real defects confirmed, 1 correction, 5 disputes resolved." The "25" matches the retraction
  S4 reported at checkpoint 135 (26→25 after the University of Utah correction) — consistent,
  no new discrepancy.

All other branches unchanged since checkpoint 153. Live-harm-surface rows re-verified: still
all correct.

### Open items (updated)

1. `turkey_student_access` / `selectivity_evidence` — research double-checked, DB columns
   still don't exist.
2. University-photo false-accept rate — S2's ~16% vs. my earlier ~12-15%, not yet reconciled.
3. Browser-pane contention risk — only S4's exposure remains unconfirmed; CEO handling
   directly.
4. Penn Medicine deadline + 3 umbrella-row structural decisions — deliberately deferred by
   CEO/S5 rather than guessed; genuinely open, not a backlog failure.

## How these numbers were produced (re-run to refresh — as separate calls, not batched)

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

select id, title, eligible_grades, updated_at from opportunities
where id::text like '31856863%';

select column_name from information_schema.columns
where table_name = 'opportunities' and column_name in ('turkey_student_access', 'selectivity_evidence');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql` (as separate calls), and `git fetch`/
branch diff against `origin`, 2026-08-27 ~11:50.
