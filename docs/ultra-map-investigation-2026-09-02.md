# The Ultra map — what it actually is, and what's actually available

**Status:** report only. No code, no CSS, nothing built — per the CEO's explicit instruction
to report options before building, and per the standing rule that component CSS waits for
oryn-4e's `data-tier="ultra"` foundation to land. The map investigation is separable from
that foundation (a different problem, per the assignment), but any ambient/glow layer this
report proposes should route through that shared mechanism once it exists, not invent a
second one.

## 0. The premise needs correcting before anything else — this is not a tiles problem

The assignment's framing (reasonably, from the outside) assumed a third-party raster map:
"tiles are the hard case... you cannot restyle them with CSS... a different tile style, a
CSS filter overlay, or a blend-mode layer." **None of that applies.** Read the actual
renderer (`features/universities/world-map-explorer.tsx`) and its dependencies
(`package.json`) before assuming anything from the word "map":

**The whole map is first-party SVG, not a single third-party pixel.** It's
`@vnedyalk0v/react19-simple-maps` — a React wrapper around `d3-geo` — drawing country
outlines from `world-atlas/countries-110m.json` (a public-domain TopoJSON dataset, the
coarsest of the standard world-atlas resolutions, already the lightest choice available) via
`topojson-client`. There is no tile provider, no Mapbox, no Google Maps, no Leaflet in this
codebase at all — confirmed by grepping `package.json` for every map/tile-adjacent package
name. `WorldMapExplorer` is the **only** map surface in the product (three call sites: the
real `/universities` page, its hero wrapper, and a dev-preview harness at
`/design-preview/map` — no second map anywhere else).

**And it was already built the "right" way for this.** Every fill color in
`lib/data/map-visuals.ts`'s `resolveCountryFillStyle` is
`color-mix(in oklch, var(--brand-primary), var(--background) N%)` — a live CSS custom
property, re-evaluated by the browser, not a baked-in hex value. The ocean background is a
`radial-gradient` using `color-mix(in oklch, var(--brand-primary), var(--card) 94%)`. Pins
and country markers are plain SVG `<circle>`/`<text>`, styled with the same Tailwind classes
(`fill-primary`, `stroke-[var(--card)]`) as any other component. **This map already reads our
CSS variables** — the thing the assignment's premise said it specifically couldn't do.

So the honest finding isn't "here's the best available approximation of a restyled tile" —
it's that full re-theming is genuinely available, through the same mechanism as every other
component, not a special case.

## 1. What's concretely achievable, mapped to the Ultra language from the founder's prototype

Read the approved prototype (`https://claude.ai/code/artifact/f486b2d8-...`) in full — it's a
dashboard-card mockup, no map content in it at all, which is exactly why this investigation
exists. Its Ultra signature: a slow-rotating blurred conic-gradient halo around the whole
surface, a sparse canvas particle system (warm-colored dots drifting upward, capped at 46,
respects `prefers-reduced-motion`), flame-gradient fills/text (`--f1` amber → `--f2` orange →
`--f3` red), glow via `drop-shadow`/`box-shadow`, and a moving gradient stripe. Mapped onto
what the map actually is:

**Pins — the clear, cheap win, and there's already a precedent in this exact file to extend.**
SVG circles take a gradient `fill` (via an SVG `<linearGradient>`/`<radialGradient>` def
referencing the flame tokens — a different mechanism from `color-mix`, which only ever
resolves to a flat color, worth being precise about since they're not interchangeable) and a
`filter: drop-shadow(...)` for glow, which is cheap on a handful of small shapes and doesn't
carry the cost a full `blur()` over large geometry would. **A pulsing ring is not a new
technique for this file** — `handleGeographyClick`'s selected-country marker already renders
`<circle r={radius+6} className="fill-primary/25 motion-safe:animate-ping" />`. Ultra's
"animated ring on the selected pin" is the same pattern, flame-colored, applied to the pin
layer instead of the country-dot layer. `motion-safe:` is Tailwind's own
`prefers-reduced-motion`-aware variant — the existing animation already respects it, so
extending the same class keeps that guarantee for free rather than needing new logic.

**Land fill — a real extension of already-tested logic, not a new mechanism.**
`resolveCountryFillStyle`'s four-step ladder (unselected/hover/selected/selected-hover) is a
pure function with its own regression test. The Ultra version is the same ladder shape with
different input tokens — plausibly `--f2`/`--f3` in place of `--brand-primary`, or a genuine
SVG gradient def for the selected country specifically (a flat `color-mix` result for the
88 unselected countries, a real flame gradient reserved for the one currently selected — the
same "reward is where attention already is" principle the prototype itself uses: the score
number gets the flame treatment, the surrounding chrome mostly doesn't).

**Ocean/background — likely needs nothing map-specific at all.** It's already a themed
`radial-gradient` behind the SVG. Once oryn-4e's page-level ambient layer exists, the map's
own background may not need its own treatment — worth checking against that foundation once
it lands rather than building a second ambient mechanism for this one surface.

**The rotating aura + ember canvas — container-agnostic, so they're not a map-specific
build.** The prototype's halo and particle canvas don't know or care what's inside the panel
they surround; they sit in front of/behind it as their own layer. If the foundation's
ambient layer is genuinely page-level (per the assignment's own description of what oryn-4e
is building), the map likely inherits it automatically as a bordered surface, the same as any
other panel — this is the strongest argument for waiting on that foundation rather than
building a map-specific version now.

## 2. Performance — measured live, not assumed

Checked the actual current map (unmodified, no Ultra styling) against the standing "don't
reintroduce the 320px problem" instruction, live at 375px via the `/design-preview/map`
harness on the shared dev server (`localhost:3000`, another session's, per this repo's
"attach, don't kill" rule — appropriate here since I'm verifying merged, unmodified code):

**World view: 341×179px rendered inside a 375px viewport — no overflow, clean margin either
side.** DOM census via direct SVG query, not estimated: **364 total SVG elements** — 177
`<path>`s (country land shapes, matches the 110m topology's global country count), 89
`<circle>`s (exactly `SUPPORTED_COUNTRIES.length`, confirming that constant), 8 `<text>`s
(`WORLD_LABEL_CAP`, confirming that constant does what its comment claims). This is a light
scene by ordinary web standards — 364 nodes is nothing a phone struggles to paint once, and
nothing here demands per-frame recomputation at rest.

**Zoomed-into-a-country view (pins): also clean at 375px**, screenshot-verified
(`?country=United Kingdom`), small subtle dots over the country shape, matching the source's
own comment that the visible pin is deliberately tiny (~3.5 SVG units) with a larger invisible
hit target layered underneath for touch/pointer accuracy.

**What Ultra would actually add, cost-wise:** the land-fill change is free (same
`color-mix`/gradient-def cost as today, different input token). Pin glow via `drop-shadow` is
per-element and already scoped to hover/selection only in the existing code ("halo only on
hover — a permanent glow on every pin turns a dense city into a smear") — that scoping
carries over, so the cost is bounded by how many pins are hovered/selected at once (one), not
by the total pin count (up to 60/country, per `lib/universities/map-pins.ts`'s own cap). An
ember canvas, if the map gets its own rather than inheriting the page-level one, would be
bounded by the prototype's own numbers — max 46 particles, simple per-frame math, no
per-particle DOM node (it's `<canvas>`, not 46 more SVG/DOM elements). **Nothing in this
surface's current shape suggests a phone-perf risk on the order of the dashboard grid
overflow** — that bug was a CSS layout defect (missing `min-w-0`/`grid-cols-1`), not a
rendering-cost one, and this investigation didn't find an analogous layout gap in the map at
375px or 320px-equivalent scale (the harness's actual rendered width, 341px, is narrower than
the 375px viewport itself, so it already has margin to spare at the narrowest common phone
width).

## 3. One thing worth naming, not re-litigating — and it changes which of these options to lead with

The prototype's own callout named a tension (flame/red reads gaming-adjacent, the founder is
likely the payer, a parent might read it as less serious than the base product's calm tone)
and proposed lowering saturation as the fix. **oryn-4e's research
(`docs/ultra-visual-direction-research-2026-09-02.md`, merged same day) checked that exact
proposal against Khanmigo, Perplexity Education, Duolingo, and Snapchat+ — the precedent the
prototype itself cited — and found saturation isn't the variable that matters. Scope is.**
None of the four studied products signal a paid tier with a full-surface animated
transformation, at any saturation; every one keeps it small and contained (a badge, an icon).
That's the founder's call to weigh, not something this report reopens — but it's directly
relevant to *which of §1's options to build first*, not just a footnote:

**This makes the pins-first recommendation stronger, not weaker.** A styled pin — or even a
pulsing ring on the selected one — is close in kind to "a badge, an icon": small, contained,
attached to one interactive element a student already taps. **Land fill and ambient/ember are
the opposite shape** — they change the color of a large, always-visible region and add a
persistent animation to the whole surface, which is exactly the pattern oryn-4e's research
found no precedent for at any intensity. If the broader Ultra scope decision moves toward
"contained signal" per that research, this report's land-fill and ambient proposals should be
held pending that call rather than built on the current assumption that a bigger reskin is
the target — pins are very likely to survive that call regardless of how it lands; the larger
map-wide treatments may not be.

## 4. Summary

- **The map is not a tiles problem.** Fully first-party SVG (`react19-simple-maps` +
  `topojson-client`), every fill already CSS-custom-property-driven. The 3-option tile
  framing (provider style / filter overlay / blend-mode) doesn't apply — there's nothing
  raster to filter or blend against.
- **Pins are the clear, cheap win, and now also the scope-safe one** — small, contained,
  attached to one element a student taps, the same shape as the "badge/icon" pattern
  oryn-4e's research found across every studied comparator. Build this first regardless of
  how the broader scope question resolves.
- **Land fill is a real extension of an already-tested pure function**, not new plumbing —
  same ladder shape, Ultra tokens instead of `--brand-primary`. **But hold it pending the
  scope call** — a large always-visible region changing color is closer to the
  "full-surface reskin" shape oryn-4e's research found no precedent for than to pins.
- **Ocean/ambient likely needs nothing map-specific** — check against oryn-4e's page-level
  layer once it lands, and same scope caveat as land fill applies if it does need its own.
- **No mobile-perf red flag found.** 364 SVG nodes at world scale, clean at 375px measured
  live, pin-glow already scoped to hover/selection only in the existing code.
- **Standard is untouched by anything in this report** — every mechanism described is an
  additive Ultra-tier input to functions/styles that already exist, not a change to what
  Standard renders.
