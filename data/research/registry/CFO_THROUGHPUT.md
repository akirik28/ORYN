# ORYN Research Freeze — CFO Throughput Checkpoint

**Maintained by: CFO (S10, capacity/throughput/bottleneck control).** Rewritten in place at
each checkpoint, not appended to — prior checkpoints live in this file's own git history
(`git log -p -- data/research/registry/CFO_THROUGHPUT.md` on `oryn/research-freeze-cfo-
throughput`), never stacked below in the live file. I do not research opportunity facts, source
photos, alter records, or override evidence — this file tracks fleet capacity and flags
backlogs/misallocations only. Cross-reference: `GAP_MAP.md` (CEO's coverage/content state) and
`CONTROL_TOWER_REPORT_*.md` (CEO's consolidated fleet report). On a 5-minute recurring check
(`/loop`, per founder instruction).

## Checkpoint 13 — 2026-08-26, freeze day 1, ~13:00 (T+~3h50min from fleet dispatch)

### S8's long-running pass finished — high-quality real output, exactly the review loop working

The 41-record subagent from checkpoints 11-12 returned. Full independent re-verification of
S7's 67-record Wave 1: **29 PRODUCTION_READY, 21 VERIFIED, 3 REJECTED, 0 BLOCKED** (of 53
actually checked this pass — 41/41 VERIFIED-tier plus a 12-record CANDIDATE sample). Method
held to standard throughout: live re-fetch of the official source for every record, no
file-content-only passes.

**The 3 rejections are worth knowing about, not just counting**: The Curieux Review's own
peer-review claim was reversed (record said the venue avoids "peer review" language; the live
page uses the phrase twice — narrow fix, one field). Türkiye Öğrenci Meclisi appears genuinely
defunct — its founding 2004 directive was repealed in 2019 per two independent Turkish news
sources, and its last remaining regulatory hook was repealed 28 July 2026, one month before this
research, independently confirmed via direct browser render of the primary notice. S8 flagged
provincial-successor uncertainty honestly rather than guessing either way. Blue Marble Review
(pre-flagged, included for tally completeness).

**A real, generalizable pattern, not just three isolated misses**: 4 of the 41 VERIFIED records
(~10%) had a materially wrong or conflated `cost`/`cost_notes` figure while every other field
checked out — Concord Review's print price sourcing was backwards, John Locke conflated two
different fees (a $10 late-*registration* fee vs. a £25/£75 extension fee), Polyphony Lit
overclaimed "all submissions free" when three seasonal contests charge past 200 entries. Worth
S7/S8 treating `cost` fields as a standing extra-scrutiny category going forward, not something
for me to re-litigate here — already in S8's own published report for the fleet to act on.

Since none of S7's 67 records are live/production yet (contract: dry-run only), this is the
system catching real defects before they could ever reach a student, not a live-harm item —
noting it as a quality-loop success, not escalating.

### Also active this tick: S6-B started the opportunity-photo pass CEO assigned

Checkpoint 1: 4 verified photos + 4 confirmed no-candidate, on their own 69 records. Reasonable
early pace for a cold-start category.

### Unchanged: 5-row fix, CEO silence, live-harm rows

All 5 rows re-verified again: unchanged. CEO: still no reply to either status-check nudge
(~40 minutes and ~20 minutes respectively) — not pinging a third time with nothing new to add,
per checkpoint 12's own reasoning. Continuing to note the pattern for founder visibility rather
than repeat the ask.

### Reallocation

None forced. Fleet capacity looks well-utilized this tick: two research lanes producing
(S5A/S5B), one closed-but-active-on-photos (S6), one closed-and-under-QA (S7), QA itself
productive (S8), university-photo lanes presumably still auditing (S1-S4, no new pushes but no
stated blockers either).

### Open items

1. 5-row fix + Stockholm Water Prize + FRC/FIRST duplicate — pending CEO's direct founder
   confirmation, unchanged.
2. `turkey_student_access` / `selectivity_evidence` still have no live columns.
3. Opportunity-photo schema gap — not urgent tonight, S6 already producing verified candidates
   against it regardless of the schema question.

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
`origin`, 2026-08-26 ~13:00.
