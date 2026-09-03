# The cost field, hand-read to completion — 2026-09-03

CEO's brief: bd's `docs/opportunity-cost-field-measurement-2026-09-03.md` (commit `dc88b931`)
hand-read a 34-row stratified *sample* of the 258 active/null-cost rows and found real signal
a keyword sweep missed. Read the *rest* — every remaining null-cost row, not a further sample
— with the same four-count discipline as `oryn/eligible-grades-prose-sweep-2026-09-03`, stage
only unambiguous fills as dry-run SQL, and report the hand-read-vs-keyword-sweep ratio.

## Scope and method

Pulled all 258 active rows with `cost is null`, excluded the 31 bd's own doc names by title
(the 34-row sample minus 3 not individually named in her prose), and hand-read the full stored
`description` of every one of the remaining **227** rows — category by category, in full, not
by snippet or keyword match. Two small bookkeeping misses (a forgotten id in a later query's
exclude list) caused 5 of bd's own rows to resurface mid-pass; each was recognized on sight
and skipped rather than re-logged as a new finding.

## The four counts

| Bucket | n | % of 227 |
|---|---|---|
| **Filled** (staged) | 6 | 2.6% |
| **Refused** (needs interpretation) | 5 | 2.2% |
| **Unrepresentable** (real price, wrong shape for the schema) | 21 | 9.3% |
| **Silent** (nothing relevant) | 192 | 84.6%* |

*192 includes 3 rows where the *concept* doesn't apply (a scholarship or paid role — money
flows to the student, not from them), the same category bd's sample also found and correctly
left null. Counted with silent rather than as a fifth bucket since the accounting and the
staged action are identical: nothing written.

Combined with bd's 34-row sample (4 filled, 2 unrepresentable, 1 institutional, 2
concept-N/A, ~25 silent-or-refused), the full 261-row read of the 258-row null-cost
population is now essentially complete top to bottom, not sampled.

## 1. The 6 filled — cross-validated by bd's parallel pass, staged in her file instead

CEO gave overlapping briefs to two lanes within minutes of each other (this pass: the full
null-cost population; bd's: a separate 28-row aid-flagged cut). Compared id lists directly
once that surfaced: all 6 of these rows are also in bd's own file
(`data/research/opportunity-cost-handread-bd-2026-09-03.sql`), including an identical $2,500
independently found for Iowa Young Writers' Studio — two unrelated hand-reads landing on the
same figure is a real cross-check, not a coincidence to shrug off. Per CEO's call, the
overlap belongs to the narrower file (this one); nothing here is staged as new SQL —
`data/research/opportunity-cost-handread-31-2026-09-03.sql` documents the reconciliation and
points to bd's file for the actual UPDATE statements. Five explicit, unscoped "free"
statements, one explicit single USD price:

- **Hong Kong Baptist University (HKBU)**: *"has offered nine free, online summer
  programmes"* → `cost = 0`.
- **Kode With Klossy**: *"Our free (yep, free!) two-week summer program"* → `cost = 0`.
- **NYU High School Law Institute**: *"we offer free, yearlong academic programming"* →
  `cost = 0`.
- **University of Bath International Summer School**: *"a free, online programme (via
  Microsoft Teams)"* → `cost = 0`.
- **Wharton Sports Analytics and Business Initiative**: *"This free competition..."* / *"Free
  and open to all current high school students"* (stated twice) → `cost = 0`.
- **Iowa Young Writers' Studio**: *"cost $2,500 per session"*, both 2026 sessions the same
  length and price — no tiering, no range, a genuine single figure → `cost = 2500`.

All six re-verified live (`status = 'active'`, `cost is null`) immediately before this pass
identified them as candidates — the actual `UPDATE` statements, with their own `WHERE`
re-checks at apply time, live in bd's file per the reconciliation above.

## 2. The 21 unrepresentable — the schema question, now with much more evidence behind it

bd's 34-row sample found 2 unrepresentable rows (1 tiered, 1 foreign-currency) and called that
"a real, recurring shape, not an isolated case." Reading the other 227 confirms that more
strongly than a 2-of-34 sample could: **21 more real, known prices exist in this catalog's own
stored text that the single `numeric` cost column cannot hold**, split roughly evenly between
the two gaps bd's report named:

**Real price, foreign currency** (no `currency` column exists):
- Acıbadem Üniversitesi Lise Yaz Programları — "110.000 TL (KDV Dahil)"
- Bilkent University Summer Camp — "68.000 TL... 61.000 TL..." (already correctly left null
  by an *earlier* pass tonight, which wrote the same reasoning into the row's own text)
- ODTÜ (METU) Engineering Summer School — "historical fee TRY 60,000," itself already flagged
  stale by a prior pass (2026 organizer is changing) independent of the currency problem
- Pre-College Program (Madrid/Segovia) — "tuition fee of 4800€"
- King's College London Pre-University Summer School — "GBP 3,195... to GBP 9,375..."
- KU Leuven Summer of Science — "EUR 380... EUR 430..."
- International Summer Schools (ISSOS) — "£6,900 (£6,400 tuition)"
- Istanbul Bilgi University HS Summer School — "16,000 TL... 20,000 TL..."
- Freie Universität Berlin SommerUNI — "EUR 10 per day" (also per-day, not a total)

**Real price, genuine tiered/range structure** (no min/max or structured-tiers field exists):
- AwesomeMath Summer Program — "$3,825-$4,675"
- BETA Camp — "$500/month," a subscription rate, explicitly flagged in its own stored text as
  unlike the one-time fees most rows in this corpus carry
- Copenhagen Business School Summer University — free for exchange/CBS students, paid
  per-course (amount unstated) for others — tiered by applicant category, not just price
- DigiPen Academy Pre-College — "$2995 to $3195"
- Interlochen Arts Camp — "$2,125... to $10,500"
- NSLC Business & Entrepreneurship — "$4,195-$4,495 depending on location"
- NYLF Medicine & Health Care — "$4,099-$4,799" residential, plus an entirely unquantified
  "lower-cost commuter" second tier
- RISD Pre-College (On-Campus) — "$12,495 (commuter: $9,595)"
- Summer at Stanford 2025 — "starts at $4,962... or $17,197..." (variable minimums, not fixed)
- Tisch Summer High School — "$12,012 for 6-credit... $8,008 for 4-credit... plus $200 fee"
- UT Austin WiSTEM — "$200... $200... $350..." across three distinct sub-offerings
- UWC Short Courses — its own text states plainly there is no single unified cost across the
  many independently-priced courses it lists (a directory record, not a priced program)

This doesn't change bd's answer to the founder's schema question — it strengthens it. Tiered
and foreign-currency pricing isn't the Tanglewood/Summer-Discovery/Koç anecdote's rare
edge case; it is the *modal* shape of a real, researched price in the `summer_program`
category specifically (21 of the category's null-cost rows, against only 6 clean fills). A
min/max pair (or structured tiers) plus a currency column, or an explicit
see-description-for-pricing sentinel, is doing real work here, not solving a hypothetical.

## 3. The 5 refused — a real number is close, but picking one value isn't the row's own call

- **Lumiere Education**: already refused by an *earlier* pass tonight, which found two
  internally-inconsistent price ranges and wrote into the row's own text: *"picking either
  would risk writing a wrong number with false confidence, which is worse than an honest
  NULL."* Not re-litigated, cited as still correct.
- **Erasmus+ Youth Exchanges**: "a funded... exchange" — real EU funding, but not an explicit
  zero-cost-to-student statement; real Erasmus+ exchanges sometimes carry a small participant
  contribution, so "funded" alone isn't the same claim as SPINWIP's "completely free."
- **Gençlik Merkezleri (e-Genç)**: "free courses and workshops" — the free claim is scoped to
  specific offerings inside the membership, not stated as the membership's own overall cost.
- **HSHSP (Michigan State)**: description ends with an unlabeled trailing fragment — "...March
  15th | 3800.0" — very likely a flattened cost value from the original structured source
  (same concatenation-artifact shape as University of Chicago's malformed URL, corrected
  earlier tonight), but not stated as labeled, unambiguous prose. Flagged for a human to
  confirm against the source rather than filled from a bare number's position. **Independently
  cross-checked**: Student Science Training Program (batch 8, silent) carries the identical
  shape — "two unlabeled numeric values (60 and 4,800)... neither is clearly identified" — and
  a *prior* pass already explicitly declined to use them for exactly this reason, reached
  without seeing this row. Same call, same logic, arrived at twice.
- **Parsons Summer Intensive Studies**: "$5,610 plus a $265 university fee (optional housing
  $2,180)" — a real USD figure, but whether "the cost" means tuition alone or tuition plus the
  mandatory fee is a judgment call the text doesn't make for us.

## 4. Already-researched, honestly null — a pattern worth naming on its own

Distinct from "never looked," a meaningful number of rows in this pass already carry their
*own* record of a real attempt that came up empty, written in by earlier passes tonight:
CyberPatriot ("Registration fee not stated on the pages reviewed"), FIRST Global Challenge
("Cost not stated... should not be assumed free" — already naming the exact trap this brief
cares about), Waterloo Math/Computing Contests ("available only via the Contest Supervisor
Portal"), ACU Bilim Yaz Kampı, Harvard Pre-Collegiate Economics Challenge, Sorbonne Université
Summer University, Kadir Has Kış Okulu, John Locke Institute ("genuinely unpublished after
three real attempts"), and — most notable — **Global Achievers Academy**, whose own text names
a specific prior systematic effort not otherwise visible in bd's doc: *"cost stays NULL
because a real check found nothing trustworthy, not because nobody looked... one of tonight's
pay-to-enroll-gate-blind-due-to-missing-cost rows (measurement #154)."* Worth surfacing to
whoever owns that numbered measurement, since it implies a broader "gate-blind" tracking
effort this report didn't otherwise encounter.

Also worth naming precisely because it's the opposite finding: **Boston University Tanglewood
Institute (BUTI)** — the founder's own original anecdote motivating bd's whole brief — has *no*
cost language anywhere in its `description`. Its real $4,055–$10,205 price lives in a different
column (`current_cycle_label`, per bd's report), invisible to a description-only hand-read.
Naming this so the method's own blind spot is on the record: exhaustive hand-reading of one
column still cannot surface a fact stored in a different one.

## 5. Hand-read vs. keyword sweep — measured, not asserted

Ran an actual sweep (not a hypothetical) over the same 227-row pool: 12 English free/no-cost
phrases (`free of charge`, `completely free`, `is free`, `are free`, `no cost`, `no charge`,
`at no charge`, `complimentary`, `(yep, free`, `free program`, `free, online`, `free online`)
— more generous than a minimal sweep, to give the keyword approach a fair chance.

**Result: 5 hits in my 227-row pool.** Of those:
- **4 true positives** — Kode With Klossy, University of Bath, Wharton Sports Analytics, HKBU
  — 4 of my 6 real fills, correctly caught.
- **1 false positive** — Freie Universität Berlin SommerUNI, matched on "a small number of
  online courses are free," but the record's *main* track has a real EUR/day price; the sweep
  would wrongly flag this as a clean free fill when the correct call is unrepresentable.
- **Missed 2 of my 6 real fills**: Iowa Young Writers' Studio (a genuine $2,500 price, not a
  "free" claim at all — no free-phrase sweep is designed to find it, a structural blind spot,
  not a bug in the phrase list); **NYU High School Law Institute** (a real miss — "we offer
  free, yearlong academic programming" matches none of the 12 phrases tried, despite being as
  explicit a free statement as HKBU's).

**A second false positive, outside my own pool, worth reporting because it's instructive**:
the same sweep run against bd's excluded rows hit **InvestIN – Immersive Career Experiences**,
whose own text reads *"Confirmed NOT free: the provider operates a dedicated 'Scholarship
Scheme'..."* — matched only because "free program" is a substring of "...genuinely free
programme." A keyword sweep taken at face value would flag a row as free whose own research
explicitly concluded the opposite.

**The honest ratio**: a 12-phrase sweep — more generous than a naive one — caught 4 of 6 real
fills (67%) in my pool, at the cost of 1 false positive needing a human to downgrade, and
missed one genuine free-statement purely on phrasing, plus the one real-price fill it was
never going to find by design. Every additional phrase added to a sweep buys a little more
recall at the cost of more false positives to adjudicate by hand anyway — at which point the
sweep hasn't replaced the hand-read, it has only pre-sorted a fraction of it. This confirms
bd's own finding (her narrower sweep found 1 of 4 in her sample) at a different sweep
generosity: better phrase lists help, but do not close the gap, and every version still needs
a human to catch what it misses and correct what it wrongly flags.

## What this doesn't answer, on purpose

Same boundary as bd's report: this reads what's already stored, it does not re-fetch any
organizer's live page. The 21-row unrepresentable list and the 5 refused rows are handed over
as-is for the founder's own schema and judgment calls, not resolved here.

## Coordination note

CEO dispatched two overlapping briefs on this same field within minutes of each other
(this pass and bd's aid-flagged-28 pass) without namespacing either output, and both lanes
independently reached for the same filename. Confirmed by CEO directly, not diagnosed here —
resolved by renaming both files to carry a lane suffix (`-31-`, `-bd-`) and comparing id lists
directly rather than guessing at a merge. Named for the record since it's the same failure
shape this fleet has a standing rule about (prefix identifiers before parallel dispatch on the
same target), not because either lane's actual work was wrong.
