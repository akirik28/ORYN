# Design System

Written during Chat 2 (World-Class UI/UX/Brand/Interaction Design). This is the living
reference for Proxola's visual language — read this before adding or restyling any surface.
See `/docs/chat-2-handoff.md` for the full pass summary and what Chat 3 should attack.

## Brand tokens (`app/globals.css`)

The existing shadcn semantic tokens (`--primary`, `--card`, `--border`, `--muted`, ...)
were kept — they're already wired through every `components/ui/*` primitive, and ripping
them out would have been high-risk, low-value churn. Layered on top:

```
--brand-primary          the logo hue (272°), = --primary today (see below)
--brand-primary-hover    color-mix(--brand-primary, --foreground 12%)
--brand-primary-strong   color-mix(--brand-primary, --foreground 25%)
--brand-primary-soft     color-mix(--brand-primary, --background 85%)  — icon-circle fills
--brand-primary-subtle   color-mix(--brand-primary, --background 94%) — section wash
--brand-primary-border   color-mix(--brand-primary, --border 60%)     — tinted borders

--success / --warning / --info / --error   status tones (--error aliases --destructive)
--ease-emphasized, --duration-fast/base/slow   motion tokens (see Motion below)
```

The `--brand-primary-*` ramp is defined **once**, in `:root`, via `color-mix()` against
`--foreground`/`--background`/`--border` — it is *not* repeated in `.dark`. Because CSS
custom properties resolve against the cascade at the point they're used, not where
they're declared, each of those referenced tokens still picks up `.dark`'s override when
rendered under it, so the single definition is correct in both themes. Don't add a second
copy under `.dark` — see the comment above the block in `globals.css` if this needs
re-deriving.

`--brand-primary` currently equals `--primary` (both point at the same gamut-checked
OKLCH value). They're kept as separate named tokens deliberately — semantically distinct
even though numerically identical today — so a future rebrand or hue adjustment only
needs to change one definition. New/touched components use `brand-primary-*`; pre-existing
`text-primary`/`bg-primary` call sites were **not** repo-wide find-replaced (real, but
zero visual difference today — not worth the churn/risk under this pass's time budget).
Prefer `brand-primary-*` in anything you write or substantially rewrite.

**Status tone → meaning is fixed.** `success` = confirmed positive (met, accepted,
strong outlook). `warning` = needs attention, not failure (needs_manual_review, reach
outlook, deadline ≤7 days). `error` = confirmed negative (not_met, rejected, extreme
reach). `info` = a distinct-but-not-bad state (likely_met, submitted). `brand` = neutral
but "this is Proxola's own" (competitive outlook, exceptional opportunity match, active
application). `neutral` = no signal yet (unknown, not started). `components/proxola/status-badge.tsx`
is the *only* place this mapping should be decided — a new status badge should reuse it,
not invent its own color logic. See `features/universities/requirement-evaluation-badge.tsx`
and `app/(app)/applications/page.tsx`'s `APPLICATION_STATUS_TONE` for worked examples.

## Typography

**Updated by UI-V3-0b (2026-08-24). Geist and Instrument Serif are both gone — see
"Where the palette comes from" below for why. The role split is unchanged.**

Two families, with a hard split by *role* rather than by heading level:

- **`--font-sans` (Manrope)** — all product UI: nav, buttons, form labels, table/list
  content, badges, **and card/dialog/sheet titles**.
- **`--font-display` (Fraunces)** — only where Proxola is making a statement *to* the
  student: page `<h1>`s (via `PageHeader`), the dashboard greeting, the score number, an
  `InsightCard` headline, an `EvidenceSignal` value, the acceptance moment,
  auth/onboarding titles.

The question to ask is unchanged — *is this Proxola talking to the student, or is this a UI
label?* — but the answer moved. Previously `CardTitle`, `DialogTitle` and `SheetTitle`
inherited the serif, which meant a busy page rendered ten serif sub-headings and the face
stopped signifying anything. Those are sans now.

Fraunces is variable, so unlike the Instrument Serif it replaced it *does* have real
weights. Display sites are nonetheless set at 400 with tight negative tracking
(`tracking-[-0.02em]`, `leading-[1.1]`) — that combination is what reads editorial. A bold
serif headline reads as a document title, which is the opposite of the intent. Prefer
scale over weight.

`--font-heading` still resolves (aliased to the same face) so that a call site predating
UI-V3 degrades to the display face rather than an unstyled serif fallback. It has no
remaining users — prefer `font-display` in anything new.

## Where the palette comes from

UI-V3-0b adopted the visual language of the founder-supplied Magic Patterns reference
("ORYN V3 Editorial Intelligence"), which is the authority for *visual* decisions —
typography, whitespace, surface restraint — while this repo stays the authority for
architecture, data and behavior. Three things were taken, and three were deliberately not.

**Taken:** the warm-paper/cool-ink pairing, the module tone system, and the component
language (`Eyebrow`, `EvidenceSignal`, the borderless `InsightCard`, the railed `ActionCard`).

**Not taken:**

- **The wordmark.** The reference renders "ORYN" as letterspaced type because its own logo
  asset ships empty (0 bytes). The canonical logo is non-negotiable — `public/brand/logo-full.png`
  stays, and `--brand` remains an exact OKLCH match of the logo's own pixels
  (`oklch(0.477 0.29 272)` vs. the logo's `oklch(0.477 0.294 272.2)`), *not* the
  reference's slightly softer indigo.
- **Percentage profile strength.** The reference's `ProfileStrengthMeter` shows "62%".
  Founder direction is explicit: qualitative evidence states only — Strong / Developing /
  Limited evidence / Needs attention. Do not reintroduce a single blended percentage.
- **Its text colors, as authored.** Measured against this theme's own grounds, the
  reference's `text-muted` gave 4.28:1 on paper and 4.03:1 on the tint — under AA for
  body copy, and that token is the product's workhorse for supporting text. Same for
  three status tones (4.40-4.54 on tint). Every one was re-solved per-hue for >=4.6:1 on
  `--surface-tint`, the tighter of the two grounds. **Measure against the real ground
  before importing a color from any reference** — paper is darker than white and every
  ratio shifts.

## Color: the ink ramp

`--foreground` / `--muted-foreground` alone forced a binary choice between "full black" and
"secondary grey". Four steps now, all at hue 272 so text never drifts neutral-grey against
the blue-black brand:

Measured on paper / on tint (both grounds, since text sits on each):

```
--ink-1   = --foreground   16.7 / 15.7   headings, primary text
--ink-2   0.378 0.026 297   9.7 /  9.1   body prose that isn't a heading
--ink-3   = --muted-fg      4.9 /  4.6   secondary/supporting text (AA)
--ink-4   0.62  0.026 300   3.5 /  3.3   DECORATIVE ONLY (3:1 non-text floor)
```

Each step is a real lightness stop, **not an opacity of the one above** — opacity-faded
text over a tinted surface picks up the tint and stops being the color you specified.

`--ink-4` is for eyebrows' rules, hairlines, icon strokes and disabled affordances, and
must never be the only thing carrying meaning.

## Surface levels

Three levels, replacing "everything is a bordered white card":

1. **Canvas** — `--background`, no token needed. The default. Most content belongs here.
2. **Tint** — `bg-surface-tint`. Groups a section *without* drawing a box around it. This
   is what most former cards should become.
3. **Panel** — `bg-surface-panel` (= `--card`). Only for a genuinely contained interactive
   module, where containment carries meaning.

Before reaching for a border + radius + shadow, check whether whitespace and a type change
already do the job. See the shape/radius rules below, which still apply to level 3.

### Module tones

Four grounds, one per kind of Proxola utterance, so a reader can tell an interpretation from a
fact from a directive without reading a label: `module-insight` (cool — an interpretation
stands back from the page), `module-evidence` and `module-action` (warm — a fact and a
directive sit in it), and `module-recommendation` (the only one carrying brand indigo,
which is exactly why indigo stays rare everywhere else). Backgrounds only, never text.

**Only `module-recommendation` is in use today** (`NextMove`'s `surface`, on Home's hero and
the opportunity detail's "Proxola's take"). `module-insight`, `module-evidence`,
`module-action` and the warm `accent-sand`/`accent-clay` accents are defined and unused —
they exist so the four utterance types have somewhere consistent to land as later surfaces
adopt the language, in the same spirit as the fully-defined-but-unused `.dark` block.
Don't read their presence as evidence the system is already applied.

Founder direction on the accents: they may carry a *selectively* important recommendation
but must not become the dominant surface. If two recommendation surfaces are visible on one
screen, one of them is wrong — which is why `surface` lives on exactly one component.

## Motion (`lib/motion.ts`, `app/layout.tsx`)

- `MotionConfig reducedMotion="user"` wraps the entire app in the root layout — every
  `motion.*` element anywhere in the product automatically honors
  `prefers-reduced-motion` with zero per-component opt-in. Don't reach for a manual
  `useReducedMotion()` check unless you're doing something MotionConfig can't cover
  (e.g. a non-Motion CSS animation).
- `transition("fast" | "base" | "slow")` from `lib/motion.ts` mirrors the CSS
  `--duration-*` tokens (150/250/400ms) with the same `--ease-emphasized` curve
  (`cubic-bezier(0.2,0,0,1)`, decelerate). Use it instead of hand-rolling a
  `{duration, ease}` object so timing stays consistent product-wide.
- `staggerFadeUp` — the entrance pattern for a list of cards (weekly actions today).
  Capped at 6 items' worth of stagger delay so a long list doesn't feel sluggish to
  appear.
- **Don't animate a value's *initial* mount state unless the entrance itself is the
  point.** `ScoreRing` originally animated the ring drawing in from empty on every
  render, including first paint — on a slow dev-mode hydration this reads as a stuck
  empty ring, not a loading state (the product spec explicitly bans fake-looking
  progress indicators). Fixed with `initial={false}` on the `motion.circle`: it now
  renders at the correct value immediately on mount, and *only* animates smoothly if the
  score changes on a later re-render (e.g. after a save elsewhere causes fresh data to
  flow in). Apply the same judgment elsewhere: entrance animation for lists/cards
  appearing is good polish; entrance animation for a value that's simply "what the page
  loaded with" usually isn't.
- The acceptance-moment celebration (`features/applications/status-control.tsx`) is the
  one deliberately more elaborate animation in the product — a restrained, non-confetti-
  library "burst" of a handful of dots plus a scale-in icon. Spec-mandated ("no childish
  fireworks... a meaningful, memorable moment") — don't add a second one of these
  elsewhere without the same restraint applied.

## Shape / radius

No change to the underlying `--radius` scale (`0.75rem` base) — but it's now used with
intent rather than uniformly:

- `rounded-lg`/`rounded-xl` — ordinary data containers: list rows, plain cards, form
  dialogs. The default.
- `rounded-2xl` — a card that represents a discrete "thing" with its own identity: an
  `InsightCard`, a hero stat panel, the acceptance-moment card, a dialog-like surface.
- `rounded-3xl` — the single dominant hero element on a page: the dashboard score card,
  the profile page's score section. There should be at most one `rounded-3xl` element per
  screen — it's a "this is the point of this page" signal, not a size utility.

## Core primitives (`components/proxola/*`)

Built this pass; every page redesign in the product now composes from these instead of
one-off `<div className="rounded-xl border p-4">` copies:

- **`PageHeader`** — page-level title (serif) + description + optional action slot.
- **`SectionHeader`** — in-page section divider (sans, dense).
- **`InsightCard`** — the "Proxola is telling you something" statement. UI-V3-0b removed its
  border, fill and icon chip: an interpretation should distinguish itself through scale,
  voice and hierarchy, and boxing it made it look like one more data card in a stack of
  data cards. Variants now tint only the eyebrow rule. `avoid` stays deliberately calm —
  a deprioritization is a strategic call, not a warning (master spec Phase 39). Its
  `surface` prop is the one sanctioned use of the warm recommendation ground.
- **`ActionCard`** — a recommended action. The bordered box became a left priority rail
  plus an optional zero-padded index: the rail groups a stack into a sequence and gives
  the leading move weight without drawing four identical boxes down the page. Keeps the
  4-dot impact meter (magnitude isn't a status, so it isn't a colored badge), the time
  estimate, a `leading` slot and a trailing `meta` slot.
- **`StatusBadge`** — see the tone table above. Every colored pill in the product should
  render through this.
- **`ConfidenceIndicator`** — a lit/unlit 3-bar meter, not a colored word — Phase 68's
  "Proxola should know when it doesn't know enough" made visible without reading as an
  error state.
- **`DeadlineBadge`** — single source of truth for "how urgent is this deadline"
  (≤3 days `error`, ≤7 `warning`, ≤14 `brand`, else `neutral`) — was previously
  duplicated with slightly different thresholds across the dashboard, opportunity cards,
  and applications.
- **`SourceBadge`** — Phase 36. Source name, "checked N ago", optional
  `ConfidenceIndicator`, optional "View source" link.
- **`Eyebrow`** — the atom of the editorial voice: a 32px hairline rule plus an 11px
  uppercase label at `tracking-[0.18em]`. That tracking *is* the signature; `tracking-widest`
  is 0.1em and reads as a different product. Tone colors the rule only — never the headline
  beneath it, or an interpretation becomes an alert.
- **`EvidenceSignal`** — one supporting fact, citation-style (`<figure>`/`<figcaption>`,
  `tabular-nums`). Displays a fact; `InsightCard` interprets one. Its `missing` tone matters:
  absent evidence ("0 verified research projects") is real signal here and should read as
  noted, not failed.
- **`NextMove`** — Proxola's signature argument: eyebrow, claim, reasoning, the evidence it
  used, labelled facts, an action, and an optional footnote for a qualification that must
  travel *with* the claim rather than sit loose beneath it. It is the only component that
  carries the warm recommendation ground (`surface`), which is what makes the brief's
  "at most one per screen" something you can actually check. Home and the opportunity
  detail's "Proxola's take" are the same anatomy through this one component, not two copies.
- **`MediaImage`** — the product's one image surface. Photo → logo → designed monogram,
  each tier falling through on a failed load. The monogram tier is the point: "no broken
  placeholders" must not be solved with generic stock imagery, which would imply we have a
  picture of a thing we don't. Callers set aspect ratio via `className`.
- **`EmptyState`** / **`ErrorState`** — every meaningful empty/degraded state in the
  product should use these rather than a bespoke `<p className="text-muted-foreground">`.
  `EmptyState` forces an icon + title + description shape, which makes the lazy "No
  records found" harder to reach for than the helpful version.

## Dev-only design preview harness

This sandbox has neither Docker nor a live Supabase project, so every authenticated route
(everything under `app/(app)/`, `app/(onboarding)/`) 404s to `NotConfiguredNotice` and
can't be rendered or screenshotted normally during development. `app/(dev-preview)/design-preview/`
mounts the same production presentational components directly with fixture data
(`lib/dev/fixtures.ts`) instead — no server, no auth, no second copy of any markup to
drift out of sync.

- Hard-gated: `if (process.env.NODE_ENV === "production") notFound();` at the top of
  every page in the group. Verified via `npm run build` — the route statically
  prerenders to a 404 in a production build (Next can prerender it because the check has
  no runtime dependency), so it cannot exist in a deployed build regardless of env vars.
- `features/dashboard/dashboard-view.tsx` is the pattern to repeat: the real
  `app/(app)/dashboard/page.tsx` does data-fetching only and renders `<DashboardView
  {...realData} />`; `design-preview/page.tsx` renders the same component with
  `lib/dev/fixtures.ts` data. If you add a new data-heavy page, consider the same
  page-fetches / `*-view.tsx`-renders split — it's what made this harness possible
  without duplicating JSX, and it's just better separation of concerns regardless.
- `lib/dev/fixtures.ts`'s numbers intentionally match the master spec's own worked
  "Key User Experience" example (Ada, 77, Research 42→ +8, Bocconi/LSE/Erasmus outlooks,
  the Economics Challenge) — building the fixtures around the spec's own target mockup
  doubles as a running check that the implementation matches what was actually asked for.
- Keep this. It's genuinely useful beyond this pass — the next person who needs to touch
  visual design here (Chat 3, or beyond) has the exact same "no live backend" problem
  in this sandbox, and a from-scratch equivalent would cost real time to rebuild.

## Known data dependencies (surfaced by UI-V3, not owned by it)

**Opportunity imagery.** UI-V3 § 19/30 asks for meaningful programme/institution imagery on
opportunity cards and a designed fallback where it's missing. The fallback exists
(`MediaImage`); the imagery does not. `opportunities` has no image column and no acquisition
pipeline, where universities have both (`university_profile_metrics.primary_image_url`,
`universities.logo_url`, `scripts/acquire-university-images.ts`).

What was tried and rejected: rendering `MediaImage`'s monogram tier unconditionally. With
zero rows carrying imagery, every card became an identical ~250px empty tinted band —
strictly worse than no image — and monograms cut from arbitrary organizer strings were
meaningless ("Middle East Technical University" → "MI"). The card now renders its media band
only when a real source exists, and `OpportunityCard` already accepts `imageUrl`, so the
surface lights up the moment the data arrives. **Nothing in the UI should invent one in the
meantime** — stock photography is banned by the brief and by Rule 4.

The likely honest source when someone picks this up: `opportunities.organization_entity_id`
already links to `canonical_entities`, and many organizers are universities that have a
verified re-hosted campus photo. That's a data-lane job (acquisition + linkage coverage),
not a UI one.

## Responsive principles

- Mobile isn't a shrunk desktop: the university explorer's world map is desktop-only
  (`useIsDesktop`, `useSyncExternalStore`-based, SSR-safe) and never mounts below `md`;
  `RegionGridExplorer`'s real `<Link>` pill grid is *both* the mobile experience and the
  keyboard/screen-reader-accessible alternative to the (aria-hidden, mouse-only) map —
  this was Chat 1's architecture already and it's correct; don't collapse it into "just
  hide the map on mobile and show nothing."
- **University explorer (UI-V3-5).** Desktop pairs a sticky map (~58%) with a scrolling
  results column (~42%); `?view=list` switches to the conventional card grid and every
  other filter survives the switch. The two panels synchronise through the URL in both
  directions — the map writes `?country=`, and each result row's country links back to the
  same param. Below `md` the map still never mounts (see below), so the Map/List toggle is
  desktop-only chrome and a phone always gets the list without needing the param.
  `UniversityResultRow` exists because `UniversityCard` is the wrong shape at 42% width —
  its image band and three metadata rows fit about four results into the panel, which
  defeats the point of pairing a list with a map.
- **The shell's breakpoint is `lg` (1024), not `md`.** The desktop header carries a logo,
  seven nav items, a search field, notifications and an avatar; below about 1100px that
  does not fit. Measured at 1024 with the old `md` boundary, the utilities cluster ran 44px
  past the header's right edge and the document scrolled horizontally. Tablets get the
  mobile shell, which is the better experience there anyway. The search affordance is
  *also* responsive — one trigger that collapses to its icon between `lg` and `xl`, because
  `lg` alone still left the labelled 208px field competing with seven nav items. It must
  stay one element: `CommandPalette` registers a global ⌘K listener on mount, so two
  breakpoint-swapped instances would open the dialog twice.
- **The desktop sidebar is gone (UI-V3-0).** Navigation is a single top bar
  (`features/app-shell/top-nav.tsx`) inside a 1360px header; page content sits in a
  1200px column. `SidebarNav` and `CareerProfileBadge` were deleted — the score moved
  into the account menu, and Documents/Settings moved there with it.
- Mobile is a compact sticky header plus a fixed six-slot bottom bar
  (`features/app-shell/mobile-nav.tsx`), not the desktop chrome at a smaller width. Two
  things that bit during implementation and will bite again: clearance for the fixed bar
  is **bottom padding on the content container**, never a spacer div inside `MobileNav`
  (a spacer there renders beside the `<nav>`, i.e. at the *top* of the flow, adding a gap
  under the header and clearing nothing); and a 62px bottom-bar column ellipsises anything
  longer than ~9 characters, which is what `NavItem.shortLabel` exists for — the full
  `label` stays as the link's accessible name via an `sr-only` span.
- Verified at 375px (mobile) and native desktop width via the preview harness: landing
  page, university region-pill fallback, acceptance moment, dashboard hero. Not
  individually re-verified at 375px: every remaining authenticated page — they reuse the
  same primitives (`PageHeader`, `EmptyState`, list rows) already confirmed responsive
  elsewhere, but see `/docs/chat-2-handoff.md` for the honest scope of what was and
  wasn't pixel-checked this pass.

## What Chat 2 deliberately did not touch

Scoring semantics, admissions/outlook policy, evidence verification vocabulary, RLS,
requirements evaluation logic, AI recommendation semantics, provider architecture — all
untouched, per this pass's own operating brief. Restyled the badges/cards that *display*
these, never the logic that computes them.
