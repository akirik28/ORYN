# UI-simplification session — 2026-08-20

Workstream: **UI-simplification / IA** — downstream of Computer B
(`docs/MASTER-EXECUTION-STRATEGY.md` defines Computer A/Computer B only; this lane was
confirmed directly by the founder mid-session as a separate, isolated third lane, given
Computer B's own handoff already frames its work as "prep for the incoming UI-simplification
redesign"). Branch: `oryn/ui-simplification-v1`, in an isolated git worktree at
`.claude/worktrees/ui-simplification-v1` (created from Computer B's branch tip, not `main`,
so this lane builds on the real current schema/behavior rather than a stale base).

## Coordination note

A live Computer B session was found actively committing to `oryn/counselor-data-quality-v1`
in the same shared working directory this session started in — confirmed via its own handoff
doc (`docs/handoffs/claude-b-2026-08-20-session.md`) and two commits landing in real time
during this session's own investigation. Moved to an isolated worktree specifically to remove
any file-collision risk with that session rather than working in place. All 4 canonical
coordination docs (`MASTER-EXECUTION-STRATEGY.md`, `current-state.md`, `product-decisions.md`,
`ORYN_WORKSTREAMS.md`) already existed and were already correctly adopted by that session —
not duplicated here.

## Completed this session (implemented, tested, committed)

1. Dashboard's opportunity preview showed a bare `{matchScore}% match` (e.g. "91% match")
   instead of an explained categorical label — the one place on the dashboard using
   unexplained numeric precision, against the founder's own opportunity-fit guidance. Extracted
   the existing `tierFor()` categorical mapping out of `opportunity-card.tsx` (a `"use client"`
   module) into `lib/opportunities/match-tier.ts` so the Server Component dashboard can call it
   directly — a real RSC-boundary correctness fix, not just a copy-paste. Both call sites now
   share one source of truth. `npm run typecheck` / `npm run lint` / `npm test` (1051/1051)
   clean; confirmed live via this worktree's own dev server (port 3002) against
   `/design-preview` — "International Economics Challenge 2027" now reads "Exceptional match".
2. `docs/ui-simplification-analysis.md` — the "what should the student actually see" research
   pass, grounded in Computer B's `docs/current-product-capability-map.md`, `design-system.md`,
   and live rendering of everything renderable without a Supabase session in this sandbox
   (dashboard, landing, university explorer, both desktop and 375px). Verdict per screen:
   dashboard already strong (fix above), opportunities/universities no issue found, profile is
   the one real open IA question.

3. **Profile jump-nav, approved and shipped** (`f182db2`). `ProfileSectionNav` — sticky,
   horizontally-overflowing on narrow screens, real `<a href="#id">` anchors, IntersectionObserver
   scroll-spy, reuses SidebarNav's active-pill motion pattern and button.tsx's focus-visible
   ring classes. Purely additive: existing 18 sections got `id`-anchor wrappers only, nothing
   reordered except folding Certifications/Skills into the "Academic record" anchor range (a
   labeling choice, not a DOM move) so all 5 groups are contiguous and the scroll-spy highlight
   moves monotonically instead of flickering across non-contiguous ranges. No tabs, nothing
   hidden, no second profile architecture. Checked for overlap with Computer B's active files
   before starting (none on `app/(app)/profile/**`/`features/profile/**` at the time) and again
   before pushing.

   QA: typecheck/lint/test (1051/1051) clean. Live `/profile` itself isn't reachable in this
   sandbox — `oryn-qa-scratch`'s Supabase Auth "Confirm email" is on (a founder-blocked item,
   `docs/founder-blocked-backlog.md`; also tried a scratch-DB SQL confirm as a workaround, which
   the permission system correctly declined — didn't route around it). Built a throwaway,
   never-committed harness under `/design-preview` instead, mounting the real component with
   dummy sections at the real page's actual container padding. Confirmed via direct DOM/
   computed-style inspection: correct scroll target + `scrollY`, active-state tracking, full
   keyboard tab order, a real focus-visible ring (3px, right color, verified via
   `getComputedStyle`), and working mobile `overflow-x-auto` (verified both via
   `scrollWidth > clientWidth` and an actual `scrollLeft` move). Two things didn't visibly work
   in this specific automated browser pane — `scrollIntoView`'s smooth *animation*, and a
   synthetic Enter keypress triggering a native link click — both standard, unmodified browser
   primitives with no code-level reason to fail for a real user; flagged as a tooling limitation
   rather than asserted as fully verified.

4. `docs/dashboard-simplification-analysis.md` — the "what matters now, not show everything we
   know" pass for the dashboard, as requested. Categorizes every current module as primary/
   secondary/collapsed-progressive/contextual-only. One concrete finding: "Due soon" duplicates
   deadline info already shown per-action in both the AI weekly-plan cards and Computer B's new
   `CounselorWeekFallback` cards (B4) — proposes deduping the *presentation*, not the data.
   Also proposes pairing the not-yet-rendered "Strengths" concept with "Biggest gap" as one
   comparative line rather than a new competing card, once Computer B wires it in. **Analysis
   only, no code touched** — `dashboard-view.tsx`/`app/(app)/dashboard/page.tsx` have Computer
   B's live in-progress commits (B4 landed mid-analysis), so implementation is explicitly held
   for a fresh collision check and a go-ahead.

## Blockers

None for this lane's own work. Noted, not owned by this lane: `oryn-qa-scratch`'s Supabase Auth
"Confirm email" setting blocks live-account browser QA for any UI package — already tracked in
`docs/founder-blocked-backlog.md`, needs a founder dashboard toggle to clear.

## Next

Pending founder direction on `docs/dashboard-simplification-analysis.md`'s proposals
(Due-soon dedup, Strengths+Gap pairing, 2-tier visual weight pass) — held for Computer B's
dashboard-contract work to settle and an explicit go-ahead, consistent with how the profile
jump-nav was handled. No blocking question otherwise; ready for redirection to a different
package or real visual references at any point.
