# Dutch numerus-fixus re-research, the CAO tag-script fix, and three closeout items

Branch `oryn/dutch-numerus-fixus-2026-09-01`. Four bundled items, per CEO's explicit
instruction to fold them into one branch: re-research the 8 Dutch numerus-fixus rows,
fix the CAO tagging regex and tag `IE-UCC-011`, check whether UCLA's stats genuinely fit
the calendar-bound-fact mechanism, and record that Stuttgart/Warwick need nothing further.
No model calls used anywhere in this branch — Browser-tool navigation and `curl` only,
per the standing "credits are thin" constraint.

## 1. The 8 Dutch rows — re-researched, 7 confirmed live, 1 blocked

All 8 are numerus-fixus (capped-admission) selection-procedure rows across 5 pilot
institutions: Delft (`DEL0020`), Erasmus (`ERA0015`), Tilburg (`TIL0045`), Amsterdam
(`UVA0047`/`UVA0048`/`UVA0044`), Groningen (`GRO0038`/`GRO0040`). All were tagged
`verification_state=verified_historical` / `evaluation_gate=historical` in task 8
(2026-08-31) because their text is bound to a specific application cycle's dates.

**What "re-research and bring current" turned out to mean.** Before visiting anything, I
checked the corpus's own `limitations`/`researcher_notes` fields for all 8 records, since
last time I assumed something was a new finding it wasn't (the "37 vs 38" CAO count, see
§2). Good thing I checked: the original 2026-08-21 researcher had already documented, for
every row, that it describes a closed cycle — including TU Delft's own "will be updated
in September 2026" banner and UvA's realized ranking-outcome figures (1934 applications,
482 last placed rank). None of that was new. What a live re-check could actually add was
narrower and more honest: **did anything change in the 11 days since, and is each source
still reachable?**

**Live result: 7 of 8 reachable, all 7 byte/mechanism-identical to the 2026-08-21
capture. Nothing has rolled over to the 2027-2028 cycle yet anywhere in this cluster.**
Checked by navigating live to each source URL (not WebFetch/WebSearch) and comparing
extracted text against the corpus verbatim:

- **Delft** — page still shows the same banner captured originally; still says the
  2027-2028 update is coming "in September 2026" (i.e., this month, not yet).
- **Erasmus** — byte-identical, including the source's own internally-inconsistent
  "12:00 AM CET (noon)" wording, reproduced again rather than silently corrected.
- **UvA (selection procedure + selection attempts)** — mechanism unchanged; the
  "Ranking update" outcome block is still stamped "Last modified on: 18 August 2026,"
  i.e. the same closed-cycle snapshot, not a newer one.
- **UvA (English proficiency)** — unchanged; had to read this one via
  `document.body.textContent` rather than `innerText` or the rendered page text, because
  the "1 April 2026" deadline lives inside a collapsed accordion panel that's DOM-present
  but CSS-hidden until clicked — the plain page-text extraction silently returns the
  accordion headers only. Worth remembering for any future re-check of this page.
- **Groningen (both programmes)** — both mechanisms unchanged; both pages still titled
  for the 2026/2027 cycle.
- **Tilburg** — **could not verify.** The page returns Cloudflare's "Just a moment..."
  interstitial in the browser, and a plain `curl` with a standard user-agent gets an
  HTTP 403. I did not attempt to defeat the bot-check — that's out of bounds regardless
  of who's asking. Tilburg's row is left exactly as it was on 2026-08-21: same
  `retrieved_at`, same content, not touched by this pass. Worth a retry from a different
  path later; it isn't a finding about the content, just about today's reachability.

**What I wrote, and why it's an UPDATE, not a new INSERT.** The standard pipeline
(`scripts/ingest-requirements-deadlines.ts`) only inserts new rows — it has no upsert
path. Feeding it 7 fresh records with byte-identical text to what's already live would
have created 7 duplicate rows on the university detail page, which is a worse outcome
than doing nothing. Instead:

1. `data/research/university-requirements/de_nl_requirements_refresh_2026-09-01.jsonl` —
   7 new dated corpus records (one per reachable row), each `supersedes`-linked to its
   2026-08-21 predecessor, each documenting today's live re-check in `researcher_notes`.
   This is the audit trail — it was never run through the insert pipeline.
2. `scripts/refresh-dutch-numerus-fixus-freshness.ts` (dry-run/`--apply`, kept in repo) —
   a small, purpose-built UPDATE script. For each of the 7 confirmation records, it
   re-fetches the live DB row by `research_record_id`, **requires the live
   `requirement_detail` to still match what this pass verified** (refuses and flags
   instead of overwriting if it doesn't — nothing drifted, all 7 passed), backs up the
   pre-image to `data/audit/`, then updates exactly three columns: `retrieved_at` (now
   `2026-09-01`), `last_checked_at` (now), and `research_record_id` (now points at the
   new confirmation record instead of the stale one). `verification_state` and
   `evaluation_gate` are untouched — still correctly `verified_historical`/`historical`,
   because the facts these rows describe are still about a closed cycle; a live
   re-confirmation doesn't make a concluded cycle current, it just makes "we checked and
   it's still accurate" honest and dated instead of 11 days stale.
3. Ran dry-run first (7/7 matched), then `--apply` (7/7 succeeded, 0 failures), then
   verified live via SQL: all 7 rows now show `retrieved_at=2026-09-01`, the new
   `research_record_id`s, `verification_state` unchanged. Tilburg confirmed untouched.

**Three genuinely uncaptured facts, noticed in passing, deliberately not added.** While
reading the live pages I found three numbers that aren't anywhere in the existing
Netherlands corpus (checked by grep across every `de_nl_*.jsonl` file, not assumed): UvA's
overall numerus-fixus capacity (600 places, plus a "register for 2 fixed-quota
programmes, accept only 1 offer" rule), Groningen Psychology's English-track capacity
(250 places), and Groningen International Business's capacity (550 places). These are
real and would strengthen the pilot's coverage, but adding them means writing new rows,
not refreshing existing ones, which is a different, larger task than "bring the 8 current."
Left as `researcher_notes` in the new corpus records, not implemented. Candidate for a
short follow-up pass, not urgent.

**A connection worth naming, not building.** Every one of these 5 institutions
republishes its numerus-fixus procedure annually and is temporarily "historical" between
cycles — structurally the same shape as `CAO_POINTS_IE`
(`lib/acquisition/verification.ts`), which this lane built for Ireland's CAO points two
tasks ago. I did NOT extend `calendar_bound_fact_class` to cover it here. Reason: that
mechanism needs a real, source-confirmed `AnnualCalendarWindow` date per institution, and
today I only have one — Delft's explicit "updated in September 2026." Erasmus, UvA, and
Groningen's pages give no equivalent self-stated republish month; assuming one from the
application-deadline pattern (roughly: new cycle content follows ~6-8 months after the
prior January deadline) would be a guess dressed up as a sourced fact, which is exactly
what this lane has spent tonight avoiding. If this is wanted, it's a small, separate,
explicitly-scoped research task — confirm each institution's actual republish timing
first, the same way Delft's was confirmed, not inferred.

## 2. CAO tagging regex — fixed, `IE-UCC-011` now tagged, real count is 39

The classification pass in task 8 (2026-08-31) found `IE-UCC-011` was a genuine CAO-points
row that `scripts/tag-cao-points-requirements.ts` had missed, because its own regex only
searched `requirement_text` and `limitations` — UCC-011 only mentions "CAO" in
`researcher_notes`. Fixed the script to search all three fields.

Re-running surfaced one more thing worth being upfront about: the fixed search found 50
candidate records (not 47), of which 46 text-matched and 7 were excluded as false
positives (up from 6) — the safety filter (`verification_state === 'verified_historical'`
required, not just a text match) caught a second false positive the same way it caught
the first six in task 7: `IE-GY-005`, a general eligibility floor that happens to mention
CAO/points/Round without being a competitive-outcome fact. Verified directly via SQL, not
assumed. **Net result: 2 genuine new tags, not 1** — `IE-UCC-011` plus one more. Applied
with `--apply`: 2/2 succeeded, 0 failures. Live-verified via SQL: total
`calendar_bound_fact_class='cao_points_ie'` rows is now **39**, and every one of the 39
sits inside `verification_state='verified_historical'` with zero leakage into
`verified_current`/`unverified` — the filter holds on the expanded search exactly as it
did on the original one. So: 37 → 39, not 37 → 38 as task 8 estimated by hand. The
undercount was in the original estimate, not in tonight's fix.

## 3. UCLA (`UCL0036`/`UCL0037`) — checked rigorously, does NOT fit calendar-bound

Task 8 surfaced UCLA's admit-rate/GPA statistics as a candidate second
`calendar_bound_fact_class` instance, on the reasoning that it's an annually-republished
institutional statistic, same shape as CAO points. Per CEO's explicit instruction — check
this the way the six false CAO matches were checked before tagging, not by analogy to
CAO — I read both full corpus records, then navigated live to
`admission.ucla.edu/apply/first-year/first-year-profile` and checked for the same
properties that make CAO genuinely calendar-bound.

**It doesn't hold up.** Three concrete differences from CAO, not a vibe:

1. **No stated refresh schedule.** CAO's August anchor is corroborated by 3 independent
   corpus citations of CAO's own published timeline. UCLA's page has no "this will be
   updated in [month]" statement anywhere — nothing to anchor an `AnnualCalendarWindow` to
   without guessing.
2. **The page is stale by its own standard, not just by ORYN's.** As of today
   (2026-09-01), the page's title and content still read "Fall 2025" — roughly 17 months
   after that cohort was admitted, and past when Fall 2026 decisions would already have
   concluded. A page that hasn't advanced through an obvious admissions cycle boundary
   isn't evidence of a predictable annual window; it's evidence the window (if any) isn't
   what I'd assume from CAO's pattern.
3. **Structurally it's an archive, not an evolving figure.** The page maintains permanent
   per-year pages — "First-Year Applicants From Past Years: Fall 2024, Fall 2023, Fall
   2022, Fall 2021." CAO republishes one evolving points figure per course. UCLA instead
   accumulates dated snapshots, which is the same shape ORYN's own `university_statistics`
   table already models (`stat_year`-stamped rows), not the shape
   `calendar_bound_fact_class` was built for.

**Decision: do not tag `UCL0036`/`UCL0037`.** No code or data change from this finding —
it's a negative result, recorded so nobody re-proposes the same extension without
re-checking. If US institutional statistics like this get a home in ORYN, it's more
likely a `university_statistics` population task than a `calendar_bound_fact_class` one.

## 4. Stuttgart and Warwick — already closed, no action taken

Per CEO: both need nothing further, so this section is a record, not a task report.
Stuttgart's replacement row (`STU0019`) was already `verified_current` as of task 8's
classification pass — nothing to recover. Warwick's row (`WAR0001`) was already superseded
by this lane's own fresh research earlier in the night, just never reconciled in the
write-up. Neither was touched in this branch. Recorded here so neither gets
re-investigated by a future pass under the impression it's still open.

## 5. The other 22 historical rows — backlog, explicitly

Of the 30 rows classified in task 8: 8 were the Dutch cluster (§1), 2 were
Stuttgart/Warwick (§4, already closed before task 8 even ran). **The remaining 22 are
scattered singles across roughly eight countries, share no common mechanism the way the
Dutch cluster shares numerus fixus, and none of them are in the 40-pilot institution set.**
That combination — no shared shape, no pilot relevance — is exactly what made the Dutch
8 worth pulling out and doing tonight, and it's exactly what the other 22 lack. **This is
backlog, not a gap.** Saying so explicitly, per CEO's instruction, so it doesn't get
picked up later under the impression it's time-sensitive: it isn't. It's a "someday, if
this becomes relevant to a specific institution" list, not a "these are visibly stale to
a pilot student right now" list.

## Verification

- `npm run lint` — clean.
- `npm run typecheck` — clean.
- `npm test` — 187 files / 2819 tests passed.
- `npm run build` — succeeded, all routes compiled.
- Live SQL verification of both the freshness refresh (7/7 rows show
  `retrieved_at=2026-09-01`, new `research_record_id`, unchanged `verification_state`;
  Tilburg untouched) and the CAO tag fix (39/39 tagged rows sit inside
  `verified_historical`, 0 leakage) — both quoted above with exact numbers, not estimated.
- No `opportunities` table touched. No `university_statistics` table touched (the UvA
  ranking-outcome figures and the three newly-noticed capacity numbers were deliberately
  left as `researcher_notes`, not written as rows — see §1).

## Scope boundaries (for whoever picks this up next)

- The 3 uncaptured Dutch capacity numbers (§1) and the "extend calendar-bound to the
  Dutch cluster" idea (§1) are both named, sourced-enough-to-start-from, and NOT done.
- The other 22 historical rows (§5) are backlog, not urgent — see above.
- Tilburg (`TIL0045`) needs a reachability retry, not a content re-check — its content
  was never in question, only whether the page could be loaded today.
