# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only. Cross-reference: `GAP_MAP.md` (coverage/content state, maintained by CEO)
and `CONTROL_TOWER_REPORT_*.md` (CEO's own consolidated fleet report) — read all three together,
not this one alone. Now on a 5-minute recurring check (`/loop`, per founder instruction), not
just event-driven check-ins.

## Checkpoint 4 — 2026-08-26, freeze day 1, ~11:10 (T+~2h from fleet dispatch)

**First checkpoint with real throughput to report.** Every S-lane has now pushed at least one
substantive batch. Numbers below are read directly from each lane's own pushed commits/files
(git diff against `origin/main`), not self-reported chat summaries.

### Most urgent item this checkpoint: 5 live rows still showing wrong data to real students, unfixed

Independently re-verified directly against the DB, right now: **İTÜ Lise Yaz Okulu**
(`973b3bdd…`, wrong `cycle_status`), **Özyeğin Summer Research** (`2f0e0301…`, `cycle_status`
self-contradicts its own description), **Istanbul Bilgi Summer School** (`d780bc55…`, deadline
14+ months stale), **InvestIN** (`8a7c89e4…`, `cost=null` on a confirmed-paid program), **THIMUN**
(`960dcf4d…`, `cost=null` when a live page quotes €340+/person) — all `status='active'`,
`verification_state='verified_current'` (the actual recommendation-reaching set, not just
Browse), all `updated_at` from **before today** (2026-08-21 to 2026-08-23), confirming none has
been touched since S8 found them. Found by S8's Track A audit, each value re-confirmed against a
live official source today. Flagged to CEO with exact IDs and an offer to hand over ready-to-run
UPDATE statements. This is not a research gap — it's a known-correct fix blocked purely on
write-authority (contract reserves `opportunities*` writes to CEO/DATA). Watching for
resolution; will escalate to the founder directly if still unfixed by the next checkpoint or two.

### Real throughput, by lane (first batches, all still dry-run/proposal per contract — no
production writes from any S1-S8 worker)

| Lane | Output this session | Headline finding |
|---|---|---|
| S1 | Shard 1-253: recon complete, corrected fleet gap-map premise, converged on S4's `--range` tool | — |
| S2 | Shard 254-506: recon complete, self-corrected an independent-formula boundary error | Root cause of the S1/S2 near-collision (Finding B, checkpoint 3) |
| S3 | Shard 507-759: **3 confirmed image-defect instances** (Bristol crest, Stanford generic crowd, a color-graded wrong-building photo) | Triggered Finding A (checkpoint 3) — "accepted" ≠ compliant |
| S4 | Shard 760-1010: authored the shared `--range` flag now used fleet-wide; running a structural audit across all 1,010 | Shared tooling adopted by S1-S3 |
| S5A | 2 batches, ~20 `summer_program` gap-closure records (deadline/eligibility/cost completion on already-live rows, per CEO's depth-over-volume directive) | On-directive: closing gaps, not padding volume |
| S5B | 1 batch, 12 mentored-research/internship candidates | — |
| S6 | ~70 claim-log entries (S6-A 37, S6-B 33) across 8+ pushed files. **Headline finding: TÜBİTAK 2204-A and 2202 — the actual national on-ramp for the 6 already-live international olympiad rows (IMO/IBO/IChO/IPhO/IOI/IOAI) — are completely absent from production.** A Turkish student today sees the destinations with no visible path there. 2 net-new + 6 Turkey-access enrichments produced, cycle correctly recorded as closed/not-yet-announced (not guessed) | Real completeness gap in the corpus's most Türkiye-relevant competition family |
| S7 | **67 accepted / 75 rejected**, consolidated by CEO across 4 sub-lanes (scholarships/journals/essay venues, leadership/social-impact, year-round/online/Türkiye-based). Correctly distinguishes `VERIFIED` (direct official fetch) from `CANDIDATE` (real but fetch-blocked, e.g. bot-protection) — 0 self-assigned `PRODUCTION_READY`, deferring that call to second review as instructed | Rigorous under real tool-budget constraints (WebSearch quota hit, handled by stopping cleanly rather than padding) |
| S8 | Track A: 38 rows audited, **17 PRODUCTION_READY / 11 VERIFIED / 10 REJECTED** (5 of the 10 on live harm-surface rows, see above). Track B: **0 of 194 "official"-sourced university images have any captured usage right — confirmed by a control check, not a query bug.** New generalization of Finding A: `status='official'` is *also* not a reliable quality signal (3-4 of 7 sampled are a flat logo/crest, not a real photo) — the defect isn't confined to `wikimedia_verified` | Two structural findings, not just per-row QA |
| CEO | Consolidated checkpoint-1 Control Tower Report, corrected harm-surface count 7→5 after re-verification, flagged Marshall Society's 4-day deadline separately | Same rigor pattern (re-verify before finalizing a founder-bound number) as S8's own self-correction this round |

### Backlog read — the first real one, not "too early"

**Verification backlog is now the visible bottleneck, and this is expected, not a problem yet.**
S5A+S5B+S6+S7 combined have produced on the order of 100+ new accepted candidates this session;
S8's Track A/B numbers above are from auditing the *pre-existing* corpus (S8 started before any
S1-S7 output existed, correctly used the wait productively) — **today's new output has not yet
had any second review.** S8's own plan already anticipated pivoting to this once real S1-S7
output existed, which it now does — flagging as confirmation the timing is right, not as a
criticism. Watch next checkpoint: does S8's throughput on *new* candidates keep pace with S5-S7's
combined input rate, or does the gap widen. If it widens, that's the first real case for
reallocating idle capacity toward review per the CFO brief's own "reduce discovery, redirect to
verification" rule — not yet, but close.

**Image backlog**: unchanged in count (721 pipeline-accepted / 109 no-candidate / 180
needs_review out of 1,010), but its *meaning* has changed twice this session — first from "0
done" to "721 done" (wrong), now to "721 unverified, real defect rate confirmed non-trivial via
3+ independent sample failures across two different status categories" (accurate). S1-S4 are
correctly now doing full-shard semantic audits, not fast re-confirms.

**Duplicate/near-miss backlog**: 2 real near-misses caught and resolved before they became actual
duplicate work (S1/S2 boundary math, S3's own boundary), plus a 3rd pocket of prior uncommitted
research (`leadership_batch*`/`thincat_*`/`discovery_*`) found by S7 beyond the two already known
(`cr1_*`/`summer_*`). Zero actual duplicate *records* reported yet.

**QA backlog**: see above — 0 of today's new output reviewed yet, expected to be the first real
number worth watching.

### Roster — unchanged from checkpoint 3, all 9 shards + CEO active, none blocked >30min

Full detail in checkpoint 3 (preserved in git history, `eb2f590`/`c933773`) — not re-listing
identical role/branch info here to keep this checkpoint focused on what changed.

### Reallocation

**Still none forced.** Everyone is producing real output on-mission. The one thing worth a
founder/CEO decision, not mine to make: whether the 5 live-harm-surface rows get fixed now
(cheap, evidenced, ready) or wait for a batch with more findings — I'd lean toward now, given
real students are affected, but this is explicitly outside CFO's remit (no production writes,
no overriding CEO's prioritization).

### Open items

1. Live-harm-surface fix — tracking until resolved (see above).
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. `Claude.pdf` privacy item — escalated to the founder directly (see checkpoint 3 detail),
   founder's call, not re-raising unless it changes state.

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
select id, title, status, verification_state, cycle_status, deadline, cost, updated_at
from opportunities where id in ('973b3bdd-59c2-4e99-a76b-2006b365d63a',
  '2f0e0301-5dd4-4d25-91a4-8f73bf5584e9','d780bc55-41e0-444b-8bcc-3f927b28c4b7',
  '8a7c89e4-e63a-4f64-a76d-4bae1b31e889','960dcf4d-322c-4e72-8c99-0a1d3368b2ea');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/`git diff --stat` against
`origin`, 2026-08-26 ~10:45-11:10.
