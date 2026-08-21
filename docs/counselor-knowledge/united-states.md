# United States — counselor knowledge

Evidence base: 522 corpus records (355 requirements + 167 deadlines) across MIT, Stanford,
Harvard, Yale, Princeton, Columbia, UC Berkeley, UCLA, Michigan-Ann Arbor, Georgia Tech, CMU, NYU
(`data/research/university-requirements/us_{requirements,deadlines}_*.jsonl`), plus
`docs/research/university-requirements/us-requirements-deadlines-summary.md` (VERIFIED tier), and
`docs/research/admissions-systems/united-states.md` + the cross-country matrix in
`docs/research/admissions-systems/README.md` (SYSTEM-LEVEL BACKGROUND tier).

## The one fact that must never be gotten wrong

**A US Early Decision acceptance is a binding contract, not a strong preference.** Columbia's own
language: *"If admitted, you must withdraw all other applications and accept our offer of
admission"* (REQ-2026-08-21-COL0029, VERIFIED). Advising a student to apply ED without confirming
they are certain — financially and academically — has real consequences: withdrawn applications
elsewhere, no leverage to compare aid offers. **Restrictive Early Action (REA/SCEA) forbids other
early applications** at Yale/Princeton/Stanford/Harvard, though it does not bind the student to
enroll if admitted the way ED does — the two restrictions are different in kind and must not be
described identically to a student. (SYSTEM-LEVEL BACKGROUND: `admissions-systems/united-states.md`
distinguishes "contingent-on-non-decline" as the US mechanic generally, distinct from the UK's
predicted-grade conditional offer — the US doesn't withdraw an offer for missing a target grade,
but ED withdraws the *student's* freedom to decline.)

These records carry a deliberate schema choice worth knowing: binding/exclusivity terms are stored
as a **separate companion requirement record** (`category: "other"`), not folded into the deadline
itself, and every one of those companion records carries an explicit note that `structured_rule`
must stay null — a binding contract must never be auto-evaluated as a checkbox. The evaluator
(`lib/requirements/evaluate.ts`) correctly routes these to `needs_manual_review` today, but that
status reads identically to a missing essay in the UI — the advisor's own language should not
repeat that flattening; say "binding" explicitly.

## Early admission plans vary by university — do not assume a shape

VERIFIED, per-institution (not a national pattern):

- **No ED at all**: MIT (EA only), Princeton and Yale (Restrictive/Single-Choice EA only).
- **Exactly one binding round**: Columbia — verified false that "ED II" exists there, despite
  third-party aggregators claiming it (their claimed ED II date matches Columbia's own Regular
  Decision date, suggesting upstream mislabeling propagated from a bad source). CMU confirmed no
  ED II via its own Common Data Set field, left blank.
  **Never trust a third-party aggregator's claim about a binding-round structure; verify against
  the university's own dates-and-deadlines page.**
- **ED II genuinely exists**: NYU, with binding terms identical to ED I.
- **Three plans, not two**: Michigan runs ED + EA + RD (added ED within the last cycle or two —
  do not assume Michigan is EA/RD-only from older knowledge).
- **Split by residency, not selectivity**: Georgia Tech runs two non-overlapping EA rounds — EA1
  for Georgia residents, EA2 for everyone else including international applicants.
- **No rounds at all**: both UC campuses (Berkeley, UCLA) use one filing period, Oct 1–Nov 30
  (expanded UC-wide in 2022 — an "Nov 1–30" assumption is stale), no ED/EA/REA anywhere in the UC
  system, one shared application for all nine UC undergraduate campuses.
- **Denial vs. deferral under ED are different outcomes with different consequences**: at NYU, a
  student *denied* under ED cannot reapply RD the same cycle; a *deferral* is automatic re-review.
  Verify this per-university — Columbia's pattern differs and was not assumed to generalize.

## Test-optional policy is not one national fact — it is per-institution and sometimes per-college

- **Harvard's 2021 page looked like a live conflict but is closed**, once read to the end of its
  own first sentence. Five current pages state SAT/ACT is required (REQ-2026-08-21-HAR0001,
  VERIFIED_CURRENT). A page dated 29 January 2021 (REQ-2026-08-21-HAR0002) scopes itself to the
  2021-22 cycle in its own opening sentence — it never claimed to govern now. Harvard announced
  testing required again from the Class of 2029 on 11 April 2024. **The real finding is a
  live-page hazard, not a conflict**: that 2021 page is still up on Harvard's primary admissions
  domain with no superseding banner, unlike a sibling 2020 page that does carry one. Tell the
  student Harvard is test-required; separately flag that Harvard's own site inconsistently marks
  its retired pages, so an old URL can look current when it isn't.
- **Princeton and Columbia are still test-optional for the current cycle** (Fall 2027 entry) —
  testing becomes required the cycle *after*. Do not assume "Ivy League has reinstated testing"
  as a blanket fact.
- **Georgia Tech never went test-optional at the undergraduate level** — one of only three
  University System of Georgia institutions that held through the pandemic. There was no
  reinstatement to find; don't imply one happened.
- **Stanford, MIT, NYU, Michigan are test-required/free**; UC Berkeley and UCLA are test-*free*
  (not merely optional — UC does not consider scores at all even if submitted).
- **CMU's policy varies by college within the same university**: required at the School of
  Computer Science, test-flexible (SAT/ACT/IB/AP/Cambridge/French Bac accepted interchangeably) at
  five other colleges, test-optional at the College of Fine Arts. Never state "CMU is
  test-optional" without naming the college.

This is the same class of finding as `scalar-thresholds-are-not-enough.md`'s TOEFL-rescale
problem, playing out at the policy level rather than the score level: a page's age and scope, not
just its content, determines whether a fact is still true.

## Financial aid for international students: genuinely varies, do not generalize an "Ivy norm"

- **Need-blind for international applicants, on the institution's own words**: Harvard, Yale,
  Princeton.
- **Need-blind for domestic, need-aware for international — a materially different policy**:
  Stanford. Do not describe Stanford as simply "need-blind."
- **Institutional aid essentially unavailable to international students**: Georgia Tech, CMU,
  Michigan (Michigan's own three-tier structure: full-need-met guarantee for residents,
  aid-eligible-without-guarantee for nonresident domestic, ineligible entirely for international).
- **CMU's own pages never use the terms "need-blind" or "need-aware" at all** — verified by raw-HTML
  grep, not inferred from a summary. If a student asks about CMU's policy, the honest answer is
  that CMU does not publish one in those terms, not a guess extrapolated from peer schools.
- **Princeton does not use CSS Profile or IDOC** — runs its own Princeton Financial Aid
  Application for all applicants, domestic and international alike. Do not tell a Princeton
  applicant to file CSS Profile.
- NYU's Promise commits to meeting 100% of demonstrated need "regardless of citizenship status,"
  but no official NYU page states whether international need is considered *in the admission
  decision itself* — a genuine open question, not filled from unofficial sources.

## The year-offset trap: a cohort label can mean two different entry years

Confirmed independently at four universities (Columbia, Georgia Tech, UC Berkeley, UCLA): a
financial-aid subdomain labels a cohort by *academic year of enrollment* while the admissions
subdomain labels the identical cohort by *admissions cycle year* — potentially a full year apart
under the same-looking string (e.g. Georgia Tech's financial-aid "2026-27" = Fall 2026 entry,
while admissions' "2026-27 cycle" = Fall 2027 entry). **When a US date carries a year label, check
which subdomain it came from before repeating it to a student** — this is now a standing check,
not a one-off quirk.

## A "three-way conflict" that is actually one rule, applied three ways — the standing lesson

CMU's ED/RD dates looked like a genuine three-way conflict across three official CMU sources —
the Common Data Set gives Nov 1/Jan 1, the live page gives Nov 2/Jan 4, the course catalog gives
Nov 3/Jan 5 (DL-2026-08-21-CMU0001, DL-2026-08-21-CMU0004, originally recorded
`CONFLICTING_EVIDENCE`). **It is not a conflict.** CMU shifts deadlines off weekends and holidays
to the next business day, and that single rule predicts all three: the CDS reports the nominal
policy date (Nov 1/Jan 1) because that is what the CDS form asks for; the course catalog (fall
2026 entry) shifts Nov 1 2025 (a Saturday) to Nov 3 and Jan 1 2026 (a holiday, with Jan 4 falling
on a Sunday) to Jan 5; the live page (fall 2027 entry) shifts Nov 1 2026 (a Sunday) to Nov 2 and
Jan 1 2027 (a holiday, weekend behind it) to Jan 4. Three sources, three cycles, one rule — nothing
actually disagrees. Other CMU dates (Dec 1 Drama/Music deadline, Dec 15 ED notification, May 1 RD
reply) are identical across all three sources, consistent with this being business-day arithmetic
rather than a sourcing problem.

**The counselor-relevant rule, generalized**: a US university's published deadline may be stated as
the nominal policy date or as the business-day-shifted actual date, and different official
documents (a Common Data Set entry vs. a live admissions page) can legitimately print different
numbers for the *same* underlying deadline without disagreeing. Before recording two dates from the
same university as conflicting, check whether a weekend/holiday shift explains the difference —
"two different dates" is not automatically two different facts. Separately: Harvard's QuestBridge
page states "end of September" where QuestBridge's own site states October 1 — the operator
(QuestBridge) owns that date, and Harvard's phrasing is a loose paraphrase that errs safe, not a
conflicting claim.

## SYSTEM-LEVEL BACKGROUND: how the US system works generally

- No national platform or admissions body; Common App is the largest single platform but not
  universal (MIT requires direct application) — never call Common App "the" US application system.
- No national numerus fixus; capacity constraints exist as university-level direct-admit majors
  (RULE-ADMISSIONS-010, RULE-ADMISSIONS-018) — e.g. Berkeley's EECS admits separately from
  Berkeley's general CS major, and the university's own site says the two processes "vary
  significantly"; CMU's School of Computer Science is one of seven colleges CMU admits into
  directly. A student "admitted to the university" is not necessarily admitted to their intended
  major — check whether the target field has a separate admission gate.
- Predicted grades play essentially no structural role in US decisions (contrast the UK, where
  they are the defining mechanic) — a US application's "conditional" concept is closer to
  "contingent on the final transcript not showing a real decline," not a target-grade offer.
- Essays are structurally central (Common App main essay + per-college supplements) — this is a
  genuine US-specific evidence requirement, not found at this weight in any other country in the
  corpus.
- Extracurriculars are a structured component (the Activities List) but NACAC's own data ranks
  them below grades/rigor — "the US cares a lot about extracurriculars" is directionally true but
  should not be overstated relative to academic rigor.
- **Dominant counselor risk (per the cross-country matrix)**: over-generalizing one university's
  policy as a US national standard. Every finding in this document exists specifically because
  that generalization keeps being wrong — test-optional, ED structure, need-blind status, and
  deadline dates are all per-institution, sometimes per-college, facts.
- Türkiye-applicant note: no authoritative US-specific source on MEB-diploma direct-entry treatment
  was found in the R3.1 admissions-systems pass — recorded as a genuine research gap, not a
  confirmed-simple or confirmed-absent finding. Do not improvise an answer here.

## Open conflicts (unresolved, do not pick a side)

The corpus originally recorded 11 `CONFLICTING_EVIDENCE` records for this country; a parallel
verification pass has since resolved several of them against a real mechanism rather than a
guessed preference — Harvard's testing page and CMU's ED/RD dates (both above) are two confirmed
examples, closed rather than disputed. **Do not treat this document's remaining-conflict count as
final** — check `us_requirements_*`/`us_deadlines_*.jsonl` `verification_state` directly, or ask
the coordinator, before presenting any specific US date or policy as unresolved. The advisor's
honest answer on a genuinely still-open conflict is "the university's own sources disagree;
confirm directly," never a silent pick of the newer-looking page — but a "conflict" is worth one
check for a resolving mechanism (a business-day-shift rule, a page's own self-scoping sentence)
before it's presented to a student as disputed.
