# What a student cannot do yet — re-measured again, 2026-09-02 (v2)

Third measurement of spec Phase 53's sixteen things a student should be able to do before V1
is complete, following `docs/what-a-student-cannot-do-yet-2026-09-01.md` (baseline, "11 of
16") and `docs/what-a-student-cannot-do-yet-2026-09-02.md` ("Pass 1", found and fixed a live
regression mid-pass). **Roughly 150 commits landed between Pass 1 and this measurement** —
this document treats both prior documents as a checklist of what to re-verify, never as
evidence of current state, exactly as Pass 1 treated the baseline before it.

**Method.** Pinned to commit `5d01bf49` — every code claim below is read from a dedicated
worktree checked out to that exact commit, not from `main` (which moves roughly every twenty
minutes in this fleet and would make an audit chasing it never finish). Every number is
queried live against Supabase project `oryn-qa-scratch`, today, never carried forward from
either prior document. The live browser path was not available this pass (auth-gated pages,
no test credentials, the dev-server preview lock is keyed across worktrees so only one session
can hold it) — every item below states plainly whether its evidence is a live-DB number, a
direct code read, or both, and says so explicitly when a live click-through could not be
substituted for.

**Three honest outcomes**, used deliberately, per item: **works** (real live evidence and/or a
direct, current code read support it), **does not work** (a specific, checkable reason),
**could not fully determine** (stated as such, never forced into either bucket). A fourth
note, distinct from all three: **founder-gated** — the code is correct or the gap is
understood, but closing it needs an action only the founder can take (apply a migration,
deploy, schedule a cron, grant admin). Several items below are founder-gated; each says so
explicitly rather than being marked failed.

Work split across four investigators in parallel (two background agents completed cleanly on
the first attempt covering items 9/13; one background agent failed twice on infrastructure
grounds — a server error, then a stall — and was retried successfully on items 1–5; items
6/7/8/10/11/12/14/15/16 were re-verified directly rather than delegated). Every live number
below was personally queried by whichever investigator's section it's in, not reused from any
other document.

---

## The single most important change since Pass 1

**Pass 1's regression is fixed in code and thoroughly tested — but has not been exercised by
a single live plan generation since, and the separate "complete an action" capability still
has no positive evidence of ever working, at any point in this project's history.**

Pass 1 found `getOrCreateWeeklyPlan` throwing unconditionally for 7 of 8 students (an
unconditional `UPDATE weekly_actions SET carried_forward = true` gated on unapplied migration
0077, added by the same-night fix for a real completed-action-deletion bug). Re-read
`lib/plan/persist.ts` directly at the pinned commit: the write is now wrapped, checks
specifically for Postgres SQLSTATE `42703` naming `carried_forward`, warns, and degrades
gracefully rather than throwing. `__tests__/plan/persist.test.ts` has a dedicated block
("degrades when migration 0077 is unapplied (SEV 2026-09-02)") with 4 tests, including two
negative/narrow-tolerance checks (a 42703 *not* naming `carried_forward` still throws; an
unrelated error still throws) — this is a scoped fix, not a blanket catch. Two further
hardening commits landed on top since Pass 1: the AI rate-limit check moved to the top of the
function itself so every caller is covered, and Job D's admin-client threading was fixed.

**Live data has not moved at all since Pass 1**: `weekly_plans` — 8 rows, latest
`week_start_date` still 2026-08-31 (unchanged), still only 1 plan at that latest week
(unchanged), 5 of 8 onboarded students have ever had any plan row. `weekly_actions` — 22 rows,
**0 with status='completed'** (unchanged), **0 with `reflection_outcome` set** (unchanged).
Every one of these numbers is identical to Pass 1's — no student, real or QA, has triggered
plan generation since the fix landed, in either direction.

**This is exactly the "built but never exercised" state worth distinguishing from "works":**
strong code and test evidence the fix is correct; zero live evidence it has actually run
successfully post-fix, because nothing has called it. Separately and more concerning: the
act → reflect → advisor-adjusts loop this product's own spec names as its center (Phase 10)
has **never once been observed working end to end in this environment's live data, before or
after any fix** — 0 completed actions, 0 reflections, unchanged across two independent
full measurements taken ~150 commits apart.

---

## Summary table — items with a clean, unchanged, or simply-corroborated verdict

| # | MVP item | state | evidence |
|---|---|---|---|
| 1 | Create an account | works | 11 profiles, 8 onboarded — unchanged. Age-14 gate confirmed live in source. |
| 2 | Complete onboarding | works | same 8; one real client-validation bug found and fixed since Pass 1 (see below) |
| 4 | Add activities and achievements | works | 78 rows across 9 tables; every onboarded student has ≥1 (per-student: 25,18,16,6,5,5,2,1) |
| 6 | Receive profile analysis | works | 5 of 8 assessed — independently re-derived by hand against all 72 live rows, exact match to Pass 1 |
| 7 | Understand strengths and gaps | works | same mechanism as #6 |
| 9 | Browse personalized opportunities | works | 1,931 matches (flat, not growing), 283 active opportunities, all 8 students have 197–285 matches each |
| 10 | Explore universities | works | 1,019 universities, 150 with programs, 111 with requirements, 105 with deadlines — all unchanged |
| 11 | Save target universities | works | 18 targets — unchanged |
| 12 | See an honest admission outlook | works | self-heal mechanism (`refreshStaleOutlooks`) re-read directly, unchanged since Pass 1's fix |
| 14 | Ask Oryn personalized questions | works | 26 advisor messages — unchanged; per-student AI budget confirmed still soft-degrade-only, never blocks |
| 16 | See the profile evolve | works | 26 snapshots across all 8 onboarded students, 5 distinct trigger reasons — unchanged |

That leaves **item 3** (import half materially re-verified, not just unchanged), **item 5**
(a real cross-document discrepancy resolved), **items 8/15** (the split verdict above), and
**item 13** (three sub-mechanisms with different verdicts) — each detailed below because a
one-line table entry would lose the finding.

---

## Item 2 — Complete onboarding: one real bug found and fixed since Pass 1

`graduationYear` had zero real client-side validation, unlike every sibling field — the
input's `min`/`max` were advisory only (bound to an `onClick`, not a real form submit, so
native browser validation never fired), surfacing only as a server-side Zod error on step 4
(Import), nowhere near the field it's actually about. Fixed and confirmed present in current
code: `features/onboarding/onboarding-wizard.tsx` now runs the same client-side check
`birthYear` already had.

## Item 3 — Enter or import a profile: works, materially more verified than Pass 1

Pass 1 measured only the "enter" half (21 career_goals, unchanged). This pass investigated
"import" directly for the first time: exactly 2 `cv_extraction` rows in `ai_usage`
(2026-08-24, 2026-08-29), each followed by real saved rows within seconds-to-minutes — not a
spend-without-artefact pattern. Three real fixes confirmed live in code since Pass 1: the one
silent-catch failure (`CVExtractionFailedError` never logged) now logs `.cause`; the
profile-page CV re-import surface now has full edit/delete parity with onboarding's own import
step; extracted skills and languages, previously paid for and silently dropped on every save
path, are now wired in. That last fix's safety claim was independently verified rather than
trusted: it depends on migration `0084_skills_languages_source.sql`, confirmed **not
applied** live (`information_schema.columns` returns zero rows for the new columns) — the
insert code defensively catches Postgres `42703` and retries without the column, the same
degrade-not-throw pattern the weekly-plan fix uses, confirmed correct by direct read, not
assumed from the file's own comment.

## Item 5 — Optionally attach evidence: correct refusal, one real schema gap, one resolved cross-document discrepancy

**1 evidence file, 1 student — unchanged across all three measurements.** The path itself is
correct end-to-end for that one real upload (right storage bucket, correct
`evidence_added`-not-`verified` semantics, correct RLS) — the low count is the system doing
nothing because almost no student has attached evidence, not a failure.

**A real, narrow schema gap, and a genuine correction between two same-night audit documents**:
`docs/portfolio-audit-2026-09-02.md` claims 8 of 9 evidence-linkable tables carry
`evidence_status` (only `education_records` missing it); a separate same-night audit
(`docs/evidence-flow-audit-2026-09-02.md`) says both `education_records` **and**
`test_scores` are missing it. A direct live `information_schema.columns` query settles this:
**exactly 7 of 9 have the column** — the evidence-flow audit was right, the portfolio audit's
specific claim was wrong. The fix (migration `0079_education_test_score_evidence_status.sql`)
is written but **not applied** live (absent from the 49 currently-applied migrations; 85
migration files exist in the repo total — **founder-gated**). Live practical effect today: a
student attaching evidence to a transcript or test score gets a false-success — the file and
`evidence_files` row save correctly, but the achievement item's own status silently fails to
mirror. That specific silent failure was itself already fixed this session and confirmed
live: the mirroring-write error is now logged rather than discarded, so the gap degrades
observably (a log line) instead of silently, even though the underlying migration gap
remains open pending the founder applying it. A later, separate merge shipped the
UI-visibility half — evidence status now renders on the achievement item itself, not only on
the standalone Documents page.

**New since both prior passes, worth the founder knowing regardless of the evidence item
itself**: nothing prevents `birth_year` being edited downward past the minimum-signup-age
gate after an account already exists — `completeOnboarding` is the only hard stop in the
system today; `settings/actions.ts`'s `updateBirthYear` logs the change but never blocks it.
A documented product decision surfaced by this pass's investigation, not a bug, but a live
gap worth naming explicitly. Separately: 4 of 11 profiles (including the founder's own real
account) are onboarded with `birth_year` still null — an expected backfill-in-progress state,
not a regression.

## Items 8 / 15 — see "The single most important change since Pass 1" above

## Item 13 — Track deadlines: one spec item, three sub-mechanisms, three different verdicts

**Core surfacing (a student sees their own upcoming deadlines): works.**
`getUpcomingDeadlines` unions applications, saved opportunities, and target-university
deadlines, each correctly lifecycle-gated so a closed cycle never shows as "due soon." Live:
3 applications, 18 targets, 4 saved opportunities, 470 university_deadlines (124 future-dated).

**Proactive reminder delivery: could not fully determine it has ever meaningfully worked, plus
a confirmed schema gap.** The cron is registered in `vercel.json` (daily), but
`external_sync_jobs` shows it has run exactly twice — both 2026-08-22, both
`items_processed: 0`, nothing since. Zero notifications of category `deadline` exist, ever.
Migration 0075's `deadline_notification_log` table does not exist live, so the dedup step
would silently no-op if the job ever did find something to send — **founder-gated**: apply
migration 0075.

**Deadline change-detection: does not work, by documented design, not oversight.** Every
write to `university_deadlines` in this codebase is a plain INSERT, never an UPDATE — checked
directly against every call site — so no row's change can ever be detected the way a
`universities` or `university_statistics` row's can. What shipped detects only a **brand-new**
row appearing since tracking started; the file's own docstring states plainly that detecting
an *existing* deadline's date moving would need a real redesign and was not attempted. The
whole mechanism additionally cannot run live today regardless: migration 0080 is unapplied (no
`last_changed_at` column; the notification-log table doesn't exist), and its cron is
deliberately absent from `vercel.json` per its own comment ("left to the founder"). **Two
founder-gated actions**: apply migration 0080, and decide whether/when to schedule the cron.

**Applications flow / readiness (the mechanism behind this item and item 15): works.** All
three of Pass 1's specific claims independently re-verified via direct file:line reads: the
no-targets branch is a real link, not a disabled button invisible on touch devices; the
`/applications` mobile bottom-tab placement is confirmed by tracing the actual filter that
builds the tab bar; the three-state readiness result (`unmeasured`/`not_tracked`/`measured`)
is confirmed genuinely consumed by two real UI surfaces, not merely defined.

**Overall item-13 call: works** for the capability the spec item actually names — a student
seeing and tracking their own deadlines. The two real sub-gaps are both about *notifying* a
student of something, not the student's own ability to see/track, and both are founder-gated
rather than open engineering work.

## Item 9 — one more precise finding worth carrying into the summary

Beyond the clean "works" in the table above: `reason-codes-coverage` (merged this window,
"559 of 724 now say why") is correct code — confirmed by re-deriving its own internal
arithmetic — but **no live opportunity_match row reflects it yet**. Every live row's
`calculated_at` predates that merge by ~5.5 hours; recomputation only happens on a student's
own page visit, and no backfill job exists. Not a bug, but exactly the "built, not yet live"
distinction this measurement was asked to preserve — a founder comparing the claimed number
against today's live data will not see it until a student revisits their dashboard.

---

## Not one of the sixteen, named for completeness only (per Pass 1's own convention)

Peer benchmarking: `MIN_COHORT_SIZE = 100`, live onboarded count still 8. Unchanged, correctly
refusing to show a percentile against a cohort this small.

---

## Summary

**Thirteen of sixteen items work with direct live and/or code evidence re-verified today,
independent of either prior document.** Ten hold completely unchanged from Pass 1 (account,
onboarding, activities, profile-analysis pair, opportunities, universities, target
universities, admission outlook, ask-Oryn, profile-evolves). Two (#2 onboarding, #3 profile
import) gained real, confirmed fixes since Pass 1 without changing their verdict. One (#13
deadlines) is "works" at the level the spec item actually asks, with two real, understood,
founder-gated sub-gaps underneath it.

**One item (#5 evidence) is a correct, deliberate refusal** — the system doing nothing
because almost no student has used it — with one real, founder-gated schema gap discovered
underneath, and one genuine correction resolved between two same-night sibling audits.

**Two items (#8, #15) share one regression's aftermath.** The regression Pass 1 found live and
flagged immediately is fixed in code and covered by dedicated tests with real negative cases
— but has not been exercised by a single live plan generation since, and the separate
"complete an action" capability has no positive existence proof at any point across two
independent measurements taken ~150 commits apart. This is the most important sentence for the
founder: **the fix is real and well-tested, but nobody has actually seen a plan generate
successfully since it landed, and the reflection loop this product is built around has never
once been observed working end to end in this environment.**

**Founder-gated items, listed once for clarity**: migration 0075 (deadline reminders' dedup
table), migration 0079 (evidence_status on education/test-score tables), migration 0080 +
a scheduling decision (deadline change-detection), migration 0084 (already degrades safely
without it — cv-import skills/languages). None of these block the core capability they sit
under; each is a real gap closed by a founder action, not by more code.
