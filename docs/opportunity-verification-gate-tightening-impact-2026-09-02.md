# Quantifying `isOpportunitySufficientlyVerified` tightening — before touching a line of it

2026-09-02, oryn-31. CEO's ask, precisely: how many active opportunities exist, how many would
survive a tightened verification gate, and what does Browse look like afterward for a typical
student and a worst-case narrow-filter one. No code in `lib/opportunities/lifecycle.ts` touched —
this is measurement only, per explicit instruction.

## The core numbers

- **283** active opportunities total.
- **205** pass the gate as it exists today (`isOpportunityActionable` and
  `isOpportunitySufficientlyVerified` both true).
- **75** active opportunities carry `cycle_status='unverified'`. My first pass reported 74 — not
  an arithmetic error, a mislabeled one: I had silently added `AND deadline IS NULL` on top of the
  plain predicate and reported the result as if it were the whole population. CEO's own
  independent re-verification used the unfiltered predicate and caught it. Worth naming as a
  general shape since it recurs and is easy to miss: **a filtered count reported as a population
  count** — both numbers were individually correct, only the label was wrong, and nothing looks
  inconsistent until someone runs the unfiltered version next to it. 75 is the number this
  document uses throughout. Of those 75:
  - only **16** carry `verified_at`, **70** carry `last_verified_at` — most pass on the older
    pipeline-lineage timestamp, not the newer one
  - **0** carry neither — `isOpportunitySufficientlyVerified`'s own comment ("On today's corpus
    this excludes nothing") is confirmed literally true for this population, not aspirational
  - only **1** of the 75 has an actual deadline on file
- **A tightened gate — cycle_status='unverified' no longer sufficient on a bare timestamp —
  leaves 131 active opportunities recommendable.** That's a drop of 74 rows, essentially the
  entire unverified-cycle population (the 1 row with both `cycle_status='unverified'` and a real
  deadline still passes on the deadline alone, under either a narrow or broad reading of
  "tightened" — both readings converge to the same 131, confirmed by computing both).

**This is not a small adjustment.** The gate currently excludes zero rows in this cycle_status
value; tightening it would exclude the entire value. There's no partial middle ground to find
inside the current rule — CEO's own framing was exactly right going in.

## What Browse looks like afterward — the decisive number

By category, active rows recommendable today vs. after tightening:

| Category | Total | Recommendable today | Of which unverified-cycle | After tightening |
|---|---|---|---|---|
| summer_program | 140 | 90 | 59 | **31** |
| competition | 80 | 67 | 8 | 59 |
| research | 15 | 9 | 3 | 6 |
| scholarship | 8 | 7 | 0 | 7 |
| student_program | 7 | 6 | 0 | 6 |
| internship | 8 | 6 | 3 | 3 |
| fellowship | 5 | 5 | 0 | 5 |
| volunteering | 6 | 5 | 0 | 5 |
| online_program | 6 | 4 | 0 | 4 |
| entrepreneurship | 5 | 3 | 0 | 3 |
| conference | 2 | 2 | 0 | 2 |
| academic_program | 1 | 1 | 1 | **0** |

**`summer_program` is the single largest category in the catalog — 140 of 283 active rows, 49%
of everything — and it loses two-thirds of its recommendable inventory (90 → 31).** A student
whose interests skew toward summer programs, which is a large fraction of Oryn's actual users
given the age range this product targets, goes from a genuinely broad shelf to a thin one.

**`academic_program` goes from 1 recommendable row to 0 — a literal empty category.** Small in
absolute terms (one row), but it's the exact failure mode CEO named: a student who filters into
that category sees nothing, and an empty result reads as "this product has nothing for you," not
"we're being careful."

`internship` (6→3) and `research` (9→6) are smaller but still real double-digit-percentage cuts
in already-thin categories.

## Answering CEO's own decision framework directly

CEO's stated test: *"if tightening takes a student from twelve things to consider to two, we've
traded a soft honesty problem for a hard emptiness problem."* Applied to the actual numbers: the
single biggest category goes from 90 to 31 (not twelve-to-two, but a real two-thirds cut on
nearly half the catalog), and one category goes to exactly zero. **The shortfall is large, not
small, by CEO's own stated threshold.**

This points toward CEO's own hypothesis being correct: **the fix belongs in a re-verification
pass (confirming which of the 75 unverified-cycle rows are actually still running this year),
not in narrowing the gate.** Narrowing the gate converts an honesty problem (a student sees a
recommendation Oryn can't fully back) into an availability problem (a student sees nothing),
and the category breakdown shows that trade is not favorable here — especially for
`summer_program`, where it isn't close.

## What this does NOT resolve

- Whether 74 of those 75 rows are *actually* still running this year is unmeasured — this
  analysis only shows what removing them from view would cost, not whether removing them would
  be *correct*. A real re-verification pass is the only way to know that, and is a separate,
  larger piece of work (AGENTS.md Phase 30 / `docs/opportunity-reverification-job-design-
  2026-08-23.md`, designed but not built).
- `under_review` rows (107 with `cycle_status='unverified'`, larger than the entire active
  unverified population) are not counted here because they are not student-facing today —
  confirmed via `isOpportunityActionable`'s own first check (`status !== "active"` returns false
  immediately) and independently via `docs/known-issues.md`'s "All 122 under_review opportunity
  rows, traced" entry (no promotion path exists anywhere in the codebase).

  **Flagging forward, for whoever eventually builds that promotion path** (`under_review` →
  `active`, designed in principle, not built — see that same known-issues.md entry): promoting
  this queue without also addressing the gate this document measures would land ~107 more rows
  into the exact shape described above, roughly **3x today's 75-row unverified-cycle population**.
  The promotion path and the verification gate are two separate pieces of unbuilt work that
  interact — building the first without revisiting the second reintroduces this finding at a
  larger scale on day one of the promotion feature, not as a later regression.
- No change made to `isOpportunitySufficientlyVerified`, `isOpportunityActionable`, or any other
  gating logic. This document is measurement only, per explicit instruction.
