# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`), not stacked below. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only. Cross-reference: `GAP_MAP.md` (coverage/content state, maintained by CEO)
and `CONTROL_TOWER_REPORT_*.md` (CEO's own consolidated fleet report). On a 5-minute recurring
check (`/loop`, per founder instruction).

## Checkpoint 10 — 2026-08-26, freeze day 1, ~12:30 (T+~3h20min from fleet dispatch)

**A second full lane closed: S7 done, 77 reviewed records, 0 cross-lane duplicates.** Pushed
20 seconds before this tick's fetch. Final accounting: 47 VERIFIED+Turkey-access-resolved ready
for S8's sign-off, 30 CANDIDATE/UNCLEAR, 112 rejected + 1 note. S7 explicitly did its own dedup
sweep against both the live DB and ~110 pre-existing uncommitted research files before starting
(listed by name in its claim doc) — no Wave 3 requested, considers itself complete pending S8.
S5A (+7) and S5B (+6, "two of the strongest finds" per their own commit message, not yet
independently reviewed by me — that's S8's job, not mine to pre-judge) both still producing at a
steady pace. Live-harm rows re-verified again: all 5 unchanged, still nothing from CEO on last
tick's nudge — holding off a second nudge for now (10 minutes since the first; my own stated
cadence is 15-20 minutes between follow-ups, not every tick).

### S8's real backlog is now two fully-closed lanes plus two in-progress ones

S6 (69, closed) and S7 (77, closed, 47 explicitly ready for sign-off) are both formally done and
waiting. S5A/S5B continue producing. **54 minutes since S8's last push** — close to, not yet at,
the hour-mark I set for myself as the next check-in trigger. Given two full lanes are now
stacked waiting on S8 specifically, this is worth watching closely next tick rather than treating
the hour-mark as an arbitrary line I won't move up if warranted — but not there yet, holding.

### Still open: 5-row fix — no new information

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
