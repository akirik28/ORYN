# Does `program_id IS NULL` reading as "university-wide" actually surface wrong? Yes.

Branch `oryn/unit-scope-risk-2026-09-01`. Report only — no schema change, no re-scoping, no
new column, nothing written to any table. CEO's redirect from the 388-mismatch report: a
requirement or deadline with `program_id` null is read by the product as applying to the
whole university. Some of those rows actually describe a School, an admission route
spanning several subjects, or a single specific program that simply never got linked — and
the mislabeling isn't cosmetic, because there's no captured exception text to give it away
the way the UK October deadlines at least had. Two questions: how many rows, and does it
actually surface wrong in the running app.

## 2. Does it surface? Yes — checked live, not inferred from code

Read `app/(app)/universities/[id]/page.tsx` first: line 185,
`const universityWideRequirements = requirements.filter((r) => r.program_id === null)`,
rendered at line 565 under `<RequirementGroup title="University-wide" .../>`. Every
`program_id IS NULL` requirement gets that heading — not "ungrouped" or "general", the
literal word **"University-wide"**. That's an affirmative claim, not an absence of one.
Deadlines are milder: `DeadlineGroup` only adds a small program-name tag when `program_id`
is set (line 754) and adds nothing when it isn't — an unlinked deadline sits unlabeled in
the flat list rather than under a false "University-wide" heading. Same underlying bug,
worse presentation on the requirements side.

Checked this live against the real database, not a fixture, via the app's own running dev
server (`localhost:3000`, same Postgres this whole lane has used all night):

**Koç University — the clearest case.** Its "Requirement check" section lists, under
"University-wide": **1200, 1260, 1300, 1420, and 1450 (all "out of 1600")** — five
different SAT-equivalent thresholds, all presented as if Koç has five simultaneous general
admission floors. `program_name = "School of Medicine"` on the corpus record behind 1450
(`REQ-2026-08-21-2009`) — its own `requirement_detail` is literally just `"1450 out of
1600"`, no other text, no self-disclosure. A student evaluating any other Koç program sees
this number with nothing to tell them it's the medical school's bar, not theirs — and the
internal inconsistency (five different "university-wide" minimums) is itself a visible
trust problem even before knowing why. Contrast: the same page's "Requirement check"
section separately shows a real "Law" heading with one correctly-scoped English-proficiency
requirement — proof the grouping mechanism displays correctly whenever `program_id`
actually is set; the failure is specific to the null rows, not the display code.

**Carnegie Mellon — the softer case.** `program_name = "School of Design"` /
`"School of Drama"` records render under the same false "University-wide" heading, but
their own text self-discloses: *"College of Fine Arts -- School of Design: 4 years
English..."*, *"If you're applying to the School of Design, you must submit a portfolio..."*
A careful reader can still catch these from the prose even though the heading is wrong.
Materially less dangerous than Koç's bare number, same structural bug.

**The severity genuinely depends on whether the requirement's own text repeats the scope.**
Koç's case has none; Erasmus's Master's-prerequisite case found in the count below
(*"All applicants must hold a Bachelor degree (BSc) in the field of economics,
econometrics or business"*) also has none — a student applying to Erasmus Psychology would
see this listed with nothing marking it as an Economics-Master's-only prerequisite.

## 1. The count — a range, hand-classified, not a keyword pass

Keyword counting was explicitly distrusted going in (it undercounted in the 388-mismatch
report). Hand-classified two separate real samples instead:

**Sample A — 30 records drawn `order by random()` from every live `program_id IS NULL`
requirement with a `research_record_id`** (not filtered to the 388 — this is the first
time the ~1,155-record "`program_name` was never even attempted" population has been
examined for this pattern at all, since the 388-mismatch report only ever looked at rows
that named *something*). Read each one's actual `title`/`requirement_detail`, not just a
label:

- **18/30 (60%) genuinely university-wide** — general policies applying to every applicant
  regardless of program (document legalization, general English-test floors, age-limit
  FAQs, test-optional policy text).
- **6/30 (20%) clearly mis-scoped** — reads as describing one specific program, subject, or
  admission route, with no hint of that in how it's stored. Concrete examples: Waterloo's
  *"Competitive admission average range: Low to mid-90s. Approximate intake: 120"* (a
  specific program's numbers, not a university figure); Göttingen's DoSV
  (dialogue-oriented-service-procedure) admission text, Germany's national allocation
  system used only for capped/NC subjects, not the whole university; Freiburg's Test for
  Medical Studies criterion; Stuttgart's *"Bachelor's Degree... in Chemical, Civil,
  Environmental, Mechanical, Process Engineering..."* (a specific engineering Master's
  prerequisite); Waterloo's *"Applicants to Mathematics programs must submit..."* (names
  the subject directly in text, still renders unscoped); Erasmus's Economics/Econometrics/
  Business Bachelor's prerequisite above.
- **6/30 (20%) ambiguous** — self-disclosing pointers to program-specific pages rather than
  false claims (Tilburg's *"GRE... varies by program, refer to the specific program
  pages"*), or too terse/truncated to classify confidently. Not counted as confirmed
  mis-scoped, but not confirmed safe either.

**Sample B — the 388-mismatch report's earlier finding**, re-expressed for this question:
a conservative keyword count found at least 55 of 169 unresolved (post-shape) pairs
(88 records) describing an organisational unit or admission-route text; the hand-read
sample in that report suggested the true share ran meaningfully higher than the keyword
floor caught.

**Combining both, as a range with reasoning, not a single number:**

- **Conservative floor**: Sample A's 20% confirmed-mis-scoped rate applied to the
  ~1,155-record population it was drawn from (≈231 records), plus Sample B's keyword floor
  of 88 records from the 398-record named-but-unlinked population ≈ **~320 of 1,795
  (~18%)**.
- **Plausible upper bound**: if Sample A's "ambiguous" 20% and Sample B's higher hand-read
  proportion are included rather than excluded, this could plausibly run to
  **~35-40% of 1,795 (roughly 630-720 records)**.
- **Best single estimate, if one number is wanted**: **~20-25% of the 1,795**, i.e.
  **roughly 360-450 rows** — closer to the conservative floor because the "ambiguous"
  bucket in Sample A genuinely reads as a softer problem (a pointer, not a false claim) and
  shouldn't be weighted the same as a confirmed mis-scope.
- **Not covered by either sample, and worth naming honestly**: the 132 records that would
  cleanly link to one specific real program (task 11) are a different shape from CEO's
  "unit or route" question — a genuinely single, specific programme, not a School or an
  admission route — but they render exactly as wrongly today (also under "University-wide",
  since none are backfilled). If the broader question is "how many of the 1,795 show up
  more narrowly-scoped than they claim to be" rather than specifically "unit-or-route",
  these 132 add to the total. Kept separate here because CEO's question was specifically
  about the School/admission-route shape.

This is built from 30 + ~25 hand-read records — about 3% of 1,795. It is a real,
reasoned range, not a precise count; getting materially tighter would mean reading several
hundred more records by hand, which is a different-sized task than this one.

## What was NOT done, per instruction

No schema change. No new `scope` column or concept. No re-linking, no backfill, no fix to
`RequirementGroup`'s heading logic. The 114 remaining unresolved (university, program_name)
pairs from the 388-mismatch report were explicitly dropped, not picked back up — CEO's
call, and the right one: this task needed depth on a narrower, more consequential question,
not more breadth on the one already reported.

## Verification

- Live SQL against the real database (not a fixture) for both samples; every quoted
  requirement text is copied verbatim from `university_requirements.requirement_detail`.
- Live browser check against the actual running app (Koç, Carnegie Mellon) — read the
  rendered accessibility tree directly, not a screenshot guess, and cross-referenced
  against the `RequirementGroup`/`DeadlineGroup` source to confirm the rendering logic
  matches what was observed (the false "University-wide" heading on requirements; the
  milder unlabeled-in-a-flat-list behavior on deadlines).
- No code changed, so lint/typecheck/test/build are unaffected — ran them anyway as this
  lane's standing practice: all clean, 2864 tests passing, build succeeds.
- No `opportunities` table touched. No existing row written to.
