# Staleness audit — already-populated `deadline` values

Requested by the coordination session, following its own re-framing of this session's earlier
adjacent finding (some *populated* deadlines are stale too, not just the null ones — a
student can act on a wrong date, which is worse than not acting on a missing one). Scope:
every live `opportunities` row with a non-null `deadline` (52 as of this audit, up from the
46 measured before Part 1's write added 6 more).

## Method

Pulled all 52 rows fresh (id/title/org/url/category/country/deadline/cycle_status/
current_cycle_label/verification_state). For each, checked internal logical consistency —
does `cycle_status` correctly reflect whether `deadline` (2026-08-21 as the reference date)
has passed? Then spot-verified the two *oldest* deadlines (highest risk of a silently-missed
newer cycle, since the most time has passed since they'd have been researched) by directly
fetching the official page again, checking specifically for a posted 2027 cycle that an
older cycle_status label might not reflect.

## Finding 1 (the main one): the feared pattern mostly didn't materialize

Of 52 rows, **28 have a deadline already in the past relative to today**. All 28 correctly
carry `cycle_status: closed` or `historical` — **zero rows found showing a passed deadline
as `open`/`upcoming`**, which would be the dangerous case (a student acting on a date that's
already gone). This is genuinely good news about this data's existing discipline, not a
report of nothing found — the earlier "87.5% null" framing raised a real worry that turned
out, on this audit, not to be the shape of the actual defect here.

**Spot-verified the two oldest** (Boston University Tanglewood Institute, deadline
2026-01-25; Wharton Global Youth "Future of the Business World," deadline 2026-01-28) against
their official pages directly:
- BUTI: fetch failed (connection error) — not independently re-confirmed this pass.
- Wharton FBW: **confirmed** — official page still shows only 2026 cycle information
  ("Priority deadline: January 28, 2026... Final deadline: Rolling admission"), no 2027 cycle
  posted. The existing `historical` label and stored deadline remain accurate; nothing was
  silently missed.
- Carnegie Mellon SAMS (deadline 2026-02-01, third-oldest): also spot-verified — official
  page still shows only the 2026 cycle (Feb 1 deadline, June 20-Aug 1 2026 dates). Existing
  `closed` label remains accurate.

No evidence of the "STALE_SUPERSEDED" case (old date shown, newer one already posted and
missed) in the sample checked. A full re-verification of all 28 would be needed to rule this
out completely, but the oldest-and-highest-risk ones checked out clean.

## Finding 2 (unplanned, higher-value than expected): two likely duplicate pairs

Not what this audit set out to find, but surfaced directly by sorting all populated-deadline
rows together:

1. **"Conrad Challenge (Space Center Houston)"** (`1f7b2e52-...`, category `competition`,
   `official_url: conrad.spacecenter.org`, deadline 2026-10-29) vs **"Conrad Challenge"**
   (`ac53340c-...`, category `entrepreneurship`, `official_url: conradchallenge.org`,
   deadline 2026-10-30, `verification_state: unverified`). One day apart on deadline was the
   first flag; **confirmed via WebSearch** ("Space Center Houston Partners with Conrad
   Foundation's Conrad Challenge") that these are officially partnered, not independent
   competitions — Space Center Houston hosts/co-presents the Conrad Foundation's own Conrad
   Challenge. Very likely the same real-world competition, live as two rows.
2. **"Diamond Challenge"** (`cb1ae3e2-...`, category `entrepreneurship`, deadline
   2027-01-14) vs **"The Diamond Challenge"** (`30a605ab-...`, category `competition`,
   deadline 2027-01-14 — *identical* date). Same organizer (Horn Entrepreneurship, University
   of Delaware) on both rows, both official-looking `diamondchallenge.org` URLs (bare
   homepage vs. `/competition/` subpage). Near-certain duplicate.

**Not merged or deleted here** — per this repo's own established entity discipline (never
fuzzy-match/auto-merge, flag and queue for human/DATA-A review instead), both pairs are
flagged, not touched. Whoever resolves them should decide which row is more complete/
authoritative and retire the other via the proper dedup path (`lib/opportunities/dedup.ts`
conventions), not a manual delete.

## Finding 3 (minor): a few `current_cycle_label` gaps

Three rows have `cycle_status` correctly set but `current_cycle_label: null` (DNA Day Essay
Contest, Waterloo Mathematics and Computing Contests, Conrad Challenge/Space Center Houston)
— not wrong, just thinner context than the rest of the table. Low-priority enrichment
opportunity, not a correctness issue; no remediation SQL generated for these since there's
nothing to correct, only to add.

## Remediation batch

Unlike Part 1, **this audit did not surface false/misleading data requiring an UPDATE** — the
existing `deadline`/`cycle_status` pairs checked out as accurate everywhere this pass looked.
No dry-run SQL is included for that reason; forcing a batch to exist when the honest finding
is "this data is already correct" would be exactly the kind of manufactured-volume this whole
campaign has tried to avoid. The two duplicate-pair flags above are this audit's actual
actionable output, queued for human/DATA-A review rather than an automated fix.

## What a fuller pass would still need

- Re-verify the other 26 past-deadline rows the same way (only the 2 oldest were directly
  spot-checked this pass) to fully rule out STALE_SUPERSEDED elsewhere in the set.
- Re-attempt BUTI's page (connection failure, not yet re-confirmed).
- Investigate whether other categories (not just Conrad/Diamond) have similar partner-domain
  duplicate patterns — this was found by chance via deadline-proximity, not a systematic
  duplicate sweep.
