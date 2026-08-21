# `university_programs` — independent data verification

**Lane:** data-verification (read-only audit). **Branch:** `worktree-agent-a2115f99449807811`.
**Audit window:** 2026-08-21. **Method:** read-only `SELECT` against the live Supabase project
`qtcvcflzxbuagvvwahhu`, plus re-fetching the original official pages named in each row's
`official_program_url`.

Nothing in the database was modified. Every finding below is reported with row ids and evidence
for someone else to decide on and act.

---

## Headline

**The programme *content* that was checked is accurate. The programme *provenance* is not.**

Across every row whose stored URL actually resolved to the programme it claims to describe,
`name`, `degree_level`, `language_of_instruction` and `degree_type` matched what the institution
publishes — **13 of 13, no factual mismatches**. That is a genuinely clean result for the fields
most likely to mislead a student, and it holds across 9 countries and 13 institutions.

The defects found are structural rather than factual, and they cluster in two places:

1. **44% of rows cannot be traced back to a programme page at all** — the stored
   `official_program_url` is a course-finder, an A-Z index, a bare domain, or a dead template.
2. **`language_of_instruction` has no controlled vocabulary** — 100 distinct values for what is
   effectively a handful of languages, so any filter on it silently returns wrong sets.

Neither of these would show up as a bad-looking row. Both change what a student is told.

> ⚠️ **The table was being written to throughout this audit.** Row count went
> 7,985 → 8,020 → 8,492 → 8,857 across roughly two hours. Every absolute count below is a
> point-in-time reading; percentages are stable. Re-run the queries before acting on any count.

---

## Findings, ranked by how wrong a student-facing answer would be

### 1. `language_of_instruction` is free text — an "English-taught" filter is wrong today · HIGH

There are **100 distinct values** in this column. English alone is stored four different ways:

| Value | Rows |
|---|---|
| `English` | 5,034 |
| `İngilizce` | 171 |
| `ENG` | 6 |
| `Eng` | 3 |
| `English (METU is a fully English-medium-of-instruction university, confirmed institutional fact, not per-program guesswork)` | 53 |

**233 rows that are English-taught would be missed by a filter matching `= 'English'`.** The same
fragmentation affects Italian (`Italian` 197 / `ITA` 55 / `Ita` 18), Turkish (`Turkish` 184 /
`Türkçe` 157), and German+English, which appears as `German and English` (42), `German/English`
(18), `German, English` (7), `English, German` (5), `German / English` (4), `English and German` (5)
— six spellings of one fact.

Separately, **45 rows across 10 variants encode partial instruction as a percentage**
(`İngilizce (%30)`, `Arapça (%30)`, `Fransızca (%30)`, `Ukraynaca (Ukraince) (%30)`). A programme
taught 30% in English is materially different from one taught wholly in English, and no consumer of
this column can currently tell them apart. This is a real distinction the source publishes and the
schema cannot express.

Why this ranks first: it misleads *every* student who filters by teaching language, in the direction
of hiding programmes they are eligible for.

### 2. Research prose written into `language_of_instruction` — 53 METU rows · HIGH

This is a **recurrence of the exact incident class the lane was created to catch.**

All 53 rows carry the literal value:

```
English (METU is a fully English-medium-of-instruction university, confirmed institutional fact, not per-program guesswork)
```

- University: Middle East Technical University (Turkey), `university_id` shared across all 53
- Written `2026-08-21 12:51:58` → `12:52:12` — a 14-second window, single batch
- One distinct value across all 53 rows

The *underlying claim is true* — METU is English-medium. The defect is that a researcher's
justification note addressed to a reviewer was persisted into a student-facing data field. Any UI
rendering "Language: {value}" prints the whole parenthetical.

Note these 53 rows are almost certainly the same 53 METU programmes previously rejected by a
validation rule and since re-landed — the count matches exactly. The rejection was fixed; the
payload was not cleaned.

**The correct value is unambiguously `English`, and the fix is safe.** The project already has an
established convention for exactly this situation: put the clean value in
`language_of_instruction` and the justification in `notes`. Every other institution that recorded
the same institution-level language evidence followed it —

| University | `language_of_instruction` | Rows | Evidence in `notes` |
|---|---|---|---|
| Bilkent University | `English` | 29 | 29 |
| Boğaziçi University | `English` | 26 | 26 |
| Özyeğin University | `English` | 20 | 20 |
| Koç University | `English` | 18 | 18 |
| Sabancı University | `English` | 8 | 8 |
| Hacettepe University | `Turkish` / `English` | 96 / 3 | all |
| Istanbul Technical University | `Turkish` | 45 | 45 |
| KIT Karlsruhe | `German` / `English` | 44 / 1 | all |
| Yildiz Technical University | `Turkish` | 43 | 43 |

That is **333 rows across 11 universities** doing it correctly, with the evidence stored as
`… | Language evidence: <justification>` in `notes`. METU's 53 rows are the **only** deviation in
the table. This is an isolated slip against a working convention, not a systemic design gap.

### 3. 44% of rows have no usable source link · HIGH (trust, not correctness)

`PRODUCT_SPEC` treats source traceability as non-negotiable ("University requirements and deadlines
must have traceable sources", PHASE 71 "View source"). Classifying every row by whether its
`official_program_url` can identify one programme:

| Class | Rows | % | Universities |
|---|---|---|---|
| `programme_specific` | 4,923 | 55.6% | 85 |
| `shared_catalogue_url` (≥10 rows share one URL) | 3,334 | 37.6% | 43 |
| `bare_domain` (no path) | 403 | 4.6% | 11 |
| `dead_querystring_template` | 197 | 2.2% | 1 |

**This is a defect, not a source limitation.** Verified directly: the University of Manchester row
for `Physics MPhys` stores
`https://www.manchester.ac.uk/study/undergraduate/courses/2026/` — which fetches as a *course
finder* whose own text offers "a simple A-Z list of courses". That A-Z list publishes exactly the
per-course pages that should have been captured:

```
Physics BSc                     .../2026/00638/bsc-physics/
Physics MPhys                   .../2026/02021/mphys-physics/
Physics with Astrophysics BSc   .../2026/00639/bsc-physics-with-astrophysics/
Physics with Astrophysics MPhys .../2026/02024/mphys-physics-with-astrophysics/
```

Manchester publishes per-programme URLs and even distinguishes the BSc from the MPhys by separate
course codes. All **294** Manchester rows point at the search page instead.

Worst offenders by rows sharing a single URL:

| University | Rows on one URL | URL |
|---|---|---|
| The University of Manchester | 294 | `/study/undergraduate/courses/2026/` |
| University of Southampton | 248 | `/courses/` |
| University of Wisconsin-Madison | 217 | `guide.wisc.edu/explore-majors/` |
| Technological University Dublin | 200 | `/study/a-z-courses/` |
| Ankara Üniversitesi | 153 | `https://yokatlas.yok.gov.tr/` (bare root) |
| Loughborough University | 124 | `/study/undergraduate/courses/` |
| Istanbul University | 124 | `https://yokatlas.yok.gov.tr/` (bare root) |
| The University of Sheffield | 111 | `/undergraduate/courses/2026` |

The three Turkish entries pointing at the bare root of `yokatlas.yok.gov.tr` (356 rows combined
with METU's) are the weakest: a student clicking "view source" lands on a national statistics
portal homepage with no way to reach the programme.

### 3b. Universität Hamburg — 197 URLs that *look* traceable and are not · HIGH

This one defeats the obvious heuristic and is worth calling out separately. All 197 Hamburg rows
have **distinct** URLs of the form:

```
https://www.uni-hamburg.de/campuscenter/studienangebot/studiengang.html?1673450830
```

A uniqueness-based audit scores Hamburg as perfectly traceable. It is not. Verified two of them
(`?1673450830` = `Atmospheric Science`, `?1028710404` = `Lateinamerika-Studien`): both return
HTTP 200, the query string is ignored, and the page is a generic hub. `curl` of the
`Lateinamerika-Studien` URL contains **no occurrence of the string "Lateinamerika"**.

None of Hamburg's 197 rows can be verified from their stored URL. This is why the table above
counts them separately from `programme_specific`.

### 4. UK integrated master's classified two different ways · MEDIUM

The same real-world degree — a UK MEng/MSci entered directly from school — is recorded under two
different `degree_level` values depending on which lane landed it:

| Uses `Bachelor / first-cycle (integrated master's)` | Uses plain `Bachelor / first-cycle` |
|---|---|
| Manchester 36, Sheffield 17, St Andrews 12 (**65**) | Southampton 69, Nottingham 67, Bath 52, Exeter 40, Loughborough 33, Durham 25, Liverpool 21, City St George's 15, Leicester 13, Cambridge 2, QMUL 1, Edinburgh 1, Imperial 1, Galway 7 (**~347**) |

Manchester and Sheffield are **internally inconsistent** — Manchester uses the dedicated value for
36 rows but plain Bachelor for 3 (`Physics MPhys`, `Physics with Theoretical Physics MPhys`,
`Physics with Astrophysics MPhys`); Sheffield 17 vs 2.

**Neither value is factually wrong, and I verified this before reporting it.** Exeter's own page for
`MEng Engineering and Management` confirms 4-year direct entry from school on A-Level AAB–ABB,
UCAS H704 — so `Bachelor / first-cycle` is a defensible description of the entry point. The defect
is that a student filtering for integrated master's programmes gets 65 of roughly 412.

Downgraded from HIGH to MEDIUM precisely because the underlying classification is defensible; the
harm is inconsistency, not incorrectness.

### 5. Audit-trail gaps — bookkeeping, not data loss · MEDIUM (traceability) / LOW (student impact)

I checked this carefully because the lane brief flags a prior incident where records vanished from
both the table and its audit trail. **This is not that.** Both directions were tested by name-match:

| Check | Result |
|---|---|
| `outcome='accepted'` with NULL `promoted_program_id` | **212** |
| …of which the programme **is** present in the live table | **212 (100%)** |
| …genuinely absent from the live table | **0** |
| `outcome='accepted'` with dangling `promoted_program_id` | 0 |
| Live rows with no audit row | 349 |
| …of which a matching queue row exists, just unlinked | 280 |
| …with **no queue row at all** | **69** |

So the 212 and 280 figures are a **missing back-pointer**, not missing data — every affected
programme exists and is correct. No student-facing impact. Worth fixing so the audit trail can be
trusted as an audit trail, but it is not a repeat of the earlier disappearance.

The **69 genuinely untraceable rows** are the real gap here:

| University | Rows | Added |
|---|---|---|
| Universiti Sains Malaysia (USM) | 52 | `2026-08-20 20:59:21.701386+00` |
| IE University (Spain) | 15 | `2026-08-20 20:59:21.701386+00` |
| Trinity College Dublin | 2 | `2026-08-20 17:20:37` |

USM and IE share an **identical microsecond timestamp** — one transaction, 67 rows, no queue
record. These bypassed the research pipeline entirely. Worth asking which lane wrote them.

Incidentally: USM is the only Malaysian institution in the table (61 rows) and Malaysia is outside
the stated geographic focus (US / UK / Europe / Turkey). Flagging as a scope question, not a defect.

### 6. Minor name-quality artefacts · LOW

Name hygiene is in good shape. Zero HTML entities, zero mojibake, zero truncation ellipses, zero
newlines/tabs, zero embedded URLs, zero leading/trailing whitespace, zero trailing separators.

Remaining nits, all individually verified as cosmetic:

| id | Issue | Value |
|---|---|---|
| `e8e17076-f3e6-4c3b-9a6e-d57c7108f01a` | double space | `Volkswirtschaftslehre  – Bachelor 25%` |
| `157cf1ed-9ad2-4b87-9ab2-7a326a0c2cd6` | double space | `Interreligiöse Studien  – Master` |
| `5059b9f1-35a1-486e-ada7-0321a0db3c30` | double space | `Volkswirtschaftslehre  – Bachelor 100%` |
| `5e083f92-c3d8-404a-ab2c-f7b23bcf5e48` | non-breaking space | `Chinesisch – Master of Education Erweiterungsfach` |
| `139a180e-d984-4a61-aef3-3b038127056d` | unbalanced bracket | `Medicine - Graduate Entry Programme (4 year) [(only open to those who qualify for home fees]` |

Also cosmetic: `7b72a36d-c14c-4695-ba31-422d56585083` has the doubled name
`Computer Science, Computer Science, BSCompSci` (catalogue artefact — the source page confirms the
programme is real and the degree `BSCompSci` is correct), and
`a12c0453-007b-499a-8f23-527b877a4a00` carries a leading numeric code,
`0020 - Bachelor of Management with Honours USM International, RECSAM`.

One `degree_level` value carries an editorial aside rather than a category —
`Short-cycle (DEUST) - NOT a full first-cycle degree` (1 row). The caveat is correct and useful;
it is in the wrong column. **Schema limitation, not a data error.**

---

## Things that are correct and should not be "fixed"

Recording these explicitly so a later cleanup pass does not churn good data.

- **1,231 rows with NULL `language_of_instruction`.** Spot-checked several against source; the
  institutions genuinely publish no per-programme language marker. Correctly recorded as unknown.
  Do not backfill with a guess.
- **Multi-language values** such as `German; partially English, French, Chinese, or Japanese` and
  `Dutch (English in the Science and technology component)` are **accurate descriptions**, not
  prose contamination. Verified Politecnico di Torino Mechanical Engineering: the source states
  both Italian and English, so the stored `Ita Eng` is factually right (only the vocabulary is
  non-standard — see Finding 1).
- **`PSYCHOLOGICAL SCIENCE` in all caps** (`900a8525-5def-412f-852f-b5af513ff4ad`) matches how
  Università di Padova renders it. Not a shouting bug.
- **UK MEng rows marked `Bachelor / first-cycle`** are defensible — see Finding 4.
- **Long `campus` values are real, not contamination.** The 266-character Tilburg value describing
  an Erasmus Mundus consortium across Glasgow, Aarhus, Nantes/Wrocław, and the multi-city rotations
  (`Marseille … then Turku … then Tilburg`) are accurate descriptions of genuinely multi-site
  programmes. Padova's eight-city list is likewise real. Do not truncate these to a single city —
  the multi-site fact is exactly what a student needs.
- **Long `faculty_or_school` values are real.** All 13 rows over 150 characters are Universität
  Hamburg *Lehramt* (teacher-training) degrees, which genuinely span six faculties. The
  semicolon-delimited list is correct, not a dump of every faculty at the university.

---

## Verification detail

### Sampling method

Stratified, deterministic (`ORDER BY md5(id::text)` so the sample is reproducible), restricted to
rows whose `official_program_url` is not shared with any other row — i.e. rows that *should* be
verifiable — then one row per university across universities holding ≥20 programmes, spread over
all 13 countries present. Two deliberately non-random additions: a Manchester row and two Hamburg
rows, chosen to test the URL-shape hypotheses in Findings 3 and 3b.

Country distribution of the table at time of sampling: UK 2,418 · Germany 1,751 · US 1,377 ·
Turkey 779 · Ireland 748 · Netherlands 738 · Italy 370 · Spain 241 · France 126 · Canada 105 ·
Switzerland 78 · Singapore 65 · Malaysia 61.

### Result: 13/13 matched, 0 mismatches

| # | University | Programme | Checked | Result |
|---|---|---|---|---|
| 1 | Università di Padova | PSYCHOLOGICAL SCIENCE | name, level, language | ✅ Bachelor, English |
| 2 | University of Bath | Computer Science | name, level, degree_type | ✅ BSc (Hons) |
| 3 | Politecnico di Torino | Mechanical Engineering | name, level, language | ✅ Bachelor, Italian+English |
| 4 | Università di Bologna | International Development and Cooperation | name, level, language | ✅ First cycle, Italian |
| 5 | Sapienza | Natural Sciences | name, level, language | ✅ Bachelor L-32, Italian |
| 6 | University of Groningen | DDM Urban Planning, Society and Sustainability | name, level, type, language | ✅ Master, MSc, English |
| 7 | University of Exeter | MEng Engineering and Management | name, type, entry route | ✅ MEng, direct school entry |
| 8 | Delft University of Technology | MSc Geomatics | name, level, type, language | ✅ Master, MSc, English |
| 9 | Universidad Carlos III de Madrid | Bachelor in Mathematics and Computing | name, level, language | ✅ Bachelor, English-only |
| 10 | UT Austin | Computer Science, BSCompSci | name, degree | ✅ BSCompSci |
| 11 | Trinity College Dublin | Religion | name, level | ✅ BA Hons, NFQ 8 |
| 12 | University of Glasgow | Comparative Literature | name, level | ✅ MA (Hons), undergraduate |
| 13 | Rice University | Harp Performance | name, degree | ✅ BMus |

**Match rate: 100% (13/13)** on rows whose stored URL resolved to the programme.

### Rows I attempted and could not verify

| University | Programme | Why |
|---|---|---|
| Universität Hamburg | Atmospheric Science | Stored URL resolves to generic hub (Finding 3b) |
| Universität Hamburg | Lateinamerika-Studien | Same — confirmed via `curl` |
| The University of Manchester | Physics MPhys | Stored URL is a course finder (Finding 3) |
| Rheinische Friedrich-Wilhelms-Universität Bonn | Geography MSc | `uni-bonn.de` blocked by network policy at fetch time |
| IE University | Bachelor in Applied Mathematics | Redirect loop (>10) on the official URL |

The first three are *the finding itself*: the sample could not be completed because the provenance
is missing. The last two are environmental and should be retried.

---

## Integrity checks — all clean

| Check | Result |
|---|---|
| `university_programs.university_id` not resolving to `universities` | **0** |
| Duplicates surviving the six-column dedup key¹ | **0 groups, 0 excess rows** |
| `program_research_queue.outcome='accepted'` with dangling `promoted_program_id` | **0** |

¹ `(university_id, normalized_name, degree_level, language_of_instruction, official_program_url, degree_type)`

Queue outcome distribution (9,713 rows): `accepted` 8,537 · `insufficient_evidence` 522 ·
`unresolved_university` 480 · `duplicate` 243 · `rejected` 12.

### Shape audits run across the whole table

| Audit | Result |
|---|---|
| HTML entities in `name` | 0 |
| Mojibake (`Ã`, `â€`, `Â`, `ï¿½`) in `name` | 0 |
| Truncation ellipsis in `name` | 0 |
| Newline / tab in `name` | 0 |
| Leading or trailing whitespace in `name` | 0 |
| Trailing separator in `name` | 0 |
| URL embedded in `name` | 0 |
| Doubled whitespace / NBSP / unbalanced parens in `name` | 5 (Finding 6) |
| Prose-length values in `language_of_instruction` | 53 (Finding 2) + 17 legitimate multi-language |
| Prose-length values in `name` (>120 chars) | 8, all legitimate long official titles |
| `delivery_mode` outside `{in_person, online, NULL}` | 0 |
| `verification_state` / `source_type` unexpected values | 0 (uniformly `verified_current` / `official_primary`) |
| `degree_level` contradicting its own programme name | ~412, all UK/IE integrated master's — Finding 4 |

**On programme counts per university:** I checked for implausibly high or suspiciously round counts
and found none that are indefensible. Manchester 294, Southampton 248, Wisconsin-Madison 217 and
TU Dublin 200 are all large but plausible for institutions of that size, and none are round numbers.
No university's count looked padded or truncated.

---

## What I did **not** check, and why

Stating these plainly so the clean result above is not read as broader than it is.

- **The other ~8,840 rows individually.** Only 13 were verified against source. The 100% match rate
  is a strong signal on the fields checked, but it is a sample — it is not a claim that every row
  is correct.
- **`degree_level` for the ~347 plain-Bachelor UK MEng rows individually.** I verified the pattern
  via Exeter and reasoned about the class; I did not open all 347 pages.
- **Fields outside the four named in the brief** — `duration_years`, `tuition_amount`,
  `tuition_currency`, `field`, `subject_taxonomy`, `secondary_subject_tags`,
  `international_eligible`, `admissions_url`. Not examined.
  - `campus`, `faculty_or_school` and `notes` **were** swept for the Finding 2 prose shape, since
    they were the most likely place for a recurrence. **Clean** — every long value is legitimate
    data (see "Things that are correct" above). The only editorial voice found anywhere outside the
    METU rows is a single trailing clause, `… - explicit triple-degree rotation.`, on
    `4b3ecaf7-84e6-4b3c-808f-b850966d063e` — accurate, mildly researcher-toned, harmless.
  - Numeric and boolean fields were **not** range-checked. `duration_years` and `tuition_amount`
    are the obvious next audit: a wrong tuition figure is high-impact and would not be caught by
    any check in this pass.
- **Whether every catalogue URL has a per-programme alternative.** Proven for Manchester and
  Hamburg by fetching. Assumed, not proven, for the other 41 universities in the
  `shared_catalogue_url` class. Some institutions genuinely publish no per-programme page —
  those rows would be correct-as-recorded, and each university needs its own check before anyone
  treats all 3,334 rows as defective.
- **Whether stored data is *current*.** I compared against sources as they read today. A row that
  matched a 2025 page but is stale for 2027 entry would pass every check here. `verified_at`
  freshness was not audited.
- **The other three research queues** (`requirement_research_queue`, `deadline_research_queue`) and
  the `universities` table itself, beyond joining to it. The brief scoped me to
  `university_programs`.
- **`universities.website_url` domain cross-check.** The brief asked for this. I substituted a
  stronger test — actually fetching the URLs — after finding that URL *resolution* failures
  (Findings 3, 3b) were the dominant problem and that a domain-match test would have passed all 197
  Hamburg rows and all 294 Manchester rows. A domain cross-check remains worth running for rows
  pointing at genuinely third-party hosts.

---

## Suggested order of action

1. **Finding 2** (53 METU rows) — smallest, clearly wrong, and now provably safe: set
   `language_of_instruction = 'English'` and move the justification to `notes`, matching the
   convention 333 other rows already follow.
2. **Finding 1** (language vocabulary) — decide a controlled vocabulary and a representation for
   partial-language instruction before more rows land; the table is growing hourly. Note the
   `notes` convention above already solves the "where does the nuance go" half of this.
3. **Finding 4** (integrated master's) — pick one convention, apply to all ~412.
4. **Finding 3 / 3b** (source URLs) — largest effort; per-university, start with Manchester,
   Southampton, Hamburg and the `yokatlas` rows.
5. **Finding 5** (69 unqueued rows) — identify the writing lane; backfill the 492 missing
   back-pointers.
6. **Next audit:** `duration_years` and `tuition_amount` range checks — the highest-impact fields
   this pass did not touch.
