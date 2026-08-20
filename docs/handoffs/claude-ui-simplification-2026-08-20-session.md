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
   secondary/collapsed-progressive/contextual-only. **Approved by the founder in full**, along
   with a visual north star (references are hierarchy/spacing/polish targets, not feature specs
   — no fake precision, categorical language only unless backed by real deterministic logic).

5. **Dashboard hierarchy pass, approved and shipped** (`22e7c20`, plus two merge commits pulling
   in Computer B's B4/B6/B7/B10/B11 packages — re-checked for file overlap before each merge,
   found none). Re-fetched and confirmed B4 (`dashboard-view.tsx`'s deterministic weekly-focus
   fallback) had fully landed as reviewed atomic commits — not still in flight, despite Computer
   B's own handoff text saying so (stale relative to its own git history) — before touching
   anything.

   - Pairs Counselor Core's top-ranked strength (`lib/counselor/strengths.ts`, already computed,
     already tested) with Biggest Gap as one line — "Leadership is already one of your strongest
     areas" — only when the tier is standout/notable, never forced. No new backend logic, no
     invented numbers.
   - Dedupes "Due soon" against whatever's already on the current focus-block actions (date-string
     match, view-layer only — neither action shape carries the deadline's own id). Confirmed live
     against fixture data: the Economics Challenge deadline correctly drops out of Due Soon since
     it's already the subject of a focus action.
   - Secondary cards (University outlook, Opportunities) get `bg-muted/40` instead of the primary
     sections' weight; the hero's profile link becomes a real (still subtle) `Button` instead of a
     plain text link.
   - **Found and fixed a real, pre-existing bug during the mobile QA pass this required**: both
     secondary-grid rows were missing `min-w-0` on their truncating flex children *and* on the
     grid items themselves (a classic flex/grid default-min-width gotcha — two nesting levels
     both needed it), so long badge text silently overflowed past 375px with no scrollbar to
     reveal it. Unrelated to this session's own earlier match-tier change — the University
     Outlook badges were affected too, and that section was never touched before this pass.

   QA: typecheck/lint/test (1140/1140) clean after both merges. Desktop confirmed via
   `getComputedStyle`/`getBoundingClientRect` (2-column grid active, `bg-muted/40` fill
   present, focus-visible ring on the new button) after screenshot capture proved unreliable
   at this scroll position on this specific page (DOM measurements confirmed content was
   correctly positioned regardless — a capture tool artifact, not a rendering bug). Mobile
   confirmed via screenshot + measurement, both before and after the overflow fix.

## Visual north star (approved, for every future package)

References are hierarchy/spacing/polish/premium-card-treatment targets — never feature specs.
Don't copy reference-specific capabilities, metrics, nav items, or scores ORYN doesn't actually
have. No fake precision anywhere (no bare percentages, no invented admission probabilities) —
categorical, explainable language only, and only when backed by real deterministic logic.

## Noted for a later pass (not started)

Discovery/map redesign: the founder flagged a filters → map → selected-opportunity-detail
layout as the strongest reference direction for opportunity discovery (summer programs,
competitions, internships, research, etc.) — using ORYN's real opportunity taxonomy and real
data/imagery, not reference-specific categories or fake fit scores. Do not start this yet.

6. **Premium Visual Convergence V1, approved and shipped** (`233e944` dashboard, `5a174f1`
   profile). Same rule as every package this session: references are hierarchy/spacing/
   polish targets, never feature specs — nothing below adds a capability, a number, or a
   metric ORYN doesn't already have.

   **Dashboard** — before: University outlook / Opportunities rows were plain text with zero
   interaction (not even a hover state), and the primary→secondary transition had no visual
   separation beyond the same `space-y-10` rhythm as everything else. After: every row is a
   real link to its detail page with a subtle hover lift (`rounded-lg` `hover:bg-background`
   against the muted card wash — reuses the app's existing hover-state language, not a new
   one), and the secondary grid gets `pt-4` on top of the existing rhythm so the break reads
   as deliberate. Opportunity `id` was already available in the query and just wasn't passed
   through — no new query.

   **Profile** — before: four sections (Professional profile, Featured, Profile Strength,
   score hero) all used `rounded-3xl`, directly against `design-system.md`'s own rule ("at
   most one `rounded-3xl` element per screen... a signal, not a size utility"). After: three
   demoted to `rounded-2xl`; the score hero (the one with the actual gradient/brand
   treatment, same visual language as the dashboard's own hero) is the one that stays.
   `AchievementSection` — the shared component backing all 13 of the profile's repeated list
   sections — gained a row hover state and moved from `rounded-lg` to `rounded-xl` to match
   the radius scale everywhere else lists appear; one fix, 13 sections benefit. Reviewed
   `DynamicFormFields` (the add/edit dialog) and left it alone — already a clean, consistent
   2-column grid, not the "bureaucratic form fatigue" this pass targets.

   **Found and fixed one real accessibility gap along the way**: `OpenToForm`'s toggle chips
   (`features/profile/open-to-form.tsx`) were a raw native `<button>` with no focus-visible
   styling at all — the only interactive element in either page missing it. Added the same
   `focus-visible:ring-3 focus-visible:ring-ring/50` pattern `button.tsx` and this session's
   own `ProfileSectionNav`/dashboard CTA already establish. Grepped the rest of
   `features/profile/` for the same gap — nothing else missing it.

   **QA**: typecheck/lint/test (1140/1140) clean after every commit and again after each
   merge. Dashboard confirmed live — desktop via `getComputedStyle`/`getBoundingClientRect`
   (screenshot capture is unreliable at this specific scroll depth on this specific
   map-heavy page, a recurring tool artifact this whole session, not a rendering bug — DOM
   measurement substitutes every time it happens), mobile via screenshot, no horizontal
   overflow. **Also tested an incomplete-profile/all-empty-states scenario** (temporarily
   zeroed every dashboard prop in the design-preview harness, never committed) — every
   section degrades correctly: no orphaned cards, no broken layout, "Not scored yet" /
   "No weekly plan yet" / "No target universities yet" / "Personalized matches appear here
   once your profile has enough signal" all render exactly as their existing (untouched)
   fallback branches always have. Profile's own live render still isn't possible in this
   sandbox (same email-confirm blocker) — its changes are precedented, low-risk token/class
   reuses of patterns already proven correct elsewhere this session, not asserted as
   visually confirmed.

## Blockers

None for this lane's own work. Noted, not owned by this lane: `oryn-qa-scratch`'s Supabase Auth
"Confirm email" setting blocks live-account browser QA for any UI package — already tracked in
`docs/founder-blocked-backlog.md`, needs a founder dashboard toggle to clear.

## Next

No blocking question. Continuing autonomously per the founder's standing instruction — next
candidate work would be further scoped polish within the approved dashboard/profile direction,
or redirection to a different package (discovery/map is explicitly not started yet). Will stop
only for: a genuine new file collision, anything that would remove working capability, undefined
counselor/product logic, missing backend support, or a real founder-level product decision.
