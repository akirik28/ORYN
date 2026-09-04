# C7 — what the comparison feature shows with real data

Look-and-report only, per assignment. Nothing in this branch touches product code.

## Bottom line

The comparison table is a **separate, older rendering path** that D6's work never touched.
It still shows the pre-D6 "silent blank" pattern everywhere the detail page now shows an
honest explanation — and it reproduces the **exact self-contradicting-badge bug** D6 fixed on
the detail page today, unfixed, live, right now, for Oxford. Being a genuinely wanted
university doesn't buy a more complete row: MIT, the single most-targeted university in the
whole product, has 2 real gaps in its comparison row, about the same rate as a random pick.
There's one mitigating factor worth crediting: a real, correctly-worded sentence — "unknown
fields are shown as —, never guessed" — sits at the top of both compare pages. If payment is
opening on this feature soon, the Oxford-shaped bug is the one item here that looks like a
straightforward, contained fix rather than a larger design question.

## Method

Same 4 queries the real page runs (`app/(app)/universities/compare/page.tsx:74-83`), against
the live DB, for two groups of 3 universities:
- **Targeted** (real demand, from `target_universities`): MIT (5 targets, most-demanded
  university in the product), Oxford (1 target, D6's own subject), Caltech (2 targets, D5's
  own subject — chosen specifically to check whether today's earlier fix is visible yet).
- **Random**: American University, Universität Leipzig, University of Edinburgh — `ORDER BY
  random()` excluding all 12 targeted universities.

For each, I traced every one of the 10 comparison-table rows against the actual render code
(`page.tsx:152-234`, read and quoted directly, not inferred) to determine exactly what renders
for each real value, then cross-checked the two most surprising results (Oxford's tuition
fields, Caltech's zero deadlines) before trusting them — the first was a bug in my own
diagnostic query (see below), the second checked out as expected, documented process.

## Q1 — does the table fill in, or look mostly empty?

Per-university, of the 9 fields that meaningfully apply to that institution (excluding the
`tuition` row for US universities, which is *always* "—" **by design** — a deliberate,
commented decision at `page.tsx:166-169` to keep it separate from `costOfAttendance` rather
than a data gap; counting it as a gap would overstate the problem):

| University | Real gaps | Which fields |
|---|---|---|
| MIT (targeted ×5) | 2 / 9 | applicationSystem, researchStrengths |
| Oxford (targeted ×1) | 3 / 9 | costOfAttendance, admissionRate, applicationSystem |
| Caltech (targeted ×2) | 1 / 9 | applicationSystem |
| American University (random) | 0 / 9 | — fully populated |
| Universität Leipzig (random) | 4 / 9 | costOfAttendance, admissionRate, statisticsSource, applicationSystem |
| Edinburgh (random) | 1 / 9 | costOfAttendance |

11 of 54 meaningfully-evaluable cells (~20%) are "—". Not catastrophic, but not rare either —
every single one of the 6 sampled universities except American had at least one blank, and two
had 3-4.

## Q2 — targeted (real demand) vs. random — what's the difference?

Less than expected: targeted group = 6 gaps / 27 cells (22%), random group = 5 gaps / 27 cells
(19%). **Being wanted doesn't correlate with being known**, at least not yet. MIT — 5 real
students targeting it, the most of any university in the product — is missing
`applicationSystem` and `researchStrengths` exactly like a university nobody has looked at.
Oxford, which got dedicated attention today (D6's detail-page fix, and per memory an earlier
D8 stats-fill pass), still shows `admission_rate`/`cost_of_attendance` as null as of this
check (`university_statistics.updated_at` = today 08:08 UTC, but those two fields are still
null in that row) — whatever was fixed there didn't touch these two headline fields, or hasn't
landed live yet.

## Q3 — do today's honest empty-states carry over to comparison?

**No — confirmed by reading the code, not inferred.** Grep for `lacksCoreAdmissionStats` /
`lacksApplicationDeadline` / `data-depth` across both compare pages: zero matches. Grep for
`university_deadlines` / `deadline` in the universities compare page: zero matches — **the
university comparison table has no deadline row at all**, for any university, regardless of
whether that university has real deadline data, MIT-shaped scholarship-only data, or nothing.
It isn't rendered honestly or dishonestly; it just isn't there.

For the two stats fields the detail page now explains, the compare page instead falls back to
the pre-D6 pattern: a bare `—` in a muted span (`page.tsx:25`, `NA = <span
className="text-muted-foreground">—</span>`), no sentence, no source link, no distinction
between "we haven't researched this" and any other reason a cell might be empty.

**And it reproduces D6's own self-contradiction bug, unfixed, right now.** The
`statisticsSource` row (`page.tsx:196-212`) renders a `SourceBadge` whenever `s?.source` is
truthy — with no guard tying it to whether the stats it's attached to are actually populated
(unlike the detail page, which now suppresses the badge specifically when
`missingCoreAdmissionStats` fires, exactly to prevent this). Oxford's `university_statistics`
row has a real `source` URL (`ox.ac.uk/about/facts-and-figures/...`) despite `admission_rate`
and `cost_of_attendance` both being null. Compare Oxford against any other university today
and its row will show **"—" for cost, "—" for admission rate, and "Source: ox.ac.uk" directly
below them in the same column** — the identical self-contradicting shape D6 fixed on the
detail page, live on this page, unfixed. (Worth noting in fairness: the code comment at
`page.tsx:187-195` explaining why the source badge is per-university rather than one shared
badge is a genuinely reasoned design decision about a different, real risk — averaging
different universities' data-vintages under one badge. It just wasn't written with this
specific empty-row case in view, because D6's finding didn't exist yet when this page was
built.)

## Q4 — does a blank cell read as "this university doesn't have it" or "we don't know"?

**There is a real mitigation already in place**, worth crediting: both compare pages render
`t("sideBySide", { count })` as the page's own subtitle (`page.tsx:244` universities,
`page.tsx:139` opportunities) — `messages/en.json` → *"{count} universities side by side —
unknown fields are shown as "—", never guessed."* This is genuinely correct framing, genuinely
visible (it's the `PageHeader` description, not buried copy), and directly answers the
"guessed vs. unknown" half of the question.

What it doesn't solve: it's one sentence at the top of the page, and the table below can put a
populated cell for University A directly beside a blank cell for University B in the same row.
Reading the disclaimer once doesn't change the immediate visual impression of that specific
juxtaposition — a side-by-side blank still reads as "this one, not that one" at a glance, even
with correct framing available above the fold. That's a UX judgment call, not a defect; noting
it because it's exactly the mechanism the question was asking about.

## Opportunities side (lighter pass — same shape)

Sampled 3 real (`saved_opportunities`, most-saved) + 3 random, against the 7-field opportunity
compare table (`app/(app)/opportunities/compare/page.tsx:113-135`):

| Opportunity | Real/random | Blank fields (of 7) |
|---|---|---|
| Duke of Edinburgh's Award — Türkiye | saved | deadline, cost |
| Girl Up Project Awards | saved | deadline, cost, selectivity* |
| Yale Young Global Scholars | saved | cost, ageRange |
| Battle Code MIT | random | deadline, selectivity*, ageRange |
| Wharton M&TSI | random | deadline, ageRange |
| Wharton FBW | random | ageRange |

*Girl Up/Battle Code's `selectivity_tier` is the literal enum value `"unknown"` — a real,
non-null classification — but `selectivityLabel`'s lookup table is a `Partial` that omits
`"unknown"`, so it renders identically to a genuinely missing value. Same shape as Q4 above:
correct data, indistinguishable rendering from absent data.

Every one of the 6 sampled opportunities has at least one blank field; most have 2-3. Same
picture as universities — real demand (saved by actual students) doesn't buy more complete
data than a random pick.

## One aside, not asked but adjacent

`university_statistics` is fetched with `select("*")` (`page.tsx:76`) — `sat_range_low/high`,
`act_range_low/high`, and `graduation_rate` all come back in the query — but **none of the 10
rows in the table ever reads them.** They're not blank; they're absent as a comparison
dimension entirely, for every university, regardless of whether the data exists. Three of
these four fields are exactly what `lacksCoreAdmissionStats` (wired into the detail page
today) checks for. Not a bug — just worth knowing that "wire the same check into compare" is a
bigger job than adding a guard, since compare has no row for two of the four fields the check
inspects.

## What was checked and ruled out

- Caltech showing 0 `university_deadlines` rows live is **expected, not a regression** — D5's
  fix (`8b9c5f95`) was a dry-run-verified SQL file staged for someone to apply
  (`data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql`), per the
  standing no-live-writes rule; its own commit message says so explicitly. It hasn't been
  applied yet.
- Oxford's tuition fields (`£9,790`/`£37,380`) genuinely exist and genuinely render correctly
  on the compare page — my first pass queried `value_text` instead of `value_numeric` for
  `university_profile_metrics` and got a false null; the actual page code
  (`page.tsx:141-149`) reads `value_numeric`, confirmed by direct read, and the live values are
  there. Caught before it went into this report as a false claim.
