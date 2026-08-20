# Handoff: Opportunity eligibility intelligence (R4)

STATUS:
COMPLETE. Three methodology topics (grade/age normalization, citizenship/residency/
school-location taxonomy, prerequisites/timing patterns) plus an applied extraction audit
against 102 live `opportunities` rows, producing 32 sourced proposed-value rows for
review. Self-directed package, ranked #1 of 3 candidates in the R3.1 wrap-up
(`docs/handoffs/research-admissions-systems.md`) on the strength of `eligible_countries`
being the largest measured data-trust gap blocking real eligibility matching.

SCOPE COMPLETED:
Full writeups: `docs/research/opportunity-eligibility/*.md`. Cross-cutting matrix and
14-rule evidence-based ruleset: that directory's `README.md`. Machine-readable, full
sourcing: `data/research/opportunity-eligibility/opportunity-eligibility-v1.json`.
Categories covered: summer_program, competition, research, scholarship, internship (337
of 352 live rows, 97%). Volunteering (1 row) and fellowship (2 rows) explicitly out of
scope this pass.

PRIMARY SOURCE COVERAGE:
Strong on official-domain direct fetches for most examples (Stony Brook/Simons, MIT
PRIMES, NASA, Havering Council UK, Bavaria/Hesse German state ministries, Diamond
Challenge, QuestBridge, DAAD RISE, EUCYS, UWC, Regeneron STS, FIRST Robotics, Coca-Cola
Scholars, Gates Scholarship, Sutton Trust, Johns Hopkins CTY visa page). Several official
pages returned HTTP 403 to automated fetch throughout (cee.org/RSI, cty.jhu.edu general
pages, stonybrook.edu FAQ, horatioalger.org, med.stanford.edu, ibo.org, education.gouv.fr,
anabin.kmk.org) — for these, quoted language is drawn from search-engine-indexed excerpts
of the official pages, explicitly flagged per-instance in the JSON rather than presented
as verbatim live fetches.

KEY FINDINGS:
1. **Grade/age**: naive same-number grade mapping across countries is unsafe in general.
   US↔Türkiye is the one verified safe pair. US↔UK is off by one (UK Year *N* = US Grade
   *N-1*, confirmed via an official UK government birth-date table — not a guess).
   Germany's Klasse-N is state/track-ambiguous (G8 vs G9). France's grade terms are
   non-numeric and institutionally split (Troisième is in *collège*, not *lycée*). IB DP
   has no native grade-number system at all — IBO's own criterion is age-based (16-19).
2. **Citizenship/residency/school-location**: these are three independent, non-substitutable
   eligibility axes, proven with a real cross-program example (a Turkish citizen at a US
   high school is eligible for MIT PRIMES-USA, ineligible for NC Governor's School,
   ineligible for Simons/Davidson/NASA — three different verdicts, one student, three real
   active programs). ORYN's schema has no field for school-enrollment-location distinct
   from domicile.
3. **Visa/documentation language ≠ eligibility restriction**: a program mentioning "F-1
   visa" is frequently still open to international applicants; several open-worldwide
   programs (Telluride, PROMYS, CTY) mention visa logistics purely as informational notes.
4. **No named-course prerequisite pattern found** in the sample researched — programs gate
   on demonstrated ability (test scores, GPA, portfolio) rather than a specific transcript
   line item; may not generalize outside the elite-US-program sample studied.
5. **Deadline architecture is category-dependent**: summer programs use priority+regular
   tiers, competitions split registration from event date, scholarships/research use one
   annual deadline, internships use rolling multi-session windows. A single scalar
   `deadline` field under-represents at least 2 of these 5 shapes.
6. **Live DB gap has not materially closed since R2.1**: `eligible_countries` moved from
   14/334 (~4.2%) to 18/352 (~5.1%) — table grew, coverage didn't meaningfully improve.

HIGH-RISK MODELING/COUNSELOR ERRORS (ranked by how easily an LLM defaults to the wrong
pattern):
1. Comparing raw grade-number strings across countries without a verified per-pair mapping
   — the single highest-risk pattern, since US↔UK's off-by-one error is easy to miss and
   produces a confidently wrong (not obviously wrong) result.
2. Conflating a school-location or citizenship fact with the other, or with a visa/
   documentation note — three independent axes routinely get collapsed into one.
3. Applying a category-level default (typical GPA, typical deadline shape, typical
   citizenship pattern) instead of extracting the specific program's own stated rule —
   every category researched had clear, sourced counter-examples to any single default.
4. Treating "no statement found" as evidence of openness rather than as a genuine unknown
   — organizer type/country is proven unreliable as a predictor in this sample.

EXTRACTION AUDIT SAMPLE (primary consumer: **Claude A / DATA-A**):
32 of 102 live rows yielded a sourced, reviewable proposed value across `minimum_age`,
`maximum_age`, `eligible_grades`, `citizenship_restrictions`, `residency_restrictions`,
and `application_requirements`. Full evidence quotes and per-row notes:
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json` →
`extraction_audit_sample`. Reviewable summary table:
`docs/research/opportunity-eligibility/extraction-audit-sample.md`. This is a proposal,
not a write — no `opportunities` row was modified by this research lane. Several rows have
explicit caveats (truncated source text, genuinely ambiguous/conflicting source statements)
flagged rather than silently resolved — worth a targeted re-fetch before applying those
specific rows.

PROPOSED DATA SEMANTICS / SCHEMA GAPS:
RULE-ELIGIBILITY-001 through 014, fully stated with sourced grounding in
`docs/research/opportunity-eligibility/README.md`. Conceptual entities recurring across
all three methodology files (not a schema proposal — Claude B decides implementation): a
canonical age-anchored `secondary_stage` enum (S1-S4) to normalize grade/year labels before
cross-country matching; a structured `restriction_basis` enum (citizenship |
permanent_residency | domicile_residency | school_enrollment_location |
national_quota_nomination | none_stated) to make the citizenship/residency free-text
fields machine-queryable; a `school_location_restrictions` field genuinely separate from
`residency_restrictions`; a way to flag organizer-determined/non-public/annually-variable
country lists as distinct from fixed ones; and a `deadline` model that can represent
registration-vs-event splits and multi-session rolling windows, not just one scalar date.

UNRESOLVED QUESTIONS:
Each topic doc has its own full list. Highest-priority if this becomes product-critical:
(1) whether ORYN's actual 352-row dataset contains any program treating citizenship and
permanent residency differently (none found in the 20-program sample); (2) whether
Germany's G8/G9 split needs per-school (not just per-state) tracking, given several states
have partially reversed the reform; (3) re-verification of the several facts sourced only
via search-engine paraphrase of a blocked official page (RSI, Simons FAQ, CTY, Horatio
Alger, Stanford SIMR, IBO, French Ministry of Education, Anabin) against a differently
configured fetcher; (4) whether the "no named-course prerequisite" finding holds outside
the elite-US-program sample studied, particularly for European or medical/health-track
programs likely present elsewhere in ORYN's data.

INTENDED CONSUMER:
Primary: **Claude A / DATA-A** for the extraction audit sample (directly actionable,
sourced proposed values against live rows) and for the schema-gap findings when next
touching opportunity-related migrations. Secondary: **Claude B / PROD-B** for the
methodology/taxonomy sections and the RULE-ELIGIBILITY ruleset, relevant to any eligibility
-matching or counselor logic that reads these fields.

NEXT ACTION:
1. DATA-A reviews the 32-row extraction audit sample and decides whether/how to apply any
   of the proposed values to the live table, re-fetching the handful of rows flagged with
   truncated or ambiguous source text first.
2. PROD-B reviews RULE-ELIGIBILITY-001 (grade/age cross-country mapping) and
   RULE-ELIGIBILITY-007/008 (citizenship/residency/school-location/visa separation) as the
   two findings most likely to produce a materially wrong eligibility determination if left
   unaddressed in matching logic.
3. Re-read `docs/current-state.md` and `docs/ORYN_WORKSTREAMS.md` for what's changed since
   this package started, then propose the next highest-leverage research package rather
   than assuming a fixed sequence.
