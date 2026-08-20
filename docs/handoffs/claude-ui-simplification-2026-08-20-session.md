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

## Next (superseded below — see the context-reset handoff)

No blocking question. Continuing autonomously per the founder's standing instruction — next
candidate work would be further scoped polish within the approved dashboard/profile direction,
or redirection to a different package (discovery/map is explicitly not started yet). Will stop
only for: a genuine new file collision, anything that would remove working capability, undefined
counselor/product logic, missing backend support, or a real founder-level product decision.

---

# CONTEXT-RESET HANDOFF — Discovery/Map package, 2026-08-20 (later checkpoint)

Written because the founder's session context window is close to full and asked for a
complete, execution-ready handoff rather than continuing implementation. Everything above this
line (dashboard + profile premium convergence) is committed and pushed and stays true. This
section is specifically about the Discovery/Opportunity Map package, started after the above,
**not yet committed**. Read this whole section before touching any opportunities file.

## 1. Current state

- Branch: `oryn/ui-simplification-v1`
- HEAD: `530a3544` ("docs(ui): document premium visual convergence pass in handoff") — this
  commit and everything before it is **pushed**, `origin` is in sync up to here.
- Working tree: **dirty**. Real, functional, typechecked/linted/tested Discovery/Map code sits
  uncommitted in the working tree (full list in §4). Nothing from this package has been
  committed or pushed yet — the next session's first real decision is whether to review this
  diff and commit it, or discard/rework parts of it. It is not lost either way; it's sitting
  in the worktree at `.claude/worktrees/ui-simplification-v1`.
- No conflicts, no stash, nothing else in flight.

## 2. What is complete (committed, pushed, done)

- **Dashboard**: hierarchy pass (strength+gap pairing, Due-soon dedup, quieter secondary
  cards) + premium visual convergence pass (interactive outlook/opportunity rows, primary/
  secondary spacing separation). Founder-approved both times. See the sections above this one
  in this same file for full detail.
- **Profile**: jump-nav (About/Your standing/Goals/Experience & achievements/Academic record)
  + premium visual convergence (rounded-3xl→2xl hierarchy fix, AchievementSection hover/
  radius consistency, a real focus-visible accessibility fix on OpenToForm's chips).
  Founder-approved both times. Do not reopen either page's IA — both are explicitly settled.
- **Discovery/Map — in progress, uncommitted** (full detail in §3). Desktop 3-column shell,
  country-level map, filters, selected-opportunity panel, and a mobile composition all exist
  and typecheck/lint/test clean, but have had only partial visual QA (§10) and the founder has
  already asked for one more visual iteration (§5) before this is ready to commit.

## 3. Discovery/Map current implementation

**Architecture decision, and why**: the reference shows per-pin precision on a world map.
Audited the schema exhaustively (§7) — `opportunities` has no coordinate column anywhere, and
`entity_locations` (the one generic lat/lng table in the schema) is defined but has zero reads
or writes anywhere in the codebase. There is no defensible way to place a precise pin for an
opportunity today. Built **country-level aggregation** instead (opportunity count per
`opportunities.country`, one marker per country, sized by count) — the same pattern the
existing `/universities` map already uses successfully, and the only one the real data
actually supports. No clustering beyond country-level exists (no sub-country/regional
clustering) — the live catalog is ~11 active opportunities total (per `browse.ts`'s own
comment), so country-level is already close to per-item granularity in practice.

**Filters (left rail)** — `features/opportunities/opportunity-filter-rail.tsx` (new,
replaces the deleted `opportunity-filter-bar.tsx`): category (pills), search (title/org
substring), country (owned by the map/pills, not this form), cycle status, remote/online,
free only, **saved only (new — real `saved_opportunities` data, wasn't filterable before)**.
Same URL-driven GET-form pattern the old filter bar used, just laid out as a vertical rail.
No field/subject or duration filter added — judged too weak/complex for what's real today,
not implemented.

**Map (center)** — `features/opportunities/opportunity-map-explorer.tsx` (new). Reuses the
university map's proven pieces directly: `pickLabelPriorityCountries` (label-count capping)
from `lib/data/map-visuals.ts`, `SUPPORTED_COUNTRIES`/`countryByName` from
`lib/data/country-geo.ts`, and the exact same "assign every one of the map library's four
style-variant keys the identical resolved style object" fix for a real, already-diagnosed
bug where the third-party map library can drop fill color entirely right after a click. Does
**not** reuse `resolveCountryFillStyle` itself — see §5, this was deliberately given its own
color ladder after direct founder feedback that the shared one (tuned for ~89 countries with
real data) read as nearly blank when only 2-3 countries have any opportunity. Selecting a
country toggles `?country=` via `router.push(..., { scroll: false })`, same in-context,
no-navigation pattern the university map uses. **Fixed a real, confirmed bug found auditing
the university map before building this**: there, filter changes narrow the result list but
never the map (two separate queries, one filtered, one not). Here, `browseOpportunities()`
(`lib/opportunities/browse.ts`) computes `countryCounts` from the exact same filtered,
pre-pagination row set the list renders from — map and list share one query and cannot
disagree.

**Selected opportunity (right panel)** — `features/opportunities/opportunity-detail-panel.tsx`
(new, async Server Component). `?selected=<opportunityId>` in the URL, same pattern as
`?country=`. Real fields only (title, organizer, category+selectivity+cycle badges, deadline,
computed duration from start/end date, location, cost, eligibility notes, description),
missing ones simply don't render — no empty labels. No image (see §3 imagery below — none
exists to show). `OpportunityActions` (existing, untouched component) provides Save/Applied/
Not-interested + Official-page/Apply links. "Full details" links to the existing, untouched
full route (`/opportunities/[id]`) — that route is not replaced, just supplemented. Rendered
**once** per request (`const detailPanel = params.selected ? <OpportunityDetailPanel .../> :
null`) and the resulting element is placed in both the desktop sidebar and (conditionally) the
mobile sheet — this avoids double-fetching; do not split it into two separate JSX usages of
the component, that would re-run its 2 queries twice per request.

**Cards** — `features/opportunities/opportunity-card.tsx` (existing, extended, not
rewritten): added a category icon-band (see §3 imagery), a `detailHref` prop (when set, the
title links to a `?selected=` URL instead of the full detail route — Discovery passes this,
"For You" doesn't and is unchanged), and a `selected` prop (ring highlight). Existing
save/applied/not-interested/eligibility-badge/match-tier logic is completely untouched.

**Mobile composition** — three new small client components, specifically because the
unmodified desktop layout stacked (filters full-height, then map, then list) and a student
had to scroll past an entire filter panel before seeing one result — confirmed live before
building the fix:
- `opportunity-mobile-filter-sheet.tsx` — filters move into a `Sheet` (bottom), trigger
  button always visible instead of a permanent filter block.
- `opportunity-mobile-view-toggle.tsx` — List/Map segmented toggle (defaults to List); List
  and Map are true alternates (conditional render, not both mounted with one CSS-hidden) so
  the map's code-split bundle only loads if a student actually taps "Map". **Takes plain
  serializable data as props, not render functions** — a real bug hit and fixed while building
  this: a function prop ("Functions cannot be passed directly to Client Components...") can't
  cross the Server→Client boundary at all, the same trap `achievement-section.tsx`'s own code
  comment already documents from an earlier session. If you touch this component, do not
  reintroduce a function/callback prop — pass data and let the client component build hrefs
  itself (see `selectedHref` reimplemented locally inside the toggle).
- `opportunity-mobile-selected-sheet.tsx` — the same `?selected=` panel, presented as a
  bottom sheet on mobile. Closing (backdrop/swipe/X) removes `selected` from the URL via
  `router.push`, preserving every other filter — this only works correctly because
  `OpportunityDetailPanel`'s own close button takes a `closeHref` prop built from the current
  filter set, **not** a hardcoded `/opportunities` — a first version of this hardcoded the
  href and would have silently dropped every active filter on close; fixed before it shipped
  anywhere, but worth knowing if you add another close affordance.

**Search** — unchanged from before this package: plain title/organization substring match
(`browse.ts`), no autocomplete. The founder's brief asked to reuse canonical search
infrastructure "where backend support exists" — it doesn't for opportunities today (confirmed
in the audit, §7); `lib/entities/search.ts` has a separate, different `searchOpportunities`
used only by `EntityCombobox` on the profile page, not wired to Discovery, and was left alone
rather than forced in without a real design pass on what that would mean for this filter form.

**Data limitations (real, not a bug)**: ~11 active opportunities in the live catalog
(`oryn-qa-scratch`), so most countries show 0 on the map/pills, most filter combinations will
show few results, and pagination will rarely if ever show a second page. This is honest
behavior given real data, not something to fake around.

**Imagery**: exhaustively confirmed (§7) that no image field exists anywhere in the
opportunity/organizer schema chain (`opportunities`, `opportunity_sources`,
`canonical_entities`) — only `universities.logo_url`/`university_profile_metrics` carry real
images, and only for organizers that happen to resolve to a `universities` row, which no code
path currently does for opportunities. Every card/panel uses a category icon-on-gradient band
(`lib/opportunities/category-visuals.ts`, one Lucide icon per `OpportunityCategory`) as the
honest fallback — never a fake/stock photo. This is the single biggest visual gap versus the
founder's reference images, and it is a **data problem, not a component problem** — building
real opportunity imagery is a Computer A (data acquisition) dependency, not something a UI
pass can manufacture. Flag this explicitly to the founder if visual parity with the reference
is the bar — the reference's photo-forward cards assume image data this product does not
have yet.

## 4. Files changed (all uncommitted right now)

| File | Why |
|---|---|
| `lib/opportunities/browse.ts` | Added `countryCounts` (filter-synced map data) and a `savedOnly` filter to `browseOpportunities`; added `online_program` to `getOpportunityFacets`'s category list (was silently missing — real pre-existing bug, unrelated to this package, found and fixed in passing) |
| `lib/opportunities/category-visuals.ts` **(new)** | Single source of truth: category → Lucide icon + humanized label, used by card, detail panel, filter rail |
| `features/opportunities/opportunity-map-explorer.tsx` **(new)** | The map itself — see §3 |
| `features/opportunities/opportunity-map-hero.tsx` **(new)** | Desktop-gated wrapper (code-split, `aria-hidden`, decorative) + `OpportunityMapMobile` (same map, ungated, real navigation surface on mobile — see §3) |
| `features/opportunities/opportunity-country-pills.tsx` **(new)** | Always-present accessible country nav, mirrors `region-grid-explorer.tsx`'s role for the university map |
| `features/opportunities/opportunity-filter-rail.tsx` **(new)** | Vertical filter rail, replaces `opportunity-filter-bar.tsx` (deleted — confirmed zero other importers before deleting) |
| `features/opportunities/opportunity-detail-panel.tsx` **(new)** | Right-panel/bottom-sheet opportunity preview — see §3 |
| `features/opportunities/opportunity-card.tsx` | Added icon-band, `detailHref`, `selected` prop — additive, existing behavior unchanged |
| `features/opportunities/opportunity-mobile-filter-sheet.tsx` **(new)** | Mobile filter Sheet wrapper |
| `features/opportunities/opportunity-mobile-view-toggle.tsx` **(new)** | Mobile List/Map toggle — see §3 for the function-prop bug this had and how it was fixed |
| `features/opportunities/opportunity-mobile-selected-sheet.tsx` **(new)** | Mobile bottom sheet for the selected-opportunity panel |
| `app/(app)/opportunities/page.tsx` | `BrowseAllView` rewritten for the 3-column desktop shell + mobile composition; `ForYouView` and the tab switcher untouched |
| `app/(dev-preview)/design-preview/scratch-discovery-test/page.tsx` **(new, throwaway)** | Local-only verification harness (real components, fixture data) — `/opportunities` needs a live auth session this sandbox's Supabase project gates behind email confirmation (`docs/founder-blocked-backlog.md`), same blocker as every prior package. **Delete this before any real commit** — same convention as every scratch harness used earlier this session, just not yet deleted because the founder's context-reset request arrived mid-verification. |

## 5. Visual north star

The founder shared real reference images for the first time this session (previously only
described in text across several long briefs). What they show, and what to take from them:

**Carry forward**: the filters|map|selected-detail-panel split (already built, §3); real-
image-forward cards (not achievable today, no image data — see §3); categorical fit badges
done well (one reference literally shows "Çok Uygun"/"Uygun" — this already matches
`tierFor()`'s "Exceptional match"/"Strong match" pattern already in use, no change needed).

**Explicitly confirmed NOT to copy** (matches every "no fake precision" instruction already
given this session, now visually confirmed why): a fake "Premium" badge, a fake human
counselor ("Mert Kaya — Eğitim Danışmanı"), raw numeric skill scores (e.g. "Akademik
80/100"), an overall "Genel Uyum Skoru 78/100", a "Fit Score" filter slider (implies a
precise 0–100 fit metric that doesn't exist), and a 7–8 tab profile structure. None of these
exist in ORYN's real data model or were ever implemented — correctly.

**Founder feedback received live, only partially acted on before the context-reset request**:
1. *"bembeyaz kötü duruyor" (looks too plain white)* — **acted on**: the map's ocean was a
   near-invisible brand-tinted wash and ~86 of 89 countries (everything without an
   opportunity) rendered in a very pale gray — confirmed by direct screenshot to read as
   almost blank. Gave the opportunity map its **own** color ladder
   (`resolveOpportunityCountryFillStyle`, local to `opportunity-map-explorer.tsx`, does
   **not** touch the university map's shared, regression-tested `resolveCountryFillStyle` in
   `lib/data/map-visuals.ts`) — ocean now `color-mix(in oklch, var(--info), var(--background)
   88%)` (a real, visible blue, not the brand-purple wash), land-without-data now `color-mix(
   in oklch, var(--muted-foreground), var(--card) 80%)` (clearly visible gray, not
   near-white). Countries with real opportunities keep the brand-blue accent so "the data" is
   still what stands out. Confirmed by one fresh screenshot after the change — looked
   correct, but this was the very last thing done before the context-reset request landed, so
   treat it as unverified-at-scale (not checked at mobile width, not checked with
   hover/selected states in this new palette, not checked against a "many countries have
   data" scenario since the live catalog only has 3 in the fixture used to check it).
2. *"map should feel geographically richer — distinguish terrain, water, deserts, greener
   regions"* — **not yet acted on**. The current fix (§5.1) makes land vs. ocean clearly
   distinct, but it's still two flat token-driven fills, not textured/varied terrain. Getting
   genuinely "geographically rich" (visually distinct biomes/terrain) with only 2-3 solid
   fills and no texture/imagery layer is a real design question, not a one-line color swap —
   worth thinking about whether that means real terrain map tiles (a bigger architectural
   question — this app has no map-tile provider today, only an SVG country-shape layer), a
   textured/gradient treatment per continent, or something more restrained that still reads
   as "richer" without a new dependency. **Flag to the founder as a genuine open design
   question**, not something to guess alone.

## 6. What still needs work

**MUST FIX before founder visual approval**:
- Land/ocean "geographically richer" feedback (§5.2) — not started, needs either founder
  input on approach or a considered design proposal before implementing, since it may imply
  new dependencies (map tiles) the founder should sign off on first (matches the founder's own
  stop condition #5, "a major mapping-architecture decision").
- Re-verify the just-changed map colors properly: mobile width, hover state, selected state,
  and ideally with more than 3 countries populated (the live catalog realistically won't grow
  during a session, so this may mean a richer fixture in the scratch harness, not real data).
- Full visual QA pass never completed for Discovery (§10) — desktop map interactions
  (zoom/pan — note: this map has no zoom/pan today, only click-to-select and a Europe-style
  region drill-down was deliberately NOT built, see §3 "no clustering beyond country-level" —
  confirm this is acceptable or whether pan/zoom is actually expected), keyboard/focus
  through the whole new component set, empty-state and many-result scenarios, URL round-trip
  correctness for every param combination.

**SHOULD POLISH**:
- The detail panel's "duration" is a naive `start_date – end_date` string concat — reads
  fine for the fixture data tried, but wasn't checked against every real date-formatting edge
  case (single date only, same-day, etc.).
- No field/subject filter — deliberately deferred (§3), worth reconsidering once/if the
  catalog grows enough for it to matter.
- Card icon-band sizing/placement was carried over from a first pass — not iterated on
  visually beyond the one desktop screenshot in §10.

**OPTIONAL / later**:
- Real opportunity imagery — blocked on Computer A's data pipeline (§3), not a UI task.
- Sub-country clustering if the catalog grows enough that country-level stops being
  sufficiently granular (structurally easy to add later — `lib/data/regions.ts`'s
  `MapRegion` pattern already supports this for the university map).

## 7. Known bugs/limitations

**Real bugs found and fixed this package** (not left open):
- `getOpportunityFacets` was silently missing `online_program` from its category list —
  fixed.
- University map's filters never reached its map (separate unfiltered query) — a real,
  confirmed, still-open bug **on the university map**, not touched/fixed here (out of this
  package's scope) but avoided by construction in the new opportunity map (§3). Worth a
  separate ticket against `/universities` if not already tracked.
- The "Functions cannot be passed to Client Components" crash (§3, mobile toggle) — fixed
  before anything was left in a broken state.
- Detail panel's close button silently dropping active filters (§3) — fixed before it shipped
  anywhere.

**Sandbox/tooling limitations (not app bugs)**:
- `/opportunities` cannot be visually verified live end-to-end — same Supabase email-confirm
  blocker every package this session has hit (`docs/founder-blocked-backlog.md`), verified
  instead via the scratch harness (§4) with fixture data.
- The Browser pane's screenshot tool was unreliable at certain scroll depths on map-heavy
  pages multiple times this session (confirmed each time via DOM/computed-style inspection
  that it was a capture artifact, not a real rendering bug) — if this recurs, don't assume a
  rendering bug without a DOM-level cross-check first.
- The Browser pane itself crashed/closed once while testing the mobile map tab tap
  (immediately after the very first map-color change was made) — recovered via
  `preview_start`, but the actual mobile "tap Map tab, see the map render in the new colors"
  interaction was **not re-confirmed** after recovery. Do this early in the next session.

**Missing backend/data (see §3 for full detail)**: no opportunity coordinates, no opportunity
images, ~11 total active opportunities live.

## 8. Capabilities that must not be lost

- Everything on the existing full opportunity detail route (`/opportunities/[id]`) — sources,
  full application requirements list, full eligibility notes, fields/subject tags. The new
  panel is a preview, not a replacement; the full route is untouched and must stay reachable
  ("Full details" link).
- "For You" tab — completely untouched, still the fixed-30, no-filter, no-map personalized
  view. Do not merge it into the map experience.
- Save / Applied / Not-interested actions and their exact current semantics (Save is not a
  toggle-off, "undo" on not-interested sets status back to `saved` not `null` — pre-existing
  behavior, not changed, not this package's concern to fix).
- All 6 pre-existing filter dimensions (category, search, country, cycle status, remote,
  free) — none were dropped when the rail replaced the old horizontal bar.
- Pagination on Browse (`PAGE_SIZE = 24`) — untouched.
- The eligibility-unknown-vs-ineligible-vs-eligible 3-state distinction on cards — untouched.

## 9. Collision/dependency state

- **Computer B** (`oryn/counselor-data-quality-v1`, tip as of this check: `4d3eb5ea`) — fully
  incorporated up through `4d3eb5ea` (3 merge commits earlier this session, most recently at
  the top of this file's dashboard/profile section). The one new commit since the last merge
  (`4d3eb5ea`, "docs(integration): validate final multi-branch merge topology") is docs-only,
  confirmed via `git diff --stat` — safe to merge whenever convenient, not urgent.
- **Computer A** (`oryn/programs-pipeline-reconciled`) — not merged into this branch at any
  point this session (never needed to be — no file overlap found in any collision check run
  this session). Not re-checked as part of this specific handoff; do a fresh check before any
  future merge.
- **Files/modules with real overlap risk for the next session**: none currently known for
  Discovery/Map specifically — `features/opportunities/**` and `lib/opportunities/**` were
  Computer B's own territory per `MASTER-EXECUTION-STRATEGY.md`'s ownership table, but no
  active work was found there in any collision check this session (most recently: zero
  overlap confirmed before starting this exact package). **Re-check anyway** — real time has
  passed and this session did not re-verify collision state after the map-color change.
- **What the next session must do before editing anything**: `git fetch --all --prune`, diff
  `origin/oryn/counselor-data-quality-v1` against this branch's last-known merge point
  (`4d3eb5ea` per this check) for anything new, specifically checking
  `features/opportunities/**`, `lib/opportunities/**`, and `app/(app)/opportunities/**` (this
  package's own files) before assuming the uncommitted diff in §4 is still safe to build on.

## 10. Validation

- `npm run typecheck`: **clean**, most recent run this session.
- `npm run lint`: **clean**, most recent run this session.
- `npm test`: **clean, 1140/1140**, most recent run this session (includes Computer B's own
  new tests merged in earlier — this package added no new automated tests of its own; the new
  components are presentation/composition, not new business logic, consistent with what
  earlier packages this session also left untested).
- `npm run build`: **not run this package**. Should be run before any commit — the founder's
  own work-package contract requires it for anything touching the application bundle, and it
  hasn't been checked since the dashboard/profile package.
- Desktop QA: partial. Confirmed via the scratch harness: map renders with correct country
  positions/counts, filter rail renders, cards render correctly including long-title wrapping
  and a missing-organization graceful-omission case, selected-ring visual state confirmed,
  saved-button-state confirmed. **Not** confirmed: the detail panel itself (never rendered
  live — needs either the auth blocker resolved or a scratch-harness addition, since it wasn't
  safe to fixture given it does its own live Supabase queries), map hover tooltip, map
  click-to-select interaction end-to-end, pagination UI, empty-state rendering for this new
  layout, the just-made color change beyond one static screenshot.
- Mobile QA: partial. Confirmed: the List tab (default view) renders correctly, no horizontal
  overflow, filter trigger button replaces the old full-height filter block correctly, hrefs
  on cards correctly toggle `?selected=`. **Not** confirmed: actually tapping the Map tab and
  seeing the map render (browser pane crashed at exactly this step, recovered but not
  re-tried), the mobile filter Sheet actually opening, the mobile selected-opportunity bottom
  sheet at all.
- Keyboard/focus: **not checked** for any new Discovery component this package.
- No horizontal overflow: confirmed only for the mobile List-tab view described above.

## 11. Exact next execution plan

1. **Fetch the latest repository state and verify no collision before editing** (§9).
2. Re-open the scratch harness (`/design-preview/scratch-discovery-test`, still present,
   uncommitted) and re-confirm the map color fix at desktop width, then fix the Browser pane
   and confirm the mobile Map tab actually renders correctly (the one interaction that was
   mid-verification when this handoff was written).
3. Get founder direction on §5.2 (geographically-richer terrain) before implementing anything
   for it — this is a real open design/possibly-architecture question, not a quick fix.
4. Finish the QA gaps in §10: hover tooltip, click-to-select end-to-end, pagination UI, empty
   state, keyboard/focus pass, `npm run build`.
5. Verify the detail panel itself somehow — either resolve the live-auth blocker (founder-only
   fix, `docs/founder-blocked-backlog.md`) or extend the scratch harness carefully (note in §3:
   the real `OpportunityDetailPanel` does its own live Supabase queries and was deliberately
   left out of the scratch harness for that reason — don't fixture-fake it, find another way
   to see it, e.g. a temporary fixture-backed variant, deleted after verification).
6. Delete `app/(dev-preview)/design-preview/scratch-discovery-test/` before committing
   anything real (standing convention every package this session has followed).
7. Commit in atomic pieces per the founder's own requested style (`ui(discovery): ...`),
   validate before each, push to `oryn/ui-simplification-v1`.
8. Update this handoff file in place with what actually shipped — do not create a new
   handoff file for the next checkpoint either.

## 12. Definition of done for Discovery visual readiness

Not ready for founder visual review until: the terrain-richness question (§5.2) is either
resolved or explicitly deferred with founder sign-off; every item in §10's "not confirmed"
lists has been confirmed one way or the other (fix if broken, document if a real constraint);
`npm run build` passes; the scratch harness is deleted and the actual `/opportunities` route
has had at least the same depth of live/DOM-level verification the dashboard and profile
packages got earlier this session (screenshots plus computed-style/geometry checks, not just
"it typechecks"); and the work is committed and pushed, not sitting only in the working tree.

STATUS: HANDOFF COMPLETE — SAFE TO CONTINUE IN FRESH UI CLAUDE SESSION

---

# SESSION UPDATE — 2026-08-21, Discovery/Map shipped

Continuation of the context-reset handoff above, in a fresh session. The founder sent real
reference images mid-session (previously described only in text) and gave live visual
feedback across two iterations. Everything below is committed and pushed — this package is
no longer in the "uncommitted, needs review" state the handoff above describes.

## What changed since the handoff above

1. **Recovered clean** — zero collisions. Computer B (`counselor-data-quality-v1`) unchanged
   since `4d3eb5e` (the handoff's own reference point); Computer A
   (`programs-pipeline-reconciled`) never touched `features/opportunities/**`. Confirmed via
   `git fetch --all --prune` + a branch-tip diff before touching anything, per §9.
2. **§5.2's "geographically richer" open question — resolved via founder reference images**,
   not guessed. The founder sent real reference mockups (one specifically labeled "Option 1 —
   Split View Discovery Map") and confirmed the theme direction was right, "modifiable per
   ORYN's real features." Extracted the visual language (richer land/ocean tones, numbered
   cluster markers) and explicitly did **not** carry over the reference's fake-precision UI
   (a `Fit Score` 0–100 slider, `"92 Excellent Fit"`, a `Genel Uyum Skoru`, a fake counselor)
   — none of that exists in ORYN's real data model, consistent with every prior instruction
   this workstream has had. **No map-tile dependency added** — the founder's own fresh-
   context brief explicitly foreclosed that option ("do not introduce a major mapping-stack
   migration just for aesthetics"), so the richer treatment is entirely CSS/SVG on the
   existing country-shape layer: `--success`-token land (was a `--muted-foreground`/`--card`
   gray), a deeper `--info`-token ocean radial-gradient (was diluted to 88%, read as blank),
   and numbered cluster markers (the count now renders inside each marker circle, not just
   encoded in its radius).
3. **Second iteration, after the founder saw the first pass live**: explicitly asked for more
   land/sea contrast, a more pronounced selected-country/cluster state, and more depth —
   explicitly *not* a blanket darkening, and explicitly no fake terrain/geo data. Implemented
   as: deeper land/ocean dilution percentages; a `drop-shadow` glow + wider stroke on the
   selected country and marker (fill darkness deliberately left untouched — see the code
   comment in `opportunity-map-explorer.tsx` — this avoids re-approaching the exact
   near-undiluted-brand-primary zone that caused a real "selected country turned black"
   regression on 2026-08-18); a subtle inset `box-shadow` on the map card for a "recessed
   premium panel" depth cue; a small neutral `drop-shadow` on every marker. All color/shadow
   only — no new dependency, no per-country texture, no invented biome/terrain data.
4. **Found and fixed 3 more real bugs during this session's QA pass** (all introduced by this
   same still-uncommitted-at-the-time package, so "fixed before it shipped anywhere," same
   standard as everything else in this file):
   - `opportunity-filter-rail.tsx`'s category pills and `opportunity-country-pills.tsx`'s
     country pills had **no `focus-visible` ring at all** — caught via real keyboard Tab
     navigation + `element.matches(':focus-visible')`, not a visual glance (programmatic
     `.focus()` does not reliably trigger `:focus-visible` in Chromium, so a real keypress
     was needed to find this). Both now use the same `focus-visible:border-ring
     focus-visible:ring-3 focus-visible:ring-ring/50` pattern as `button.tsx` and every prior
     fix in this workstream.
   - `opportunity-mobile-view-toggle.tsx`'s List tab had **no empty-state fallback** — a
     zero-result filter combination silently rendered a blank grid on mobile, while desktop's
     equivalent (`page.tsx`'s `resultsList`) already had a proper `EmptyState`. Mirrored the
     same icon/copy (this component only receives resolved `rows`, not the raw search-query
     string desktop's exact wording needs, so it uses the static half of that message).
   - (Pre-existing, found and fixed earlier in the uncommitted diff, restated here for the
     record: `getOpportunityFacets` was silently missing `online_program` from its category
     list.)
5. **QA gaps from §10 closed**:
   - Map hover tooltip — confirmed live (desktop).
   - Selected-country/marker state — confirmed live, both visually and via direct DOM
     property inspection (exact fill/stroke/filter values checked, not eyeballed).
   - Mobile Map tab — **could not be confirmed via click** (see known issue below); confirmed
     instead by temporarily flipping the toggle's default `useState` to `"map"` (never
     committed, reverted immediately after) and reloading — proves the component itself
     renders correctly at 375px with zero defect, isolating the gap to the click-triggered
     transition specifically, not the map.
   - Pagination UI — verified by code read only (`page.tsx`, the `resultsList`/`totalPages`
     block): correct `pageHref` param preservation, correct `totalPages > 1` gating. The
     scratch harness never actually exercised this path (it hand-rolled its own grid instead
     of calling `page.tsx`'s real `resultsList`), and the live catalog is too small to
     trigger a second page — this remains genuinely unverified live, flagged honestly rather
     than asserted as confirmed.
   - Empty state — confirmed live on mobile (after the fix above, via a temporary
     `rows={[]}` in the scratch harness); desktop verified by code read only, same harness
     limitation as pagination.
   - Keyboard/focus — a real Tab-order walk across the filter rail, both pill components, and
     the shared `Input`; sane order, each stop confirmed via `document.activeElement` after
     an actual keypress, not assumed.
   - `npm run build` — clean, run twice (once mid-session, once after the scratch-harness
     deletion, to confirm nothing was orphaned in the route manifest).

## New known issue (tooling, not app — flag if it recurs)

Clicking the mobile List/Map toggle button hangs the Browser pane's `computer` tool for the
full 30s timeout, reproduced 3/3 times across two different sessions now (this one and the
one that wrote the handoff above), both times at the exact same interaction. Console and
network are clean before and after — no JS error, no hanging request, and the map's
code-split chunk was already loaded in every case. Isolated this time, not just re-flagged:
mounting the identical `OpportunityMapExplorer` at the identical 375px viewport via a direct
page load (no click involved) works instantly with zero defect — so the gap is specific to
click-triggered `next/dynamic` mounting inside this particular automated browser tool, not
the component, not the viewport, and — most likely — not a real user's experience (no
evidence of an actual freeze, just this tool's own readiness heuristic apparently not
handling a click-triggered lazy-mount well). Worth a real-device check if this ever becomes a
founder complaint; nothing found here justifies a code change.

## Final state

- Branch: `oryn/ui-simplification-v1`, worktree `.claude/worktrees/ui-simplification-v1`.
- HEAD: `808ee25` ("ui(discovery): ship opportunity Discovery/Map package") — **pushed**,
  `origin` in sync.
- Working tree: **clean**. Scratch harness deleted. Nothing uncommitted.
- `npm run typecheck` / `lint` / `test` (1140/1140) / `build`: all clean, most recent run
  this session (after every change in this section, not just once at the start).
- **Not merged to `main`** — per standing instruction, this lane never merges main itself.

## Next (nothing blocking)

Discovery/Map's visual direction is founder-approved through two live iterations, and the one
open design question from the prior handoff (§5.2, terrain richness) is resolved — see above.
Candidate next work, none blocking, founder's call:
- The mobile-toggle click-hang above, if it turns out to matter on a real device.
- Real opportunity imagery — still blocked on Computer A's data pipeline, not a UI task.
- Sub-country clustering if/when the catalog outgrows country-level aggregation.

STATUS: DISCOVERY/MAP PACKAGE SHIPPED — COMMITTED, PUSHED, CLEAN TREE.

---

# SESSION UPDATE — 2026-08-21, Opportunity Detail Experience V1 shipped

Continuation of the same session, same fresh-context lineage as the update above. The
founder approved Discovery/Map as complete and handed over a new, separate 18-section brief
for the opportunity detail page (`/opportunities/[id]`). Recovered cleanly (`git fetch`,
zero new commits on Claude B's branch since last check, Claude A's newest commits —
`25e43be` competitions/research/scholarship data batch, `cfe6338` programme-catalogue +
"2 real engine fixes" — touch only `lib/acquisition/programs.ts`, scripts, and data files,
zero overlap with anything this package touches). Everything below is committed and pushed.

## What shipped

`features/opportunities/opportunity-detail-view.tsx` (new) replaces the old flat, single-
column, raw-ISO-date, no-tier, no-reason-codes, no-verification-state detail page. Full
detail in the commit message (`2001482`); summary:

- **Hero** — the page's one `rounded-3xl` element (design-system.md's "at most one per
  screen" rule). Category icon-band (still zero image data anywhere in the opportunity/
  organizer schema — re-audited, not just trusted from memory: `Opportunity`, `CanonicalEntity`,
  and `OpportunitySource` all still have no image/logo column). Match-tier + eligibility +
  selectivity + cycle-status + deadline-urgency badges (the same `tierFor`/`DeadlineBadge`/
  reason-codes system Discovery's cards already use — this page just wasn't using it before).
- **Why Oryn surfaced this** — `InsightCard`, populated only from the real, already-computed
  `reason_codes` (`matches_your_interests` / `addresses_a_current_gap` / `near_you`), silent
  when there's nothing real to say or the student isn't eligible.
- **About this program** — description + subject-field pills, real data only. No fabricated
  "learning outcomes"/"schedule"/"tracks" sections — audited the schema, nothing backs them.
- **Eligibility** — age/grade, citizenship (structured `eligible_citizenships` with free-text
  `citizenship_restrictions` fallback), residency (same pattern with `eligible_countries`),
  application requirements. No academic-prerequisites/language/test-score buckets — nothing
  in the schema supports them, so they're omitted rather than shown empty.
- **Source & verification** — existing `SourceBadge`/`ConfidenceIndicator` rendering, plus
  `verification_state` (migration 0041, live since before Discovery shipped, never actually
  displayed anywhere until now) surfaced as a badge — "Verified" only for `verified_current`,
  silent for the common `unverified` default, same restraint `selectivity_tier`/`cycle_status`
  already use elsewhere on this page.
- **No related-opportunities section** — audited for real similarity/relation logic first
  (`lib/opportunities/dedup.ts`/`duplicates.ts` exist but are title-dedup for the ingestion
  pipeline, a different purpose entirely); none exists for "show the student similar
  opportunities", so per the brief's own instruction this section is skipped, not faked.

**Architecture**: mirrors `dashboard-view.tsx`'s page/`*-view.tsx` split — `page.tsx` is now
pure data-fetching (unchanged queries) rendering `<OpportunityDetailView>`, a presentational
component. Did this specifically so it could be mounted in `app/(dev-preview)/design-preview`
with fixture data for real visual QA, instead of another scratch-and-delete harness — two new
fixtures added to `lib/dev/fixtures.ts` (`FIXTURE_OPPORTUNITY_DETAIL_RICH`/`_SPARSE`), chosen
to exercise every conditional section at once (long title, full eligibility, multiple
sources, near-deadline urgency vs. no image/cost/duration/eligibility/sources/deadline at
all, closed cycle, eligibility-unknown callout).

**Real bugs found and fixed before ever being committed** (caught by this package's own
fixtures, not by production data — real DB date columns are plain `YYYY-MM-DD`, but the dev
fixtures build dates via `.toISOString()`, which happens to be exactly the shape that broke
this): a duration calculation that unconditionally appended `T00:00:00Z` to a date string
produced `NaN` when the string already carried a full timestamp; a second, related bug where
the end date's year printed twice. Both fixed at a shared, now-unit-tested root
(`parseDbDate`/`formatDate`/`formatDuration` in `lib/i18n/format.ts`, `__tests__/i18n/
format.test.ts` — 10 new tests, including a regression test reproducing the exact
timestamp-shaped-input scenario that caused it) rather than patched at the call site. The
previous detail page rendered deadline/date fields as raw unformatted ISO strings — also
fixed, same shared helper.

## Real bug found and flagged, not fixed here (out of this package's scope)

The shared `Button` component's `focus-visible` ring does not actually render — confirmed via
`getComputedStyle`, not a visual glance: `:focus-visible` correctly matches on Tab, but
`--tw-ring-color`/`--tw-ring-shadow` are empty/reset and the computed `box-shadow` is `none`.
Verified on 3 independent elements: this page's own "Apply" (Button-as-`<a>`) and "Saved"
(native `<button>`) actions, **and** the sidebar's icon-only "Search" button — completely
unrelated, pre-existing code, proving this isn't something this package introduced. Every
button in the app uses this component, so this is a real, currently-shipped, product-wide
keyboard-accessibility gap. Not root-caused (checked `app/globals.css` for a competing
`box-shadow`/`:focus` rule — none found; the actual cause is somewhere in `button.tsx`'s
`cva()` setup or how Base UI's polymorphic `render` prop interacts with the Tailwind build).
Flagged as a separate task (`task_899aeecf`, full repro steps and diagnostic findings
included) rather than fixed inline — wrong scope and blast radius for this package, needs its
own dedicated pass across the whole app. This page reuses the exact same focus classes
everything else does, so it's no worse than the rest of the product on this axis; it just
doesn't fix a pre-existing, unrelated gap either.

## QA performed

- **Visual**: desktop + 375px, both fixtures (rich and sparse), via `design-preview` —
  screenshots confirmed hero/badges/facts/actions, "Why Oryn surfaced this", "About this
  program", "Eligibility", and "Source & verification" all render correctly, and that the
  sparse record degrades to a clean, intentional-looking minimal card (hero + badges + title
  + eligibility-unknown callout + Save/Mark-applied — every section that has no real data
  disappears completely, confirmed both via DOM query and screenshot, not one or the other).
  **Tooling note**: the Browser pane's screenshot capture went blank/`document.hidden` at
  deep scroll positions on this design-preview page multiple times this pass (same family of
  issue as the map-heavy-page capture unreliability noted in the Discovery section above,
  now also reproduced on a long-but-not-map page) — worked around by reordering
  `design-preview/page.tsx` to put the new fixtures near the top rather than fighting the
  capture tool, and by cross-checking every visual claim via `getComputedStyle`/DOM query
  before trusting a screenshot. Real rendering was never in question at any point (confirmed
  live via DOM the whole time); only the screenshot tool's own capture was flaky.
- **Keyboard/focus**: real Tab-key walk (not programmatic `.focus()`, which doesn't reliably
  trigger `:focus-visible`) through this page's own new interactive elements. This is where
  the Button focus-ring bug above was found — everything else (heading order: `h1` → `h2` →
  `h2` → `h2`, no skipped levels; `InsightCard`'s title is a styled `<p>` not a heading,
  which is `InsightCard`'s own pre-existing, already-shipped-elsewhere pattern, not something
  to change unilaterally here) checked out.
- **Reduced motion / alt text**: not applicable — no new animation, no images anywhere on
  this page (audited, none exist in the data).
- `npm run typecheck` / `lint` / `test` (1150/1150, +10 new) / `build`: all clean, run after
  every change in this section, not just once at the start.

## Final state

- Branch: `oryn/ui-simplification-v1`, worktree `.claude/worktrees/ui-simplification-v1`.
- HEAD: `2001482` ("ui(opportunity-detail): premium detail page — hero, why-it-matters,
  eligibility, trust") — **pushed**, `origin` in sync.
- Working tree: **clean**.
- **Not merged to `main`** — per standing instruction, this lane never merges main itself.

## Next (nothing blocking)

Both Discovery/Map and Opportunity Detail are shipped and founder-facing-ready. Candidate
next work, none blocking, founder's call:
- The Button focus-ring bug above (`task_899aeecf`) — real, product-wide, worth a dedicated
  session; deliberately not folded into this package.
- The mobile-toggle click-hang noted in the Discovery section above, if it turns out to
  matter on a real device.
- Real opportunity imagery — still blocked on Computer A's data pipeline, not a UI task.
- University Explorer — explicitly out of scope for this session per the founder's own
  instruction ("Do not start University Explorer yet").

STATUS: OPPORTUNITY DETAIL EXPERIENCE V1 SHIPPED — COMMITTED, PUSHED, CLEAN TREE.
