# Opportunities / Turkish placements / counselor knowledge — verification audit, 2026-08-22

**Scope.** Three datasets, audited read-only against live sources. No database writes were made.

| Dataset | Rows / files | Coverage achieved |
|---|---|---|
| `opportunities` | 391 | Every row, via structural sweeps; targeted live fetches on the worst findings |
| `university_program_placement_cycles` | 456 | **Every row**, reconciled field-for-field against YÖK Atlas's live API |
| `docs/counselor-knowledge/*.md` | 11 country docs + README | Every cited record id resolved; claim-tagging swept; 15 citations read back against their records |

Project `qtcvcflzxbuagvvwahhu`. Builds on, rather than repeats,
`docs/research/verification/opportunities-verification-2026-08-22.md` (the prior live-source pass)
and `docs/handoffs/yok-atlas-placements-scale-12-universities.md`.

Findings are ranked **misleading above incomplete** throughout: a row that tells a student
something false outranks a row that tells them nothing.

---

## SEVERITY 1 — Misleading: facts that are wrong or invisible where it matters

### 1.1 Three `active` opportunities are gated to a country value that matches no student

`eligible_countries` is a structured list the matching gate compares with
`isSameCountry` (`lib/opportunities/matching.ts`). The ten descriptive-prose rows flagged earlier
are gone — no prose survives anywhere in the column. But the cleanup normalised the worst
offenders and left three rows whose values still fail the gate.

The column's entire vocabulary is now 11 values across 26 rows. Three do not resolve. Verified by
running the shipping `canonicalCountryKey`/`isSameCountry` against the live values, not by reading
the code:

| Stored value | Normalises to | Matches "Türkiye" | Matches "United States" |
|---|---|---|---|
| `Türkiye` | `turkey` | yes | no |
| `Türkiye (residents)` | `turkiye residents` | **no** | no |
| `Global` | `global` | **no** | **no** |

`normalizeEntitySearchText` keeps the parenthetical as tokens, and `COUNTRY_ALIASES` maps only the
bare `turkiye -> turkey`.

- **`2833637b` Geleceği Eşitle — Sustainable Livelihoods TTT** (`active`, `cycle_status=open`) and
  **`600c8ff6` Genç UPSHIFT Sosyal Girişimcilik Programı** (`active`, `date_not_announced`) are
  gated to `Türkiye (residents)`. Both are Turkey-specific programmes, so they are invisible to
  precisely their intended audience — the identical harm the prose bug caused, spelled differently.
- **`95b3b7dc` Schoolhouse.world Tutor Certification** (`active`, `open`) is gated to `Global`.
  This one is *inverted*: a non-empty list means the gate is on, and `isSameCountry(anything,
  "Global")` is false, so a value meant to say "open to everyone" functions as "open to no one."
  It is hidden from every student with a country on file and shown only to students without one.

**Root cause is structural, not three bad cells.** Nothing constrains this column to a resolvable
vocabulary. Any value failing `canonicalCountryKey` degrades silently into a permanent exclusion —
no error, no log, no test. The next research pass can reintroduce this at any time.

### 1.2 Live rows whose `official_url` points at something that is not the programme

The prior pass found one professor's-CV URL. It is a class: **24 rows carry the canonical
programme URL inside `description` while `official_url` points elsewhere — 14 of them `active`.**
The ingest had the right URL available and stored a different one. Confirmed by direct fetch, not
inferred:

| Row | Status | `official_url` actually is |
|---|---|---|
| `e0960bef` University of St Andrews (Scotland, UK) | **active** | `research-portal.st-andrews.ac.uk/en/persons/zainab-teraif/` — a named doctoral candidate's personal research profile (an English instructor at Bahrain Polytechnic), unrelated to any summer school |
| `1e907aad` King's College London (London, UK) | **active** | A KCL Pure record for a psychiatry meta-analysis on RCT representativeness — a publication, not a programme |
| `e03e1172` Summer High School Programs - at BU | **active** | `hasdhawks.org`, a school-district site; `bu.edu` is in the description |
| `2b1886f1` Nat Geo Slingshot | **active** | A Spanish **draft** PDF asset (`…Slingshot-7-Tips-2026-Spanish-Draft-2.pdf`) |
| `907e279d` New York University (NY, USA) | **active** | `wp.nyu.edu/birdvox/news/`, an unrelated research-project blog |
| `a7a89e1e` Lehigh University: Bethlehem, PA | **active** | A graduate-admissions event schedule |
| `3c4cbeb7` Pre-College Program (IE) | **active** | An events page for a bachelor's fair |
| `7cfc009f` Oxford Royale Summer Schools | under_review | `https://www.ox.ac.uk/` — **credibility-inverting**: Oxford Royale is a private company, and pointing it at the University of Oxford's homepage implies the University runs it |
| `dc4343ec` Koç University camp | under_review | **Acıbadem University** — a different institution entirely |
| `ccc1ff13` Mathworks (HSMC) | under_review | The professor's CV page found previously; the correct `txstate.edu` URL is in the description |

Two of these (St Andrews, Mathworks) serve an identifiable individual's personal page as a
programme's official source.

### 1.3 Six `active` rows advertise a cycle that ended one to three years ago, and say so in their own title

All six are `active` with a **NULL deadline**, so no date rule can catch them — yet the evidence of
staleness is sitting in the record's own title field, and nothing reads it:

- `a29d4ef0` "Summer Science Research Program (SSRP) **2023**"
- `dc762fce` "Edinburgh Summer School **2024**"
- `ccd1cf71` "Summer at Stanford Program for High School **2025**"
- `eaabbbee` "UCL The Bartlett Summer Schools **2025**"
- `b10444c7` "Summer Programs in the Netherlands - **2025**"
- `7dabbd20` "USC Summer Programs **2025** Info Sessions"

A student in August 2026 is shown a 2023 cohort as a live opportunity. Unlike the Stanford SASI
case — which genuinely requires re-fetching the source page — this is cheaply detectable from
stored data alone.

### 1.4 A webinar announcement is live as an opportunity

**`910ec94d`**, `status='active'`, title `"Time: 4:30pm – 5:30pm (Hong Kong time) (time in your
region)"`. Reported in the prior pass and never actioned. Its `official_url` is a Vietnamese high
school's news page about an HKBU webinar — not HKBU's own page — and its `description` holds a Zoom
registration link. `organization` is NULL. This is not a stale opportunity; it is not an
opportunity.

### 1.5 A live duplicate: one programme, two `active` cards

`a29d4ef0` "Summer Science Research Program (SSRP) 2023" and "The Rockefeller University Summer
Science Research Program (SSRP)" share `rockefeller.edu/outreach/ssrp/` and **both are `active`**.
One of the two also carries the stale 2023 title from §1.3.

---

## SEVERITY 2 — Structural: the ingestion defect behind most of Severity 1

### 2.1 182 rows hold an unparsed delimited source record in `description`; 78 are live

**47% of the catalogue** (182 of 391) has a raw pipe-delimited corpus record dumped verbatim into
`description`. Example, `ccc1ff13`:

```
Mathworks (Honors Summer Math Camp) | Texas State University - San Marcos |
http://www.txstate.edu/mathworks/camps/... | <real description> | 18.0 |
Teacher Recommendation Transcript Essay | 4000.0
```

**78 of these are `status='active'`** — students read the raw delimited string, stray numbers and
all, as the opportunity's description.

The same failure explains the rest: **181 of the 182 also have `organization` NULL even though the
organisation name is field 2 of that same string**, and the wrong-URL class in §1.2 is the ingest
picking a different URL than the one in field 3. A delimited corpus was loaded without being
parsed into columns. Fixing the parser addresses §1.2, §2.1 and most of §2.2 together; patching
rows one at a time does not.

**198 rows total have `organization` NULL (81 `active`)** — so organisation-based display, dedup
and matching cannot work for half the catalogue.

### 2.2 Titles that are not programme names

Beyond §1.3 and §1.4:

- **11 rows titled as bare institution + location labels** — "New York University (NY, USA)",
  "Lehigh University: Bethlehem, PA", "Carnegie Mellon University (PA, USA)", "University of St
  Andrews (Scotland, UK)", "King's College London (London, UK)", "George Washington University:
  Washington, DC", "University of Southern California (CA, USA)" — **7 of them `active`**. These
  name an institution, not an opportunity, so a student cannot tell what is on offer.
- **Marketing copy as a title**: `7f8281b0` "Earn college credit that may transfer to any college
  you attend" (`active`); `1d9d3901` "For-Credit Fun-Sized Courses" (`active`).
- **A page-title artifact**: `053114c6` "Future Ready Summer Experience Program 2025 | Inspiring
  Global Citizens".
- **A hosting centre's name used as a programme title**: `c35f002c` "Wharton Sports Analytics and
  Business Initiative" — see §4.1.

---

## SEVERITY 3 — Incomplete: honest gaps, not false statements

### 3.1 The dateless-closure class: 186 rows

The count requested. **186 rows are `status='active'` with a NULL `deadline` and an actionable
`cycle_status`** — structurally invisible to the date-only rule in `isOpportunityActionable`:

| `cycle_status` | Rows |
|---|---|
| `unverified` | 100 |
| `date_not_announced` | 44 |
| `open` | 22 |
| `upcoming` | 20 |
| **Total** | **186** |

The 22 `open`-with-no-date rows are the sharpest subset: they assert "applications are open" with
nothing to check that claim against. The Stanford SASI case lives among the 20 `upcoming`.

**The date-based half of the gate is clean.** Zero rows are `active` with a passed deadline and no
closure marker — every already-past deadline carries a correct `closed`/`historical` status. The
lifecycle gap is entirely the dateless class, and closing it needs the source-refetch job
(AGENTS.md Phase 30 Jobs B and E), neither of which is built.

### 3.2 `eligible_countries` is empty on 93% of rows, and empty cannot mean two different things

**365 of 391 rows (246 `active`) have an empty `eligible_countries`** — no gate, shown to everyone.
The 26 gated rows are coherent on inspection (US scholarships, UK olympiads). The risk is in the
empty set, and it is genuinely mixed: many entries are legitimately global, but the prior pass
confirmed from its own source page that **Coca-Cola Scholars is US-citizen/permanent-resident
only** — and that restriction is not in the structured column.

The schema conflates "no restriction exists" with "nobody researched one." Auditing 365 rows
against their sources was beyond this pass; what is certain is that empty-means-open is doing real
work for 246 live rows on a column that cannot distinguish the two facts. A third state, or a
`eligibility_researched_at` marker, would separate them.

### 3.3 Recipient-identifying data — the URL columns are clean

**Zero** rows carry tracking or recipient-identifying query strings in `official_url`,
`source_url` or `application_url`. The Bath fix held and a full-corpus sweep
(`_cldee`, `recipientid`, `esid`, `utm_*`, `mkt_tok`, `mc_eid`, `fbclid`, bare `email=`, `@`)
found nothing else.

Lower-severity residue, all in `description` rather than the URL columns:
- **8 rows** embed tracking parameters (3 `active`), including HubSpot `_hsenc`/`_hsmi` on
  `269c4d5e` Young Founders Lab.
- **4 rows** contain an email address — `hsp@columbia.edu`, `precollege@tufts.edu`,
  `elcentro@neiu.edu` (departmental role addresses) and `heidi.vicente@vesalius.edu` (a named
  individual). All four are `under_review`, and all four are *published programme contacts*, not a
  third-party recipient — materially different from, and much less severe than, the Bath case.

---

## 4. Duplicates versus supersession — distinguished, both sides verified

### 4.1 Wharton: a genuine duplicate, confirmed from both pages

I fetched both. `wsb.wharton.upenn.edu/wharton-data-competition/` and
`globalyouth.wharton.upenn.edu/competitions/data-science/` describe **the same event**: the Wharton
High School Data Science Competition, run by the Wharton Sports Analytics and Business Initiative
(WSABI) and supported by the Wharton Global Youth Program. The globalyouth page states it verbatim:
the competition comes "from the Wharton Sports Analytics and Business Initiative, supported by the
Wharton Global Youth Program."

So **`c35f002c` "Wharton Sports Analytics and Business Initiative" is the hosting centre's name
used as a programme title**, and duplicates `cfb32772` "Wharton Data Science Competition". It is
`under_review`, so not live. Merge, do not promote.

### 4.2 TechGirls: deliberate supersession, correctly configured

`7081b03a` (generic fellowship, `active`) and `58d2e707` (Virginia Tech-specific 2026, `disabled`)
share `techgirlsglobal.org/apply/`. The live page makes no mention of a Virginia Tech track.
Disabling the year/institution-specific row in favour of the currently-live generic one is the
right configuration. **No action needed** — this is the system working.

### 4.3 Neither duplicate nor supersession: shared generic URLs

"Global Issues at Princeton: Grades 10-12" (`active`) and "Civic Leadership Institute (Grades
9-12)" (`under_review`) both point at JHU CTY's generic `/cty-experience/courses` index. These are
**distinct programmes that were never given their own canonical URL** — a provenance gap, not a
duplicate. Same shape for "Two-week UM Academies (non-credit)" and "University of Miami".

---

## 5. Turkish placement data — 456 rows, all verified

Rather than the requested 15-20 row spot check, I pulled YÖK Atlas's **full live dataset** (21,493
records, keyless `POST /api/tercih-kilavuz/search`) and reconciled **all 456 rows**.

### 5.1 Result: 456/456 reconcile exactly

Every row matched on `kilavuz_kodu`, then agreed field-for-field on `min_puan`, `basari_sirasi`,
`kontenjan`, `puan_turu`, `burs_orani_adi` and `fymk_id`. **Zero mismatches, zero dangling codes.**

### 5.2 `cycle_year` is correct — the failure I expected did not occur

All 456 rows are `cycle_year=2026` / `cycle_label='2026-YKS'`; the column is `NOT NULL`, so "a
cut-off with no cycle" is structurally impossible.

The real risk was subtler and worth stating, because it nearly went the other way. The endpoint is
the **tercih kılavuzu** — the preference guide, published *before* placement — whose score columns
conventionally carry *last year's* figures. Worse, the on-disk snapshot
(`data/research/yok-atlas-placements-2026-08-21.json`) **trims away the source's own `yil` and
`sinav` fields**, so the year label cannot be checked from the stored artifact at all. It was
assigned by the ingest, not read from the record.

Settled against year-labelled published history for two independent programmes:

| Programme | Live top-level | `minPuan1` | `minPuan2` | `minPuan3` |
|---|---|---|---|---|
| METU Elektrik-Elektronik (İng.), 108410354 | 539.79908 / 1205 | 532.88444 / 1484 | 534.41115 / 1603 | 538.04447 / 1913 |
| Published history | *no year ≤2025 matches* | **2025** | **2024** | **2023** |
| Hacettepe Tıp (İng.), 104810626 | 541.38019 / 965 | 534.82259 / 1169 | — | — |
| Published history | *no year ≤2025 matches* | **2025** | | |

The top-level fields are therefore the **2026** cycle — announced ~21 August 2026 and fetched
2026-08-21 17:55 UTC, within hours of publication. **The label is right, and the data is genuinely
current-cycle, not last year's relabelled.**

### 5.3 Resolved: the `gk1/gk2/gk3` cluster is prior-cycle data

Migration 0055 and `docs/handoffs/yok-atlas-placement-schema-decision.md` both flagged the
`gk1/minPuan1/basariSirasi1 … gk3/minPuan3` cluster as "investigated and left unresolved — values
did not look like a clean prior-year progression," and invited whoever confirmed a meaning to
record it. Confirmed on both programmes above: **`gk1` = 2025, `gk2` = 2024, `gk3` = 2023.**

The migration's caution was right in method, wrong in conclusion. Three further years of
per-programme trend data sit unmodelled in the source — the cheapest available upgrade to this
dataset, and exactly what the one-row-per-`(program, cycle)` schema was built to hold.

### 5.4 Consistency and identity checks — all clean

- **`placement_status`**: 425 `filled` all carry score AND rank; 31 `unfilled` carry neither. Zero
  partial cases. The null-together invariant holds across all 456.
- **`program_id` → university**: zero disagreements. Each live record's own `universiteAdi` matches
  the university the `program_id` resolves to — Ankara 153, İstanbul 120, METU 79, Hacettepe 51,
  İTÜ 44, Sabancı 9. Exactly one placement row per programme; no fan-out. The `universities` table
  holds 12 distinct Turkish rows with no duplicates or tombstones, so nothing points at a
  superseded institution.

### 5.5 The four score types are never compared across — because nothing reads them

SAY / EA / SÖZ / DİL are all present and correctly stored per row. But the honest answer is
structural: **no read path exists.** Grepping the application, `min_puan` / `basari_sirasi` /
`puan_turu` appear only in the ingestion matcher (`lib/programs/yok-atlas-matching.ts`) and its
tests. No UI, no advisor context, no admission-outlook consumer.

Two consequences: there is **no false-precision risk live today**, and there is also **zero product
value** being delivered by the most decision-relevant dataset in the corpus. The cross-type hazard
is entirely latent — whoever builds the first read path must not let a 516 EA sit beside a 541 SAY
as though comparable, and must carry `cycle_year` into the UI so a 2026 cut-off is never shown as
timeless.

---

## 6. Counselor knowledge documents

### 6.1 Every cited record id resolves

73 distinct `REQ-…`/`DL-…` ids are cited across the 11 documents. Checked against all 2,374 corpus
records in `data/research/university-requirements/*.jsonl`: **all 73 exist. Zero dangling
citations.**

### 6.2 Cited records say what the documents claim — 15 read back, 15 accurate

Sampled across countries and claim types, including the highest-leverage cross-cutting ones:

| Claim | Record | Verdict |
|---|---|---|
| Ankara TR-YÖS-only, min 440, for Medicine/Dentistry/named engineering | REQ-…-9320 | Accurate — record reads "Minimum 440 points from TR-YÖS" for exactly those programmes |
| Hacettepe quota split 60/30/10 TR-YÖS/SAT/A-Level | REQ-…-9306 | Accurate, verbatim Turkish + translation |
| METU rejects IELTS taken on/after 24 Dec 2022 | REQ-…-9102 | Accurate, verbatim |
| Bilkent rejects predicted grades | REQ-…-6008 | Accurate, verbatim |
| Ankara diploma route, GPA 80/100, used only for leftover quota | REQ-…-9326 | Accurate — but see §6.4 |
| TOEFL cutover 21 Jan 2026 | REQ-…-4001 | Accurate |
| New 1–6 scale, overall is the *average* not the sum | REQ-…-4002 | Accurate |
| 0–120 comparable provided for two years, **overall only** | REQ-…-4003 | Accurate, including the subtle "sections are NOT restated on 0–30" crux |
| Edinburgh republished on new scale (4.5 / 4.0) | REQ-…-4004 | Accurate |
| Glasgow per-subtest minimums unsatisfiable post-cutover | REQ-…-4005 | Accurate, `NEEDS_REVIEW` as described |
| Boğaziçi 79 total / 22 writing, no cutover date | REQ-…-4006, -0020 | Accurate |
| Göttingen does not use uni-assist | REQ-…-GOE0003 | Accurate |
| CMU three-way ED/RD date conflict | DL-…-CMU0001, -CMU0004 | Accurate — but see §6.5 |

No misrepresentation of a cited record was found.

### 6.3 Untagged claims — a citation-hygiene defect, not fabrication

The README's contract is explicit: *"Every claim in these documents is labelled with one of two
tiers,"* with VERIFIED requiring an inline record id. A sweep for blocks containing a specific
checkable fact (number, date, percentage, named test/score) with no inline id and outside a
`SYSTEM-LEVEL BACKGROUND` section returned **34 blocks**. On review most are continuation text of
an adjacent cited claim, corpus-level statistics about the research itself, or meta-commentary. But
roughly **ten are confident, specific, student-facing claims with no resolvable pointer**, including:

- **`netherlands.md`** — "Tilburg accepts a Genel Lise Diploması … only if the Diploma Puanı clears
  85%", excluding Imam-Hatip/Meslek/Teknik; "VU Amsterdam requires either an 80% GPA plus 4
  qualifying AP exams scored 3-5, or at least one completed year of Turkish Lisans credits." No
  tier label, no id, directly student-facing and numeric.
- **`united-states.md`** — the entire early-admission shape list (MIT EA-only, Princeton/Yale
  REA-only, Columbia one binding round, NYU ED II, Michigan ED+EA+RD, Georgia Tech EA1/EA2) is
  headed "VERIFIED, per-institution" but carries no ids; likewise the financial-aid list
  (Harvard/Yale/Princeton need-blind for internationals, Stanford need-aware, Princeton does not
  use CSS Profile).
- **`turkey.md`** — "up to 24 programme codes"; "as of the 2026 cycle, every candidate registered at
  or graduated from a secondary institution in Turkey or the TRNC must enter through YKS — with
  only three narrow named exceptions."
- **`switzerland.md`** — "At 10 of the 12 institutions" (a derived count with no pointer).

**Critically, I found no fabrication.** Every untagged claim I spot-checked is factually correct:

- The Tilburg 85% rule and the Imam-Hatip/Meslek/Teknik exclusion appear **verbatim** in the
  corpus (`tilburguniversity.edu`, `VERIFIED_UNDATED`) — the fact is sourced, the *pointer* is
  simply missing from the document.
- "Up to 24 programme codes, associate and Bachelor's together" is confirmed against ÖSYM's own
  2026 tercih rules.

So the defect is that a reader — human or advisor — cannot resolve these claims back to evidence,
not that the claims are invented. That is real (the README promises resolvability, and an advisor
instructed to prefer VERIFIED facts cannot tell these apart from background), but it is a
documentation gap, not a trust failure.

### 6.4 One material omission inside an otherwise accurate citation

`turkey.md` quotes Ankara's diploma route as *"GPA of at least 80 out of 100"* and correctly
explains the leftover-quota demotion. The cited record REQ-2026-08-21-9326 carries one more clause
the document drops: **"(Excluding high school diplomas obtained from schools located in Türkiye.)"**
For a Turkey-focused product this is the load-bearing half — a student at a Turkish school cannot
use this route at all. The surrounding section is about the foreign-national pathway, so it is
implied by context, but it should be stated.

### 6.5 31 resolved conflicts are still machine-readable as unresolved

Of 50 corpus records carrying `verification_state: CONFLICTING_EVIDENCE`, **31 have
`researcher_notes` containing an explicit RESOLUTION / "NOT A CONFLICT" finding** — the conflict
was investigated and closed, but the state field was never updated. The counselor docs describe
several of these as resolved (correctly, per the notes), while any code reading
`verification_state` will still treat them as disputed.

This errs toward over-caution rather than false confidence, so it is not misleading to a student.
But the human-readable and machine-readable layers of the same record disagree, and the documents
have silently taken the human-readable side.

---

## Verdict: which of these three datasets can go in front of a student today?

**Turkish placement data — yes, unreservedly, and it is the strongest dataset in the corpus.**
All 456 rows reconcile exactly against the live official source; the cycle label is correct and
independently confirmed on two programmes; `placement_status` is internally consistent; every row
resolves to the right university. It is accurate, current to within hours of publication,
traceable, and correctly attributed. The only reason it is not in front of a student is that
**nothing reads it** — there is no read path at all. The work needed is a UI, not a data fix. Two
conditions on building it: never compare across the four score types, and always carry
`cycle_year` into the display so a 2026 cut-off is never rendered as timeless.

**Counselor knowledge documents — yes, with a caveat that is smaller than it first looks.**
Every one of the 73 cited record ids resolves, and all 15 citations I read back accurately
represent their records, including the subtle TOEFL-rescale crux that most sources get wrong.
The gap is citation *completeness*, not correctness: about ten confident student-facing claims
carry no resolvable pointer, and every one I spot-checked turned out to be true and, in the
Tilburg case, verbatim-sourced in the corpus. The honest risk is that an advisor told to prefer
VERIFIED facts cannot distinguish these from background — so they should be tagged before the
documents are treated as the advisor's authority, but they are not spreading falsehoods today.
Fix §6.4's dropped exclusion clause first; it is the one place where an omission changes the
answer a student gets.

**The opportunities catalogue — no, not in its current state.** This is the one to hold back, and
the reason is not staleness. Staleness is honest failure; this catalogue is failing in ways that
actively mislead. A student browsing it today can be shown a doctoral candidate's personal profile
page as a summer school's official source, a psychiatry meta-analysis as King's College London's
programme page, the University of Oxford's homepage as a private company's credential, a 2023
cohort presented as a live opportunity, a webinar time string as a programme name, and 78 records
whose description is a raw pipe-delimited spreadsheet row. Two Turkey-specific programmes and one
global one are invisible to the students they were researched for.

None of this is fabricated data — every organisation and programme checked is real, and the prior
pass's conclusion on that still holds. The defect is that **an unparsed delimited ingest was
promoted to `active` without a field-level review**, and 47% of the catalogue carries its
fingerprints. The single highest-leverage fix is the parser, not the rows: parsing `description`
into `organization` / `official_url` / structured fields addresses §1.2, §2.1 and §2.2 at once,
and would let the 78 live raw-description rows and the 14 live wrong-URL rows be corrected from
data the system already holds.

Until then the safe subset is narrow but real: the 26 rows with a researched `eligible_countries`
gate (minus the three broken values in §1.1) and the `source_confidence='high'` near-deadline
bucket that the prior pass verified at 9/10. Everything carrying the delimited-description
fingerprint should be demoted from `active` until it has been through a parsed re-ingest.

---

## Method notes

- **A failed fetch was never treated as evidence.** Where a scripted fetch returned nothing useful
  (YÖK Atlas's `lisans.php`, now a React SPA serving a 945-byte JS shell), I switched to the JSON
  API rather than concluding the page was empty.
- **Both sides of every duplicate claim were checked**, not just the one that confirmed the prior
  finding — the Wharton merge is asserted only because both pages independently name the same
  event and the same host.
- **The country-matching failures were verified by executing the shipping code** against the live
  values, not by reading the normaliser and reasoning about it.
- **Postgres regex caveat that changed a result**: `\b` is not a word boundary in Postgres ARE
  (`\y` is). An initial title sweep silently under-matched and missed the stale-year class in §1.3
  entirely; re-running with `\y` surfaced it.
- **No database writes were made.** Every finding above is reported, not fixed.
