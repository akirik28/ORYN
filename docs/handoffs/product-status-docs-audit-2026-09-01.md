# Five "what does ORYN do" documents, audited — none should be trusted as current, and none needs reviving

CEO-assigned: five documents (`final-product-audit.md` 15 Aug, `feature-inventory.md` 16 Aug,
`launch-readiness.md` 16 Aug, `pilot-readiness.md` 19 Aug, `current-product-capability-map.md`
20 Aug) each claim to answer "what does ORYN do and what's missing," and none has been touched
across the 92 merges since the newest was written. Asked: what's still true, what's false, and
whether each has a reason to exist separately — re-derived against live data and code, not
against each other, since mutual deference between these files is the mechanism that let this
happen.

**Recommendation up front: none of the five should be treated as current, and none needs a
refresh.** `docs/what-a-student-cannot-do-yet-2026-09-01.md` — written by CEO tonight, every
number live-queried a few hours ago — already does what all five were trying to do, better,
and explicitly says so in its own opening line. `docs/current-state.md` covers the
migrations/DB/integrations ground the older docs also tried to cover. Marked each of the five
with a short, dated superseded notice pointing to both, rather than moving or deleting them —
15 other documents link to these five by path (listed below), and a broken link is worse than
an outdated one clearly marked as such.

## The mutual-deference chain, confirmed directly

Every one of the five, when it wants to point somewhere "more current," points at another
August document — never at live data. Checked each pointer's own last-commit date:
`chat-2-handoff.md` (15 Aug), `pre-publish-checklist.md` (16 Aug), `data-readiness.md`
(17 Aug), `product-decisions.md` and `FOUNDER-START-HERE.md` (22 Aug, and
`FOUNDER-START-HERE.md` was independently found stale earlier tonight in the
`current-state.md` rewrite — it still says "Live schema is at 0056," now 74 migrations
behind). Nothing in this cross-referencing chain terminates at the database or the code; it
loops among documents that are all roughly the same age. This is the identical shape as
`known-issues.md`'s four security entries (wrong because a pass re-read the file instead of
the database) and `founder-blocked-backlog.md`'s header (named two "highest-priority" items
that had been fixed) — both found and fixed earlier tonight.

## Headline numbers, then vs. now

| | 15–20 Aug docs claim | Live, tonight |
|---|---|---|
| Tests | 113 (final-product-audit) → ~230 (launch-readiness, implied) | **3,094+**, 212 files |
| Migrations | 25 → 27 | **74** |
| Universities | 21, identity-only | **1,019** (150 with programmes, 111 with requirements) |
| Opportunities | 0 → 11 active | **421** total, 275 active |
| Supabase (app) | Missing → OK (deployment-specific, first time) | Not measurable from this worktree — deployment state, flagged not assumed |

Every one of the five documents' specific counts is wrong by one to two orders of magnitude.
This alone would justify a superseded notice; the per-document read below goes further, into
which *claims* (not just numbers) still hold.

## Per-document read

### `final-product-audit.md` (15 Aug, oldest) — its central Trust claim is now disproven fifteen times over

Structured around the spec's own Phase 79 five-perspective audit (Product/UX/AI/Data/Trust).
Its Trust section concludes: *"No new instances of false admissions precision, fabricated
opportunities, or invented requirements were introduced or found this pass."* That framing —
"does the system produce a confident-looking output it hasn't earned" — is exactly the pattern
this session's own memory has tracked as **fifteen separate confirmed instances** across the
two nights since, including one in the *identical function* this document's own era never
looked at again (`lib/admissions/persist.ts`'s `refreshAdmissionOutlook`, fixed once tonight
already and investigated again earlier this session). The document wasn't wrong when written —
its own "not independently verified" caveats are honest — but its conclusion has been
overtaken in the one dimension it spent the most words on.
**Still true, narrowly**: the architectural claims (source/confidence/timestamp columns exist,
GPA cross-scale comparison correctly refuses rather than guesses) are principles, not
snapshots, and remain accurate as design decisions — just not as a completeness claim about
current data.
**Reason to exist separately**: none currently. A future real Phase-79 pass would write a new
document in this shape; reviving this one doesn't help that.

### `feature-inventory.md` (16 Aug) — the most granular of the five, and the most uniformly stale

A route-by-route table (feature → route → server action → DB table → tests → env dependency →
readiness). Its granularity — one row per route — isn't replicated by any current document.
Its content is not: "Content-empty until seed batch applied" appears on the university and
opportunity rows, both now richly populated; "Env-blocked (migration 0029) — every save
currently fails" is describing a single-migration-behind state from a codebase now 74
migrations deep.
**Still true**: the "Not yet built" section (per-program requirement discovery, Parcoursup
ingestion, opportunity moderation/review-before-publish) — checked against tonight's own
extensive requirement/opportunity work, none of these three has been built since. This is the
one section of the one document worth reading as still-current, and it substantially overlaps
`docs/founder-blocked-backlog.md`'s own open items already.
**Reason to exist separately**: the per-route table format is a real gap if the founder wants
that granularity maintained — but that's a case for building a fresh one, not reviving this.

### `launch-readiness.md` (16 Aug) — already knew it was going stale when written

Its own second paragraph pre-emptively hedges: "this file's *product-capability* assessment
below is still accurate, but for current security/test/CI status see [other docs]" — written
before 16 days and 92 merges did the same thing to the capability assessment too. Its two
named launch blockers: (1) "zero opportunity data and near-zero university data" — now false,
by two orders of magnitude; (2) "no professional legal review of minor-safe/privacy claims" —
**checked, still open**, and already tracked as its own item in
`founder-blocked-backlog.md` (item 13) — nothing new to carry forward, it's already in the one
place that matters.
**Reason to exist separately**: none found.

### `pilot-readiness.md` (19 Aug) — CEO's specific concern, and it cuts in both directions as predicted

Its three named blockers: (1) Confirm-email on for `oryn-qa-scratch`, (2) `ANTHROPIC_API_KEY`
unset, (3) opportunity catalogue thin (11 active rows). **(3) is resolved** — 275 active rows
today, spanning far more than the four categories the document names. **(1) and (2) are
deployment/dashboard state**, not visible from this session's tool access any more than
`current-state.md`'s own repeated "deployment state is not measured here" caveat allows —
genuinely unverifiable from here, stated plainly rather than assumed either way. **What makes
the document's overall verdict more wrong than a stale number**: even if all three of its named
blockers were resolved today, a pilot cohort would run headlong into two things this document
had no way to know about, found only tonight — the plan-regenerate action that silently
deletes a student's completed actions and reflections (task 7's "mark applied" and the
weekly-plan loop this doesn't cover), and the admission-outlook badge that never recomputes
after a save, so pilot task 5 ("save a university as a target") would show a permanently frozen
"Not yet assessed" for most testers regardless of how much profile data they add during the
pilot. Both are real, both post-date this document by two weeks, and both matter more to a
pilot's outcome than the document's own three blockers.
**Still valuable**: the ten-task script's *structure* (concrete success/failure signal per
task, sequencing rationale, the `product_events` query for checking what actually happened) is
reusable pilot-planning scaffolding independent of the specific numbers — worth keeping as a
template if/when a pilot is actually scheduled, not as a current status claim.
**Reason to exist separately**: the task-script skeleton, yes, if a pilot is imminent; the
blockers/status section, no.

### `current-product-capability-map.md` (20 Aug, newest and most rigorous) — right method, still 90 merges stale

The best of the five by construction: cross-checked against migrations/`lib`/`app`/tests
directly rather than trusting prior docs, explicitly flags its own scope, and its closing line
— *"treat any doc as a lead to verify against code, never as ground truth, until a fresh
integration checkpoint is written"* — is exactly the instruction this audit is now applying to
the document itself. Its area-by-area tables (Student/Counseling/Opportunities/
University/Social) are more granular than anything current. Spot-checked its most specific
"Notable issue" — migration `0043` (duplicate-university handling) "exists as a file but has
never actually been applied live" — against tonight's own work: duplicate-university handling
is confirmed resolved and live (`FOUNDER-START-HERE.md`'s own already-superseded "no longer
blocking" table, cross-checked independently earlier this session), so this specific,
once-true claim is now false. Given the doc's own age and the volume of schema/code change
since, the rest of its ~150 individual cells were not re-verified one by one — the pattern
established by the other four, plus this one spot-check, is consistent enough not to warrant
that effort.
**Reason to exist separately**: its structure is the strongest template of the five if this
granularity of capability map is ever wanted again — but as a current document, no.

## What's still open, not covered by any of the five, and already tracked

Nothing found in this pass that isn't already in `docs/founder-blocked-backlog.md` or
`docs/what-a-student-cannot-do-yet-2026-09-01.md`. That's the point of the recommendation:
those two documents (plus `docs/current-state.md` for DB/migration/integration state) already
cover this ground, current as of tonight, and don't need a sixth document merged into them.

## Action taken

Added a short, dated superseded notice to the top of all five files, pointing to
`docs/current-state.md` and `docs/what-a-student-cannot-do-yet-2026-09-01.md`. Original
content preserved below each notice, unedited — historical record of what each session found,
not corrected in place, matching this repo's own convention for `docs/handoffs/*`. Not moved
or renamed: 15 other documents link to these five by their current paths
(`what-a-student-cannot-do-yet-2026-09-01.md`, `data-readiness.md`, `product-decisions.md`,
`qa-environment-readiness-audit.md`, `product-ux-audit-2026-08-18.md`,
`student-data-contract-audit.md`, `provenance-confidence-contract-audit.md`,
`ORYN-AI-DEVIR-RAPORU-2026-08-28.md`, `ui-feature-preservation-matrix.md`,
`feat2-loop-audit-2026-08-22.md`, `ORYN-ORG-BRIEFS.md`, and three files already in
`docs/handoffs/`) — moving the files would break every one of those; a banner does not.

One of those referrers, `docs/what-a-student-cannot-do-yet-2026-09-01.md`, is CEO's own
document from tonight and the one that actually matters (the rest are themselves August-dated
or already-archival) — not edited here; it already states plainly, in its own first paragraph,
that all five are stale, so nothing about this audit changes what it should say.
