# 96 partial-eligibility opportunities: research complete, fill package staged

Follows `docs/opportunity-96-partial-eligibility-2026-09-05.md` (the measurement + id list, CEO
overlap-confirmed, merged `b7b9b0f1`). Two SQL files, neither applied:

- **`data/opportunity-96-today-writable-2026-09-05.sql`** — 8 rows, a specific age/grade value,
  live-writable right now, no migration needed. Split out on CEO's own follow-up request so the
  founder can run this before, or independently of, packaging 0126/0129/0133.
- **`data/opportunity-96-partial-eligibility-fill-2026-09-05.sql`** — everything else: staged
  `confirmed_open`/`basis` writes for 0126/0129/0133, the 4 free-text writes (below), and the
  4 still-flagged items.

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

## CEO's rule, applied after the first pass

> "If the schema can't express a restriction, don't write a guessed encoding — write the truth
> to free text."

Confirmed independently 3 other times today (Massachusetts residency, Vanderbilt's cycle-
dependent test policy, Harvard CURE) before this made it 4 — now the standing rule. Reworked the
package against it: **checked whether a free-text fallback already exists** before deciding
whether a finding is "flagged, no SQL" or "written to text." It does for country/citizenship
(`citizenship_restrictions`/`residency_restrictions`, migration 0008/0047 — already read by
`lib/counselor/eligibility.ts` and already surfaced to the student as an advisory note). It does
**not** for age or grade — no equivalent column exists at all. Reusing `description` as an
improvised substitute would just move the "guessed encoding" problem from the value to the
schema, so that wasn't done either — those 4 stay flagged, now with that specific question for
CEO instead of a vaguer "needs a decision."

## SQL package structure

**`opportunity-96-today-writable-2026-09-05.sql`** (8 rows, live-writable now, no migration):
- 5 specific ages (`minimum_age`/`maximum_age`).
- 3 specific grades (`eligible_grades`).

**`opportunity-96-partial-eligibility-fill-2026-09-05.sql`**:
- **Section 3a** — empty; no country finding reduced to a clean specific list.
- **Section 3b** (23 rows) — `country_eligibility_confirmed_open`. Already live (migration 0060)
  like the today-writable file's 8 — stayed in this file only because CEO's request named "the 8
  rows" specifically; flagged back in case that scope should widen to include these too.
- **Section 3c** (5 rows) — `age_eligibility_confirmed_open` / `grade_eligibility_confirmed_open`
  (0126). Reclassified DOWN from a would-be "FOUND specific value": the source text (e.g. IPhO's
  "students of general or technical secondary schools... or graduated the same year... not yet
  started university") confirms no restriction across the whole population it describes but
  never names a specific grade number.
- **Section 4** (104 rows, +1 after reclassifying Stockholm's grade down from FOUND — see below)
  — `*_eligibility_basis = 'checked_not_stated'`, staged for 0129/0133. Most of the package by
  volume: converts "nobody has looked" into "looked, genuinely silent" for most of these 96 rows.
- **Section 6** (4 rows, NEW) — the rule above, applied where a free-text home exists:

| row | written to | why |
|---|---|---|
| Breakthrough Junior Challenge | `residency_restrictions` | sanctions-list-based, not a stable country name — would go stale the day OFAC's list changes |
| İstanbul Kent Konseyi Gençlik Meclisi | `residency_restrictions` | real requirement is **city** residency (Istanbul); "Turkey" reads true but wrongly admits an Ankara student — a wrong value is worse than an empty one |
| Erasmus+ Youth Exchanges | `residency_restrictions` | tiered EU-member/associated-country/neighboring-region rule, not a flat list |
| International Physics Olympiad (IPhO) | `residency_restrictions` | the real gate is whether a student's country fields a national team (an organizing-committee decision), not a per-student allow-list |

- **Section 7** (4 items) — still flagged, **no SQL written**, real schema question for CEO:

| row / dimension | why |
|---|---|
| Wharton Investment Competition, age | "16+" applies to the team **leader** role only, not every applicant — no `age_restrictions` field exists to carry that nuance |
| Millfield Sixth Form Scholarships, grade | "Year 9 or the Lower Sixth" named together, and a UK Year value either way |
| Nuffield Research Placements, grade | "Year 12 (or equivalent)" — its **age** half (over 16) IS written in the today-writable file |
| Blackstone Law Review, Junior Division, grade | "Year 12–13 UK, or high school juniors/seniors internationally" — two systems, neither convertible without inventing an equivalence the source never states |

Stockholm Junior Water Prize's grade (originally FOUND, a Turkish source repeating the known
age range and saying only "lise öğrencileri"/high school students) moved from flagged into
Section 4 as `checked_not_stated` instead — genuinely uninformative, not a schema-gap case.

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

No new migration number requested or needed for anything actually written — every write in this
package targets a column either already live (0060, `citizenship_restrictions`/
`residency_restrictions`) or already defined in a migration written earlier today (0126/0129/
0133), just not yet applied. The one open question (Section 7 above: `age_restrictions`/
`grade_restrictions` text columns, or leave those 4 flagged) would need a number if CEO wants it
— not requested yet, waiting on that answer first. Nothing here touches production.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
