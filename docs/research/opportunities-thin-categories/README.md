# Thin-category opportunity research — 2026-08-21

Research-only lane. No application code, no migrations, no Supabase writes.

**Branch:** `worktree-agent-aa8764820a368f9d6`
**Commits:** `1876d12` (batch 1) → `66ce466` (batch 2) → `cf8cfa8` (batch 3) → batch 4 + this report
**Data:** `data/research/opportunities/thincat_batch{1,2,3,4}_2026-08-21.jsonl`

## Why this lane existed

ORYN's live `opportunities` table is 369 rows, of which 252 are summer programmes and 72
are competitions. The remaining categories are so thin that "your gap is research exposure"
resolves to 13 worldwide options, and "get an internship" resolves to 8. This lane deliberately
ignored summer programmes and competitions and researched only the thin categories, with
Turkey first and US/UK deprioritised.

## Headline numbers

| | |
|---|---|
| Candidates investigated | 23 |
| Records published | **16** |
| Dropped for cause | **7** |
| Pages blocked or dead | **21** |

Verification states across the 16 published records:

| State | n | Records |
|---|---|---|
| `VERIFIED_CURRENT` | 4 | SJF Studienwochen, TEV Mesleki Ortaöğretim Bursu, Erasmus+ VET mobility, DofE Award Türkiye |
| `VERIFIED_HISTORICAL` | 3 | Mawhiba Research, Mawhiba Skills, TD Scholarships |
| `CURRENT_CYCLE_NOT_PUBLISHED` | 2 | DENEYAP, Kennedy-Lugar YES Türkiye |
| `CONFLICTING_EVIDENCE` | 1 | A*STAR–MOE Attachment |
| `NEEDS_REVIEW` | 6 | Krajowy Fundusz, A*STAR YRA ×2, H3 Attachment, JA Company Programme, JST GSC |

Only 4 of 16 are confirmed to have a live cycle. That is not underperformance — it is the
calendar. Mid-August sits between cycles for most of the world, and a sibling lane reported
the same. The honest states above are the finding.

## Category and geography distribution

**Category** (target categories in **bold**):

| Category | n |
|---|---|
| **research** | 7 |
| **internship** | 2 |
| **scholarship** | 2 |
| **entrepreneurship** | 2 |
| **fellowship** | 1 |
| **volunteering** | 1 |
| academic_program | 1 |

Every one of the six target categories got at least one record, and the two thinnest in the
live table — fellowship (2 rows) and volunteering (1 row) — each gained one.

**Geography** (Turkey-first was the brief):

| Country | n | Notes |
|---|---|---|
| Turkey | 3 | + Kennedy-Lugar YES is Turkey-eligible, so 4 Turkey-actionable |
| Singapore | 4 | zero prior coverage |
| Saudi Arabia | 2 | |
| Switzerland / Poland / Canada / Japan | 1 each | Poland and Switzerland had zero prior coverage |
| Multi-country (EU) | 2 | Erasmus+, JA Company Programme |

No new US or UK records were added, by design.

## The domain-gate blocker, measured

`lib/acquisition/source-authority.ts` `looksOfficial()` accepts a domain only if it ends
`.edu`/`.gov` or contains `.edu.`/`.ac.`/`.gov.`. Scoring the 16 records against it:

- **4 pass** — all four A*STAR records, on `a-star.edu.sg`.
- **12 fail (75%)** — `sjf.ch`, `fundusz.org`, `deneyap.org`, `tev.org.tr`, `mawhiba.sa` ×2,
  `jaeurope.org`, `yesprograms.org`, `youth.europa.eu`, `td.com`, `intaward.org.tr`, `jst.go.jp`.

The important part is *which* domains fail. This is not an ".org problem":

- **`youth.europa.eu`** — the European Commission's own European Youth Portal.
- **`jst.go.jp`** — the Japan Science and Technology Agency, a Japanese national R&D agency on
  the `.go.jp` namespace that JPRS restricts to government organs.

The gate currently rejects two sovereign governments' official domains while accepting a
university's. Any fix that only whitelists `.org` misses this.

**The fix already has a socket.** `sourceAuthority()` takes an `officialDomains` parameter whose
docstring says the caller must have established the domain "from an authoritative identity source
rather than guessing it". That is exactly what the `organizer_domain_provenance` field on every
record in this lane supplies. The strongest worked example is DENEYAP: a Turkish Ministry of
National Education page on `istanbul.meb.gov.tr` names T3 Vakfı as operator and links
`deneyap.org`, so a `.gov.tr` source establishes a `.org` domain. The Award Türkiye record uses
the same pattern via the global licensor's own site.

Provenance strength varies and each record says so explicitly. Four rest on organiser
self-attestation alone because corroboration attempts were blocked — `fundusz.org`, `tev.org.tr`,
and both `mawhiba.sa` records. Those should not be promoted to official-domain status until the
corroborating page is actually read.

## Dropped for cause (7)

Dropped, not parked — each failed a specific standard.

1. **INSPIRE-MANAK (India)** — verification revealed it progresses through district, state and
   national *exhibitions and competitions*. Competition is a saturated, explicitly out-of-scope
   category. Dropped on scope, not quality.
2. **INSPIRE-SHE (India)** — both official sources failed TLS
   (`indiascienceandtechnology.gov.in` self-signed; `online-inspire.gov.in` unverifiable chain).
   Only aggregator evidence remained. Publishing on snippets was the alternative; dropped instead.
3. **Ashoka Young Changemakers** — `ashoka.org` returned 403 on two different locale paths. No
   official evidence obtainable.
4. **UWC / UWC Türkiye** — four URLs across `uwc.org` and `tr.uwc.org` all blocked (403 / socket
   hang up). A strong Turkey scholarship candidate lost purely to fetch blocking; worth a retry
   from a different client.
5. **Gönüllülük Kulübü (Turkish Ministry of Youth and Sports)** — the official page fetched fine
   but states no age requirement, no eligibility criteria and no application cycle. The source did
   not support the claims a record would need.
6. **Young Change Agents (Australia)** — official programmes page lists twelve programmes but
   states no age range and no cost. The widely-quoted "10–18" exists only in aggregator text.
7. **GençBizz / Genç Başarı (Turkey)** — deduplicated. Already present in ORYN's research corpus
   as a live entrepreneurship record.

Two further leads were left open rather than dropped: **Qatar University Young Scientists Center /
Al-Bairaq** (existence confirmed on `qu.edu.qa`, but every eligibility and registration detail
page 404s) and the **~15 individual JST GSC host-university calls**, which are the actionable unit
behind the national framework record.

## Two stale-cycle traps caught

Both would have produced confidently wrong data. Recording them so the pattern is recognised.

**TEV.** The foundation's site still displays an announcement headed "başvuruları 2 Ekim'e
uzatıldı!" Fetching it shows it refers to *18 Ağustos – 2 Ekim 2025* — the previous cycle.
Turkish news coverage repeats the same figures. The correct current dates live in a different
announcement (id 63): **1 Eylül – 8 Ekim 2026**. Reading the homepage, or trusting the news,
yields a wrong deadline and a wrong open date.

**Kennedy-Lugar YES.** The official Türkiye page states applicants must be born "between 15 August
2008 and 15 August 2010" and be in grades 9–11 "during the 2024-25 academic year" — two cycles
stale. Those birth years were **not** carried into the record and **not** recalculated forward;
recalculating would be fabrication. Only the durable "15–17" band is recorded, with a caveat.

A third, smaller trap: the TD Scholarships terms PDF is served from a URL ending `-2026-eng.pdf`
but its own title block and every clause read "2025/2026". Content governs; the filename lies.

## Conflicts recorded, not resolved

**A*STAR–MOE Attachment nationality.** A*STAR's student-awards index says "Open to Singaporeans".
The programme's own detail page says non-Singaporeans may participate but scholarship recipients
must apply for Singapore Citizenship. Both are official A*STAR pages. The second reads like
scholarship-wide boilerplate, but the record does not pick a side —
`international_applicants_allowed` is left null and the conflict is written into the notes.

**JA Company Programme age range.** Official `jaeurope.org` says 15–18; aggregators say 15–19.
Aggregators are leads, not evidence, so 15–18 is recorded and the discrepancy logged.

## Blocked and dead pages (21) — do not repeat these

TLS failures:
`gonulluyuzbiz.gov.tr` · `kuratorium.lublin.pl/?akc=akt&id=1287&op=szcz` ·
`indiascienceandtechnology.gov.in/…/inspire-she-…` (self-signed) ·
`online-inspire.gov.in/Content/SHEFAQs.pdf`

HTTP 403:
`spis.ngo.pl/197037-krajowy-fundusz-na-rzecz-dzieci` · `tr.uwc.org/nasil-basvurulur/` ·
`uwc.org/how-to-apply/` · `ashoka.org/en-us/program/ashoka-young-changemakers-nomination-and-selection-process` ·
`ashoka.org/en-id/young-changemakers` · `my.gov.sa/ar/agencies/18305` · `spa.gov.sa/N2529036`

Connection dropped / timeout:
`tr.uwc.org/uygunluk-kriterleri/` · `uwc.org/national-committee/uwc-turkiye/` ·
`burs.tev.org.tr` (ECONNRESET) · `exchanges.state.gov/non-us/program/kennedy-lugar-youth-exchange-study-yes` ·
`erasmus-plus.ec.europa.eu/opportunities/individuals/trainees/vocational-education-learners-…` ·
`acnc.gov.au/charity/charities/0f32799a-3aaf-e811-a963-000d3ad244fd`

404:
`a-star.edu.sg/Scholarships/junior-college-and-polytechnic-and-secondary-school-students/a-star---moe-attachment`
(both casings; content found at `/scholarships/home/student-awards/astar-moe-attachment`) ·
`qu.edu.qa/research/ysc/about` · `qu.edu.qa/en-us/Research/ysc/Programs/Pages/default.aspx`

Note the pattern: government sites — Turkish, Polish, Indian, Saudi, Australian, US State
Department — were the *worst* offenders, mostly via expired or misconfigured TLS. The most
authoritative sources are the hardest to fetch.

## A structural finding worth acting on

Four of the sixteen records are **umbrella frameworks, not bookable opportunities**: Erasmus+ VET
mobility, JA Company Programme, JST Global Science Campus, and to a degree the A*STAR
school-nominated awards. A student cannot apply to any of them directly — the route is
"your school must participate" or "your school must nominate you".

If these are ingested as ordinary opportunities, the counsellor will tell students to apply to
things they have no route into, which is precisely the fake-actionability the product spec warns
against. They need either a parent-entity model (with national member programmes as children,
the way GençBizz sits under JA) or an `application_route` field distinguishing
`direct` / `school_nominated` / `school_mediated`. Six of the sixteen records here are not
directly student-applicable, so this is not an edge case.

## Remaining gaps

- **Internship is still the thinnest.** Only two added, and one (Erasmus+) is school-mediated.
  Secondary-school-eligible direct-application internships barely exist outside the US/UK; this
  may be a real-world scarcity rather than a research gap, and is worth confirming before more
  effort is spent.
- **India: zero records.** Not for lack of candidates — both official DST sources were TLS-blocked.
  Highest-value single retry target.
- **Turkey research and internship: still zero.** Turkey gained a scholarship, a volunteering
  framework and a technology programme, but nothing in research or internships.
- **Untouched geographies:** Korea, Taiwan, most of South Asia, Latin America, Africa, New Zealand.
- **UWC** deserves a retry from a different client — a fully-funded, Turkey-eligible, 16–18
  scholarship is close to an ideal record for this table and was lost only to 403s.
