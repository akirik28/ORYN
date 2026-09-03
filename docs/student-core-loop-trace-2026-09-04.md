# Student core loop, traced through the code — and is today's work actually there

Two tasks folded into one, both answering the founder's own question rather than trusting a
green gate: *"her şeyin çalıştığına emin ol"* (make sure everything works) and, separately,
*"bugün yaptığın şeylerin de olduğunu doğrula"* (verify the things you did today are actually
there). **No browser, no session — the actual walkthrough this was originally scoped as isn't
safely available on this machine tonight; see `docs/worktree-dev-server-hazards-2026-09-04.md`
for exactly why, written the hard way, first.** Everything below is source-level: reading the
handoff points a browser walk would exercise, and reading whether a claimed change is present
in code that actually runs, not just in a merged diff.

**One honest miss beats a clean list, so this is organized as held vs. drifted, not as a
sequence of confirmations.**

## Drifted — three real findings

### 1. A live AI prompt still says "Oryn," missed by every rename pass tonight

`lib/ai/refine-achievement.ts:25` — the literal `SYSTEM_PROMPT` sent to the model for the
"Improve this entry with AI" achievement-refinement feature (AGENTS.md Phase 5):

> *"You help a student strengthen a single achievement entry (an activity, project, award, or
> similar) in their **Oryn** profile."*

Confirmed this is not a comment, not a codename, not a false positive: read the file directly,
it's the actual prompt constant, sent to the model on every real call to this feature. Checked
this specifically because tonight's own reconciliation already found and fixed the identical
class of bug once (the advisor's own injected context) with the explicit lesson *"a prompt
does not stop a model repeating what its own injected context says."* That lesson didn't reach
this file. Swept every other system-prompt constant in the codebase (12 files matching
`SYSTEM_PROMPT =`/`const.*PROMPT.*=` across `lib/`) plus all of `lib/ai/` for any
non-comment "oryn" — this is the only other hit. Two look-alikes were false positives, both
the same camelCase-boundary accident (`storyNotes` → "st**ory** **n**otes"), confirmed the
same pattern that made `messages/en.json`/`messages/tr.json` look dirty in a first grep and
turned out clean (`categoryNavAriaLabel`, `storyNotesCount` — "ory" + "N" at a word boundary,
not the word "Oryn").

**Not fixed here** — report only, per this task's own scope, and a one-word prompt edit still
needs the same care every other rename edit got tonight (checking nothing else in the string
depends on the exact phrasing).

### 2. `academic_tier`: unused is confirmed, but the backfill claim is wrong

05's finding, independently corroborated and partly corrected. Grepped `academic_tier` across
`app/`, `features/`, `lib/`, `types/` — **zero hits, confirmed.** Not typed in
`types/database.ts`, not read anywhere the product runs. Migration 0108 added a real column
(confirmed live: `information_schema.columns`, `USER-DEFINED` enum type) that nothing
downstream consumes.

**But "277 institutions backfilled" is not true of the live database right now** — checked
directly: `select academic_tier, count(*) from universities group by academic_tier` returns
exactly one row, `{null: 1019}`. Every single row is null. The 277 figure most likely names a
*staged* backfill SQL file's row count (this session's own memory shows academic_tier backfill
work staged into applied-sciences/WO files earlier tonight) rather than something already run
against `oryn-qa-scratch` — matching the same "written, not applied" shape as nearly
everything else in this database tonight, just not stated that way in what reached this task.
**So the honest description is worse than "unused": the schema shipped, the data that would
have made it meaningful hasn't landed either, and nothing reads it regardless.**

### 3. The 10-row Turkish grammar defect — re-confirmed live, independently, not by citation

CEO flagged this one as circular in how it reached the record (05 cited CEO's own morning-
package header as if it were fresh corroboration) and asked for a check that doesn't repeat the
loop. Ran one query, fresh, against all six columns the rename touched — not reading anyone's
package:

```
opportunities.description ............................ 0
weekly_actions.reason ................................. 0
weekly_plans.summary ................................... 0
notifications.body ..................................... 0
ai_recommendations.reason .............................. 0
student_requirement_evaluations.reasoning (exact bad string) . 10
```

**Confirmed, live, right now: still exactly 10 rows, nowhere else.** Nothing has been applied
since this was first found and reported (`docs/rename-db-render-check-2026-09-04.md`) — the
number holds because nobody has touched it, not because the earlier report is being repeated.

## Held — checked directly, not assumed

**The message catalogs are clean.** `messages/en.json`/`messages/tr.json` had two
case-insensitive "oryn" hits; both are camelCase-boundary false positives (above), not real
content. No genuine leftover product-name text in either catalog.

**Fleet codenames are correctly untouched, and there are a lot of them.** A first, broad grep
across `app/`/`features/`/`components/` returned ~90 hits — nearly all of them comments citing
session codenames (`oryn-a7`, `oryn-45`, `oryn-4e`, `oryn-3f`, `oryn-60`, `oryn-31`, `oryn-80`,
`oryn-d0`) or descriptive comments using the old name to talk *about* the product ("Oryn can't
check this," "Oryn's own note") — internal history, never rendered, correctly left alone by
every rename lane tonight, matching the standing forbidden-pattern rule.

**Dashboard → three priorities.** `features/dashboard/dashboard-view.tsx` and `weekly-focus.tsx`
both have real, distinct empty/error states rather than one generic fallback: no AI plan vs.
counselor fallback vs. plan-generation-failed vs. plan-not-configured are four different
copy states, not one blurred together. `opportunityMatchesRefreshed: false` renders an explicit
`ErrorState` rather than silently showing possibly-stale data as current (AGENTS.md Rule 4,
still honored). The migration-0077 `carried_forward` column being unapplied degrades to
"every action renders in the normal active list" by plain JS truthiness, documented as the
deliberately chosen behavior, not an oversight.

**The opportunity strip (the crash site from an earlier walkthrough tonight) is intact.**
Thin-state (below `MIN_CARDS_TO_ANIMATE`, a static row instead of a broken-looking loop),
empty-state (a real `EmptyState`, not a blank shell), and the reduced-motion/`inert`
keyboard-trap fix are all present and match their own documentation.

**Save actions handle the real race conditions, not just the happy path.**
`addTargetUniversity` (`app/(app)/universities/actions.ts`) resolves a superseded university id
to its canonical winner before ever writing, explicitly avoids a broken `onConflict` clause
that would have silently duplicated rows on a repeat click (nullable `program_id` never
satisfies Postgres's own uniqueness check), and treats a genuine concurrent-insert race
(`23505`) as "someone else's request already won it," not an error. It revalidates both
`/universities` and `/dashboard`, so a save is visible on the next render of either.

**The advisor's context builder degrades correctly on empty input.**
`lib/ai/opportunity-context.ts` returns an empty string for zero saved opportunities rather
than emitting a broken or misleading section — checked specifically because this is the exact
class of surface (injected AI context) that produced today's other confirmed leak.

**One thing noticed, not chased, since it's outside this task's scope:** the logged-out
landing page still reads "Sign in," not "Student sign in" (G10, the parent-account spec) —
P2's scope, not this task's, named here only because it was directly visible before the
session-hazard stopped the browser attempt.

## What this pass did not do

Did not walk a real signed-in session (see the hazards doc for why). Did not trace every
seam in the loop exhaustively — advisor→plan-page and the settings/plan redesign specifically
were not read in the same depth as the seams above, given time spent on the two reassigned
verification items. Did not fix the refine-achievement.ts prompt or re-run the render-check's
staged UPDATE. Did not re-derive 05's other findings beyond the two named here — this
corroborates and corrects, it isn't a full independent re-audit of their whole package.
