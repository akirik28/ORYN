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

## Checkpoint 159 — 2026-08-27, ~12:15

**Significant quality finding — the photo-defect rate was materially understated, now
corrected. Flagging this prominently, not folding it quietly into a routine update.**

`oryn/research-freeze-ceo-control-tower` advanced +16 → +17, 4 minutes ago: "refine
official-tier photo defect rate 16%->42%, S2 finding." Read the actual `GAP_MAP.md` diff
rather than trusting the commit title alone:

- S2 independently cross-checked S1/S3/S4's **official-tier** images directly against the
  actual files (147 universities, not self-reports). True defect rate on that tier:
  **~42% (85 pass / 62 fail)** — consistent across all three shards (S1 41.8%, S3 40.5%,
  S4 44.0%).
- **The earlier ~12-16% figure was not wrong data, it was a misleading blend**: it mixed the
  bad `official` tier with the near-0%-defect `wikimedia_verified` tier, diluting the real
  severity. The `official`-tier acquisition path is defective on **close to half its output,
  not a sixth of it.**
- `wikimedia_verified` remains genuinely trustworthy — confirmed near-0% failure a third
  independent way tonight (after CEO's own count and S8's).
- Related, equally serious: license completeness is **exactly inverted by tier** —
  `wikimedia_verified` is 525/525 (100%) license-complete; `official` is **0/194 (0%)**.

This is a real, well-evidenced quality problem on the `official` photo tier specifically —
not a false alarm, not resolved, and worse than my own earlier open-item note ("S2's ~16% vs.
my earlier ~12-15%") suggested. Superseding that note with the precise figure. CEO has already
documented this formally in `GAP_MAP.md` with a full handoff
(`docs/handoffs/s2-crosscheck-official-tier-2026-08-27.md` on `oryn/s2-crosscheck-official-
tier`) — not re-escalating to CEO since they authored the finding, but flagging directly to
the founder in chat this tick given the magnitude.

**No dead servers.** Same 9 peers, relaunched sessions ~2h old, originals 13h. All other
branches unchanged since checkpoint 158. Live-harm-surface rows re-verified: still all
correct.

### Open items (updated)

1. **`official`-tier photo defect rate: ~42%, license-complete 0/194** — real, quantified,
   `wikimedia_verified` tier unaffected and trustworthy. Superseding the earlier ~12-16% note.
2. `turkey_student_access` / `selectivity_evidence` — research double-checked, DB columns
   still don't exist.
3. Browser-pane contention risk — only S4's exposure remains unconfirmed; CEO handling
   directly.
4. Penn Medicine deadline + 3 umbrella-row structural decisions — deliberately deferred,
   genuinely open.
5. S1's 3 BLOCKED university rows — not yet detailed; watching for follow-up.

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

select column_name from information_schema.columns
where table_name = 'opportunities' and column_name in ('turkey_student_access', 'selectivity_evidence');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql` (as separate calls), and `git fetch`/
branch diff against `origin`, 2026-08-27 ~12:15.
