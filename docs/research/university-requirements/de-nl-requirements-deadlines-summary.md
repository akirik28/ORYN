# Germany & Netherlands admission requirements and deadlines

Research lane: `worktree-de-nl-programmes` (continuation of the DE/NL programme-catalogue lane)
Researched: 2026-08-21
Data files: `data/research/university-requirements/de_nl_requirements_*.jsonl`,
`data/research/university-requirements/de_nl_deadlines_*.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

`university_requirements` held 84 rows and `university_deadlines` held 26 rows across ORYN's
entire 1,019-university catalogue, against `university_programs`' 7,700+ — the weakest link in
the product by a wide margin, and the gap the Requirement Check feature (Phase 69) and deadline
engine (Phase 23) both depend on. Assigned by the coordination session to the same 16 German and
Dutch universities this lane had just finished mapping for programmes, on the reasoning that
having spent hours inside each institution's own site made this the best-placed lane to do it.

---

## Verified counts

**991 records across 16 universities**: 595 requirements + 396 deadlines.

| University | Country | Requirements | Deadlines | Undated (`recurring_annual_undated`) |
|---|---|---:|---:|---:|
| LMU Munich | Germany | 33 | 11 | 7 (64%) |
| Universität Heidelberg | Germany | 16 | 24 | 22 (92%) |
| TU Berlin | Germany | 41 | 17 | 0 (0%) |
| University of Bonn | Germany | 38 | 25 | 18 (72%) |
| Humboldt-Universität zu Berlin | Germany | 20 | 34 | 6 (18%) |
| Albert-Ludwigs-Universität Freiburg | Germany | 13 | 20 | 2 (10%) |
| Georg-August-Universität Göttingen | Germany | 26 | 45 | 30 (67%) |
| Universität Hamburg | Germany | 35 | 9 | 5 (56%) |
| TU Darmstadt | Germany | 29 | 16 | 6 (38%) |
| Universität Stuttgart | Germany | 31 | 17 | 15 (88%) |
| TU Delft | Netherlands | 38 | 20 | 14 (70%) |
| Erasmus University Rotterdam | Netherlands | 71 | 34 | 19 (56%) |
| Tilburg University | Netherlands | 46 | 37 | 29 (78%) |
| University of Amsterdam | Netherlands | 49 | 27 | 16 (59%) |
| University of Groningen | Netherlands | 44 | 22 | 4 (18%) |
| Vrije Universiteit Amsterdam | Netherlands | 65 | 38 | 8 (21%) |
| **Total** | | **595** | **396** | **201 (51%)** |

Across all 396 deadlines: 201 `recurring_annual_undated`, 177 `dated_specific`, 18
`not_published_centrally`. Just over half of every deadline this lane found has no year on it
at all — not a defect in the research, the actual shape of how German and Dutch universities
publish this information.

---

## The central finding: undated deadlines are the norm, not the exception, and the rate varies enormously even within one country

`deadline_date` is a real `date` column. The one rule that mattered most across all three waves:
**if a source states only a day and month, `deadline_date` stays null and `recurrence` becomes
`recurring_annual_undated`, never a synthesised year.** Every one of the 201 undated records
found this way carries its real text in `deadline_text_verbatim` instead.

What's more interesting than the aggregate 51% is the spread: Heidelberg (92%) and TU Berlin
(0%) are both German comprehensive universities of similar profile, publishing on the same kind
of central admissions page, with opposite conventions — TU Berlin binds every deadline to one of
three named upcoming cycles with a real year; Heidelberg states almost everything as bare
day/month. A rule tuned to either one would misfire on the other. Nothing about "Germany" alone
predicts this; it has to be checked per institution.

---

## The Netherlands confirms the Studielink hypothesis, independently, five times

The research-handoff doc's standing brief named `studielink.nl`'s 15 January numerus fixus
deadline as the expected test case for an application-system-owned fact. Every one of the five
Dutch university agents (Delft, Erasmus, Tilburg, UvA, Groningen, VU Amsterdam — six, not five,
counting Delft from wave 2) independently fetched Studielink's own page and found the same thing:
**"until 23:59 on 15 January" (numerus fixus) and "until 23:59 on 1 May" (non-fixus), both
genuinely undated on Studielink's own page**, never restated with a year even where a university's
own page gives one for a specific programme. Recorded as `official_application_system` / HIGH
authority per coordination DECISION 1 in all six files, cross-referenced to each other rather
than re-derived independently each time.

UvA and Erasmus both went further and confirmed a real structural exception: **selective**
Bachelor's programmes (PPLE and Amsterdam University College at UvA; EUC and several Erasmus
majors) run their own later deadlines through their own selection procedures, distinct from the
national numerus fixus date — a genuine programme-level fact, not a restatement of the national
one, and confirmed against official pages after a third-party blog gave UvA's agent the wrong
date for PPLE.

---

## The TOEFL rescale trap, found and handled 124 times, both ways

ETS rescaled TOEFL iBT on 21 January 2026 to a 1–6 scale (the overall is now an *average*, not a
*sum*), with a comparable 0–120 score staying on score reports for two years. This lane recorded
124 test-scale-tagged requirements:

| `scale_ambiguity` | Count | Meaning |
|---|---:|---|
| `none` | 47 | Unambiguous instrument (mostly IELTS/Cambridge) |
| `resolved_unambiguous` | 44 | Source explicitly and correctly handles the rescale |
| `undated_scale_assumption` | 29 | Bare legacy-scale number, no rescale acknowledgment — unsafe to evaluate as a naive threshold |
| `partially_unsatisfiable` | 3 | A subtest minimum genuinely unmeetable by any current score report (the Glasgow-shaped defect) |
| `possibly_discontinued_instrument` | 1 | Format the source cites may no longer be offered |

**The most useful pattern isn't the aggregate — it's that "good" and "bad" handling coexist
inside single institutions**, proving this is a page-maintenance property, not an
institution-level one:

- **TU Delft**: the MSc English-proficiency page handles the rescale correctly and explicitly
  (two cleanly dated, bounded records, before/after cutover). The BSc page, fetched the same day,
  shows zero rescale awareness — a bare "TOEFL iBT 90"/"70."
- **Stuttgart**: INFOTECH's own page states both the legacy and new score explicitly, with the
  cutover date printed ("95 or better / from 2026: 5 or better"). WASTE, a different Master's at
  the same university, states only "TOEFL (iBT): 88" — the exact undated-legacy pattern.
- **Groningen** is the cleanest positive counter-example in the whole lane: all 7 subject-area
  groups checked republish both scales side by side, zero `undated_scale_assumption` records.
- **VU Amsterdam** handles it cleanly almost everywhere too — only 2 PDF-sourced Master's rows
  lack a scale-date qualifier.

The three `partially_unsatisfiable` records (a subtest minimum unmeetable post-rescale, the
sharpest version of the defect) appeared at Erasmus, in three different programmes.

---

## uni-assist.de: three distinct relationships, not one

Every German university agent was asked to check whether `uni-assist.de` — a cross-university
international-application processor — sets an independently authoritative deadline. The answer
split three ways, not the two the brief anticipated:

1. **Doesn't use uni-assist at all**: Bonn, LMU, Göttingen, TU Darmstadt, Stuttgart. Confirmed
   by absence from uni-assist's own published member-university list, plus a university-side
   corroboration each time (a direct-payment bank account, a single self-run portal named for
   every applicant group).
2. **Uses it, but uni-assist explicitly defers to the university's own dates**: Humboldt, TU
   Berlin. uni-assist's own page states verbatim that "uni-assist's deadline is the deadline set
   by the university" — the opposite relationship from UCAS/Glasgow (documented in
   `source-authority-gap.md`), where the application system does set an independently
   authoritative date. The "application system is HIGH authority for facts it owns" principle
   only applies where the system actually owns a fact.
3. **Doesn't require it, but accepts its evaluation reports as alternative/fallback evidence**:
   Hamburg. A genuinely third shape — neither "uses" nor "doesn't use" captures it cleanly.

Heidelberg is the one case with real internal disagreement: a 2018 official PDF describes a
mandatory uni-assist step for non-EU Medicine/Pharmacy/Dentistry applicants, while a current live
page says those applicants apply directly with no uni-assist mention — recorded as
`CONFLICTING_EVIDENCE`, not resolved.

---

## Conflicts found: 13 total, all recorded, none resolved

4 requirement-level and 9 deadline-level `CONFLICTING_EVIDENCE` records, each naming both sources
and cross-referencing the paired record rather than picking a winner:

- **Heidelberg**: 2018 PDF (uni-assist mandatory) vs. current live page (direct application) for
  non-EU Medicine/Pharmacy/Dentistry.
- **Humboldt**: two official pages give different Winter-semester uni-assist-track Master's
  deadline windows for the same category, ~2 weeks apart at both ends.
- **Hamburg**: the Psychology department's own page states TOEFL 72/567, the central
  campuscenter page states 70/550, for the same programme.
- **Erasmus (EUC)**: one page's own intro paragraph is stale (2026 dates) while its section
  headings and sidebar are current (2027 dates) for the same deadline — reconfirmed via four
  independent fetches before being recorded as conflicting rather than assumed resolved.
- **Groningen**: two official pages disagree on the current FEB Master's deadline for
  international-diploma applicants — one already rolled to 1 May 2027, the general hub (headed
  "2026/2027") still showing 1 January 2026 for the same population.
- **VU Amsterdam**: Law in Society's own pages give three different dates across three different
  framings (test-registration guidance, general deadline, rolling-admission table) for what
  should be one application window.

None of these were resolved by picking the source that "sounds more current." A resolution rule
that defaults to "prefer the most recently modified page" would get the Erasmus case right and
the Groningen case wrong, since it's the *older-looking* page that's actually correct there —
which is exactly why they're recorded as conflicts for a human to adjudicate, not silently
collapsed to one answer.

---

## A defect in this lane's own brief, caught mid-run and fixed

The agent brief for German `cycle_year` contained a genuine self-contradiction: one worked
example implied "Wintersemester 2026/27" should map to `cycle_year: 2027`, another implied 2026,
for the same input. The Heidelberg agent caught it and flagged it rather than guessing. Resolved
as: `cycle_year` = the calendar year teaching actually begins (2026 for WS2026/27) — populated
alongside `cycle_label` (the source's own full string), not instead of it.

Three agents still running at the time (LMU, TU Berlin, Humboldt) were corrected before they
finished. Two had already completed (Bonn, Freiburg) — Bonn had used the correct convention by
chance, Freiburg had used the wrong one and required a 9-record post-hoc fix, applied and
re-validated before commit. Every wave-2 and wave-3 brief had the corrected convention built in
from the start; zero mismatches found in either wave.

---

## Validation performed

- All 991 records parse as valid JSON, UTF-8, native-language characters preserved.
- All records carry the exact 24-field (requirements) or 22-field (deadlines) schema — zero
  missing/extra-field records.
- Every enum-constrained field (`category`, `requirement_category_db`, `applies_to`,
  `source_type`, `confidence`, `verification_state`, `text_fidelity`, `test_scale`,
  `scale_ambiguity`, `deadline_type`, `recurrence`) checked against the exact allowed vocabulary
  — `requirement_category_db` in particular is a live Postgres enum where an out-of-vocabulary
  value fails the insert outright.
- Every `recurring_annual_undated` deadline verified to have `deadline_date: null` — zero
  violations across all 396 deadline records, all three waves.
- Every `dated_specific` deadline verified to have a real `deadline_date` — zero violations.
- Zero duplicate `research_requirement_id` / `research_deadline_id` within any pair, across this
  lane's own 32 files, or against the **entire** existing requirements/deadlines corpus
  (including the pre-existing 84+26 rows from before this lane started).
- `source_authority_passes_gate` spot-checked against the actual `looksOfficial()` predicate:
  correctly `false` for all 15 `.nl`/`.de` universities, correctly mostly `true` for Tilburg
  (`.edu`) — the one university in this entire lane whose own domain passes the gate.

One real defect found and fixed before commit, not left for review: Freiburg's 9
`cycle_year`-mismatched Wintersemester records (see above).

---

## Remaining gaps, in priority order

1. **13 unresolved conflicts** (listed above) need a human or a downstream lane to adjudicate —
   this lane's job was to surface them accurately, not resolve them.
2. **The `looksOfficial()` gate rejects nearly every source in this lane** (only Tilburg's `.edu`
   domain and a handful of `official_application_system` citations pass) — already documented as
   a design gap in `source-authority-gap.md`, unchanged by this lane, but now with 991 more
   concrete records depending on the fix.
3. **The scale/recency/exclusion storage gaps** documented in `scalar-thresholds-are-not-enough.md`
   are now backed by many more concrete instances (124 test-scale records, dozens of recency
   rules and named exclusions across every university) — the interim mitigation proposed there
   (route anything with an unqualified scale, a recency rule, or a named exclusion to
   `needs_manual_review` rather than a naive scalar comparison) is more clearly justified with
   this volume of evidence behind it.
4. **A genuine product decision, not a data question**: how should the UI represent a
   `CONFLICTING_EVIDENCE` record to a student? Neither side is simply wrong in most of these 13
   cases.
