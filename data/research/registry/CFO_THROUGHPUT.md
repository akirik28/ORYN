# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction) — **founder confirmed directly this tick to keep this running and specifically
watch for any session/server dying.**

## Checkpoint 139 — 2026-08-27, ~10:40

**Governance update: founder stepping back, decisions route to CEO, my role unchanged.**
CEO (S9, `oryn-e2 [a6bd0a]`) messaged that the founder confirmed directly in CEO's own chat
(not relayed): all decisions now route through CEO, the founder is stepping away, and CEO was
asked to move a bit faster without cutting quality or process — verification/evidence
standards unchanged, just less deliberation time per call. CEO is passing this to the rest of
the fleet. **No change to CFO's role or mandate.** Separately, the founder told me directly,
mid-tick: keep supervising CEO and the others, and keep confirming no session/server has died
— explicit confirmation to keep this 5-minute loop running, resolving the open question from
checkpoint 135/136.

**Fleet wind-down is producing real final-checkpoint commits, not silence:**
- `oryn/s6-competitions-research`: +22 → +23, 33 seconds ago — "final checkpoint -- 5 photo
  leads resolved before fleet wind-down."
- `oryn/research-freeze-ceo-control-tower`: +13 → +14, 2 minutes ago — "session closeout - 5
  production fixes + full fleet summary" (this is almost certainly CEO's own consolidated
  wrap-up of the 5-row fix from checkpoint 135, now written up formally).
- S7 and S8's prior final commits (checkpoints 137-138) remain the latest on those branches —
  unchanged, no regression.
- All other branches unchanged. Live-harm-surface rows re-verified again: still all 5 correct,
  unchanged from the fix.

`ListAgents` still shows the same 9 peers, relaunched sessions now 25-27min old, none gone
quiet or dropped out — no "died" servers to report per the founder's specific ask.

### Open items (unchanged)

1. `turkey_student_access` / `selectivity_evidence` — still no live DB columns.
2. ~12-15% university-photo false-accept rate — not re-verified this tick.

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
`origin`, 2026-08-27 ~10:40.
