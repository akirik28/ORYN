# D8 — data completeness for the 12 real-target universities

Measured first, per instruction. SQL below is a draft — not applied, no migration number
assigned yet ("SQL hazırlanır, uygulanmaz. Numara benden").

The 12: MIT, LSE, Erasmus Rotterdam, Bocconi, Caltech, Carnegie Mellon, University of
Amsterdam, Oxford, Stanford, Boğaziçi, Yale, Warwick — the exact list from D7's own
measurement (every university with at least one real `target_universities` row today).

## 1. Measurement: `university_statistics`

```
University                     stats row?  admission_rate  SAT/ACT   grad_rate  cost   basis
MIT                            yes         4.55%           1520-1580 96.4%      $82,730  published
Stanford                       yes         3.61%           1510-1580 91.9%      $87,833  published
Yale                           yes         3.87%           1470-1570 95.7%      $88,300  published
Carnegie Mellon                yes         11.66%          1500-1570 94.1%      $83,654  published
Caltech                        yes         2.57%           NULL/NULL 94.4%      $86,886  published
Oxford                         yes         NULL            NULL/NULL NULL       NULL     not_researched (source+confidence ARE set)
LSE                            no row      —               —         —          —        —
Erasmus Rotterdam              no row      —               —         —          —        —
Bocconi                        no row      —               —         —          —        —
University of Amsterdam        no row      —               —         —          —        —
Boğaziçi                       no row      —               —         —          —        —
Warwick                        no row      —               —         —          —        —
```

**Oxford's exact shape — row exists, source cited, every value null, `admission_rate_basis`
still at default — does not repeat once among the other 11.** Five US universities
(MIT/Stanford/Yale/CMU/Caltech) are fully populated via College Scorecard, high confidence.
The other six simply have no row at all, which renders identically to Oxford's row today
(`stats?.field != null ? value : "Not available"` — same fallback either way) but is a more
honest underlying state: nothing claims to have looked. Caltech is the one partial gap among
the populated rows — SAT/ACT range is null there specifically, everything else is filled.

`retrieved_at` on Oxford's row is `2026-09-04 00:00:00+00`, and migration 0119's own comment
already names this: "Oxford, this pass: site friction, not a structural absence." Confirmed
that friction still holds — `WebFetch` on `ox.ac.uk/about/facts-and-figures/...` returns
HTTP 403 both directly and via the Wayback Machine. The existing row is the visible trace of
someone hitting that same wall today and stopping after setting the source, before the values.

## 2. `university_requirements` / `university_deadlines`: clean, no repeat of the pattern

```
                    reqs missing detail  reqs unverified  deadlines w/o usable date  deadlines missing source
All 12 universities         0                0–7                    0                          0
```

Zero rows anywhere with a missing `requirement_detail`, an unusable `deadline_date` (null with
no valid recurrence), or a missing `source_url`. `unverified` counts (Boğaziçi 3, LSE 7,
Oxford 2) are a legitimate, honest state in this schema's own vocabulary, not a defect. **The
row-exists-but-empty pattern is isolated to `university_statistics` for this group of 12** —
it does not show up in requirements or deadlines.

One gap outside that pattern, worth flagging separately rather than silently fixing here:
**Caltech has 37 requirements and 26 programs but zero deadline rows.** Real deadline
research (finding Caltech's actual current cycle dates) is a different kind of work than
filling a statistics table from an official numbers page — flagged for whoever owns deadline
research next, not attempted in this pass.

## 3. Filled — official sources only, unfound left blank

**Oxford** (completing the existing row, not creating a new one):
- `admission_rate = 0.142` — Oxford's own admissions-statistics page: 3,302 admitted of
  23,329 applications, 2025 cycle (offer rate separately stated as 16.7%; used the acceptance
  figure, not the offer figure, to match `admission_rate`'s existing meaning on the other 5
  rows — MIT/Stanford/etc.'s College Scorecard figures are final-admit rates, not offer rates).
  `data_confidence: medium`, not `high` — the 403 above means this is sourced through search
  synthesis of the official page's own published numbers, not a direct primary fetch I could
  quote verbatim myself.
- `graduation_rate`: **left null.** The only completion-rate figure surfaced (99.29%) traced
  to a secondary aggregator, not an Oxford or UK Office for Students primary source — didn't
  meet the bar the other 5 rows are held to.
- `sat_range_*` / `act_range_*`: **left null, and this isn't a gap.** UK admission doesn't use
  SAT/ACT. `testScoreRangeLabel` (`app/(app)/universities/[id]/page.tsx:831`) has no way to
  say "not applicable" versus "not researched" for this field specifically — same defect
  shape as D7 and `admission_rate_basis` before migration 0119, one level down, on a field
  this pass wasn't asked to touch. Flagging, not fixing here.
- `cost_of_attendance`: **left null, by design, not a gap.** `lib/universities/queries.ts`'s
  own comment confirms this column is deliberately US-only (IPEDS-derived); Oxford's real cost
  figure belongs in `university_profile_metrics.tuition_international_annual`, a separate
  mechanism, separately fillable, out of this table's scope.
- `admission_rate_basis`: **`published`** — set explicitly, not left at the default it's
  been sitting at.

**LSE** (new row):
- `admission_rate ≈ 0.0633` — derived from LSE's own official page (fetched directly,
  quoted): *"in 2025, we received approximately 30,000 applications for roughly 1,900
  places"* (`lse.ac.uk/study-at-lse/Undergraduate/Teachers-schools-parents/...`). LSE
  states rounded counts, not a percentage — `data_confidence: medium`, and the rounding is
  written directly into the `source` string (this table has no separate notes column) so
  the derivation is traceable rather than looking like a literal published rate.
- `admission_rate_basis: published`.

**Erasmus Rotterdam** and **University of Amsterdam** (no row — recommend leaving unfilled,
correctly classified rather than left ambiguous):
- Both confirmed, on their own official domains (`eur.nl`, `uva.nl`), to admit per-programme
  — numerus fixus (selection, capped places) for some programmes, open admission for others.
  No single university-wide rate exists to cite. `admission_rate_basis: no_single_rate`,
  matching TU Munich/TU Delft's existing precedent exactly (migration 0119).

**Bocconi**: searched `unibocconi.it` directly (including its own "Results and Enrollment"
page) — no applicant/admit counts or rate published anywhere I could find.
`admission_rate_basis: not_published` is the accurate value **but that state doesn't exist
yet** — it ships in migration 0127 (`d1-qs-top100-fill` branch, not yet merged to main).
**Sequencing dependency, flagging rather than assuming:** if my migration number lands after
0127 merges, I'll use `not_published`; if before, Bocconi's row ships with
`admission_rate_basis` left at the `not_researched` default (still correct — just less
specific than what I actually found) rather than blocked on a value that doesn't exist yet.

**Boğaziçi**: search explicitly returned *"acceptance rate is not reported by the university
itself as official published statistics."* Judgment call, flagging rather than deciding
unilaterally: Turkish admission here runs through YKS (domestic) / YÖS (international)
score-cutoffs **per programme**, the same shape TU Munich/TU Delft's `no_single_rate` already
covers, not a holistic "reviewed X, admitted Y" rate a single percentage would describe even
if published. I lean `no_single_rate` over `not_published` for this reason — structurally
closer to Munich/Delft than to Bocconi's "plausibly one rate exists, just not released"
shape — but this is the one genuinely ambiguous classification in this batch and I'd rather
you weigh in than guess silently.

**Warwick**: Warwick does publish detailed admissions statistics — a real, official, FOI-backed
data hub at `warwick.ac.uk/.../freedomofinformation/admissionsdata` — but it's an interactive/
filtered page, and every year-specific figure `WebFetch` could reach was old (2016, 2009).
Using a decade-old figure as today's rate would be the exact stale-precision problem tonight
has been about. **Left at `not_researched`, genuinely** (not `not_published` — the data
exists and Warwick does release it, I just couldn't drive the filter to a current year with
the tools this pass had). Flagged as a distinct, completable follow-up: someone with browser
automation against that specific page, not another web-search pass.

## 4. Draft SQL — NOT applied, no migration number

```sql
-- Oxford: complete the existing row rather than inserting a second one.
update public.university_statistics
set
  admission_rate = 0.1420,
  admission_rate_basis = 'published',
  source = 'University of Oxford — Undergraduate admissions statistics (2025 cycle: 3,302 admitted of 23,329 applications). https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students',
  data_confidence = 'medium',
  retrieved_at = now()
where university_id = (select id from public.universities where name = 'University of Oxford')
  and admission_rate is null; -- guarded: never overwrites a value someone fills in the meantime

-- LSE: new row.
insert into public.university_statistics
  (university_id, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 0.0633, 'published',
  'London School of Economics (official) — "in 2025, we received approximately 30,000 applications for roughly 1,900 places," rate derived from LSE''s own rounded figures, not a literal published percentage. https://www.lse.ac.uk/study-at-lse/Undergraduate/Teachers-schools-parents/Information-for-teachers-and-schools/admissions-advice',
  'medium', now()
from public.universities where name = 'London School of Economics and Political Science';

-- Erasmus Rotterdam, University of Amsterdam: confirmed no_single_rate (Dutch numerus-fixus-per-programme model).
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Erasmus University Rotterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.eur.nl/en/education/practical-matters/admission/bachelor-admission-and-application',
  'medium', now()
from public.universities where name = 'Erasmus University Rotterdam';

insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'University of Amsterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.uva.nl/en/education/admissions/bachelors/applying-for-a-selective-bachelors-programme.html',
  'medium', now()
from public.universities where name = 'University of Amsterdam';

-- Boğaziçi: recommended no_single_rate (see §3 for the judgment call) -- confirm before applying.
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Boğaziçi University — admission via YKS (domestic) / YÖS (international) score-cutoffs set per programme each cycle; no single institution-wide admission rate is published or structurally applicable. No official rate found on bogazici.edu.tr.',
  'low', now()
from public.universities where name = 'Boğaziçi University';

-- Bocconi: not_published, BLOCKED on migration 0127 merging first (adds that enum value).
-- If 0127 lands before my number is assigned, uncomment and use 'not_published'.
-- Until then, Bocconi gets no row from this migration -- left at the honest default rather
-- than forced into a value that doesn't exist yet.
-- insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
-- select id, 'not_published',
--   'Bocconi University — searched unibocconi.it directly, including its own Results and Enrollment page; no applicant/admit counts or admission rate published.',
--   'low', now()
-- from public.universities where name = 'Bocconi University';

-- Caltech: fill the one missing field on an otherwise-complete row. Confirmed via search
-- (multiple sources independently citing the same IPEDS 2025 survey figure for enrolled
-- testers, academic year 2024/25: middle-50% SAT 1530-1580) -- not pulled from the College
-- Scorecard API directly the way the row's other four fields were, so data_confidence on
-- the row is left untouched (still 'high', earned by those four) rather than raised or
-- lowered on the strength of this one secondary-sourced pair.
update public.university_statistics
set sat_range_low = 1530, sat_range_high = 1580
where university_id = (select id from public.universities where name = 'California Institute of Technology (Caltech)')
  and sat_range_low is null;
```

**Caltech SAT figure**: 1530–1580, middle-50% for enrolled testers, IPEDS 2025 survey
(academic year 2024/25) — confirmed via multiple independent secondary sources citing the
same underlying IPEDS figure, not pulled from the College Scorecard API directly the way the
row's other four fields were (no API key loaded in this session). Consistent with the same
IPEDS lineage the row's existing `source` string already names, so I'm treating it as usable,
but flagging the sourcing distinction rather than letting it look identical in provenance to
the four fields that came straight from the API.

**Warwick, Bocconi (until 0127), and the Boğaziçi classification** are the three open items —
everything else above is ready to apply once you assign a number.
