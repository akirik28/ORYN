# Reduced-motion standard

Written ahead of the founder's animation-expansion directive ("olabildiğince fazla
animasyon" — as much animation as possible — plus Ultra's primary color becoming flame
rather than blue), while three animated surfaces exist rather than thirty. Read-only audit
— nothing in this doc changed any component. Every claim below was checked against the
actual source at the commit this was written against (`002dd6af`), not assumed from a
comment or a memory of how it "should" work.

## Why this is a floor, not a taste call

`prefers-reduced-motion` exists for vestibular disorders, migraine triggers, and motion
sensitivity — real conditions, not a preference for a calmer UI. A full-viewport animated
flame, moving ember particles, or a spinning ambient glow is exactly the category that can
make a product unusable for someone, not merely less polished. Every animation added from
here forward needs an answer to "what does this do under reduced motion," decided at build
time, not discovered later in an audit.

## What already honors it today — verified in code

Three animation mechanisms exist in this codebase right now. All three already handle
reduced motion correctly. This is the good news the audit found, and it's why the standard
below is mostly "keep doing this," not "start doing this."

### 1. `motion/react` components — covered automatically, app-wide

`app/layout.tsx:82`:

```tsx
<MotionConfig reducedMotion="user">
```

wraps the entire authenticated and public app, with its own comment: *"Global
prefers-reduced-motion gate — every `motion.*` element in the app honors the OS setting
automatically; no per-component opt-in needed."* Confirmed this is load-bearing, not
decorative: `features/applications/status-control.tsx`'s acceptance-burst animation (ten
`motion.span` dots radiating outward) carries no reduced-motion code of its own and relies
entirely on this — its own comment says so, and the mechanism is real.

**Standard: if you're animating with `motion.div`/`motion.span`/etc. from `motion/react`,
you do not need to do anything else.** This is the default, lowest-effort path — prefer it
over raw CSS or canvas for anything that fits its model (enter/exit, layout, gesture-driven
motion, staggered sequences like the acceptance burst).

### 2. Tailwind utility animations — the `motion-safe:` variant

`features/universities/world-map-explorer.tsx` (three call sites, e.g. line 452):

```tsx
<circle r={9} fill="var(--tier-glow)" className="motion-safe:animate-ping" />
```

`motion-safe:` is Tailwind's built-in variant — it wraps the utility in
`@media (prefers-reduced-motion: no-preference)`, so `animate-ping` (or any other
`animate-*` utility) simply never applies for a student who has requested reduced motion.
Own comment: *"not a new animation mechanism here, it's the identical utility the
selected-country marker above already uses."* Tested directly —
`__tests__/universities/map-ultra-pins.test.ts:78` asserts the literal className string
contains `motion-safe:animate-ping`.

**Standard: any plain Tailwind `animate-*` utility (ping, pulse, bounce, spin, or a custom
one registered the same way) gets the `motion-safe:` prefix. This is the whole fix — one
word.** Do not gate these with a JS check; the variant is free and correct.

### 3. Custom `@keyframes` animations — an explicit reduced-motion override block

`app/globals.css`. Every custom `@keyframes` animation currently in the file
(`aurora-border` → `.glass-card`/`.glass-card-fast`/`.glass-card-offset`/
`.glass-card-offset2`, `usage-sheen`, `pin-drop`, `blob-drift`, `tier-flow`, `tier-spin` →
`.ultra-ambient-glow`) is disabled in one shared block near the bottom of its section:

```css
@media (prefers-reduced-motion: reduce) {
  .glass-card, .glass-card-fast, .glass-card-offset, .glass-card-offset2 {
    animation: none;
    box-shadow: 0 12px 120px 12px rgba(61, 53, 232, 0.42), 0 0 0 2px rgba(107, 100, 240, 0.8);
  }
  .usage-sheen { animation: none; opacity: 0; }
  .pin-drop { animation: none; }
  .blob-drift { animation: none; }
}
```

Note the pattern in the aurora-border case: reduced motion doesn't remove the glow, it
freezes it at one frame (`box-shadow` set to the animation's own `0%` value) — the
component still reads as premium, it just stops moving. `.ultra-ambient-glow` does the
same thing with a static `opacity: 0.12` instead of its animated `opacity: 0.16`. **This is
the right default posture for anything decorative: static-but-present, not gone.** A
component that would look broken or empty with `animation: none` and nothing else needs a
deliberate static fallback declared alongside it, the way both of these do.

**Standard: any new `@keyframes` animation gets a same-selector rule inside
`@media (prefers-reduced-motion: reduce)` that sets `animation: none` plus whatever static
value keeps the element looking finished. Add it in the same PR that adds the keyframes —
this file's existing block is the place to extend, not a new one.**

### 4. Canvas / `requestAnimationFrame` loops — the one thing the above three cannot reach

This is the case the founder's directive is about to test hardest, and the one Tailwind
variants and `MotionConfig` structurally cannot help with — neither can see inside an
imperative RAF loop.

`features/app-shell/ultra-ambient.tsx:94,141-146` — the ember particle canvas:

```ts
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
// ...
if (reduceMotion) {
  // A static, premium-looking frame — not a degraded/empty one. No RAF loop at all.
  drawFrame(() => 0.8);
} else {
  rafRef.current = requestAnimationFrame(tick);
}
```

This already does exactly the right thing, and it is not incidental: the component's own
test file header (`__tests__/app-shell/ultra-ambient.test.tsx:7-10`) records it as one of
two **hard constraints the founder named for this component specifically** — *"prefers-
reduced-motion must hold... not a degraded mode, a static one"* — and pins it with an
assertion that checks the mechanism, not just the outcome:

```ts
test("ultra + reduced motion: draws once (clearRect called) but never starts the RAF loop", () => {
  matchMediaMatches = true;
  // ...
  render(<UltraAmbient tier="ultra" />);
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});
```

**Standard for any new canvas/RAF-driven effect (the sidebar flame canvas this directive is
about to add, most directly):**

1. Check `window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false` once,
   before deciding whether to call `requestAnimationFrame` at all — not inside the loop, and
   not as an afterthought once the loop already exists.
2. When reduced motion is active: **draw one static frame and stop.** Do not skip rendering
   entirely (an empty canvas reads as broken, not as an accessibility accommodation) and do
   not throttle the loop to a slower rate (it's still the same continuous motion, just
   slower — that does not address vestibular triggers).
3. Mock `matchMedia` the way `ultra-ambient.test.tsx:31-39` already does
   (`vi.stubGlobal("matchMedia", ...)` returning a controllable `matches`), and assert
   `requestAnimationFrame` was never called under reduced motion — not just that *something*
   rendered. A test that only checks the canvas isn't empty would pass even if the loop
   still started.

Copy `ultra-ambient.tsx`'s implementation directly rather than reinventing it — it is the
reference implementation for this category, already founder-approved, already tested.

## Open finding — named, not fixed here

`ultra-ambient.tsx`'s `matchMedia` check runs once, at mount (`useEffect` reads `.matches`
directly). It does not react if the OS setting changes while the component is already
mounted — and since `UltraAmbient` mounts once for the whole authenticated session
(`app/(app)/layout.tsx`), a student who toggles reduced-motion mid-session wouldn't see the
canvas respond until a reload or a tier change remounts it.

This codebase already has the correct pattern for a *live-reactive* media query, just
applied to a different query: `features/universities/university-explorer-hero.tsx:21-36`
uses `useSyncExternalStore` with an `addEventListener("change", callback)` subscription
(there, for a `(min-width: 768px)` breakpoint) specifically to avoid "the effect+setState
cascading-render pattern." The same shape — a small `usePrefersReducedMotion()` hook built
on that exact idiom — would close this gap for any canvas effect, present or future, in one
shared place instead of each one hand-rolling its own `matchMedia` call.

Not fixing this now: it's a real gap but a narrow one (an active user changing a system
accessibility setting mid-session, not on load), this pass is read-only by design, and
`ultra-ambient.tsx` belongs to another lane. Flagging it here so the sidebar flame canvas —
built after this doc, not before it — can start from the live-reactive version instead of
copying the mount-only check and needing the same fix twice.

## Judging the borderline case

Not everything that moves needs a reduced-motion gate. `features/advisor/monthly-usage-
meter.tsx` uses `requestAnimationFrame` too, but only to defer a single `setState` by one
frame so a CSS `width` transition animates in on mount rather than snapping — the motion
itself is a brief, one-shot, small-scale bar fill communicating a real value, not a
decorative loop. That's a reasonable line: **gate anything decorative, continuous/looping,
or large enough in scale to fill meaningful screen real estate (the ember canvas, the
ambient glow, an aurora border, a drifting background blob). A brief, single, functional
UI-state transition — a bar filling once, a fade-in on mount — is lower priority and
doesn't need one by default.** If a new effect is ambiguous, ask whether it repeats or
loops (gate it) versus happens once and settles (probably fine as-is).

## Quick reference for new work

| Building with... | Do this |
|---|---|
| `motion/react` (`motion.div`, etc.) | Nothing — `MotionConfig` in `app/layout.tsx` already covers it. |
| A Tailwind `animate-*` utility | Add the `motion-safe:` prefix. |
| A custom `@keyframes` rule | Add a same-selector override in `app/globals.css`'s existing `@media (prefers-reduced-motion: reduce)` block: `animation: none` plus a static fallback value. |
| A canvas / `requestAnimationFrame` loop | Check `matchMedia` before starting the loop; draw one static frame instead of nothing; copy `ultra-ambient.tsx`'s pattern and its test file's assertion style. |
