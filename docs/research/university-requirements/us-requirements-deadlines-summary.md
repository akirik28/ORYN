# United States admission requirements and deadlines

Research lane: `worktree-us-requirements` (`oryn/us-requirements-research`)
Researched: 2026-08-21
Data files: `data/research/university-requirements/us_requirements_*.jsonl`,
`data/research/university-requirements/us_deadlines_*.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

The US is the first market named in ORYN's own spec, and the one destination where ORYN has
real institution statistics (College Scorecard) and zero requirements data — a student could see
Harvard's acceptance rate and nothing about what Harvard actually asks for. Assigned to this lane
after it closed out 991 requirements/deadlines records for Germany and the Netherlands, on the
reasoning that the same verification discipline transfers directly to a new market shape.

Before any research began, all 12 targets were checked directly against the live database rather
than resolved by name — a discipline that paid off immediately: the identity lookup itself caught
"University of Missouri, Columbia" as a false positive on a `%Columbia%` match, and surfaced a
real duplicate database row for MIT (one populated, one empty stub — independently confirmed by
the coordinator as one of nine such pairs database-wide, already correctly marked
`duplicate_status: superseded` pointing at the populated row this lane had already chosen). All
11 non-MIT targets were confirmed to have no duplicate siblings.

---

## Verified counts

**522 records across 12 universities**: 355 requirements + 167 deadlines.

| University | Requirements | Deadlines | Total |
|---|---:|---:|---:|
| MIT | 16 | 7 | 23 |
| Stanford | 32 | 14 | 46 |
| Harvard | 22 | 12 | 34 |
| Yale | 22 | 9 | 31 |
| Princeton | 16 | 9 | 25 |
| Columbia | 29 | 17 | 46 |
| UC Berkeley | 25 | 10 | 35 |
| UCLA | 37 | 28 | 65 |
| Michigan-Ann Arbor | 47 | 11 | 58 |
| Georgia Tech | 16 | 11 | 27 |
| Carnegie Mellon | 59 | 30 | 89 |
| NYU | 34 | 9 | 43 |
| **Total** | **355** | **167** | **522** |

CMU's 89 records are the largest single-university batch in this entire research programme —
not an anomaly, but a direct reflection of genuine institutional complexity: CMU's seven
undergraduate colleges admit with real, independently-sourced differences (11 distinct coursework
tables, a testing policy that varies by college, per-school portfolio/audition requirements)
rather than one university-wide rule set.

---

## The test-optional trap, found in every real shape the brief predicted

The brief named test-optional policy as the top trap — announced at institution level, sometimes
varying by school-within-university, frequently a temporary extension, and prone to a still-live
2021-era page contradicting the current one. All of these showed up, plus shapes the brief didn't
anticipate:

- **A genuine live conflict, exactly as predicted**: Harvard has five current pages consistently
  stating SAT/ACT is required, and a page dated 29 January 2021 — still live, with no superseding
  banner (unlike a sibling 2020 page that does carry one) — stating the opposite for that cycle.
  Recorded as `CONFLICTING_EVIDENCE`, not resolved by assuming the older page is obviously moot.
- **Two universities not yet reinstated, contrary to the brief's own assumption**: Princeton and
  Columbia are both still test-optional for the *current* cycle (Fall 2027 entry); testing
  becomes required only the *following* cycle. Recorded as two separate `VERIFIED_CURRENT` records
  at different `cycle_year`s so neither reads as contradicting the other — a real distinction from
  a genuine conflict.
- **A stale page that turned out not to be a conflict**: Columbia's own 2021/2022-dated
  test-optional page is still live at its URL, but explicitly self-scopes to closed cycles rather
  than claiming current applicability — correctly classified `VERIFIED_HISTORICAL`, not
  `CONFLICTING_EVIDENCE`. The distinction from Harvard's case (no self-scoping, looks live) is the
  whole point: the same symptom (an old page still up) has two different correct answers depending
  on what the page actually claims.
- **Genuinely clean, no-conflict cases, correctly reported as such rather than forced**: Stanford,
  MIT, Georgia Tech, NYU, Michigan and UC Berkeley/UCLA (test-*free*, not merely optional) were
  each specifically checked for a stale contradicting page and none was found. Georgia Tech's case
  is its own correction to the brief: it never went test-optional at the undergraduate level at
  all — one of only three University System of Georgia institutions that held the line through
  the pandemic — so there was no reinstatement to find.
- **Non-uniform by college, confirmed and mapped, not assumed uniform**: CMU's testing policy
  genuinely varies — required at the School of Computer Science, test-flexible (SAT/ACT/IB/AP/
  Cambridge/French Bac) at five other colleges, test-optional at the College of Fine Arts.
- **Within-institution good/bad handling of the January 2026 TOEFL rescale** (see below) turned up
  the same "not a single institutional property" lesson the DE/NL lane found, again.

---

## Early admission rounds: binding semantics captured as their own fact, not flattened

The brief's schema approach — round name verbatim in `cycle_label`, binding/exclusivity terms as
a **separate companion requirement record** (`category: "other"`) rather than encoded into the
deadline itself — held up across the whole lane, including the UC system's genuinely different
shape (no rounds at all).

**Coordinator-verified before this lane trusted it**: the coordinator traced `category: "other"`
through the actual evaluator (`lib/requirements/evaluate.ts`) and confirmed it correctly falls
through to `needs_manual_review` for these records today — the right verdict for a binding
contract. Two things worth keeping in mind, not fixed by this lane: `structured_rule` must stay
null on these records (every companion record carries an explicit `researcher_notes` sentence
saying so, to stop a future `interpret-requirement.ts` pass from converting a legal commitment
into a checkbox), and the `needs_manual_review` UI copy ("review it yourself") under-states an ED
contract next to what a student would read as the same generic warning as a missing essay — a
copy fix for whoever owns the requirement UI, not something this lane can act on.

**Real institutional variation found, not assumed uniform:**

- **No Early Decision at all**: MIT (EA only, verified not assumed — no ED record fabricated),
  Princeton and Yale (Single-Choice/Restrictive EA, no ED program).
- **Binding round confirmed present where a name-based guess would have gotten it wrong**:
  Columbia's brief described "ED and ED II" — verified false; only one binding round exists,
  Columbia's own Dates & Deadlines table and dedicated ED page both confirm it, and third-party
  aggregators' claimed "ED II" date matches Columbia's own Regular Decision date, suggesting
  upstream mislabeling. CMU's brief also assumed ED II might exist — confirmed absent via the
  Common Data Set's own structured field, left blank by CMU.
- **The direct opposite finding at a different institution**: NYU's ED II genuinely exists,
  verified independently per instruction rather than assumed to parallel Columbia — with identical
  binding terms to ED I (the brief had guessed they might differ; they don't).
- **A brief assumption corrected by direct verification**: Michigan actually runs three plans
  (ED + EA + RD), not the two the brief assumed — it added a binding ED option within the last
  cycle or two. The mandatory companion record was written for ED only; the confirmed
  non-restrictive EA correctly got no companion record, per the brief's own conditional
  instruction — the same correct restraint Georgia Tech showed when it searched exhaustively for
  EA exclusivity language and found none.
- **A genuinely novel shape**: Georgia Tech runs two non-overlapping EA rounds split by residency
  (EA1 Georgia residents, EA2 everyone else including international), not seen at any other
  university in this batch.
- **A structural mechanic distinct between two ED-using universities**: at NYU, an applicant
  *denied* under ED cannot reapply RD the same cycle, distinct from being *deferred* (automatic).
  Columbia's pattern differs — disambiguated explicitly rather than assumed to generalize.
- **No rounds at all, confirmed not assumed**: both UC campuses use a single filing period
  (Oct 1 – Nov 30, itself a correction to the brief's "commonly Nov 1–30" — that window was
  expanded UC-wide in 2022, four years stale by the time this brief was written) applying to all
  nine UC undergraduate campuses via one shared application, no ED/EA/REA anywhere in the system.

---

## Financial aid: captured as its own fact, and precise enough to show real institutional variation

Every university's CSS Profile/FAFSA/institutional-aid deadlines were recorded as their own
deadline records (`deadline_type: scholarship`, noted as need-based aid infrastructure, not merit
scholarship — the closest fit in the existing enum). FAFSA was consistently excluded as an
international-applicant fact since it is domestic-only.

**Need-blind/need-aware turned out to be genuinely varied, not a single Ivy-League norm:**

- **Need-blind explicitly extended to international applicants, confirmed on the institution's own
  words**: Harvard, Yale, Princeton.
- **Need-blind for domestic, explicitly need-aware for international — a materially different
  policy, recorded precisely rather than generalized**: Stanford.
- **Institutional aid essentially unavailable to international students, confirmed directly**:
  Georgia Tech, Carnegie Mellon, Michigan.
- **A genuine three-tier public-university structure**: Michigan gives residents a full-need-met
  guarantee, nonresident domestic students aid-eligibility without that guarantee, and confirms
  international students ineligible for need-based aid entirely.
- **More generous than the brief's own hypothesis**: NYU's Promise commits to meeting 100% of
  demonstrated need "regardless of citizenship status" — but no official NYU page states whether
  the *admission decision itself* considers need for international applicants specifically. Two
  different facts easy to conflate, kept separate; the second recorded as an open gap rather than
  filled from secondary sources (CollegeVine, Quora claims were found and explicitly excluded).
- **Terminology absent entirely, verified not merely unfound**: CMU's own pages were checked via
  raw-HTML grep, not just page summaries — "need-blind" and "need-aware" appear on zero official
  CMU pages. Recorded as an explicit verified unknown rather than repeating the "aid-blind" claim
  found only on secondary sources.
- **A nuance inside an apparently-clean policy**: Harvard's blanket no-loan guarantee is stated
  only on citizenship-neutral pages; the international-specific aid guide doesn't restate it and
  separately notes loan programs are "designed primarily for US citizens" — recorded as an
  explicit partial gap, not resolved either way.
- **Princeton doesn't use CSS Profile or IDOC at all** — runs its own Princeton Financial Aid
  Application, used by domestic and international applicants alike. A genuine negative finding,
  not an oversight.

---

## The cross-institutional year-offset trap, found live at three separate universities

Columbia's own agent flagged a pattern in wave 1: a financial-aid subdomain labeling cohorts by
*academic year of enrollment* while the admissions subdomain labels by *admissions cycle year* —
potentially a full year apart for the identical entry class under the same-looking label string.
Every wave-2 brief carried this warning forward, and it turned up live, independently, three more
times:

- **Georgia Tech**: financial aid's "2026-27" meant Fall 2026 entry; admissions' "2026-27 cycle"
  meant Fall 2027 entry — a full year apart under the identical string.
- **UC Berkeley and UCLA**, independently, on what both agents identified as the same UC-systemwide
  stale page (`ca-dream-act.html`): still showing the closed Fall 2026 cycle at retrieval time.
  Each recorded the stale figure as its own `VERIFIED_HISTORICAL` row and sourced the real Fall
  2027 date from the properly-cycled page instead, rather than either treating the stale figure as
  current or silently overwriting it.

Four independent confirmations of the same failure shape (Columbia, Georgia Tech, Berkeley, UCLA)
is strong enough that it should be treated as a standing check for any future US-market pass, not
a one-off Columbia quirk.

---

## Conflicts found: 11 total, all recorded, none resolved

2 requirement-level and 9 deadline-level `CONFLICTING_EVIDENCE` records. The most structurally
interesting is CMU's: **a three-way conflict**, not the two-source pattern seen everywhere else in
this research programme — the live deadlines page, the course catalog, and the Common Data Set
each give a different ED/RD date (Nov 2/Jan 4, Nov 3/Jan 5, Nov 1/Jan 1 respectively), all three
official CMU sources, none picked. That the Dec 1 Drama/Music deadline, Dec 15 ED notification and
May 1 RD reply date are identical across all three of the *same* sources confirms the conflict is
real and localized to one specific date pair, not a wholesale sourcing problem.

None of the 11 conflicts in this lane were resolved by a "prefer the newer-looking page" heuristic
— consistent with the DE/NL lane's Groningen/Erasmus finding that no single resolution rule
generalizes safely.

---

## Validation performed

- All 522 records parse as valid JSON, UTF-8.
- All records carry the exact 24-field (requirements) or 22-field (deadlines) schema — zero
  missing/extra-field records.
- Every enum-constrained field checked against the exact allowed vocabulary —
  `requirement_category_db` is a live Postgres enum where an out-of-vocabulary value fails the
  insert outright.
- Every `recurring_annual_undated` deadline verified to have `deadline_date: null` — zero
  violations across all 167 deadline records.
- Zero duplicate `research_requirement_id` / `research_deadline_id` within any pair, across this
  lane's 24 files, or against the **entire** existing requirements/deadlines corpus (including the
  DE/NL lane's 991 records and the pre-existing rows from before either lane started).
- Zero Missouri/wrong-institution contamination, confirmed via direct grep on the Columbia files.
- `source_authority_passes_gate` spot-checked against the actual `looksOfficial()` predicate: a
  brief error claiming `admission.universityofcalifornia.edu` fails the gate was caught by the UC
  Berkeley agent, which pulled the real function from `lib/acquisition/source-authority.ts` and
  ran it directly — the domain genuinely ends in `.edu` and passes. All 35 UC Berkeley and 65 UCLA
  records citing that domain were verified `true`.
- Every binding-round companion record confirmed to carry the `structured_rule`-warning sentence
  in `researcher_notes` — checked programmatically, with the filter's false positives (unrelated
  `category: other` records like fee-waiver or need-blind facts) manually triaged rather than
  assumed to be misses.

---

## Corrections this lane made to its own briefs, kept visible rather than smoothed over

A research lane's briefs are themselves claims, not ground truth, and five were caught and
corrected by direct verification rather than propagated:

1. Princeton had not yet reinstated testing (brief assumed it had).
2. Columbia has no Early Decision II (brief assumed it did, based on third-party sources that
   likely mislabeled Columbia's own RD date).
3. Yale's brief described a testing policy phase that was already superseded by the time this
   pass ran — Yale had moved to a stricter policy weeks earlier.
4. Michigan runs three admission plans, not the two the brief assumed.
5. `admission.universityofcalifornia.edu` passes the source-authority gate; the brief said it
   didn't.

None of these were treated as blockers — each was caught, corrected, and the corrected fact
carried forward into the actual records, exactly the discipline this whole research programme is
built around.

---

## Remaining gaps, in priority order

1. **11 unresolved conflicts** (listed above) need a human or a downstream lane to adjudicate —
   this lane's job was to surface them accurately, not resolve them.
2. **The binding-round UI-copy gap**: `needs_manual_review` reads the same for a binding ED
   contract as for a missing essay — flagged by the coordinator as a copy fix for whoever owns the
   requirement UI.
3. **`structured_rule` must stay null on every binding-round companion record** going forward,
   including in any future US-market pass — the explicit warning is in `researcher_notes` on each,
   but the real protection is whoever builds `interpret-requirement.ts` respecting it.
4. **The year-offset trap (financial-aid vs. admissions subdomain labeling)** should be a standing
   check for any future US-market research, not treated as resolved after four confirmations.
5. **NYU's international admission need-aware/need-blind status** is a genuine open question, not
   just an unresearched one — no official page states it either way.
6. **The MIT/UCL/LSE/Warwick-class duplicate-`universities`-row pattern** (nine pairs, confirmed
   by the coordinator to be a `universities`-table issue, not a canonical-entity dedup failure) is
   out of this lane's scope but worth flagging again: any lane targeting one of those nine
   institutions should resolve on the row with real data, not by name.
