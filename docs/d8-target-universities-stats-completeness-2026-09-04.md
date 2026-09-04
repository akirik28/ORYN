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

One gap outside that pattern, flagged rather than fixed here — **already picked up
elsewhere**: Caltech's zero deadline rows turned out to be another lane's work in progress,
its own real dates pulled from Caltech's official REA/Regular Decision pages, SQL ready and
waiting on the same apply step this doc's SQL is. Nothing further needed from this doc on it.

## 3. Filled — official sources only, unfound left blank

**Oxford** (completing the existing row, not creating a new one):
- `admission_rate = 0.142` — Oxford's own admissions-statistics page: 3,302 admitted of
  23,329 applications, 2025 cycle (offer rate separately stated as 16.7%; used the acceptance
  figure, not the offer figure, to match `admission_rate`'s existing meaning on the other 5
  rows — MIT/Stanford/etc.'s College Scorecard figures are final-admit rates, not offer rates).
  `data_confidence: medium`, not `high` — the 3,302 figure is now primary-verified (§5), the
  23,329 figure isn't (PDF/Tableau, unreadable by this tooling); the `source` string spells
  out which is which rather than presenting both at one confidence level.
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
`admission_rate_basis: not_published` — **originally blocked** (that value shipped in
migration 0127, `d1-qs-top100-fill` branch, not yet merged when this pass started) **and now
unblocked**: CEO merged 0127 to `main` same night, the value exists, the INSERT in §4 is live.

**Boğaziçi**: **`no_single_rate` — CEO confirmed.** Search returned "acceptance rate is not
reported by the university itself," but the real mechanism is YKS (domestic) / YÖS
(international) score-cutoffs **per programme** — the same shape TU Munich/TU Delft's
`no_single_rate` already covers, not a holistic "reviewed X, admitted Y" rate a single
percentage would describe even if published. Flagged as a judgment call rather than decided
unilaterally; CEO agreed it was the right read.

## 4. Draft SQL — NOT applied, no migration number

```sql
-- Oxford: complete the existing row rather than inserting a second one.
update public.university_statistics
set
  admission_rate = 0.1420,
  admission_rate_basis = 'published',
  source = 'University of Oxford — Undergraduate admissions statistics, 2025 cycle. 3,302 admitted: confirmed directly on ox.ac.uk''s own live page (primary-read). 23,329 applications (→ 14.2% rate): reported via search synthesis, not independently confirmed — the figure lives in the Annual Admissions Statistical Report, served as a forced PDF download, and Tableau dashboards, neither readable by the tooling used here. https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students',
  data_confidence = 'medium',
  retrieved_at = now()
where university_id = (select id from public.universities where name = 'University of Oxford')
  and admission_rate is null; -- guarded: never overwrites a value someone fills in the meantime

-- LSE: new row. RE-RUN SAFETY (added 2026-09-04, assembling Package 14): university_statistics'
-- own unique index is (university_id, stat_year), but none of these five inserts ever set
-- stat_year -- it lands NULL, and standard SQL never treats NULL = NULL as a conflict, so the
-- index silently never catches a second run. Found by running the full package twice and
-- diffing per-university row counts, not by inspecting the constraint definition first: all
-- five doubled with zero error, the quietest failure mode found that night. Explicit
-- not-exists guard added to all five inserts below; content otherwise unchanged.
insert into public.university_statistics
  (university_id, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 0.0633, 'published',
  'London School of Economics (official) — "in 2025, we received approximately 30,000 applications for roughly 1,900 places," rate derived from LSE''s own rounded figures, not a literal published percentage. https://www.lse.ac.uk/study-at-lse/Undergraduate/Teachers-schools-parents/Information-for-teachers-and-schools/admissions-advice',
  'medium', now()
from public.universities where name = 'London School of Economics and Political Science'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Erasmus Rotterdam, University of Amsterdam: confirmed no_single_rate (Dutch numerus-fixus-per-programme model).
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Erasmus University Rotterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.eur.nl/en/education/practical-matters/admission/bachelor-admission-and-application',
  'medium', now()
from public.universities where name = 'Erasmus University Rotterdam'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'University of Amsterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.uva.nl/en/education/admissions/bachelors/applying-for-a-selective-bachelors-programme.html',
  'medium', now()
from public.universities where name = 'University of Amsterdam'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Boğaziçi: no_single_rate -- CEO-confirmed.
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Boğaziçi University — admission via YKS (domestic) / YÖS (international) score-cutoffs set per programme each cycle; no single institution-wide admission rate is published or structurally applicable. No official rate found on bogazici.edu.tr.',
  'low', now()
from public.universities where name = 'Boğaziçi University'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Bocconi: not_published -- unblocked, migration 0127 is merged to main.
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'not_published',
  'Bocconi University — searched unibocconi.it directly, including its own Results and Enrollment page; no applicant/admit counts or admission rate published.',
  'low', now()
from public.universities where name = 'Bocconi University'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

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

## 5. Warwick and Oxford, revisited with browser access

CEO clarified the browser-pane caution that shaped this pass originally: the risk is our own
app's authenticated pages sharing the founder's real session (host-scoped, not port-scoped) —
public external sites carry none of that risk. Went back to both open items with that access.

**Oxford — partially upgraded, not fully.** Read `ox.ac.uk`'s own live admissions-statistics
page directly (not search synthesis): confirms *"In 2025, 3,302 students were admitted to
Oxford to begin their undergraduate studies"* verbatim, primary-sourced now, not relayed.
The applicant count (23,329) that the 14.2% rate depends on lives in the Annual Admissions
Statistical Report — a PDF the site serves as a forced download (browser sandbox won't open
it) — or Tableau dashboards the "About the applicants" / "By course" links open, neither of
which this tooling can read as text. So: the numerator is now directly verified, the
denominator still isn't. Left `data_confidence: medium` rather than upgrading to `high` —
a real, partial win, not the full confirmation CEO asked me to check for, and I'd rather say
that plainly than round a half-verification up to a full one. §4's Oxford UPDATE is unchanged.

**Warwick — still not_researched, and now a clearer account of why.** Went to the FOI
admissions-data page directly: it names "the University's academic statistics webpages" with
year/department dropdowns as where the real data lives, but that phrase isn't an actual link
on the page as rendered (tried scrolling it into view and clicking directly — no navigation).
Found a second, genuinely official path instead: UCAS (the UK's central admissions body, and
the same source LSE's own figures ultimately trace to) publishes a per-university stats page
at `ucas.com/explore/unis/.../university-of-warwick/stats?studyYear=current` — but it sits
behind a CAPTCHA challenge. Did not attempt to complete or bypass it — that's a hard line for
me regardless of who's asking. **Left open, with a sharper next step than before**: this
needs either a human clicking through UCAS's CAPTCHA once, or someone who can locate Warwick's
own internal stats-dashboard URL directly rather than via its FOI page's dead cross-reference
— not another automated pass with the same tools this one had.

**Only Warwick remains open** — everything else in §4 is confirmed and ready to apply once
you assign a number.
