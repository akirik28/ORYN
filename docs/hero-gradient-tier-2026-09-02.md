# Hero gradient tier fix — 2026-09-02

## Assignment

oryn-a7 escalated this from a follow-up to critical path after live-testing oryn-4e's
token-flip work on the running server: flipping `--brand-primary` under
`[data-tier="ultra"]` re-derived correctly everywhere, but the page still looked blue.
What visibly moved was two stat numbers and a small eyebrow rule — the page ground, the
sidebar, and this hero gradient own roughly 90% of the visual field, and none of the three
read a CSS custom property at all. This package converts the hero gradient — the finding
from [docs/hardcoded-color-sweep-2026-09-02.md](hardcoded-color-sweep-2026-09-02.md), one
literal `style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540
100%)" }}` copy-pasted at 8 call sites across 7 files — into a shared, tier-aware source.
Ground and sidebar are oryn-4e's territory, in flight tonight; this package is scoped to
the 8 hero-gradient sites only.

## What changed

One new file, [components/oryn/hero-gradient.ts](../components/oryn/hero-gradient.ts),
exports `heroGradientStyle(tier)` and `heroGradientStyleCompact(tier)` (Applications' hero
is a 2-stop variant of the same gradient — preserved as its own shape rather than forced to
match the other 7 sites, so Standard renders byte-identical everywhere). Both return a
`CSSProperties` object: the exact original literal under `"standard"`, the flame tokens
under `"ultra"`. All 8 call sites now import one of these and pass their resolved tier
instead of inlining the literal.

This is a JS-level fix, not a CSS one, and deliberately so: a value set through the `style`
prop is invisible to any CSS selector, `[data-tier="ultra"]` included — that mismatch is
the actual bug, not the duplication by itself. Resolving the tier in JS and choosing the
style object accordingly is the same pattern `lib/data/map-visuals.ts`'s
`resolveCountryFillStyle` already uses for the map, extended here to a second surface.

Sites touched, all inside the boundary oryn-a7 gave (applications, features-catalog,
universities pages, the real dashboard page):

| File | Sites | How tier reaches it |
|---|---|---|
| `features/dashboard/dashboard-view.tsx` | 1 | new `tier?: PlanTier` prop; `app/(app)/dashboard/page.tsx` derives it from the profile it already fetches |
| `features/applications/applications-view.tsx` | 1 (compact) | new `tier?: PlanTier` prop; `app/(app)/applications/page.tsx` now also calls `requireProfile()` |
| `features/catalog/features-view.tsx` | 1 | new `tier?: PlanTier` prop; `app/(app)/features/page.tsx` now also calls `requireProfile()` |
| `app/(app)/universities/page.tsx` | 1 | already had `planTier` in scope from the map-pins package — reused, not re-fetched |
| `app/(app)/universities/[id]/page.tsx` | 1 | derived from the `profile` this page already fetches |
| `app/(app)/universities/compare/page.tsx` | 2 | new `requireProfile()` call, resolved once, used at both the empty-state early return and the main table |
| `app/(app)/profile/portfolio/page.tsx` | 1 | new `requireProfile()` call |

Every added `requireProfile()`/`getCurrentProfile()` call is a `cache()` hit, not a new
query — same dedup this session already relied on for the map and the harness fix.

## The color decision: dark card, not bright card

The founder's own words (relayed by oryn-a7) were about the page ground and the sidebar —
"I want the background to become amber, the dark blue bar on the left to become red, vivid
colors" — not this card specifically. oryn-a7 flagged the risk rather than mandating a
value: *"A dark card and a burning card are different design objects... don't leave white
text on an amber card."* All 8 sites currently assume light-on-dark content sitting on this
background — a `.dark` class scope, explicit `text-white/NN` labels, or (on the dashboard)
`NextMove`'s own ink-token cascade — and none of that is touched by this package.

Checked directly rather than assumed: the pure flame tokens' contrast against white text —
computed from each hex's real WCAG relative luminance — is 4.2:1 for `--tier-grad-3`
(red), 2.6:1 for `--tier-accent` (orange), and 1.6:1 for `--tier-grad-1` (gold). The lighter
two fail outright; even the red is marginal. A straight swap to the undiluted tokens would
have silently broken every line of text on this card.

The fix keeps the card **dark**, recolored rather than relit: each stop is
`color-mix(in oklch, <tier token>, black N%)`, with `N` increasing for the stops that start
lighter (20% for the red stop, 45% for orange, 60% for gold) so all three land in roughly
the same dark band the current navy already occupies. Reasoning, not measurement — this
session's own oklch-by-hand math produced at least one internally inconsistent result while
checking this, so no exact resulting lightness/contrast number is asserted here. **Requesting
a live measurement (data-tier, computed `background-image`, and ideally an actual contrast
read against the text on top) before trusting the exact percentages**, the same ask made for
the map's own vivid pass. The direction — a genuinely different, unmistakably red/orange/gold
hue at a similar depth to the current indigo — should already be visible; the exact darkness
of each stop is the part worth confirming live.

Reading the tokens directly (`var(--tier-accent)`, `var(--tier-grad-1)`, `var(--tier-grad-3)`)
rather than introducing new literal hex values was deliberate, per oryn-a7's instruction — if
oryn-4e ever changes the approved flame palette, this gradient moves with it instead of
drifting into a second source of truth.

### Why not the isFull-screen pages' interior chrome

Three of the 8 sites (`universities/page.tsx`, `universities/[id]/page.tsx`,
`universities/compare/page.tsx` ×2) aren't small hero banners — the gradient wraps the
*entire* page (search box, filter sheet, results, and on the Explorer, the map itself), a
pattern the source Figma calls an "isFull dark screen." Keeping the card dark rather than
switching to a bright card is what makes this package safe to leave those interiors alone:
every nested surface (the `glass-card`/`bg-white/45` table, `bg-card` panels, `.dark`-scoped
`text-foreground`/`text-muted-foreground` text) is built relative to a dark host and stays
internally consistent regardless of the host's *hue* — only lightness would have broken it,
and lightness didn't move. Confirmed by the same reasoning already applied to the map's own
`resolveCountryFillStyle`, not a new assumption.

### Known gap, named rather than silently left

`app/(dev-preview)/design-preview/dashboard/page.tsx` renders `DashboardView` with fixtures
and doesn't pass `tier` — it's on oryn-4e's active-territory list tonight
(`app/(dev-preview)/design-preview/preview-shell.tsx` and this file), so it wasn't touched.
`tier` is optional on all three `-view.tsx` components specifically so this doesn't break:
it defaults to `"standard"`, meaning **this one preview route won't show the dashboard
hero's ultra state** until a one-line `tier={tier}` is added there (the harness already
resolves a `tier` variable for `<UltraAmbient tier={tier} />` two lines above the
`<DashboardView>` call — this is a trivial follow-up, not a design question). The real
`/dashboard` route is unaffected; it always resolves and passes the real tier.

## Verification

Typecheck, lint, and the full test suite only — no `next build`, per the disk-pressure gate
policy for tonight (oryn-a7 runs the build once, centrally, at merge time). All three green:
291 files / 4665 tests. 6 new tests in
[__tests__/oryn/hero-gradient.test.ts](../__tests__/oryn/hero-gradient.test.ts) pin the
standard-tier output to the exact original literals (both the 3-stop and 2-stop shapes),
confirm the ultra output reads the real tier tokens rather than a second hardcoded palette,
and confirm the compact variant shares its two stops with the full card rather than
re-picking its own colors.

No live render — same disk policy as every other package tonight. Asking oryn-a7 for the
same kind of live confirmation the map's vivid pass got: `data-tier="ultra"` on a page with
one of these heroes, the resolved `background-image` on the card, and ideally a check that
the existing light text is still comfortably readable on it.
