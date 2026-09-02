# Ultra mobile audit — 2026-09-02

CEO's ask: nobody had looked at the Ultra visual tier on a phone. The founder's product spec
makes mobile responsiveness mandatory, not optional, and explicitly warns against shrinking
desktop cards into unusable mobile ones. The flame work in flight — full-height sidebar
canvas, amber page ground, hero card gradients, animated cards and bell — was all built and
reviewed at desktop width. This is a report, not a fix: nothing here has been changed.

Branch: `docs/ultra-mobile-audit-2026-09-02`, off `d0127b88` (main, post flame-merge: garnet
sidebar, amber ground, canvas mounted).

Method: `resize_window` to the 375×812 mobile preset, reload so load-time device gates
re-run, then A/B'd Standard vs Ultra at identical scroll positions via the `/design-preview`
harness (`PreviewToolbar`'s `?tier=` toggle) on `localhost:3000`. Confirmed with computed
styles (`getComputedStyle`), not eyeballing alone, for the two numeric claims below. Source
reads for every structural claim — a screenshot shows what renders, not why.

## What Ultra surfaces actually do at phone width

Everything gated on the CSS custom-property mechanism (`var(--tier-glow)`,
`ultra:size-3.5`, etc.) works correctly at 375px, because that mechanism isn't
viewport-aware — it reads `[data-tier="ultra"]` on `<html>`, which doesn't change with
width, so there's no separate "mobile case" for it to get wrong:

- **Amber page ground** (`ultra-ambient.tsx`, `position: fixed; inset: 0` at the layout
  level): renders full-bleed at mobile width, no clipping. A/B screenshot at identical
  scroll: Standard is the lavender/blue wash, Ultra is peach/amber.
- **Notification bell dot**: computed at 375px, `width/height: 14px` (`ultra:size-3.5`),
  `box-shadow: rgba(255,122,26,.45) 0 0 32px 8px` — bit-for-bit the same values the
  desktop version would compute, since `ultra:` is a Tailwind variant, not a breakpoint.
- **Opportunity card "exceptional match" halo** (`ultra:drop-shadow-[0_0_40px_var(--tier-glow)]`
  on `matchScore >= 80`): screenshotted on `/design-preview/opportunities` at 375px. The
  glow bleeds outside the card into the ~32px side margins the content container leaves;
  it doesn't hit the viewport edge or get clipped, even on a full-width card instead of a
  desktop grid cell.

The one surface that does not work at phone width is the sidebar flame — see below, it's a
structural absence, not a rendering bug.

## Where desktop has no mobile equivalent

**`SidebarFlame` cannot run on a phone. Not "looks wrong" — there is no DOM node for it to
attach to.** `Sidebar` is `hidden ... lg:flex` (`features/app-shell/sidebar.tsx:61`): below
1024px it doesn't just hide, it doesn't mount. `SidebarFlame`'s canvas sizes itself off
`canvas.parentElement.getBoundingClientRect()` (`features/app-shell/sidebar-flame.tsx:37,53`)
— with no parent in the tree, the `useEffect` that would start its RAF loop never even runs.
`MobileNav` (`features/app-shell/mobile-nav.tsx`) is untouched by any `tier`/`ultra:` code
path at all — confirmed by grep, not just by reading — so on Ultra tier, a phone gets
identical chrome to Standard tier for both the header and the bottom nav.

This exact class of problem — "component X is desktop-only by design, what does mobile get
instead" — already has a working, pre-existing answer elsewhere in the app, and it's the
shape worth pointing at rather than re-deriving one from scratch: `UniversityExplorerHero`
(the interactive map) is wrapped the same way desktop-only, and
`app/(app)/universities/page.tsx:92-93` already routes phones to a genuinely different
`List` view rather than a shrunk map —

> "Below `md` the map never mounts at all... so the toggle is desktop-only chrome and List
> is what a phone always gets, without needing a separate param."

That precedent predates the Ultra work entirely; it's not a tier decision, it's this
codebase's existing answer to "a desktop surface doesn't fit on a phone; build the
phone-native alternative, don't shrink the desktop one."

Applying that shape here: the sidebar flame currently signals two things — tier identity
("you're on Ultra") and the motion the founder explicitly asked for
("olabildiğince fazla animasyon"). On phone, identity is already covered ambiently (amber
ground, bell glow). Motion has no current carrier at all below `lg`. The cheapest genuine
phone-native equivalent, not a shrink of the existing one: `MobileNav`'s top header
(`mobile-nav.tsx:71-81`, currently a flat `bg-background/90` bar) is the one persistent,
always-visible surface a phone has with no 1:1 desktop counterpart — a thin animated line
under it, similar in spirit to the `.tier-flow-bar` keyframe already defined in
`globals.css` for a different element, would carry "in motion" without needing a 214px
canvas to live inside. Sizing and building that is a call for whoever owns the shell, not
decided here.

## Readability at small sizes

Checked for this specifically — fire-colored text reading worse on a phone than on a
laptop, worse again outdoors — and did not find a live case that fails. **The reason that
matters more than the clean result: every gradient-text instance reachable today is a short
numeral or a two-to-three-word badge label, never a heading or a sentence.** Nothing was
tested and passed; the risky case simply hasn't been built yet. `UniversityExplorerHero`
accepts a `tier` prop with its own `[data-tier]`-reachable treatment, but per the finding
above it never mounts on phone in the real app, so its specific readability profile
couldn't be exercised at 375px either way.

**This is the caveat to carry forward, not the "nothing's broken" headline**: the first
person who applies `.tier-grad-text` (or an equivalent gradient/transparent-color
treatment) to a heading or paragraph-length string needs to check it at 375px *before*
shipping, not after — there is no existing instance to generalize from that it will be
fine.

## What this audit did not check

- Animation performance/jank on a genuinely narrow viewport (frame timing, not just visual
  correctness) — no tooling was used to measure this; only structural and visual checks.
- Every one of the 11 other `/design-preview` routes at mobile width — checked dashboard and
  opportunities specifically, the two CEO named as carrying the surfaces in question.
- A physical device — this is a resized viewport in a desktop browser (`resize_window`'s
  mobile preset: 375×812, Android Chrome UA, touch-point/hover emulation), not a real phone.
  Emulated hover-to-touch translation and safe-area insets (`env(safe-area-inset-bottom)`,
  present in `mobile-nav.tsx:85`) were not independently verified against real hardware.

## Bottom line

One real gap (sidebar flame, structural, not cosmetic), one existing precedent in this same
codebase for how to close that class of gap correctly (`UniversityExplorerHero`/`List`),
and one caveat worth preserving even though nothing is currently broken: the readability
risk is untested, not passed, because the risky case doesn't exist yet.
