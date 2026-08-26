# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only. Cross-reference: `GAP_MAP.md` (coverage/content state, maintained by CEO)
and `CONTROL_TOWER_REPORT_*.md` (CEO's own consolidated fleet report). On a 5-minute recurring
check (`/loop`, per founder instruction).

## Checkpoint 6 — 2026-08-26, freeze day 1, ~11:35 (T+~2h25min from fleet dispatch)

### Still open: 5-row fix, correctly gated on CEO's own direct founder confirmation

Unchanged again this tick — all 5 rows still exactly as wrong, `updated_at` unchanged. Correctly
tracked as *pending*, not *authorized*: CEO is right that a peer-relayed authorization claim
(mine, last checkpoint) isn't the same as first-hand confirmation, and is asking the founder
directly in CEO's own conversation before writing anything. Not a stall — the system correctly
refusing to cascade an unverified claim into a production write. Watching for CEO's own
confirmation, next tick or the one after.

### New this tick: a second genuinely-zero infrastructure gap, confirmed directly

CEO's S6 closeout surfaced that **0 of 69 competition records have any image**, and asked
whether this is fleet-wide. Checked myself: `opportunities` has no image-adjacent column and no
EAV-sibling table (unlike `universities`, which had a hidden `university_profile_metrics` table
nobody's schema-grep caught). **This one really is a cold start — confirmed, not assumed** — all
~421 rows, not just S6's 69. CEO has assigned S6 (freed up after closing their lane) to a bounded
photo-sourcing pass on their own 69 records, reusing domain context rather than starting a fresh
lane cold. Reasonable allocation; not something I'd change.

### S8 status resolved: not blocked, was mid-pass — and a real routing gap found and fixed

31 minutes without a push looked worth a check; turned out S8 was deep in a live fact-
verification pass on S7's 41 `VERIFIED`-tier records (re-fetching every official source), on top
of having already resolved all 8 of S7's previously-blocked URLs and caught 2 real content errors
(both already fixed on S7's branch). **Real finding: S8 had only received a handoff from S7 —
nothing routed from S5 or S6**, and was about to spend time searching for their branches/files
rather than being told directly. Sent S8 the exact branch names and file paths for S5A/S5B/S6
just now — a small thing, but avoided a duplicate-search cost across two sessions doing the same
lookup independently. Exactly the kind of routing gap this role exists to catch before it costs
real time, not just a nice-to-have.

### S6 full closeout detail (69 records, depth over volume, stopped at genuine saturation)

**12 self-graded production-ready**, 45 verified, 6 ready-for-review, 2 candidate, 2 rejected, 2
blocked. Deliberately stopped short of a nominal ~180 share since competition is already 24% of
the corpus alone — evidenced, not a shortfall. Key finds beyond the TÜBİTAK gap (checkpoint 4):
**GençBizz** — a real, 26-edition, government-protocol, 81-province Turkish entrepreneurship
competition — existed nowhere in the prior corpus until this pass found it via Turkish-language
search. A **second instance of the affiliation-inflation pattern** (UniHive, after Blackstone) —
CEO flagged this as worth a dedicated cross-category sweep later, agree that's right, not
something to fix ad hoc per-instance. Two known live defects re-confirmed but still unfixed
(Stockholm Water Prize wrong-entity, flagged 3 days ago; FRC/FIRST Robotics likely-duplicate
pair) — both blocked on the same write-authority question as the 5-row item, not new research
gaps.

### Real throughput this tick

S5A: +1 batch (5 more gap-closure records). S5B, S6, S7: no new pushes since last tick (S6
because it's closed; S5B/S7 plausibly mid-batch). CEO: +1 substantive push (S6 closeout + new
gap). No new opportunities/universities baseline movement (421 total unchanged, as expected —
no production writes from any lane yet).

### Backlog read

Verification backlog (S8's real workload) is now precisely scoped rather than a vague concern:
S7's 41 VERIFIED records mid-review, S6's 69 closed records now formally handed off, S5A/S5B's
combined ~5 batches still unrouted until S8 picks them up from the paths just sent. This is a
real, sizeable queue — worth watching whether S8 needs a second reviewer rather than working
through it alone, but not calling for that yet; one tick of data isn't a trend.

### Reallocation

S6 → opportunity-photo sourcing (CEO's call, already made, agree with it). Otherwise none forced.

### Open items

1. 5-row fix — pending CEO's direct founder confirmation. Tracking every tick.
2. Stockholm Water Prize (wrong-entity) + FRC/FIRST duplicate pair — same write-authority
   blocker as #1, not separate research gaps. Worth bundling into the same founder decision
   rather than three separate asks.
3. `turkey_student_access` / `selectivity_evidence` still have no live columns.
4. Opportunity-photo schema — same shape as the university-photo schema gap (checkpoint 3):
   research/verify now, production promotion needs a migration later. Not urgent tonight.

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
`origin`, 2026-08-26 ~11:35.
