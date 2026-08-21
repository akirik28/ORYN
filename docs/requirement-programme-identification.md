# Requirement records have almost no programme identification

**Measured 2026-08-21 against the live database and the corpus as it stands. Nothing was
written. Migration 0056 was not applied.**

Reproduce with:

```bash
npm run audit:requirement-program-linkage
# from a worktree, point at the main checkout's env file:
npm run audit:requirement-program-linkage -- --env-file ../../../.env.local
```

The script (`scripts/audit-requirement-program-linkage.ts`) has no `--apply` flag and no write
client. Its pure classification rules live in `lib/requirements/program-linkage.ts` and are
unit-tested in `__tests__/requirements/program-linkage.test.ts`.

---

## 1. The shape of the problem, verified

`university_requirements` has **22 columns and no `program_name` among them** — confirmed
against `information_schema.columns`, not inferred. A requirement row therefore either carries
a real `program_id` or carries *no programme identification whatsoever*. There is no
intermediate state, no free-text fallback, and no way for a reader to tell "this rule is
university-wide" apart from "this rule is programme-specific and we lost which programme."

That asymmetry decides everything below: **a wrong `program_id` is strictly worse than no
`program_id`.** A null is honest. A wrong link silently attaches Medicine's grade threshold to
Economics, and nothing downstream can detect it.

Live counts:

| | |
|---|---|
| `university_requirements` rows | 84 |
| ... with a `program_id` | 26 |
| `university_programs` rows | 9,423 across 127 universities |
| `universities` rows | 1,019 |

The 26 linked rows are a small hand-curated set (UCL, Cambridge, Imperial, LSE, KCL,
Edinburgh, ETH). Every one has `scope IS NULL` and at most one requirement per type per
programme — which is why the narrow programme-side index (§5) has not bitten yet.

---

## 2. The corpus, re-measured

105 files, 2,018 records. Split by `lib/requirements/corpus-files.ts`, which routes on
**filename**:

| | files | records |
|---|---:|---:|
| requirement-named | 63 | 1,363 |
| deadline-named | 42 | 655 |

**Finding, not previously recorded: 45 deadline records sit inside requirement-named files.**
They carry `research_deadline_id` / `deadline_type` and no `research_requirement_id`, and they
are spread across nine `es_ch_requirements_*.jsonl` files (UCM 7, UNIL 7, Spain-system 6, ETHZ
5, UZH 5, EPFL 4, Switzerland-system 4, UC3M 4, UNIGE 3). Because classification is by
filename, the requirement ingestion path would take all 45. They are excluded from every
denominator below, leaving **1,318 genuine requirement records**.

Of those 1,318:

| class | records | share |
|---|---:|---:|
| states **no** programme — a university-wide rule, correctly programme-less | 805 | 61.1% |
| states a programme | 463 | 35.1% |
| institution could not be resolved at all | 50 | 3.8% |

The 50 unresolved break down as: 23 with no `university_name` (national-level rules), 12
"Switzerland (swissuniversities — national framework)", 8 "Spain — National University Access
System", and **7 "Ankara University"**. The last is a plain alias gap — the live row is named
`Ankara Üniversitesi` and has **zero** rows in `entity_aliases`, so its English name resolves
to nothing. That is a one-line data fix, not a research problem.

*Comparison to the prior pass (85 resolve / 419 no-programme / 290 mismatch = 794):* the corpus
has grown by 524 requirement records since, and the no-programme share rose from 53% to 61%.
That rise is **a property of the markets researched since, not a research gap** — the rate
varies enormously by lane:

| lane prefix | records | states no programme |
|---|---:|---:|
| `us_*` | 355 | 85% |
| `fr_it_*` | 39 | 79% |
| `uk_tr_*` | 104 | 74% |
| `es_ch_*` | 94 | 55% |
| `de_nl_*` | 595 | 49% |
| `requirements_batch*` | 131 | 40% |

US admissions really are mostly institution-wide — a test-optional policy or an Early Decision
deadline governs the whole university. German and Dutch admission rules really are mostly
per-programme (numerus fixus, per-programme language bars). The schema needs to hold both
shapes well; 61% is not a number to drive down.

---

## 3. Name matching, and why the number is so much smaller than it looks

Matching is **exact on the normalized name, within an already-resolved university**. Never
substring, never ranked-best. Both alternatives have already produced wrong answers here:
`ILIKE '%ITU%'` returned Georgia Tech for İTÜ, and a ranked name search returned Uşak
University first for "Anadolu". A ranked search always returns *something*; it structurally
cannot say "no".

On top of that, **the source's own degree-level statement must agree before a name match
counts.** Where the source states no level, the match is *not* promoted — absence of a
discriminator is not agreement.

Against the live programme table, over the 463 records that state a programme:

| | records | share of 463 |
|---|---:|---:|
| match ≥1 programme by exact normalized name | 64 | 13.8% |
| ... matching exactly one programme | 53 | |
| ... matching 2+ programmes | 11 | |
| **resolve: one match, and the source's level agrees** | **6** | **1.3%** |
| one match, source states no level (cannot clear the rule) | 58 | 12.5% |
| no match at all | 399 | 86.2% |

**13.8% is what a name-only rule would claim. 1.3% is what actually survives.** The gap is
almost entirely records that state no degree level — Bonn writes `"Economics"` with a null
scope, and Bonn publishes four live programmes named "Economics" (three Bachelor's, one
Master's). Even a stated level would leave three of them tied.

That is not a Bonn quirk. Across the live table, **385 name-groups covering 1,005 programme
rows have the same normalized name at the same university spanning both undergraduate and
graduate level.** For any of those, a name-only match is a coin flip.

### Why the 399 non-matches are non-matches

| | records | share of 399 |
|---|---:|---:|
| the university has **no** programme rows at all | 29 | 7.3% |
| the university has fewer than 10 | 77 | 19.3% |
| the university has a real catalogue and the name still does not match | 293 | 73.4% |

The first two are **an ingestion backlog, not a naming problem**. University of Amsterdam has
**4** live programme rows against 326 researched; Vrije Universiteit Amsterdam has **0** against
163 researched. Between them they contribute 76 programme-stating requirement records that
cannot possibly match anything.

### The ceiling if the whole programme corpus were ingested

Re-running the identical classification against the 10,094-record programme research corpus
instead of the live table:

| | live table | full corpus |
|---|---:|---:|
| match by name | 64 (13.8%) | 115 (24.8%) |
| resolve (name + level agree) | 6 (1.3%) | 20 (4.3%) |
| no name match | 399 | 348 |
| ... at a university with no programmes | 29 | **0** |

Ingesting the outstanding programme backlog roughly **doubles** name matching and **triples**
confirmed resolutions, and eliminates the "nothing to match against" bucket entirely. It is
the cheapest available improvement and requires no new research.

---

## 4. Does keying on `official_program_url` work? Measured: mostly no

**First, can a programme URL identify a programme at all?**

| | rows | share of 9,423 |
|---|---:|---:|
| URL is unique within its own university | 5,612 | 59.6% |
| URL is shared with a sibling programme | 3,811 | 40.4% |
| no URL | 0 | 0% |

The worst offenders, each a URL carrying zero identifying information:

| rows | university | URL |
|---:|---|---|
| 391 (6 universities) | Ankara 153, Istanbul 124, … | `yokatlas.yok.gov.tr` (site root) |
| 294 | Manchester | one undergraduate course-search page |
| 248 | Southampton | `/courses` |
| 217 | Wisconsin–Madison | `/explore-majors` |
| 200 | TU Dublin | `/a-z-courses` |

Add **Durham's 162 rows**, whose 18 distinct URLs are `searchstax` *pagination* pages
(`&searchstax[page]=3`) — distinct strings that identify a result page, not a programme. They
count as "identifying" in the table above and should not. Counting them honestly:
**3,973 of 9,423 rows (42.2%) have no usable per-programme URL.**

Hamburg is the opposite case and the reason the normalizer keeps query strings: its 197
programmes share **one** path and are distinguished **only** by the query
(`studiengang.html?1525352964`). Any URL normalizer that strips queries collapses 197 real
programmes into one. `normalizeProgramUrl` therefore lowercases scheme/host, drops fragment and
trailing slash, and **keeps the query**.

**Second, would URL evidence close the unresolved records?** Measured on exactly the 457
programme-stating records the name rule does not resolve:

| evidence | records | share |
|---|---:|---:|
| `source_url` equals exactly one programme's `official_program_url` | 20 | 4.4% |
| `source_url` equals exactly one programme's `admissions_url` | 19 | 4.2% |
| `source_url` sits one segment under exactly one programme URL (a **candidate**) | 39 | 8.5% |
| equals a URL shared by several programmes (identifies none) | 0 | 0% |
| no relation to any programme URL at that university | 379 | 82.9% |

**39 of 457 (8.5%) resolve deterministically by URL. 39 more (8.5%) are candidates a human
would have to confirm. 379 (82.9%) are unresolvable by any URL evidence.**

The reason is structural, and visible in the data: requirement records are researched from
*rule pages*, not programme pages. Bonn's programme-specific German-proficiency records all
cite `.../application-admission-and-enrollment/german-language-proficiency` — one page that
governs many programmes and is nobody's programme page. No key derived from that URL can
recover which programme the record was about; only the record's own `program_name` says.

`admissions_url` is the most promising tier and the thinnest: it is populated on only 1,067 of
9,423 live rows (11.3%), across just 478 distinct values.

**Where both lines of evidence exist, they agree.** 34 records had a single name match *and*
independent URL evidence: **34 confirmed, 0 contradicted.** That is reassuring about the
matching rules and says nothing about coverage — 34 records out of 1,318.

### Records that name a faculty, not a programme

12 records put a school or college in `program_name`: Koç 5 (`College of Engineering`,
`School of Medicine`, …), CMU 6 (`Tepper School of Business`, `School of Computer Science`, …),
Michigan 1 (`College of Literature, Science, and the Arts (LSA)`). These are **not** naming
errors — CMU genuinely publishes per-college admission requirements. They are facts at a
granularity the schema has no slot for: there is no faculty-scoped requirement. No programme
key will ever resolve them, and expanding them to every programme in the faculty would
fabricate per-programme facts the source never stated.

---

## 5. The index interaction — the decisive finding

Both relevant unique indexes were read out of `pg_indexes` directly:

```
university_requirements_university_type_scope_idx
  UNIQUE (university_id, requirement_type, COALESCE(scope,''))  WHERE program_id IS NULL

university_requirements_program_type_idx
  UNIQUE (program_id, requirement_type)                         WHERE program_id IS NOT NULL
```

The first is partial, as expected — so resolving a row to a programme lifts it out of that
constraint. But it does not become unconstrained: **it lands in the second one, which is
strictly narrower.** It has no `scope` term and no title term at all, permitting exactly one
requirement per type per programme. Migration 0056's own comment says this plainly ("the
program-scoped index has the identical defect and is strictly worse"), and 0056 replaces both
with title-discriminated versions — but 0056 is written and deliberately unapplied.

Measured, on the 45 corpus records that this audit would resolve to a programme by
name-confirmed or unique-URL evidence:

| | distinct keys | rows destroyed on insert |
|---|---:|---:|
| today's `(program_id, requirement_type)` | 26 | **19 of 45 (42%)** |
| 0056's `(program_id, requirement_type, scope, md5(title))` | 45 | **0** |

**Linking rows to programmes before 0056 is applied would silently destroy 42% of exactly the
rows the linking exists to create** — and destroy them the same way the university-scoped index
destroyed 341 rows and all 36 recorded `rejected` queue entries: a unique-violation on insert,
with the first row winning and the rest gone.

---

## 6. Recommendation

**Do not run a programme-linkage backfill now.** Not because the evidence is weak everywhere —
45 records have defensible evidence — but because the payoff is 45 rows out of 1,318 (3.4%),
42% of which the current schema would eat, against a downside (a wrong `program_id`, invisible
and undetectable) that the schema gives no way to walk back.

In priority order:

1. **Apply migration 0056 first, or link nothing.** This is a precondition, not a nicety. It is
   the difference between 45 linked rows and 26. It is the founder's decision and it blocks
   everything else in this document.

2. **Fix the Ankara alias** (`Ankara Üniversitesi` has no `entity_aliases` rows; add
   "Ankara University"). Seven records, one row, no judgement required. Worth a broader sweep
   for Turkish universities stored under their Turkish name with no English alias.

3. **Ingest the outstanding programme backlog** — UvA (4 live vs 326 researched) and VU
   Amsterdam (0 vs 163) first. This is the highest-value action in the document: it needs no new
   research, no schema change and no judgement, and it doubles name matching (64 → 115) while
   eliminating the 29 "nothing to match against" records outright.

4. **Move the 45 deadline records out of the nine `es_ch_requirements_*` files**, or rename
   those files. Today `classifyCorpusFiles` would hand all 45 to the requirement ingestion
   path on filename alone.

5. **Then, and only then, link the 45 by hand — never by rule.** 6 by name+level, 39 by unique
   URL. Present the 39 path-descendant candidates for human confirmation separately; do not
   auto-accept them.

6. **Add `program_name_input` (or equivalent) to `university_requirements`.** The deepest
   finding here is that the corpus *knows* the programme for 463 records and the schema has
   nowhere to put it, so ingestion discards it and this entire reconstruction exercise exists
   to guess it back. A nullable text column holding the source's own words — explicitly
   unresolved, never treated as a foreign key — would make the 293 real naming mismatches a
   visible, reviewable queue instead of silent loss. That is a schema proposal for the founder,
   not something this lane should write.

**What is not worth pursuing:** keying on `official_program_url` as the general mechanism. It
was worth testing and the test is negative — 8.5% deterministic on the unresolved set, because
42% of programme rows have no identifying URL and, more fundamentally, requirements are
researched from rule pages that are nobody's programme page. Keep it as one evidence tier
among several; do not build the linkage strategy on it.

### Rules any future attempt must keep

- Exact normalized-name equality within an already-resolved university. Never substring, never
  ranked-best-match.
- The source's own degree-level statement must agree. No statement means no match, not a match.
- A URL identifies a programme only when no sibling programme at that university shares it.
- Two or more name matches means no match. Refusing to choose is the correct output.
- `MA`, `MEng`, `MSci` are not degree-level evidence — MA is an *undergraduate* degree at
  Glasgow, Edinburgh and St Andrews, and MEng/MSci are undergraduate-entry integrated Master's.

One note on method, recorded because it nearly became a finding: the first version of the level
rule used substring matching and read Glasgow's `scope: "international_undergraduate"` as
**graduate** — "undergraduate" contains "graduate" — and reported two fabricated degree-level
conflicts. Word-boundary matching fixed it and the conflicts went to zero. The regression test
is `reads international_undergraduate as UNDERGRADUATE, not graduate`.
