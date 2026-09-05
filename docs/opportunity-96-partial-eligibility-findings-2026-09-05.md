# 96 partial-eligibility opportunities: research complete, fill package staged

Follows `docs/opportunity-96-partial-eligibility-2026-09-05.md` (the measurement + id list, CEO
overlap-confirmed, merged `b7b9b0f1`). SQL package:
`data/opportunity-96-partial-eligibility-fill-2026-09-05.sql`. **Not applied — written for
CEO/founder to package alongside migrations 0126/0129/0133, same two-step pattern as Packages
14/15/16.**

## Method

Six parallel research passes (16 rows each), every one fetching each row's own already-known
`source_url` and reading the real page — not a search snippet — then checking `page_url` or a
targeted follow-up search when the primary page didn't answer. Two of the six stalled mid-run on
their first attempt and were relaunched clean; both completed fully on retry. Every one of the
160 expected (row, dimension) pairs came back — zero gaps, zero duplicates, checked
programmatically against the original list, not assumed.

**Spot-check before trusting the batch**: one subagent's own report flagged that its quote
extraction goes through a markdown-conversion step with a small model pulling the relevant
sentence, and recommended verifying before writing anything to a database. Independently
re-fetched 6 of the highest-stakes citations myself (Coca-Cola, NSLC, IPhO ×2, Breakthrough
Junior Challenge, Yale YYGS ×2, Davidson Fellows) — all 6 matched the reported quote **verbatim**,
across 4 different research batches. No fabrication or drift detected in the sample.

**SQL package verified before handing off**: built a scratch Postgres schema with 0126/0129/0133
actually applied (unlike the live database) and ran the entire fill file against it — every
statement is syntactically valid Postgres; zero errors. (Row-matching itself couldn't be tested
this way, since the scratch schema has no data — the WHERE-clause predicates are the same ones
already verified against live row counts in the measurement pass.)

## Results: 160 (row, dimension) findings

| status | count | meaning |
|---|--:|---|
| CHECKED_NOT_STATED | 103 | page genuinely read, dimension never mentioned either way |
| CONFIRMED_NO_RESTRICTION | 23 | page explicitly states no restriction ("open to all countries," etc.) |
| FOUND | 22 | page states a specific value |
| COULD_NOT_ACCESS | 12 | source blocked/unreachable (6 opportunities × 2 dimensions each) |

## SQL package structure

- **Section 1** (5 rows) — specific ages, live-writable today: `minimum_age`/`maximum_age` exist.
- **Section 2** (3 rows) — specific grades, live-writable today: `eligible_grades` exists.
- **Section 3a** — empty; no country finding this pass reduced to a clean specific list (the two
  candidates that might have — Breakthrough, Erasmus+ — are flagged instead, see below).
- **Section 3b** (23 rows) — `country_eligibility_confirmed_open`. This column is already live
  (migration 0060), but staged like everything else per instruction.
- **Section 3c** (5 rows) — `age_eligibility_confirmed_open` / `grade_eligibility_confirmed_open`
  (0126). These were reclassified DOWN from a would-be "FOUND specific value": the source text
  (e.g. IPhO's "students of general or technical secondary schools... or graduated the same
  year... not yet started university") confirms no restriction across the whole population it
  describes but never names a specific grade number — writing a specific `eligible_grades` value
  the source never stated would be less honest than the correct "confirmed no restriction" shape.
- **Section 4** (103 rows) — `age_eligibility_basis` / `grade_eligibility_basis` /
  `country_eligibility_basis` = `'checked_not_stated'`, staged for 0129/0133. This is most of the
  package by volume, and it's real value: it converts "nobody has looked" into "looked, genuinely
  silent" for the majority of these 96 rows, which is exactly the state the "partially checked"
  badge exists to represent.
- **Section 5** (9 items) — flagged, **no SQL written**, needs a decision first:

| # | row / dimension | why it doesn't fit a mechanical write |
|---|---|---|
| 1 | Wharton Investment Competition, age | "16+" applies to the team **leader** role only, not every applicant |
| 2 | Millfield Sixth Form Scholarships, grade | source names "Year 9 or the Lower Sixth" together; this opportunity is the Sixth Form one specifically |
| 3 | Breakthrough Junior Challenge, country | eligibility is "not under comprehensive US sanctions" — an exclusion keyed to a changing OFAC list, not a stable allow-list or a clean "no restriction" |
| 4 | İstanbul Kent Konseyi Gençlik Meclisi, country | real requirement is **city** residency (Istanbul), narrower than any country value can represent honestly |
| 5 | Erasmus+ Youth Exchanges, country | a tiered EU-member/associated-country/neighboring-region rule, not a flat list — needs real geographic research to enumerate, not a mechanical read |
| 6 | UK/non-US grade-system conversion (Millfield above, Nuffield's "Year 12", Blackstone's "Year 12–13 UK") | confirmed the live `eligible_grades` convention is plain US-style numeric strings ("9".."12") from existing rows, but found no prior art for how a UK Year maps onto that scale — flagging the convention question once rather than guessing per-row |
| 7 | IPhO, country | the actual rule governs which countries the **organizing committee** may invite, not a per-student allow-list — real eligibility depends on whether a student's country fields a delegation, which this text doesn't resolve |
| 8 | Stockholm Junior Water Prize, grade | Turkish source repeats the already-known age range and says "lise öğrencileri" (high school students) but names no specific grade — too vague to write |

(Nuffield's **age** and Blackstone's **country** halves were clean and ARE written — only their
grade halves hit the UK-Year question above.)

## New blocked domains found this pass

Beyond the two CEO already flagged today (`girlup.org`, `summer.gwu.edu`), this batch hit four
more, each confirmed across multiple attempts, not a one-off:

- `lionsclubs.org` — 403, 3 separate attempts (Alpha Leo Club)
- `uwc.org` — 403, 2 URLs × 2 attempts each (UWC Short Courses)
- `engineering.virginia.edu` — 403, repeated attempts (Emerging Engineers @ UVA)
- `www.rotary.org` — 429 (rate-limited), 4 attempts (Rotary Interact Club)
- `www.jax.org` — content is JS-accordion-driven, not present in any static fetch (JAX Summer
  Student Program) — a different failure shape than a hard block, worth naming separately since
  a future retry of the SAME url will hit the SAME wall for a different reason than a 403/429

## One out-of-scope flag, not acted on

While researching IE University's grade/country (not age — out of scope for this pass), the page
repeatedly surfaced **"14–16 years old"** for what reads as the same Pre-University Summer
Program section already on file with age **15–17**. Not touched, since age wasn't this row's
assignment — flagging for whoever owns that field next, since the two numbers don't obviously
reconcile (possibly two different program tiers on one page, not confirmed either way).

## Status

No new migration number requested or needed — every write in this package targets a column
either already live (0060) or already defined in a migration written earlier today (0126/0129/
0133), just not yet applied. Nothing here touches production.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
