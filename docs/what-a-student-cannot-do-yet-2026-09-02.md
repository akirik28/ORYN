# What a student cannot do yet — re-measured 2026-09-02

Re-measurement of `docs/what-a-student-cannot-do-yet-2026-09-01.md` (written 2026-09-01, 20:30),
after roughly twenty more packages merged overnight. **That document is a starting point for
what to check, not evidence of current state** — every number and every claim below was
re-queried live against `oryn-qa-scratch` or re-read directly from the current checkout tonight,
never carried forward. Where this document's answer differs from last night's, the cause is
stated, not just the new number.

Same frame as last night: spec Phase 53's sixteen things a student should be able to do, each
marked by what live data and live code show today, not by whether code exists. Three honest
outcomes, used deliberately: **works** (real evidence behind it), **does not work** (a specific,
checkable reason), or **could not fully determine** (stated as such, not forced into either).

---

## Works, twelve of sixteen — but two of the twelve changed how they're counted, and two items moved to "does not work"

| MVP item | evidence | vs. last night |
|---|---|---|
| Create an account | 8 onboarded, 11 total profiles | unchanged; a new minimum-age-14 gate at onboarding (`lib/legal/age-policy.ts`, merged tonight) now blocks completion below that age — a deliberate minor-safety addition matching the spec's own 14–18 target age, not a regression |
| Complete onboarding | same 8 | unchanged, same gate note as above |
| Enter or import a profile | 21 career goals | unchanged |
| Add activities and achievements | populated across all 8 | unchanged |
| Receive profile analysis | **5 of 8** students have at least one dimension in `isAssessed` state (evidence present, confidence not `low`) | **corrected, see below — was reported as 7 last night** |
| Understand strengths and gaps | same mechanism as above | unchanged |
| Browse personalised opportunities | 1,931 matches (was 1,921) | stable, small natural growth from re-computation |
| Explore universities | 1,019 universities; 150 with programmes, 111 with requirements, 105 with deadlines | **unchanged**, despite ~10 Gate F/depth-research packages merging tonight (Caltech, Galatasaray, Marmara, Yeditepe, TR/UK depth, VU Amsterdam) — expected, not a gap: every one of those was staged research, correctly not promoted to live tables per this session's own standing "no live writes, founder-gated" rule for all data research |
| Save target universities | 18 target universities | unchanged |
| See an honest admission outlook | mechanism improved, see below | **changed — a real-time self-heal shipped and merged tonight** |
| Track deadlines | 3 applications, readiness now an honest three-state result, the dead-end and mobile-nav gaps closed | **improved**, see below |
| See the profile evolve | 26 snapshots | unchanged |

That leaves **ask Oryn personalised questions** (still works, unchanged: 26 advisor messages,
new per-student AI budget is soft-degrade-only and never blocks a reply — see below) at twelve,
and moves **receive prioritised actions** and **complete actions** from last night's "works" and
"does not work" respectively into a single new, more severe failure, covered first.

---

## Does not work — the most consequential change since last night, and it is a regression tonight's own fix introduced

### Receive prioritised actions / complete actions: weekly-plan generation currently throws for most of the pilot cohort

**This was one working item and one broken item last night. Tonight it is one broken mechanism
behind both.** `lib/plan/persist.ts`'s `getOrCreateWeeklyPlan` — the single function behind both
a student's first-ever weekly plan and every "Regenerate" click — was rewritten tonight
(`plan-regen-preserve-completed-2026-09-02`, `e55a86f7`) to stop deleting completed actions and
their reflections on regeneration, a real fix for a real, previously-confirmed bug. It depends on
`supabase/migrations/0077_weekly_actions_carried_forward.sql`, which **is not applied** —
confirmed directly (`information_schema.columns` has no `weekly_actions.carried_forward` row),
not assumed from the migration file's own header.

The new code path is unconditional: it runs an `UPDATE weekly_actions SET carried_forward =
true ... WHERE status IN ('completed','skipped','expired')` **before every single plan
generation**, first-time or regenerate. Tested safely, no rows touched (`EXPLAIN` on the exact
statement, which validates column existence without executing): it throws
`column "carried_forward" of relation "weekly_actions" does not exist`, unconditionally —
Postgres validates the `SET` clause before it ever evaluates `WHERE`, so this fires regardless
of whether any row would have matched.

**Live impact, measured, not assumed**: `weekly_plans` has one row for the database's current
week (`week_start_date = 2026-08-31`); the other seven students' most recent plans are from
earlier weeks (three from 08-24, four from 08-17). `getCurrentWeeklyPlan` returns null for all
seven, which falls through to generation — meaning **seven of eight students would hit this
failure on their next dashboard visit**, and any explicit "Regenerate" click fails for all eight.

**Not a full crash, checked both call sites**: `dashboard/page.tsx` wraps the call in try/catch
and sets a `planError` state instead of throwing to the page; `plan/actions.ts`'s
`regenerateWeeklyPlan` catches and returns a generic error string. So nothing 500s — a student
sees a failed-to-load state for "This week" instead. But the capability itself does not work.

**Live data corroborates this has been broken for a while, not just since this fix landed**:
`weekly_actions.status = 'completed'` — **zero rows**. `reflection_outcome is not null` — **zero
rows**. The four actions last night's document found completed on 22–23 August are still gone
(a fix prevents future loss, it does not restore what the old bug already deleted), and nothing
has been completed-and-kept since. The act → reflect → advisor-adjusts loop AGENTS.md names as
the product's own center has, as of this measurement, **never been observed working end to end
in this environment's live data, at any point** — not last night's "destroyed by a bug", but
"has no positive existence proof either before or after the fix."

Flagged to oryn-a7 directly and immediately on finding it, ahead of this document, since it is
time-sensitive: applying migration 0077 is a founder-gated live-database action, not something
resolved by more code.

---

## Receive profile analysis / understand strengths and gaps: corrected count, methodology shown

Last night: "7 of 8 have at least one assessed dimension." Tonight, applying the product's own
`isAssessed`/`evidenceStateFor` predicate exactly (`lib/scoring/signal.ts`: a dimension counts
only if it has evidence — `reason_codes` non-empty — **and** `confidence !== 'low'`, regardless
of score) by hand against all 72 live `profile_scores` rows: **5 of 8**. Two accounts
(`46dd6f7e…`, the QA admin test account, and `49de3083…`) have every dimension at `low`
confidence with zero reason codes — no evidence recorded at all. One more (`e9eba798…`) has a
handful of dimensions with a reason code but every one still at `low` confidence, so nothing
clears the bar.

Stated as a correction, not a silent replacement: this document cannot determine, from the data
alone, whether the true count moved between last night and tonight or whether last night's "7"
used a different measure — no query from that pass is preserved to compare against. What's
verifiable now is the number produced by the product's own exact predicate, applied by hand to
every row, which is 5. Worth someone re-running this against tonight's number in 24 hours to see
which way it's actually moving.

---

## See an honest admission outlook: the freshness gap from last night is now closed in code, live

Last night's finding stands as description of the mechanism (a save or a visit to that specific
university's page were the only two triggers), but the fix for it merged and is live tonight
(`admission-outlook-refresh-2026-09-01`, part of tonight's run): `lib/universities/queries.ts`'s
`getTargetUniversitiesWithDetails` — the one function both the dashboard and the Saved list read
through — now refreshes any outlook older than the student's own `profiles.updated_at` before
returning, self-healing staleness the moment either surface is actually loaded, not on a
schedule. A weekly-sweep backstop (`lib/admin/jobs`-style cron) was also built for a student who
never revisits either surface, but per the "never deployed" finding elsewhere tonight, no cron
job — including this one — currently runs regardless of its own correctness.

**Not independently re-verified against a live render this pass** (no path to trigger a
dashboard/Saved page load as a real session from this worktree) — the code is read directly and
matches the design exactly, and it inherits the same honesty gate
(`hasConfidentSignal`/`isAssessed`) unchanged, so a profile that still doesn't clear the bar
still correctly shows nothing rather than a guess. Counted as **works, improved** on the strength
of the code itself, not a live click-through.

---

## Track deadlines: the applications dead end is fixed, live-verified by direct code read

Last night didn't call this one broken, but tonight's `applications-page-rebuild-2026-09-02`
closes two real gaps in it. Confirmed by reading the current code directly, not the handoff's own
claim: `features/applications/new-application-dialog.tsx`'s no-targets branch is a real
`<Link href="/universities">` today, not the disabled-button-with-a-tooltip that was genuinely
invisible on any touch device (this product's entire audience). `features/app-shell/
nav-items.ts` now carries `mobilePrimary: true` for `/applications`, closing the two-tap "More"
sheet detour on mobile specifically. Application readiness (`lib/applications/readiness.ts`,
fixed 2026-09-01, untouched by tonight's rebuild) still returns its honest
`unmeasured`/`not_tracked`/`measured` three-state result rather than a bare, sometimes-dishonest
percentage.

---

## Optionally attach evidence — still structurally unmeasurable, on purpose, unchanged

**1 evidence file across 8 students, unchanged from last night.** Preserved exactly as last
night's document framed it, per instruction: this is the system correctly doing nothing rather
than a failure — the upload path and the honest four-state vocabulary
(`self_reported → evidence_added → verified`) both work, and nothing in the product has been
exercised against real evidence because almost no student has attached any. Whether that changes
is a pilot question, not an engineering one.

A separate audit merged the same window this document was written (`audit/evidence-flow-
2026-09-02` → `01edb4ad`) independently reached the same "the path works" conclusion, and found
and fixed a real, narrower bug along the way: 2 of 9 evidence-linkable tables were missing an
`evidence_status` column and couldn't mirror status changes (`f24bb098`). Doesn't change this
item's count (still 1 file), but is the kind of corroboration worth citing rather than
re-deriving from scratch.

## Peer benchmarking is a different, adjacent thing — not one of the sixteen, named for completeness only

Not a Phase 53 item, so not counted in the sixteen either way, but it shares the exact "correct
refusal, not a bug" shape as evidence above and last night's document listed it alongside the
sixteen, so: `MIN_COHORT_SIZE = 100`, live student count still 8 (11 profiles, 8 onboarded).
Unchanged, still correctly refusing to show a percentile.

---

## Ask Oryn personalised questions — unchanged, and tonight's new AI budget mechanism doesn't threaten it

26 advisor messages, unchanged. Checked whether either AI-spend package merged tonight
(`ai-spend-cap-2026-09-02`, `ai-limits-job-budget-2026-09-02`) could newly block a student's
question: read `lib/ai/limits/budget.ts` directly — the per-student mechanism is soft-degrade
only (switches to a cheaper model past the monthly target, never throws or refuses), by explicit
design ("never a second code-enforced gate" per the file's own comment). The sibling
"stop not degrade" mechanism in `lib/ai/limits/job-budget.ts` is scoped to background jobs, not
the interactive advisor path, and no job runs today regardless (see the deploy-gap finding
elsewhere tonight). Neither can currently stop a student from asking a question.

---

## Summary

**Ten of sixteen work with unambiguous live evidence tonight, unchanged in kind from last
night's eleven** (account/onboarding, profile entry, activities, opportunities, universities,
target universities, profile-evolves, plus track-deadlines and admission-outlook now genuinely
improved rather than merely unchanged). **One pair — receive prioritised actions and complete
actions — moved from "one works, one doesn't" to "both broken by the same live regression"**,
introduced by tonight's own fix for last night's #1 problem, and gated behind a single
founder-approved migration. **Profile analysis/understand-strengths stays in "works" but its
count corrected down**, from 7 to 5, with the exact method shown so it can be checked again.
**Evidence and peer-benchmarking (the latter not actually one of the sixteen) are unchanged,
correct refusals**, not failures, preserved as such deliberately.

The single most important sentence for the founder: **the weekly-plan generation regression is
live right now and affects most of the pilot cohort's next dashboard visit** — already flagged
separately, ahead of this document, because it couldn't wait for a full re-measurement to be
useful.
