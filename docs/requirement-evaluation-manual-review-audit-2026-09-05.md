# Why every one of 295 requirement evaluations reads "needs review" — 2026-09-05

CEO's measurement, re-verified live (`oryn-qa-scratch`) before anything else: `student_
requirement_evaluations` has 295 rows, and every one of them is `status = 'needs_manual_
review'` — zero `met`, zero `not_met`, zero `unknown`. Four of CEO's own four questions,
answered in order. Report only, per instruction — nothing here was changed.

## The one live fact that explains almost everything

```sql
select count(*) as total, count(*) filter (where structured_rule is not null) as has_rule
from public.university_requirements;
-- {total: 1550, has_rule: 0}
```

**Zero of 1550 requirement rows in the entire catalog have ever had a `structured_rule`
authored — not for these four students' universities, for any university.** This is the
root cause underneath all four of CEO's questions, and it is a *data* fact, not a *code*
fact — the distinction the first question below turns on.

## 1. Which branch produces `needs_manual_review` — one, or every path?

**Neither, precisely — and the honest answer is more specific than either option.**
`evaluateRequirement()` (`lib/requirements/evaluate.ts`) is a real, multi-branch engine:
`curriculum`, `coursework`, `minimum_grade`, `test_score`, and `language_proficiency`
rules each have genuine logic capable of returning `met`, `not_met`, `unknown`, or
`likely_met` from a student's actual profile facts (GPA scale comparisons, course-level
ranking, test-score-scale-family matching, curriculum membership — this is not a stub).
**But before any of that runs, line 248 checks `rawStructuredRule === null` and returns
`needs_manual_review` immediately if so — and that check fires for effectively every
evaluable row today, because the data feeding it is uniformly empty.** Two categories of
row hit `needs_manual_review` for two different reasons that both currently apply:

- **`MANUAL_REVIEW_CATEGORIES`** (`essay`, `recommendation`, `interview`, `portfolio`,
  `supplemental_requirement`, `international_requirement`) never reach the rule logic at
  all — line 237 routes them to manual review *before* the structured-rule check, by
  design, permanently, regardless of data. **100 of the 295 live rows (34%)** are this
  category, confirmed by joining `student_requirement_evaluations` to `university_
  requirements` live.
- **Everything else** (`english_proficiency`, `standardized_test`, `minimum_grade`,
  `prerequisite_coursework`, `curriculum`, `entrance_exam`, `required_subject`,
  `language_proficiency`) *is* real, evaluable-in-principle rule logic — it is just
  blocked at the `structured_rule === null` gate because that column has never been
  populated for any row in the catalog. **195 of the 295 live rows (66%)** are this
  category.

So: not "one dead-end branch," and not "every path is a dead end" in the code sense —
the code has real branches. What's true is that a *live data precondition* (an admin
having authored a structured rule) currently gates 100% of the requirements that would
otherwise exercise those branches, for 66% of today's manual-review rows. The other 34%
were never going to be anything but manual review, on purpose.

## 2. Honest answer or incomplete implementation? Separated, not blended.

**Both, and they map exactly onto the 34%/66% split above — this is the actual answer,
not a hedge.**

- **The 34% (`MANUAL_REVIEW_CATEGORIES`) is a fully honest, complete implementation.**
  This system was never going to auto-grade an essay or a recommendation letter, and it
  doesn't pretend to — the migration's own comment states this design choice directly
  (`structured_rule` is "Null for categories that cannot be evaluated against stored
  profile facts"). Nothing is missing here; nothing would change if every admin in the
  world reviewed every row.
- **The 66% is honest *at the per-row level*, but the feature as actually operated is
  effectively inert for this slice — and the reason is an unexercised workflow, not
  missing code.** Three real pieces of code exist and work: the evaluation engine (above),
  a `structuredRuleJson` field on the admin's own `addUniversityRequirement` form
  (`app/(app)/universities/[id]/requirement-actions.ts`), and an AI-assisted authoring
  helper (`suggestRequirementRule`, calling `lib/ai/interpret-requirement.ts`), both
  correctly `requireAdmin()`-gated. What's missing is not code — it's that **no admin has
  ever used either path, on any of 1550 requirement rows.** The bulk-ingestion pipeline
  that actually created these 1550 rows (`lib/requirements/ingest.ts`) writes `structured_
  rule: null` by design (it's typed as the literal `null`, not just defaulted) — the
  two-phase workflow (bulk-ingest raw text, then an admin structures each one afterward)
  was designed correctly; phase two has simply never run, at all, on a single row.

The per-row copy a student actually sees is not fabricated or vague either way — see #3.

## 3. What the Requirement Check screen actually shows

**A real, distinct badge and a specific, honest sentence — not a blank table, not a
generic error.** `RequirementEvaluationBadge` (`features/universities/requirement-
evaluation-badge.tsx`) renders `needs_manual_review` as its own warning-toned "Needs
review" / "İnceleme gerekiyor" state (never silently folded into `met` or `not_met`) —
this was a deliberate Phase 68 design choice, per that component's own comment: "Oryn
should know when it doesn't know enough, not report a flat completion state." Below the
badge, `RequirementGroup` renders the actual reasoning text. For the 66% (missing
structured rule specifically), that text is (`lib/requirements/copy.ts`):

> "No structured rule has been recorded for this requirement yet — check the source
> link directly." / "Bu gereklilik için henüz yapılandırılmış bir kural kaydedilmedi —
> kaynak bağlantısını doğrudan kontrol et."

— followed immediately by a real, clickable `SourceBadge` linking to the actual official
source page. A student reading this screen is told the true thing and given a real next
step. This is the honest half of the answer to question 2, confirmed by reading the
actual rendered copy, not inferred from the code's intent.

## 4. Why only 4 of 8 students have any evaluation at all

**Confirmed live: exactly 4 of 8 onboarded profiles have any row in `student_requirement_
evaluations`, matching CEO's own count exactly.** The mechanism is the same "not computed
unless the page was opened" shape as today's admission-outlook finding, confirmed by
reading the code, not assumed by analogy: `refreshRequirementEvaluations()`
(`lib/requirements/persist.ts`) is called from exactly one place — `app/(app)/
universities/[id]/page.tsx`'s own render — and that file's own comment states it plainly:
"This function has exactly one real caller (the university detail page) and no
background-sweep path." A student who has saved target universities but never opened a
specific university's own detail page has never triggered this write, for any
university, ever. There is no scheduled job, no dashboard-load trigger, no
target-university-add trigger — only a direct page visit.

## Bonus, not one of the four questions but the mechanism behind CEO's own dashboard claim

**Confirmed at the exact code location, not assumed:** `lib/counselor/candidates.ts:8` —
`const ACTIONABLE_REQUIREMENT_STATUSES = new Set(["not_met", "unknown"]);` — is the
literal filter `requirementCandidates()` applies before a requirement can ever become a
dashboard "this week" action. `needs_manual_review` is not in that set, on purpose (per
`getRequirementCandidateInputs`'s own comment, this mirrors the university-detail-page
evaluation exactly, re-running `evaluateRequirement()` live rather than reading the
cached table — a second, independent call site hitting the *same* zero-structured-rule
data, which is why the cache being stale would not have changed this even if it were
fresher). With 0/1550 requirements structured, virtually nothing can ever land on
`not_met`/`unknown` today, so this candidate source is structurally near-zero — the exact
shape CEO's own six-of-eight-students measurement describes, now with the precise code
location and root cause behind it.

## What this is, stated plainly

A fully-built, honestly-behaving evaluation engine and a fully-built, correctly-gated
admin authoring tool, connected by a one-time bulk-data-structuring step that has never
been performed on a single row of a 1550-row catalog. Every individual student-facing
sentence this system produces today is true. The feature's actual value proposition
(telling a student which specific requirements they meet) has never yet been observed by
anyone, because the one manual step that would ever produce a `met` or `not_met` has
never run.
