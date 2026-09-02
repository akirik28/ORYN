# Ultra on opportunities and notifications — the inventory, before any CSS

Not building yet — waiting on oryn-4e's foundation (`data-tier="ultra"`, shared tokens, the one
page-level ambient layer). This is the list to agree first, per the explicit ask: *"I'd rather
agree the list than review forty gradients."*

## What the prototype actually shows, precisely, not from impression

Read the full artifact (`f486b2d8`, 284 lines), not just the rendered preview. Worth stating
exactly what techniques it uses, because "everything looks different" is not a technique — these
four are, and they have very different costs:

| Technique | What it costs | Safe at list scale? |
|---|---|---|
| **Page-level ambient** (`.aura` — `filter:blur(42px)`, conic gradient, `inset:-32px`, rotating) | One instance, GPU-composited, but a *large* blur | **No** — this is exactly what the founder's own warning is about (*"etraftan çıkan ışık birbirini kapamasın"*). Oryn-4e's one-per-page layer is the only place this belongs. |
| **Canvas particle field** (`#embers` — up to 46 animated particles) | A `requestAnimationFrame` loop per instance | **No** — one per detail page is fine; one per card in a 20-card grid is 20 animation loops and a wall of drifting light competing with itself. |
| **Gradient fill (text/border/background), no blur** | Free — a paint, not a filter | **Yes** — this is what most of this inventory uses. |
| **Small, local glow** (`box-shadow` with a tight radius, e.g. `0 0 14px`) | Cheap, GPU-composited, doesn't bleed past its own element | **Yes, in moderation** — this is the technique for anything too small for a gradient to read (the badge dot). |

**The animated versions** (flowing gradient position, spring-in, pulse) cost a `prefers-reduced-
motion` check each — the prototype itself already gates on it (`@media(prefers-reduced-motion:
reduce)`), and anything built here inherits that same discipline as a hard requirement, not an
enhancement.

## A tension the prototype names about itself, not resolved here

The artifact's own closing callout (in Turkish, summarized): the flame/red palette reads as
*speed and power* — game language — where ORYN's own tone is *calm, analytical, humble*; exciting
for a 16-year-old, but risks not reading as a serious educational product to the parent who's
likely the one paying. It proposes a lower-saturation alternative (sparser embers, dimmer
rotation, amber-weighted instead of red) as a middle path, but that version isn't built in the
artifact I read — only described.

**Not resolving this here.** It's a founder-level call about the exact palette, not something an
element inventory should silently pick a side on. Flagged for oryn-4e/the founder before any
color value is finalized — this inventory is about *which elements*, not *exactly how saturated*.

## Update, before this was reported: oryn-4e's comparator research bears on this directly

Two adjacent branches landed while this doc was being written, worth reading before treating the
tension above as still fully open. `docs/ultra-visual-direction-research-2026-09-02.md`
(oryn-4e, merged) checked the prototype's own cited precedent — Snapchat+ — against Snapchat's
actual support docs, and found it doesn't support a full-surface reskin at any saturation: the
entire Snapchat+ visual signifier is one small black star, off by default. Khanmigo, Perplexity
Education, and Duolingo were checked too; none marks a paid tier with an animated transformation
of the interface. **The finding reframes the variable: not saturation (the prototype's own
proposed fix), but scope** — contained (a badge, an icon) versus environmental (the whole surface
changes, persistently). `docs/ultra-map-investigation-2026-09-02.md` (a parallel university-map
investigation, also merged) already applied this: pins-first (small, contained, attached to one
tapped element) while holding land-fill/ambient (large, persistent, whole-surface) pending the
founder's scope call.

**This doesn't change this doc's core recommendation.** The two elements proposed below (the
match-tier label + ring, the bell's unread dot) were already contained-signal by construction —
small, attached to one specific meaningful element, gated by an existing threshold so most cards
don't even qualify, no ambient/particle technique anywhere in either. **It does walk back one
specific line below**, marked inline where it appears: the suggestion that the opportunity detail
page, being a single instance, could reasonably opt into the shared ambient layer. The new
research says instance-count isn't what makes an environmental treatment precedented — scope is,
and a rotating ambient layer is environmental regardless of how many instances of it exist on
screen at once.

## The two constraints, as concrete rules

1. **Standard renders identically, provably.** Every rule below is written to be reachable only
   under `[data-tier="ultra"]` (or whatever selector oryn-4e's foundation lands on) — zero
   overrides of an unscoped Standard style. When this is actually built, the proof is a snapshot
   diff of Standard-tier output before/after, not just "I didn't touch that file."
2. **No component brings its own large blur.** Only the shared ambient layer gets one. Everything
   in this inventory marked "local glow" uses a tight-radius `box-shadow`, not `filter: blur()`,
   and nothing here proposes a second `.aura`-style layer anywhere.

## Opportunities (`features/opportunities/opportunity-card.tsx` + the detail page)

**The one element that carries the meaning: the match-tier label** (`<Eyebrow tone="brand">
{tier.label}</Eyebrow>` — "Strong match," etc., shown only when `canClaimMatch && reason`). This
is the card's own analog of the prototype's hero score number — it's the single claim Oryn is
actually making about *this specific pairing*, everything else on the card is a fact about the
opportunity or a caveat about the match.

**Reusing a threshold that already exists, not inventing a new one.** The card already does this
today, in Standard: `canClaimMatch && matchScore >= 80` gets a slightly stronger ring border
(`ring-brand-primary-border` vs `ring-border/70`). That's an existing, deliberate signal that a
high match already gets more visual weight. Ultra's strongest treatment should land on exactly
that same condition — not a new threshold, not "every card" — so Ultra reads as *amplifying a
signal the product already makes*, not inventing a separate decoration system. Concretely: at
`matchScore >= 80` under Ultra, the tier label gets gradient text (no blur — flat gradient fill,
the cheap technique), and the card's ring gets a gradient-toned border instead of a flat brand
color, both using the shared Ultra tokens oryn-4e's foundation will define. Below that threshold,
the card stays exactly as Standard renders it, even under Ultra — most cards in a real grid will
not qualify, which is the actual mechanism that prevents "six competing gradients."

**List vs. detail, treated differently on purpose.** The above is scoped to `OpportunityCard` as
used in a grid (`opportunity-browse-grid.tsx`) — cheap techniques only, gated by the existing
threshold. The single-opportunity detail page is a different context: one instance on screen, not
twenty, so it's the one place on this surface that could reasonably opt into the shared page-level
ambient layer (oryn-4e's foundation, not built per-component here) the same way the prototype's
own single card does. Naming this distinction explicitly because it isn't obvious from "the same
component, same treatment everywhere." **Superseded — see the update above.** oryn-4e's
comparator research (merged after this paragraph was first written) found scope, not
instance-count, is what makes an environmental treatment precedented. Hold this specific
suggestion pending the founder's scope call, same as the map investigation's land-fill/ambient
items — the detail page should be treated as "contained signal only" too, same as the grid,
until that call lands.

**Deliberately staying calm, and why, not just left off the list:**
- **`OpportunityStandingBadge`** (not eligible / not open right now / needs verification) —
  these are limitations, not achievements. A flame treatment on "you don't qualify for this"
  would be actively wrong, not just unnecessary restraint.
- **`StatusBadge tone="warning"`** (eligibility unknown) — same reasoning, it's a caveat.
- **Title, organization, description, the descriptor row** (selectivity/language/cycle status) —
  plain facts about the opportunity. Oryn-a7's own framing applies directly here: these support
  the one claim, they aren't a second claim.
- **`DeadlineBadge`** — genuinely tempting (urgency maps naturally to a "heat" metaphor), and
  deliberately **not** proposed here. A list can show many cards each with their own deadline
  inside the 14-day window this badge already gates on — if all of them glow, none of them read
  as more urgent than the others, which defeats the badge's own purpose. If deadline urgency gets
  a treatment at all, it should be a separate, later decision scoped to *how many badges can be
  visually loud on one screen at once*, not bundled into this pass.
- **Action buttons** (View/Save/Applied/Not-interested) — utilitarian controls. Gamifying a Save
  button reads as a slot machine, which is the exact "excessive gamification" AGENTS.md rules out
  — for every tier, not just Standard.
- **The per-card image-placeholder tint** (`data-tint`, the recently-shipped per-opportunity
  color system) — a different, already-working mechanism solving a different problem (making an
  un-imaged grid not look like one repeated card). Left alone rather than folded into Ultra's own
  palette, to avoid two color systems fighting on the same element.

## Notifications (`features/app-shell/notification-bell.tsx`, `features/notifications/`)

**The one element: the bell's unread indicator — and it needs the glow technique specifically,
not gradient.** Named directly in the assigning message and confirmed against the real
component: today it's an 8px dot (`className="... size-2 shrink-0 rounded-full"`), not a numeric
badge — the actual count is `sr-only` text only. A linear gradient across 8px is not perceivable;
a small `box-shadow` glow around the dot is. This is the clearest case in either surface of
picking the technique to match the element's actual size, not applying the same treatment
everywhere.

**Everything else on this surface stays calm, and this is close to the whole point of the work
already shipped this session, not just restraint for its own sake:**
- **The notification list/popover rows**, individual or grouped — Phase 24 exists specifically to
  make this surface *less* visually loud (the aggregation work just merged collapses spam into
  fewer, calmer cards). Adding flame/glow decoration to the very rows that were just quieted down
  would undo the actual product work in the name of a visual pass.
- **The grouped-notification card** — same reasoning, doubly: it already carries a count doing
  real communicative work ("3 new opportunities"); it doesn't need a second visual signal on top.
- **Mark-as-read / mark-all-read controls** — utilitarian, same reasoning as the opportunity
  card's action buttons.
- **Category filter chips, timestamps, body text** — plain metadata.

**Out of this inventory's scope, named so it isn't silently dropped**: the prototype's own
"ULTRA" crest/badge (the pulsing-dot pill next to the brand wordmark) is global chrome, not
specific to opportunities or notifications — that belongs with oryn-4e's foundation work or
wherever Topbar/Sidebar treatment lands, not decided here.

## Summary table

| Surface | Gets a treatment | Technique | Gated by |
|---|---|---|---|
| Opportunity card (list) | Match-tier label + ring | Gradient text/border, no blur | `matchScore >= 80` (existing threshold, reused) |
| Opportunity detail page | Same, plus optionally the shared ambient layer | Gradient + oryn-4e's page-level layer | Single-instance page only |
| Notification bell | Unread indicator dot | Local glow (`box-shadow`, tight radius) | `unreadCount > 0` (existing condition) |
| Everything else on both surfaces | No change | — | Stays exactly as Standard renders |

Two elements, total, get a visual treatment. Everything else on both surfaces — badges, caveats,
list rows, buttons, metadata — stays calm under Ultra exactly as it renders under Standard.

## What this did not do

No CSS written, no `data-tier` selector used anywhere — waiting on oryn-4e's foundation as
instructed. Did not resolve the saturation/tone tension the prototype names about itself. Did not
decide the deadline-badge question, named as a real candidate deliberately deferred rather than
silently included or silently dropped. Did not touch the "ULTRA" crest/global-chrome question,
named as out of this surface pair's scope.
