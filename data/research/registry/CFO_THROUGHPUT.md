# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to. I do not research opportunity facts, source photos, alter
records, or override evidence — this file tracks fleet capacity and flags backlogs/
misallocations only. Cross-reference: `GAP_MAP.md` (coverage/content state, maintained by CEO)
and `CONTROL_TOWER_REPORT_*.md` (CEO's own consolidated fleet report) — read all three together,
not this one alone. On a 5-minute recurring check (`/loop`, per founder instruction).

## Checkpoint 5 — 2026-08-26, freeze day 1, ~11:20 (T+~2h10min from fleet dispatch)

### Correction, same tick: the 5-row fix is NOT "authorized, pending execution" — reverting my own record

CEO pushed back on my authorization-relay, correctly: a peer relaying "the founder told me X" is
not the same as the founder confirming X to the actual executor, no matter how confident the
relay or how many parties converge on it — the identical principle from the overnight-protocol
episode, applied consistently, including to me. CEO is right and I was wrong to log this as
"authorized" based on my own relay. CEO is now asking the founder directly, in CEO's own
conversation, for an unambiguous confirmation before writing anything. **Correct status: still
pending, direct-channel-only, not executed** — all 5 rows independently re-verified unchanged
again this tick. Not a stuck-agent problem; this is the system working correctly by refusing to
cascade an unverified authorization claim into a production write. Watching for CEO's own
direct confirmation, not mine.

### Closed this tick: `Claude.pdf`

Moved from the repo root to outside the working tree entirely (never opened by CFO or CEO).
Disposition based on S6's original characterization ("possibly a minor's personal data"),
relayed by CEO without independent verification and disclosed as such — moved rather than
deleted specifically because neither of us confirmed the content, so nothing is destroyed if
it turns out to matter. Founder had delegated this decision to CFO with CEO's input.

### Real progress since checkpoint 4

| Lane | What changed | Note |
|---|---|---|
| S1-S4 | No new pushes this tick | Consistent with doing full-shard semantic audits, which take longer than a quick pass — not a concern yet |
| S5A | +1 commit — batch 3: net-new discovery from seed PDFs (PROMYS Europe, UvA, St. Stephen's Rome) + a gap-closure fix | Still mixing new-discovery with gap-closure per CEO's directive |
| S5B | +1 commit — batch 2: 8 more mentored-research/internship candidates | Steady pace, ~2min old at last check |
| S6 | **Lane closed.** Final synthesis: 69 records total, cross-review complete. S6-A alone: 28 `PRODUCTION_READY` (2 net-new TÜBİTAK records, 6 Turkey-access enrichments on live olympiads, 3 net-new math-tournament finds, 17 corrections to already-live rows), stopped at genuine saturation of high-value gaps rather than chasing a nominal target | First lane to fully close this freeze — worth CEO/S8 prioritizing its final review given it's furthest along |
| S7 | +1 commit — **actively applying S8's QA corrections** (Blue Marble deadline framing, Foyle upgrade) | The review loop (S8 finds → S7 fixes) is working end-to-end, not just producing findings that sit unused |
| S8 | No new push in 26+ minutes | Not flagged as blocked — no blocker reported, consistent with a long audit pass (Track A/B were each substantial). Worth a direct check next tick if still silent |
| CEO | No new push since the authorization relay | See top item above |

### Backlog read

**Verification backlog is now visibly the real constraint, as checkpoint 4 anticipated.** S5A
(3 batches) + S5B (2 batches) + S6 (69, self-reviewed and closed) + S7 (continuing, now
incorporating fixes) have produced well over 100 combined candidates/corrections this session.
S8 has been silent for 26+ minutes — plausibly deep in a review pass rather than idle, but this
is exactly the ratio the CFO brief's "reduce discovery, redirect to verification" rule is about.
Not calling for reallocation yet (one silent tick isn't a pattern), but this is the first
checkpoint where the numbers would support it if S8 doesn't surface soon.

**Duplicate/near-miss backlog**: unchanged, 0 new duplicates. S6's closure explicitly resolved
one live duplicate-pair question (FRC Türkiye) along the way rather than leaving it open.

**Image backlog**: unchanged this tick (S1-S4 still auditing, no new push).

### Reallocation

**None forced yet.** S6 closing out is the first real signal of a lane finishing ahead of others
— worth CEO's attention for whether S6's freed capacity should shift to S8 (review backlog) or
S7 (still CEO's named highest-leverage category), but that's CEO's call per the standing model,
not mine to redirect unilaterally.

### Open items

1. 5-row fix: pending direct founder confirmation to CEO — not authorized until CEO has it
   first-hand. Tracking every tick.
2. S8 silence (26+ min, not yet a blocker) — watching, not escalating yet.
3. ~~`Claude.pdf`~~ — closed, moved outside the repo this tick.
4. `turkey_student_access` / `selectivity_evidence` still have no live columns.

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
select count(*) total, count(*) filter (where status='active') active,
  count(*) filter (where verification_state='verified_current') verified_current,
  count(*) filter (where eligible_countries is not null and array_length(eligible_countries,1)>0) has_eligible_countries,
  count(*) filter (where deadline is not null) has_deadline
from opportunities;

select id, title, cycle_status, deadline, cost, updated_at from opportunities
where id in ('973b3bdd-59c2-4e99-a76b-2006b365d63a','2f0e0301-5dd4-4d25-91a4-8f73bf5584e9',
  'd780bc55-41e0-444b-8bcc-3f927b28c4b7','8a7c89e4-e63a-4f64-a76d-4bae1b31e889',
  '960dcf4d-322c-4e72-8c99-0a1d3368b2ea');
```
Run against `qtcvcflzxbuagvvwahhu` via `execute_sql`, and `git fetch`/branch diff against
`origin`, 2026-08-26 ~11:20.
