# Handoff: Secondary education system intelligence (R2.1)

STATUS:
COMPLETE — 8 of 8 systems.

BRANCH:
`oryn/research-turkey-schools` (same isolated Research worktree/branch as the Wave 1
school registry — see `docs/ORYN_WORKSTREAMS.md`'s `RESEARCH` row; not renamed mid-package
to avoid branch churn, but this package is independent of Wave 1 and can be reviewed/
merged separately).

SYSTEMS COMPLETED:
Türkiye/MEB, IB Diploma Programme, Advanced Placement, Cambridge IGCSE, Cambridge
International AS & A Level, French Baccalauréat, German Abitur/DSD, US High School
Diploma. Full writeups: `docs/research/secondary-education-systems/*.md`. Cross-system
matrix and evidence-based ruleset: that directory's `README.md`. Machine-readable:
`data/research/academic-systems/secondary-systems-v1.json`.

PRIMARY-SOURCE COVERAGE:
Strongest: **MEB** (the actual 106-page official regulation PDF was downloaded and parsed
directly, article-numbered citations throughout) and **AP** (College Board domains fetched
directly without issue). Good but partially search-snippet-sourced: **IB** and **UCAS**
context for Cambridge (ibo.org and ucas.com both blocked automated fetch with a Cloudflare
challenge this session — facts come from search-engine snippet extraction of the same
official domains, not a verbatim page fetch; flagged per-claim in the IB doc).
**Cambridge** itself fetched cleanly (official PDFs/pages). **French Baccalauréat**:
education.gouv.fr/eduscol blocked (403); corroborated across multiple independent sources
that explicitly cite the Ministry's own tables. **German Abitur/DSD**: the core DSD≠Abitur
distinction is directly KMK-sourced (high confidence); the Gesamtqualifikation
two-thirds/one-third split is press-release-sourced, not primary legal text (medium-high).
**US**: no primary-source gap in the ordinary sense — the finding *is* that no single
primary source exists, confirmed via direct comparison of two states' own agencies (Texas
TEA, California CDE) plus NCES/NACAC data.

KEY SEMANTIC DISTINCTIONS (the ones most likely to be gotten wrong):
- AP course grade (school-controlled) ≠ AP exam score (College-Board-controlled) — neither
  implies the other; confirmed via College Board's own text.
- IB predicted grade ≠ IB final result; and an IB subject grade does not imply the full
  Diploma was ever pursued (the "DP courses" pathway is real).
- Cambridge predicted grade (school→student/university) ≠ Cambridge forecast grade
  (school→Cambridge, internal QA) — same underlying judgment, two different purposes.
- Cambridge standalone/staged AS Level ≠ full A Level — not equivalent evidence (Cambridge
  itself says some universities won't accept one in place of the other).
- **DSD ≠ Abitur.** DSD certifies German-language proficiency only, issued by a different
  authority (ZfA/Auswärtiges Amt) than the Abitur (state Kultusministerien). Most DSD
  holders worldwide never earn an Abitur. Turkey-specific: Deutsche Schule Istanbul runs
  DSD II + a separate DIA; ALKEV/İELEV use GIB — a third, distinct hybrid.
- MEB's `okul birincisi` is a single per-school/program end-of-year honor, not a running
  class rank, and isn't even printed on the diploma.
- US "GPA" is not a portable unit without its `gpa_scale` and weighted/unweighted status —
  confirmed as a real finding, not just ORYN's existing policy being restated.

HIGH-RISK MODELING ERRORS (grounded against ORYN's actual schema, for Claude B):
- **`education_records.curriculum='ap'` is a confirmed modeling error.** AP is never a
  whole-school curriculum the way IB/A-Level/national curricula are — always a
  course-level enrichment on a real base curriculum. Recommend removing `'ap'` from that
  enum or scoping it to a narrow, explicit edge case. The AP-course-grade-in-`courses` vs.
  AP-exam-score-in-`test_scores` split is correct and should stay.
- **No field anywhere distinguishes a predicted/forecast grade from a final grade** —
  independently confirmed as a real gap by both the IB/AP research and the Cambridge
  research. `courses.grade_value` can hold only one value at a time today, forcing an
  overwrite that destroys the predicted→final trajectory signal counselors should care
  about, or a fragile duplicate-row workaround.
- `curriculum_type` has `a_level` but no `igcse`/`cambridge_igcse` value — an inconsistent
  granularity (names the *next* Cambridge Pathway stage but not this one).
- `courses.level` has no distinct value for a standalone/staged Cambridge **AS** Level vs.
  full A Level, despite Cambridge itself stating they're not equivalent evidence.
- No `curriculum_type` value for French Baccalauréat, German Abitur, or US diploma — all
  three currently fall into `'national_curriculum'` or `'other'`, which is semantically
  inaccurate for the US case specifically (the US has no national curriculum at all).
- **DSD has a genuinely good home already**: `test_scores` with `subscores` (jsonb)
  cleanly holding its 4 equally-weighted components — this is an honest recommendation
  that the current schema already fits well, not a gap.
- No WEIGHTED vs. UNWEIGHTED flag on US GPA — two records showing the identical
  `gpa_scale`/`overall_gpa` pair could represent very different rigor depending on local
  weighting policy, and the schema can't currently tell them apart without free-text.
- IB's TOK/EE (no clean `courses.level` home), CAS (no home at all — not gradeable), and
  the 0-45 diploma total (should not be repurposed into `overall_gpa`/`gpa_scale`, which
  are elsewhere treated as GPA-shaped values) are each documented as real, specific gaps
  in `ib-dp.md` section J.

RECOMMENDED PROFILE SEMANTICS:
See each system doc's own "J. Profile data-model implications" section for the full,
system-specific reasoning — these are research recommendations, not schema changes; this
research does not modify production. The cross-cutting pattern: `education_records`
should represent a real base *curriculum* the student is enrolled in; `courses.level`
should represent a *course-level* enrichment layered on top (AP, IB HL/SL, A-Level,
Cambridge AS); `test_scores` should hold externally-set/scored results (AP exam, IB final,
LGS/YKS, DSD, SAT/ACT) independent of whether a matching course exists on the same record.

RECOMMENDED COUNSELOR RULES:
RULE-ACADEMIC-001 through 009, fully stated with sourced grounding in
`docs/research/secondary-education-systems/README.md`. Summary: preserve native grades
(never force a GPA conversion); never infer class rank; read course rigor relative to what
the specific school actually offered; keep external exam results and internal course
grades as separate evidence; predicted and final grades are separate states that don't
apply in every system; keep curriculum/course/qualification/exam as genuinely separate
concepts; never let a narrower credential (DSD) imply a broader one (Abitur); never assume
a school offers a program from reputation alone — check the actual record; distinguish
"doesn't apply here" from "not yet collected."

UNRESOLVED QUESTIONS:
Each system doc has its own full list. Highest-priority follow-ups if this becomes
product-critical: (1) IB's exact TOK/EE bonus-points matrix and passing-criteria wording,
verbatim (Cloudflare-blocked this session); (2) the exact KMK Gesamtqualifikation
two-thirds/one-third split, against primary legal text rather than a press release; (3)
GIB's exact formal recognition status relative to a standard Abitur (school-sourced only);
(4) which countries/subjects currently retain the Cambridge IGCSE 9-1 option; (5) the
French Bac's exact 2027 grand-oral-coefficient and new-maths-exam changes, which were
still describable as a reform-in-progress at research time.

INTENDED CONSUMER:
Primary: **Claude B** (product/counselor/academic-profile semantics) — the schema-gap
findings above are written directly for that role. Secondary: **Claude A** (data
normalization/canonical academic metadata) — relevant if/when school-registry data (which
programs a specific school offers) needs to link against these system definitions.

NEXT ACTION:
1. Claude B reviews the "high-risk modeling errors" list above and decides whether/how to
   act on the `curriculum='ap'` and predicted-vs-final-grade gaps specifically — these are
   the two findings most likely to cause an actual counselor-logic mistake if left
   unaddressed, per this research's own risk read.
2. Re-read `docs/current-state.md` and `docs/ORYN_WORKSTREAMS.md` for what's changed since
   this package started, then propose the next highest-leverage research package (R3+
   candidates: country-level admissions systems, opportunity-eligibility research,
   research/publication-opportunity sourcing) — per this research lane's own operating
   instructions, not started automatically without that re-check.
