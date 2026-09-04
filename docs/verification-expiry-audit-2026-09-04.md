# Verification expiry audit — 2026-09-04

The question this answers: of every doc in `docs/` dated 2026-09-04, which ones still
describe current `main`, and which describe a state a later merge has since changed? Not
a re-run of each check — a comparison of each doc's own "moment" (the commit it was
checked against, or its own introduction commit where none was stated) against what
landed on `origin/main` after it, judged against whether the later work touched the same
surface. Checked against `main` at `7bb78084` (the commit named in the dispatch);
`git fetch` at the time of writing showed main slightly ahead of that, at `48d43b9b` —
noted where it matters, not material to any conclusion below.

**Bottom line: most of tonight's verifications still hold. Two are confirmed expired in
the way that actually matters (a later merge touched the exact surface the check
covered), one is a known, already-acknowledged handoff, and the rest are either process/
tooling docs with no product-state expiry to speak of, or specs whose own currency is a
different question from "did this claim expire."**

## The table

| Doc | Claim | Checked against | What landed after, on the same surface | Status |
|---|---|---|---|---|
| `rename-sweep-blind-spots-2026-09-04.md` | 3 named files (`lib/admissions/outlook.ts`, `lib/universities/counseling-adapter.ts`, `lib/admissions/system-shape.ts`) still say "Oryn" in real, rendered student-facing text | `5604bdec` | `2b3fbcc8` — "rename: Oryn -> Proxola in the three confirmed live lib/ leaks," explicitly fixing all three | **EXPIRED — confirmed fixed.** Grepped all three files: 0 "Oryn" occurrences, all three. The doc itself still reads as an open finding; a reader who only saw the doc would think this is still live. |
| `p6-shared-premium-2026-09-04.md` | `lib/tier/parent-tier.ts`'s tier-resolution logic, built and described as not depending on P1's exact column names because P1 "hasn't landed yet" | `487077ac` | `a938108e` — "feat(tier): wire P6's DB layer against P1's real (staged) schema" | **EXPIRED — superseded, not wrong.** The file was deliberately rewritten once the real schema existed. The doc's description of *how* the code avoids depending on unknown columns no longer matches the code, which now depends on them directly (correctly, now that they're known) — reading the doc alone would describe an approach the code has since moved past. |
| `veli-hesabi-spec-2026-09-04.md`, §8 lane-status table specifically | P2 and P3 "⏳ devam" (in progress), P5 "⏸ başlamadı" (not started) | Stated in-doc as "4 Eylül 01:40 itibarıyla" (as of 01:40) | P2's routing bug was fully traced and its fix assigned; P3's panel was fully built and mobile-tested tonight (this session, twice); P5 shipped as a complete, self-started package with its own doc | **EXPIRED, and the doc says so about itself** — it's a timestamped snapshot inside a living spec, explicitly marked "updated by CEO," last updated 01:40. Not a case of a check silently going stale; more a case of a table that's supposed to move and hasn't been asked to since. Flagging because it's the one place in `docs/` most likely to be read as current status by someone skimming, not because anyone did anything wrong. |
| `plan-page-tier-comparison-trace-2026-09-04.md` | The `sameByDesign` comparison rows render plain (no flame/tier styling) | `c334cd76` | My own `f51fcd44` (the dim-green background) touched the exact same rows, adding a `.dark` scope + `text-foreground` | **Technically expired, practically still valid — worth naming as its own category.** The doc names a specific commit that a later merge changed on the exact surface it covers. But the conclusion was independently re-checked against the *later* commit by the same author (b9), in a separate message, not by updating this doc. So the claim is still true of current `main` — just not provably so from this doc alone anymore. A reader with only this file would be trusting a commit that's no longer what's running. |
| `parent-state-machine-trace-2026-09-04.md` | `getMostRecentParentLink` picks the wrong child in a two-children case — the multi-child routing bug | `4a37740d` (also cites `e645d7a2` in-doc as its own trace point) | Nothing — `git log e645d7a2..HEAD -- lib/auth/account-role.ts` is empty | **Still valid.** The bug is real and, as of this audit, still unfixed — worth stating plainly since the dispatch that assigned this audit said the fix was "in flight" with 71; it had not landed as of the commit this audit ran against. Not evidence anything is wrong, just a timing note: don't read "in flight" as "already merged." |
| `bugun-dogrulama-2026-09-04.md` | Partial — the doc itself declares what it covered before being handed off | `c334cd76`, and the doc marks itself "YARIM BELGE" (half-document) | N/A — already a known, self-declared handoff, not a silent expiry | **Not newly expired — already accounted for.** This is one of the four instances CEO named from memory; nothing to add beyond confirming the doc is honest about its own incompleteness. |
| `student-core-loop-trace-2026-09-04.md` | Three "drifted" findings against the student core loop, traced at code level because live browser testing wasn't safely available that session | `26c6be24` | P2/P3/P5 (parent-account packages) landed after | **Named by CEO as expired from memory — checked the premise rather than re-running the trace.** The three drifted findings are about the *student* loop specifically (register→onboard→profile→dashboard), not the parent surfaces P2/P3/P5 added — so the findings themselves likely still hold on their own terms; what's expired is narrower than "the whole doc is wrong": the doc's own implicit claim to be a *complete* picture of "is today's work actually there" no longer covers three packages that didn't exist when it ran. Both things can be true at once, which is exactly the "judgement, not a diff" the dispatch asked for. |
| `rename-db-render-check-2026-09-04.md` | Specific renamed DB columns (`weekly_actions.reason`, `opportunities.description`, etc.) render correctly post-migration | Live DB read, undated commit reference in-doc | No migration or rename-adjacent commit touched these tables again (`git log 26882120..HEAD -- supabase/migrations/` shows only unrelated parent-account and opportunity-eligibility work) | **Still valid.** Nothing since has re-touched the specific rows or columns this checked. |
| `empty-field-measurement-2026-09-04.md` | Live null/empty-field counts across `opportunities`/`universities`, explicit "measurement only, nothing written" | Live DB read, 2026-09-04, no commit cited (a data snapshot, not a code claim) | Not checked in this pass — this is the one row where "what merged after" is the wrong question; the right one is "has anything written to these tables since," which is a live DB re-query, not a git log | **Not assessed — different kind of claim.** Flagging rather than guessing: this is a measurement of *data*, not of code behavior, so its expiry condition is a write to `opportunities`/`universities`, not a merge. Worth a live re-query if anyone's about to act on these specific numbers, not something `git log` can answer. |
| `fleet-self-started-branch-attribution-2026-09-04.md` | Process observation: P5 was self-started and unregistered | `e7d77ab9` | P5 has since shipped and is documented (`parent-weekly-commentary-p5-2026-09-04.md`) | **Resolved, not expired.** The gap it named (unregistered work) closed once P5 was folded into the visible record — this doc's value now is historical (what happened and why), not a live claim about current risk. |
| `hidden-pane-zero-rect-2026-09-04.md` (mine) | A tooling fact about the Browser pane's `document.hidden` behavior | N/A — describes tool behavior, not product state | N/A | **Doesn't expire from a merge.** Tooling facts about the test harness aren't invalidated by product code changing. |
| `worktree-dev-server-hazards-2026-09-04.md` | Tooling facts: shared-host session leakage, dev-server hazards | N/A | N/A | **Doesn't expire from a merge**, same reasoning as above. |
| `parent-surfaces-mobile-pass-2026-09-04.md` (mine) | The real `/parent` panel nests inside the wrong layout | `48d43b9b` (the commit I checked against, itself already past this audit's own `7bb78084` baseline) | Fix assigned to 71 per CEO, not yet independently confirmed landed at time of writing | **Still valid** — the bug was present as of the commit checked and nothing in this audit's own range shows a fix landing yet. Same caveat as the parent-state-machine row: "assigned" isn't "merged." |
| `parent-weekly-commentary-p5-2026-09-04.md`, `parent-invite-flow-design-2026-09-04.md`, `parent-account-e2e-plan-2026-09-04.md` | Build accounts / design docs / a verification *plan* | Various | Each describes work that has since been superseded by its own completion (the plan became the built thing) | **Not the kind of doc this audit is about.** These record what was built and why, or propose what to check — they're not standing claims about current `main`'s behavior the way a trace or a measurement is. Reading them as historical record rather than live status is the correct use regardless of what merged after. |

## What this doesn't cover

Every doc dated 2026-09-03 or earlier was out of scope, per the dispatch's own boundary
(the class of problem is general, but auditing every verification doc this fleet has ever
produced is a different, much larger task than "tonight's exposure"). If the same
question is worth asking about last night's docs, that's a separate audit, not a gap in
this one.

## The honest summary

**Two real expirations where it matters** (`rename-sweep-blind-spots`, `p6-shared-
premium`) — both in the direction of "the doc undersells how current the code now is,"
not the more dangerous direction ("the doc claims something fixed that secretly isn't").
**One structural one** (`veli-hesabi-spec`'s own status table, which names its own
staleness by having a timestamp at all). **Two "still valid, not yet fixed"** worth
restating plainly so "in flight" isn't mistaken for "done." **The rest** are either
already-acknowledged, already-resolved, or the wrong *kind* of document for this question
to apply to. Given how much shipped in one night across seven parallel lanes, the exposure
this audit found is smaller than the framing ("what has been verified against a main that
no longer exists") made it sound — most of tonight's green reports are still spendable.
