# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`), not stacked below. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only. Cross-reference: `GAP_MAP.md` (coverage/content state, maintained by CEO)
and `CONTROL_TOWER_REPORT_*.md` (CEO's own consolidated fleet report). On a 5-minute recurring
check (`/loop`, per founder instruction).

## Checkpoint 7 — 2026-08-26, freeze day 1, ~11:50 (T+~2h40min from fleet dispatch)

**No new commits on any of the 10 tracked branches since checkpoint 6** (same 10 HEADs). Reading
as a genuine lull, not a stall: S8 is mid-verification on S7's 41-record pass (checked in 8
minutes before this tick, clear non-blocked answer — too soon to re-ping), CEO is waiting on the
founder's own direct response on the 5-row confirmation, S5A/S5B/S7 plausibly mid-batch. Live-
harm rows re-verified again: all 5 unchanged. Opportunities baseline unchanged (421, expected —
no lane has production write access). No new peer messages this tick.

### Still open, unchanged: 5-row fix, correctly gated on CEO's own direct founder confirmation

Correctly tracked as *pending*, not *authorized* — CEO is right that a peer-relayed authorization
claim (mine, checkpoint 5) isn't the same as first-hand confirmation, and is asking the founder
directly before writing anything. Not a stall; the system correctly refusing to cascade an
unverified claim into a production write.

### Confirmed checkpoint 6, still current: opportunity-photo infrastructure is genuinely zero

CEO's S6 closeout surfaced 0/69 competition records with any image; checked myself —
`opportunities` has no image-adjacent column and no EAV-sibling table (unlike `universities`,
which had a hidden `university_profile_metrics` table). Real cold start, confirmed not assumed,
fleet-wide (~421 rows). CEO assigned S6 (freed up after closing) to a bounded photo-sourcing
pass on their own 69 — reasonable, reusing domain context already built.

### Confirmed checkpoint 6, still current: S8 not blocked, real routing gap found and fixed

S8's 31-minute silence resolved as mid-pass, not stuck (live fact-verification on S7's 41
`VERIFIED` records, on top of resolving all 8 of S7's previously-blocked URLs and catching 2 real
content errors already fixed on S7's branch). Real finding: S8 had only received a handoff from
S7, nothing routed from S5/S6, and was about to spend time searching rather than being told
directly — sent exact branch/file paths, avoiding duplicate-search cost across two sessions.

### S6 full closeout detail (69 records, depth over volume, genuine saturation)

12 self-graded production-ready, 45 verified, 6 ready-for-review, 2 candidate, 2 rejected, 2
blocked — deliberately stopped short of a nominal ~180 share since competition is already 24% of
the corpus alone. Key finds: **GençBizz** (26-edition, government-protocol, 81-province Turkish
entrepreneurship competition, absent from the prior corpus entirely, found via Turkish-language
search) and a **second affiliation-inflation instance** (UniHive, after Blackstone — CEO flagged
for a later cross-category sweep, agreed). Two known live defects re-confirmed but still unfixed
(Stockholm Water Prize wrong-entity, FRC/FIRST duplicate pair) — same write-authority blocker as
the 5-row item, not new research gaps.

### Backlog read

S8's real workload is now precisely scoped: S7's 41 records mid-review, S6's 69 closed records
just handed off, S5A/S5B's combined batches still unrouted until S8 reaches them. A real,
sizeable queue — worth watching whether S8 needs a second reviewer, not calling for that yet on
one tick of data.

### Reallocation

S6 → opportunity-photo sourcing (CEO's call, agree). Otherwise none forced.

### Open items

1. 5-row fix — pending CEO's direct founder confirmation. Two consecutive stable ticks with no
   movement on this specifically; a third would be worth a direct nudge rather than passive
   waiting.
2. Stockholm Water Prize + FRC/FIRST duplicate pair — same write-authority blocker as #1, worth
   bundling into the same founder decision rather than three separate asks.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. Opportunity-photo schema — same shape as the university-photo gap: research/verify now,
   production promotion needs a migration later. Not urgent tonight.

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

select table_name, column_name from information_schema.columns
where table_schema='public' and (column_name ilike '%image%' or column_name ilike '%photo%');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-26 ~11:50.
