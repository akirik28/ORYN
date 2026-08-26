# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`). I do not research opportunity facts, source photos, alter records, or override
evidence — this file tracks fleet capacity and flags backlogs/misallocations only.
Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and `CONTROL_TOWER_REPORT_*.md`
(CEO's consolidated fleet report). On a 5-minute recurring check (`/loop`, per founder
instruction).

## Checkpoint 18 — 2026-08-27, ~00:25

### All four photo shards (S1-S4) confirmed active, not stalled

All replied to this tick's direct check with substantial, high-quality output — the 2-hour git
silence was genuinely long visual-audit work (per-university image download-and-view, not a
quick metadata check), same shape as S8's earlier false alarm. S3: sub-agents at 96/126 and
77/127, both healthy, no blockers.

**The finding, now backed by three independent samples totaling ~263 records**: the existing
pipeline's own "already accepted" bucket (`official`/`wikimedia_verified`/`verified` status) has
a real, consistent false-accept rate — **S1: 12/82 (14.6%)**, **S4-B: ~13/88 (~14.8%)**, **S2-B:
11/93 (~11.8%)**. Three shards, no coordination between their sampling, landing within 3
percentage points of each other. This is no longer "a few anecdotal defects" (checkpoint 3's
n=3) — it's a measured, real property of the pre-existing pipeline: roughly **one in eight to
one in seven "accepted" university photos is actually wrong** (wordmark/crest mistaken for a
photo, wrong building, generic stock image). Concrete examples this round: University of Utah's
campus photo is the Utah State Capitol; University at Buffalo's was a plain wordmark; Turku's was
a torch/wing crest; VU Amsterdam's was a field-hockey photo. Relayed the converged rate to all
four photo shards for calibration. Extrapolated (not verified, flagging the difference): if this
holds fleet-wide across the full 721 "accepted" university photos, that's roughly 85-105
universities whose current photo needs real replacement — a planning number, not a claim.

**S2 also modeled good discipline worth naming**: spot-checked their own sub-agent's actual
output file rather than trusting its self-report (especially given a safety-classifier outage
mid-run affected other sessions too, not just mine) — found it structurally clean and content
correct on inspection, not just self-reported as such.

### Cross-lane propagation working as designed

- **Wikimedia rate-limiting**: S2 found direct `curl` to `upload.wikimedia.org` hitting 429s
  (plausibly shared egress IP across the fleet), `WebFetch` works around it — relayed to S1/S3/
  S4 immediately rather than letting each shard independently re-diagnose it.
- **GençBizz vs. GençBizzTech**: S6 ran the dedup-blind-spot check I relayed, found a real
  near-miss, and correctly did *not* assume duplicate from field comparison alone (different
  domain, different sponsor framing) — routed to the sub-agent with actual page context to
  verify directly. Exactly the "flag, don't guess" discipline this operation has held all day.
- **S5 verified before acting**: checked S5B's actual commit directly rather than trusting my
  relay at face value, confirmed it, and is now running the same full-table check on S5A's own
  3 genuinely-new candidates.

### CEO: still silent, ~1h10min now — no new escalation, nothing has changed

### Unchanged: 5-row fix, live-harm rows

All 5 rows re-verified: unchanged.

### Reallocation

None forced — every checked lane is productively utilized.

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO, ~1h10min unreachable.
2. GençBizz/GençBizzTech — awaiting S6-B's direct-page verification.
3. S5A's 3 candidates — awaiting full-table dedup re-check.
4. `turkey_student_access` / `selectivity_evidence` still have no live columns.
5. The ~12-15% university-photo false-accept rate is now well-evidenced — worth CEO/DATA seeing
   this specific triangulated number (not just "some defects exist") once reachable, since it's
   a real sizing input for planning the eventual promotion pass.

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
`origin`, 2026-08-27 ~00:25.
