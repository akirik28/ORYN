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
match the other 7 sites, so Standard renders byte-identical everywhere). All 8 call sites
import one of these and pass their resolved tier instead of inlining the literal.

**This package reversed direction once before landing — worth recording, since the first
version was fully built, gated, and committed (never pushed) before it changed.** The first
pass recolored the gradient itself to a darkened flame palette (matching the sidebar/ground
work oryn-4e was landing in parallel). Before pushing, oryn-a7 relayed a direct founder
correction: the reference prototype behind this whole ask
(`.../scratchpad/oryn-ultra-skin.html`, "Rozet değil — yüzeyin tamamı değişiyor") was
designed against a **dark** app ground, where an amber card glow made sense. The ground
itself is now amber. The founder's own words, causal clause intact: *"since we made the
background amber, port it so it glows blue"* — amber-on-amber would disappear, so the
technique (a card that visibly glows) carries over but the hue inverts. Confirmed directly
against the prototype's own CSS before building either version — see the code comment in
`hero-gradient.ts` for the full reasoning, including where the file's literal colors and
oryn-a7's prose description disagreed and had to be checked before assuming either was
right.

The shipped version: `background` no longer varies by tier **at all** — it's the exact
original literal in both cases. What Ultra adds is a `border` color shift plus a two-layer
`boxShadow` glow, both reading `var(--brand-primary)` — the app's own existing indigo, not
a new invented blue, and not one of the flame `--tier-*` tokens (which stay reserved for the
amber/red surfaces). The prototype's soft ambient halo (a separate blurred pseudo-element,
`.aura`, positioned outside the card) is reproduced as a wide, low-opacity box-shadow layer
on the *same* element instead of a new DOM node — deliberately, because box-shadow paints
outside an element's own overflow clip, unlike a child element would, and 4 of the 8 sites
set `overflow-hidden` on this exact div. The prototype's rotating conic aura and canvas
ember-particle system are **not** ported — real animation/DOM work with no equivalent in
any of these 8 static Server Component pages today, and out of scope for a gradient
conversion. (Canvas-driven flame texture is already being built elsewhere tonight, in the
topbar usage meter and tier slider, per oryn-a7.)

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

## The color decision: unchanged card, blue glow

All 8 sites currently assume light-on-dark content sitting on this background — a `.dark`
class scope, explicit `text-white/NN` labels, or (on the dashboard) `NextMove`'s own
ink-token cascade. Leaving `background` completely untouched between tiers means none of
that needed to move, and there is no contrast question to check at all — the text sits on
the identical dark surface it always has.

The glow reads `var(--brand-primary)`, not a `--tier-*` flame token, on purpose. Per
oryn-a7: the prototype's `--calm: #7C6BF0` is its *Standard*-state indigo — every one of the
prototype's `.ultra` rules overrides that color to flame. Under this reversed direction, the
inversion flips: the cool color is what Ultra *keeps* on this one surface, while the flame
tokens stay reserved for the surfaces that are actually going amber (ground, sidebar, and
whatever oryn-f5's canvas work touches). Using the app's own existing brand token rather
than a new hardcoded blue keeps a single source of truth the same way the flame tokens do
for everything else tonight — if `--brand-primary` ever moves, this glow moves with it.

Two shadow layers, both intentional: a wide, low-opacity halo (`0 0 60px 10px ... 75%
transparent`) standing in for the prototype's separate blurred `.aura` layer, and a tighter,
downward-offset shadow (`0 25px 65px -20px ... 25% transparent`) for grounding/depth,
matching the prototype's own two-layer technique. oryn-a7's explicit warning, carried over
from the sidebar's three rejections, is that *an effect painted on an otherwise-unchanged
surface risks reading as a sticker* — weighted the halo layer as the one doing that work,
since it's the part that makes the glow read as ambient light around the card rather than a
decoration on its edge. Not verified live (no local build/dev-server, per policy) — this is
where a live look matters most, more than the earlier color-math question ever did, because
"does this read as belonging to the card or pasted on it" isn't something contrast math can
answer.

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
policy for tonight (oryn-a7 runs the build once, centrally, at merge time). All three green.
7 tests in [__tests__/oryn/hero-gradient.test.ts](../__tests__/oryn/hero-gradient.test.ts)
pin the standard-tier output to the exact original literals (both the 3-stop and 2-stop
shapes) with no border/shadow, confirm the background stays byte-identical under ultra,
confirm the added border/glow read `--brand-primary` rather than a flame `--tier-*` token,
and confirm the compact variant shares the exact same border/glow values as the full card
rather than re-picking its own.

No live render — same disk policy as every other package tonight, and the thing most worth
seeing here (whether the glow reads as ambient light or a sticker) is exactly the thing
static analysis can't answer. Asking oryn-a7 for a live look: `data-tier="ultra"` on a page
with one of these heroes, and whether the halo actually reads as belonging to the card
against the new amber ground.

One more thing worth a mention rather than a fix: oryn-a7's own dev-preview doc
(`b46afec0`, "say which surfaces actually show a tier difference yet") predates this
package and will be stale for the hero cards once this lands — not edited here, since it's
a shared decision doc outside this package's scope, but worth someone updating it.
