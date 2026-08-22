# Data batch — opportunity cycle-status lifecycle corrections

Applied 2026-08-22 to `qtcvcflzxbuagvvwahhu` via the Supabase MCP tool (`execute_sql`), under
explicit coordinator authorization for this specific operation (opportunities-verification
lane). Two parts: (A) confirmation that the originally-proposed 6-row correction batch had
already landed by the time this lane re-checked it, and (B) new writes for 6 stale-titled rows
plus one duplicate, none of which had been touched yet.

## Part A — the original 6-row correction batch: already applied, re-verified here

Re-read immediately before this batch (2026-08-22) found 5 of 6 already corrected — most
likely by the coordinator or a parallel lane acting on the same proposal before this lane's
authorization message arrived. Confirmed via direct query, not assumed:

| Row | Proposed | Found on re-read | Verdict |
|---|---|---|---|
| DNA Day Essay Contest (`d3dc512f`) | deadline → 2026-03-04 | deadline = 2026-03-04, cycle_status='historical' | Applied, matches proposal |
| Wharton FBW (`99acaf0b`) | null or re-research the deadline | deadline unchanged (2026-01-28) but cycle_status='historical' with a detailed current_cycle_label explaining it's a scholarship-priority date on a since-concluded rolling cycle | Applied, better than the original proposal (annotates the ambiguity instead of guessing a replacement number) |
| Penn Medicine Summer Program (`511a9497`) | deadline → 2026-06-01 | deadline = 2026-06-01, cycle_status='historical', detailed label | Applied, matches proposal |
| LaunchX (`50392e5e`) | deadline → 2026-11-12 | deadline = 2026-11-12, cycle_status='closed' | Applied, matches proposal (current_cycle_label text says "2027 dates not yet posted" alongside a concrete Nov 2026 date — a minor phrasing inconsistency worth a look, not a factual error) |
| Stanford SASI (`2f842782`) | cycle_status 'upcoming' → 'closed' | cycle_status = 'closed' | Applied, matches proposal |

**Stanford ULO (`54e6953d`) — re-investigated, no correction needed.** The original flag was a
false alarm: a closer refetch of ulo.stanford.edu/dates-and-tuition-ulo shows the program
publishes *multiple* term deadlines on one page (Spring: Jan 5 2026, Summer: May 11 2026, Fall
general: Jul 27 2026, Fall financial-aid: Jul 13 2026) — the stored 2026-07-27 is the genuine,
correctly-sourced Fall-term general-applicant deadline, not a mismatched date. It has since
passed (today's reference date is 2026-08-22), and cycle_status is already 'closed', which is
correct. No write made for this row.

## Part B — 6 stale-titled rows + 1 duplicate, not yet touched: applied in this batch

Found by a parallel audit lane: 6 `active`, `cycle_status='unverified'` rows carry a specific
past year directly in their own title (the evidence of closure is the title itself, not an
inferred parser rule — per the coordinator's explicit instruction, each was checked
individually with its own source evidence, no year-parsing logic was written).

**Before state** (all 6): `status='active'`, `cycle_status='unverified'`, `deadline=null`.

1. **Edinburgh Summer School 2024** (`dc762fce-b83a-4217-a610-290ac2f65f17`)
   → `cycle_status='historical'`. Live page (study.ed.ac.uk/summer-school) has moved on to
   three 2026 programmes (Pre-University Summer School, deadline 19 May 2026; SUISS, deadline
   24 Apr 2026; Sutton Trust Summer School, deadline 5 Mar 2026) — all three already passed as
   of this check, and the row's own "2024" title is two cohorts further stale than even those.

2. **Summer at Stanford Program for High School 2025** (`ccd1cf71-219d-4ee2-b6c3-47903972f7cf`)
   → `cycle_status='historical'`. Live page (summer.stanford.edu/students/high-school) states
   the 8-week program runs "June 20–August 16, 2026" — already concluded as of today
   (2026-08-22).

3. **Summer Programs in the Netherlands - 2025** (`b10444c7-6c36-463c-b240-3b48025a74b6`)
   → `cycle_status='historical'`. Underlying source (summerschoolsineurope.eu) is a rolling
   aggregator directory, not a single program page — it now lists 2026–2027 courses, so this
   row's 2025-dated capture no longer reflects the directory's current contents.

4. **Summer Science Research Program (SSRP) 2023** (`a29d4ef0-735f-4281-b486-51c1450077eb`)
   → `status='disabled'` (duplicate, not a cycle_status fix). Shares `official_url`
   (rockefeller.edu/outreach/ssrp/) with row 5 below — same programme, two cards. This one
   carries the stale title (three years old); the other carries the correct institutional
   name. Disabled per the existing dedup convention (see
   `2026-08-20-status-consistency-and-dedup.md`): loser disabled, canonical row kept.

5. **The Rockefeller University Summer Science Research Program (SSRP)**
   (`2bbea7da-09bb-4eca-b46b-c3b5363e3b92`, canonical, kept `active`)
   → `cycle_status='closed'`, `deadline='2026-01-02'`. Live page confirms: "Applications for
   SSRP 2026 are closed." SSRP 2026 cohort runs June 22–August 6, 2026; applications were due
   Friday, January 2, 2026, recommendation letters due January 5.

6. **UCL The Bartlett Summer Schools 2025** (`eaabbbee-17f6-4142-b9b4-a49bfa87fa7b`)
   → `cycle_status='historical'`. Live page (whose own URL already reads "...-2026") states
   "All of our Summer School places for July and August 2026 are now sold out and waiting
   lists are full" — the 2026 season is fully concluded, and the row's "2025" title is one
   cohort further stale than that.

7. **USC Summer Programs 2025 Info Sessions** (`7dabbd20-f678-49a3-9cae-5d6e0eb5fbde`)
   → `cycle_status='historical'`. Live page could not be independently re-verified from this
   environment (blocked by Cloudflare bot protection, confirmed via both WebFetch and a direct
   curl attempt). This decision rests on the row's own title committing to a specific past-year
   cohort (2025, versus today's 2026-08-22), not a fresh live re-check — noted here rather than
   silently treated as equally strong evidence to rows 1–6.

**After state:** rows 1–3, 6, 7 → `cycle_status='historical'` (unverified → historical), each
with a `current_cycle_label` recording the source evidence above. Row 4 → `status='disabled'`.
Row 5 → `cycle_status='closed'`, `deadline='2026-01-02'`, enriched `current_cycle_label`.
`last_verified_at` set to the time of this batch for rows 1, 2, 3, 5, 6, 7 (not row 4, a
moderation action rather than a content re-verification).

No new detection heuristic was built for "year in title" — each of the 7 rows was resolved
individually against its own source, per the explicit instruction not to build a title-year
parser (a program whose title legitimately contains a year would eventually be mislabeled by
one).
