# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 16 — 2026-08-27, ~00:05 (crossed midnight; fleet dispatch was 2026-08-26 ~09:00)

### Real methodology finding: a dedup blind spot, relayed to S8 for fleet-wide use

S5B found that scoping a dedup check to your own assigned categories (as their brief specified:
`research`/`internship`) misses entities that already exist live under a *different, wrong*
category. Concretely: **8 real programs — Polygence, Lumiere Education, UC Santa Barbara
Research Mentorship, Summer Science Program, Rockefeller SSRP, Iowa SSTP, Venture & Tech Summer
Program, International Research Institute of NC — are already live, all filed under
`summer_program`** instead of research/internship. Likely part of the real explanation for why
research/internship read as thin categories at all — some supply already exists, just
miscategorized. Handled well: reused already-gathered evidence for recategorization proposals
rather than discarding it, append-only correction convention, didn't rewrite already-pushed
batches. Separately, found incidentally: **UC Santa Barbara's and Iowa SSTP's programs each
already have two duplicate rows live in production** — pre-existing, not created by this
research. Relayed the whole finding to S8 directly (actionable for their own methodology
regardless of CEO's availability) rather than waiting to route it through CEO.

### CEO: still silent, ~1hr+ now, no material change since last checkpoint's escalation

No new push, no reply. Already surfaced directly to the founder last checkpoint — not repeating
the same escalation at the same intensity without new information. If it resurfaces active,
will note; if the silence stretches meaningfully longer (not just this one more tick), worth a
second, more direct flag.

### Steady progress elsewhere, unaffected

S5A's 18-record image backfill, S6's photo-sourcing pass, S7's QA-corrected 29 production-ready
records, S8's active review work — none of this depends on CEO being reachable right now.

### Unchanged: 5-row fix, live-harm rows

All 5 rows re-verified: unchanged.

### Reallocation

None forced.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO's direct founder
   confirmation, and now also on CEO's session being reachable.
2. New: S5B's 8-record miscategorization + 2 pre-existing duplicate pairs (UCSB, Iowa SSTP) —
   real, evidence-ready fixes waiting on the same promotion path as everything else this week.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. Opportunity-photo schema gap — not urgent; S5A/S6 producing verified candidates regardless.

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
`origin`, 2026-08-27 ~00:05.
