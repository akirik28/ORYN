# The plan page's two sameByDesign rows — still plain, verified at two levels

CEO's ask: three changes have landed on `/settings/plan` (the file's own header calls itself
"the plan page" — one page, not two, resolving what could've been read as two separate
surfaces) since anyone confirmed `weeklyPlanFocus`/`researchIdeaFocus` — the two comparison
rows where the product deliberately declines to sell itself — still render as a stated
boundary rather than an accidental Ultra advantage. **Coordinated with ab first**, per
instruction: their dim-green-ground change is real WIP, not pushed, and they've already found
a genuine contrast bug in it unrelated to this question. Traced against `main` at `c334cd76`
("the card rebuild, the tier mark, and the two rows that stayed plain") — the stable target ab
themselves pointed to, not their moving one.

## Held — confirmed at the component level

`features/settings/plan-tier-view.tsx:208-247` renders `differsRows` and `sameByDesignRows`
from two structurally separate blocks, not one loop with a conditional class:

- **`differsRows`** (line 212): `data-tier="ultra"` (a local, always-on preview scope — every
  viewer sees "what Ultra looks like" here regardless of their real tier, per the component's
  own comment) plus `className="plan-ultra-card ..."` — the flame-top-bar/glow treatment.
- **`sameByDesignRows`** (line 242): `className="rounded-xl border border-dashed
  border-foreground/20 p-4"` — no `data-tier`, no `.plan-ultra-card`, a genuinely different
  class list, with a comment immediately above stating the intent in the same terms CEO's
  brief used: *"Deliberately not .plan-ultra-card: no flame bar, no glow, a plain dashed
  border... the visual language has to say 'not a difference' as clearly as the differs cards
  above say 'this is.'"*

## Held — confirmed at the CSS level too, not just the class name

The component-level check alone isn't sufficient on this page specifically: `<html>` carries
the *real* `data-tier="ultra"` for an actually-Ultra viewer (`app/globals.css:7`), a second,
ambient scope distinct from the differs cards' local preview one — so a rule that isn't scoped
to a specific class name could still reach the sameByDesign card purely by nesting, without it
ever using `.plan-ultra-card`. Checked this directly rather than assuming the class-name
difference was the whole story: every `[data-tier="ultra"]`-scoped rule in `globals.css` is
either the bare `:root`-level block (line 630, redeclaring only `--tier-*`-prefixed custom
properties — accent, glow, gradient stops, page background, sidebar) or scoped to one of seven
named classes (`.tier-sidebar-surface`, `.tier-upgrade-cta`, `.tier-grad-text`,
`.tier-grad-fill`, `.tier-glow-sm`, `.tier-flow-bar`, `.plan-ultra-card`). The sameByDesign
card's actual classes — `border-foreground/20`, `text-muted-foreground` — read `--foreground`/
`--muted-foreground`/`--border`, none of which the ambient block touches. **A real Ultra
viewer's `<html data-tier="ultra">` has no path to this card's appearance at all**, not
because the card avoids a class name, but because nothing it reads is redefined by that scope.

## What ab's own finding says about the boundary of this check

ab found a genuine contrast bug in their own WIP — the dim-green background makes this exact
card's text/border nearly illegible, since it inherits light-theme-calibrated colors. That's a
different failure than the one this trace was scoped to (legibility, not honesty-framing), and
it confirms the risk class is real on this surface — just not the same risk, and not yet
merged. **This trace covers the honesty property only, on the currently-merged state.** It
does not clear ab's still-in-progress background change, and per their own request, the same
check (does the card still read as a stated boundary, not a smaller advantage) is worth
re-running once that lands — a contrast fix could, in principle, reintroduce a framing issue
even while fixing legibility, if whatever replaces the current styling reaches for a
`.plan-ultra-card`-adjacent treatment to solve contrast.

## What this pass did not do

Did not trace ab's WIP branch (`oryn/plan-page-green-ground-2026-09-04`) — not pushed, not a
stable target, per their own assessment. Did not re-check the weekly-plan feature
(`app/(app)/plan/*`) — confirmed by grep it shares no reference to `TIER_COMPARISON_ROWS` or
either sameByDesign row id, so "the plan page" in scope here is `/settings/plan` alone, matching
that file's own self-description. Did not visually render the page (no browser, per the
standing hazard) — this is a static trace of the actual shipped classes and the actual CSS
rules that key off them, not a screenshot.
