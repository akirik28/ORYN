# Parent surfaces — mobile pass, 2026-09-04

Five routes checked live at 375px (`127.0.0.1`, never the shared `localhost` — the pane
carries a real, persisted session per tonight's earlier finding). Report only, per the
dispatch — nothing here was fixed; the one thing worth fixing is architectural, not small.

## The headline finding: the real `/parent` panel renders inside the wrong layout

**`app/parent/layout.tsx`** is the shared layout for the entire `app/parent/*` tree —
`/parent/login`, `/parent/pending`, and the `(dashboard)` route group all nest inside it
(a route group changes the URL, not the component tree). Its own JSX is a centered,
`max-w-sm`, `p-10` card — correct for a login form or a short pending message, which is
all it was built to hold:

```tsx
<div className="... flex ... items-center justify-center ..." style={{ background: "..." }}>
  <Link ...><Image .../></Link>
  <div className="relative w-full max-w-sm rounded-[24px] p-10" style={{ background: "rgba(255,255,255,0.9)", ... }}>
    {children}
  </div>
</div>
```

**`ParentPanelView`** (`features/parent/parent-panel-view.tsx`) — the actual dashboard a
parent sees once linked — is built as its own full page: `min-h-svh`, its own background
gradient, a `max-w-3xl` content column. It has no `fixed`/`absolute` positioning and no
negative margins, so it cannot escape an ancestor's width constraint. `app/parent/
(dashboard)/page.tsx` renders it as the primary, expected branch
(`return <ParentPanelView data={result.data} .../>`) — not an edge case, the normal
success path every linked parent hits.

Put together: **every real parent, on the normal success path, gets their full panel
squeezed into an ~304px-wide card** (384px `max-w-sm` minus 80px of `p-10` padding) that
was designed for a login form, not a dashboard. This isn't a mobile-specific bug — it
would look wrong at any width, including a wide desktop monitor — but it's exactly the
kind of thing this dispatch was checking for: two lanes each building something correct
in isolation (a login-shell layout; a full-page panel) that were never rendered together
before now.

**Confirmed live, not inferred from reading the two files in isolation.** Built a
throwaway preview route (`ParentLayout` wrapping `ParentPanelView` with fixture data),
screenshotted it at 375px, then deleted the file — it was verification scaffolding, not
something to ship. The screenshot showed exactly the predicted failure: a visible outer
card (the login shell) containing a visibly narrower inner box (the panel's own
background), with the panel's own heading wrapping across two lines and list items
truncating far more aggressively than they do when the panel renders on its own (compare
`/design-preview/parent-panel`, which deliberately does **not** wrap in this layout and
renders correctly — see that file's own comment, which already names the reason: "a
parent never sees [the student app-shell]," though it doesn't name this specific
consequence).

**Not proposing the fix here** — there are a few real options (move `ParentLayout`'s card
chrome to only the login/pending routes specifically rather than the whole tree; give
`ParentPanelView` a way to break out of an ancestor's width constraint; split the
dashboard route group out from under `app/parent/layout.tsx` entirely) and picking one is
a decision for whoever owns these two files, not something to guess at mid-QA-pass.

## Everything else checked, all clean at 375px

- **`/design-preview/parent-panel`** (ready state, empty state, both locales) — genuinely
  solid. The `min-w-0 truncate` pattern on every list row already handles long titles
  correctly (`"Regional Economic…"`, `"London School of Econom…"`), badges wrap without
  overflow, the `EmptyState` component's dashed box fits cleanly within the panel width.
  This is the version a parent would see if the layout-nesting bug above were fixed, or
  if it's ever tested through the design-preview route specifically instead of the real
  one — good to know the underlying component itself isn't where the problem is.
- **All three `?state=` variants** (`pending`, `revoked`, `no_link`) — each a centered
  `max-w-sm` card, correctly sized and legible at 375px in both English and Turkish. The
  Turkish `revoked` copy (visibly the longest of the three) wraps cleanly, no overflow.
- **`/parent/login`** — logo, heading, subheading, labeled inputs, full-width button,
  "Looking for the student sign in?" link all stack correctly. No layout issues.
- **`/parent-invite/[token]`, invalid-token state** — checked live with a fake token
  (safe: `verifyParentInviteToken` rejects before any database read for this branch).
  Renders correctly at 375px. The **happy-path form** (the actual accept-invite fields) I
  could not verify live — it needs a real, signed, valid token bound to a real student
  row, and forging one or creating throwaway data to reach it would be exactly the kind
  of live write against shared state that's out of bounds. Checked by source read
  instead: the form's own markup (`space-y-4`, `Input`/`Button` at `w-full`, no
  fixed-width elements) reuses the same primitives every other auth form in this app
  already uses at every width, and it sits in the identical `ParentInviteLayout` card
  shell I did verify live (same `max-w-sm p-10`, same successful render for the
  invalid-token message above it). High confidence, not a live confirmation — stated
  as such rather than blurring the two.

## Brown theme (`--role-*`), light/dark, and the Ultra combination

**No collision with Ultra, confirmed structurally, not just "didn't notice one."**
Grepped `app/globals.css` for any selector combining `[data-tier="ultra"]` and
`[data-role="parent"]` — zero hits, they're independent. Went further: neither
`ParentPanelView` nor `ParentPendingScreen` references `data-tier`, `--tier-*`, or any
`.plan-ultra-card`/`.tier-glow-sm`-style class anywhere — and the parent panel doesn't
render the student app-shell (`Sidebar`/`UsageIndicator`/marquee) at all, which are the
*only* places those Ultra-scoped rules actually apply. So a parent whose child is on
Ultra genuinely cannot see any flame treatment leak into their view — not because the
two attributes never coexist on `<html>`, but because nothing in the parent panel's own
render tree is reachable by an Ultra-scoped selector regardless.

**Dark mode: cannot be tested live because no toggle reaches it, same finding as
tonight's earlier plan-page work.** `[data-role="parent"]`'s brown values
(`app/globals.css:1295`) are plain hex with no `.dark [data-role="parent"]` counterpart —
unlike `.plan-page-ground` (this session's own earlier addition), which deliberately
added a `.dark` line following the "dormant until a toggle exists" pattern already
established elsewhere in this file. Not reporting this as a bug: the same reasoning
applies as before (light is the sole shipped default, per `app/layout.tsx`'s own
comment), and a static brown that never changes with theme is a defensible reading of
"nobody asked for one yet," not a defect. Naming it as an observation, not a finding, in
case whoever owns the `--role-*` tokens wants parity with `.plan-page-ground`'s pattern
later.

One thing noticed in passing, not a mobile-responsiveness issue and not chased further:
`/parent/login` and `/parent/pending` hardcode their own brown-ish hex values directly in
`style` props (`#2E2418`, `#8A7A64`, `#8A6D3D`, etc.) rather than using the `--role-*`
custom properties `ParentPanelView`/`ParentPendingScreen` already use. Visually
consistent today (both landed on similar browns independently), but two mechanisms for
the same theme is a latent drift risk — flagging, not fixing, since it's a different kind
of cleanup than what this pass was scoped to.
