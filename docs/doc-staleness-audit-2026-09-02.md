# Founder-doc staleness audit — 2026-09-02

Pinned against `main` @ `579093f4` (3,617 tests) — confirmed fresh from `origin/main` before
starting, not trusted from the number in the assignment. A staleness audit against a `main`
that keeps advancing can't ever finish; pinning and saying so is the fix, not chasing the tip.

**~40 merged packages** separated the last touch on these docs from this pass (`known-issues.md`/
`current-state.md` both last edited at `ca6a15c5`, 114 commits back; `FOUNDER-START-HERE.md` at
`7aff594d`, **635 commits, dated 2026-08-22** — untouched by any of tonight's or yesterday's
extensive staleness work). Checked every claim against live data and `main` directly, never
against another doc's own claim about the same fact — the mutual-deference failure mode this
project's docs have hit repeatedly before.

## `FOUNDER-START-HERE.md` — rewritten in full, not patched

This was the most consequential finding, not the largest diff. The 2026-08-22 version's literal
top instruction was: approve migrations `0061`, `0062`, `0063` via the Supabase SQL editor.
**All three are already live.** Checked the actual mechanism, not a file header — `0061`'s fix
is an `auth.uid() is not null` clause folded into `public_profiles`'s own view definition (its
own migration comment explains why a `REVOKE` wouldn't have been durable); `pg_get_viewdef`
confirms it's there. `0062`/`0063`'s guard trigger is live via `pg_get_triggerdef`. A founder
reading the old page tonight would have hunted for a decision that isn't there anymore, while
the two migrations that **are** genuinely still unapplied and still matter (`0058`, the
deploy-blocking social-layer decision; `0048`, a live gap letting any signed-in account insert
a `profile_views` row against an arbitrary UUID) went unmentioned.

Also stale: the "14 of 16 MVP loops work, blocked only on `ANTHROPIC_API_KEY`" framing (superseded
by `current-state.md`'s own more granular finding — both feedback loops, not an API key, are
what's never closed), the 144-file/2,122-test gate snapshot (now 258/3,617), and an entire
section of 2026-08-22-specific operational instructions (un-hang a named hung session, open an
"ingester" session against a research-org structure that no longer exists in that form) with no
current referent at all. Rewritten to point at the three documents that are actually
current — `current-state.md`, `founder-blocked-backlog.md` (already correctly re-ranked today,
verified by reading it directly), and the admin-access runbook — rather than re-deriving their
content a second time next to them.

## `docs/current-state.md` — targeted corrections, not a fourth full rewrite

Its own convention is "rewritten in place at each checkpoint," and a full re-verification of
every DB count in it (universities, opportunities, canonical entities, RLS advisors — none of
which this pass has reason to believe changed) would be a materially larger task than what was
asked. Added an explicit staleness-pass row to its own provenance table instead, naming exactly
what was and wasn't re-checked, then fixed five specific claims independently verified wrong:

- **`not_interested_reason` — "collected and discarded... read by nothing in `lib/`."** No
  longer true; three of the seven reasons now feed matching (`c4f3baa6`, this fleet's own
  earlier package tonight — verified by having built it, not inferred).
- **AI eval harness — "No real (paid) run has been executed."** Wrong; two real runs exist,
  logs preserved in `docs/eval-runs/`.
- **Test count — 3,243, dated `4a3f3573`.** Now 3,617 at the pinned commit; both are honest
  numbers for different checkpoints, not a contradiction, and now both are on the record.
- **Migration `0077`'s live-outage fix — "being fixed separately."** Read `lib/plan/persist.ts`
  directly: it's fixed, and specifically *how* (catches Postgres `42703` for exactly this
  column, degrades to a warning, never crashes or silently drops the reflection data the
  original bug lost). Upgraded from a future-tense promise to a verified past-tense fact.
- **Added, not corrected: a pointer to `docs/ai-spend-cap-2026-09-02.md`.** The specific
  correction oryn-a7 asked this pass to hunt for — a claim that most AI features have no cost
  cap — doesn't appear written down anywhere in `docs/*.md` (grepped broadly, multiple phrasings,
  found nothing to correct). The true version already exists, thoroughly verified
  call-site-by-call-site in its own document; it just wasn't reachable from the one doc a
  founder is most likely to actually read. Now it is.

## `docs/known-issues.md` — one entry updated, most of 1,634 lines not re-read

Given the third staleness pass (`32d55eb9`, already merged into this pin) brought the file fully
current as recently as today, and given the doc's own top ~220 lines are exactly the newest,
highest-traffic section, concentrated verification there rather than a linear re-read of the
whole file:

- **The same `0077`/`carried_forward` entry current-state.md had** — previously marked "could
  not fully determine" whether a live "Regenerate" click errors, silently drops data, or
  degrades. Now answered directly from the code, same finding as above, cross-linked.
- **Re-verified, unchanged**: the admin-account entry (still only the QA throwaway), and the
  `0062`/`0063` header-vs-live-trigger mismatch (re-checked `pg_get_triggerdef` directly — the
  live trigger still guards all three columns, the file still says one; genuinely still
  unreconciled, correctly described as such).

**Not attempted**: adding entries for tonight's roughly forty other findings that aren't yet
in this file at all (the unchecked-write sweep, the research-generator audit, the story-bank
audit, and more each have their own already-merged write-up doc, just not yet a line here).
That's a real gap — the file is incomplete relative to tonight, not wrong about what it does
say — but writing ~40 new entries is a different-shaped task than a staleness pass, and
guessing at which of tonight's findings rise to "known issue" versus "already resolved, no
trace needed" isn't something to speed through at the end of an already-large pass.

## The product-status set (five superseded docs)

Banners from the 2026-09-01 pass are intact and still point to real, existing documents
(`current-state.md`, `docs/what-a-student-cannot-do-yet-2026-09-01.md`). Nothing to fix; a
correction to `current-state.md` above makes that pointer more accurate by extension, not less.

## The specific correction asked for

Searched `docs/*.md` broadly (several phrasings — "cost cap," "no spend cap," "nine of ten,"
"9 of 10") for a claim that most AI features have no cost cap. **Found no instance of it in
writing anywhere in this repo's docs.** Can't rule out it was said only in a message outside
this repo's own history, which this pass has no access to — reporting the negative result
precisely rather than either claiming the repo is clean of it with more confidence than the
search supports, or leaving the search unstated. The true version (a real, verified,
call-site-checked $0.50/$1.00 cap covering all ten features) is now linked from
`current-state.md`, which is the more useful half of this specific ask regardless of where the
wrong version came from.

## Gate

`npm run typecheck`, `npm run lint` both pass (docs-only change). `npm test -- --run` already
confirmed 3,617/3,617 (258 files) at the pinned commit before this pass began; nothing here
touches code.
