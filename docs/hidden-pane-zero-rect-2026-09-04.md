# A hidden Browser pane produces a zero `getBoundingClientRect()`, not a false negative in the code

Found 2026-09-04 while verifying the usage-indicator first-paint fix (see the commit on this
branch, `fix/usage-indicator-first-paint-2026-09-04`). Recorded here because it will silently
invalidate any future live-render check run through a hidden pane, not just that one.

## The two measurements that disagree

On the same `<a href="/advisor">` element, at the same moment:

```js
getComputedStyle(link).width   // "128px"  — correct
getComputedStyle(link).height  // "44px"   — correct
link.getBoundingClientRect()   // { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }
```

CSS was never wrong. Only the measured *rect* was degenerate — every property zero, not
merely small or rounded.

## The cause

```js
document.hidden          // true
document.visibilityState // "hidden"
```

`tabs_context` explained it directly, in a status line that's easy to skip past: **"the
Browser pane is currently hidden."** Not the tab's own active/inactive state within the
pane — the pane itself isn't displayed in the user's UI at that moment. That flips
`document.hidden` to `true` on the page running inside it.

Code that reads a live rect to decide what to draw sees the zero and (correctly) declines to
draw. In this case: `drawUsageFlame`'s own `if (W <= 0 || H <= 0) return;` guard, working
exactly as intended — a canvas genuinely cannot draw anything meaningful into a zero-sized
rect. The bug this was found while investigating was real and has since been fixed on this
same branch; this zero-rect behavior is a separate thing, encountered *while checking* that
fix, not part of it.

`resize_window` with explicit dimensions — the established fix for a related, shallower
symptom (a hidden pane reading `clientWidth`/`clientHeight` as zero) — does **not** clear
this one. The trigger here is `document.hidden` specifically, one level under plain layout
sizing.

## Why this isn't just "the pane is being realistic about a backgrounded tab"

A real desktop browser tab that loses focus or gets backgrounded throttles or suspends
`requestAnimationFrame` and timers — but it does not zero out `getBoundingClientRect()`.
Layout geometry stays valid for a page that isn't changing; there's no correctness reason to
discard it just because nobody is currently looking at the tab. This pane's handling of a
hidden state is more aggressive than that — it appears to skip layout/paint rather than serve
the last computed geometry.

That makes a zero-rect reading, on its own, ambiguous between two very different explanations:

1. The code has a real bug and would produce this on a real user's device too.
2. The pane was hidden at the moment of the read, and a real browser would never have
   produced this reading in the first place.

Reading `tabs_context`'s hidden/displayed line is what disambiguates the two. Skipping that
check and treating a zero-rect reading as proof of a product bug risks either chasing a
phantom, or — the sharper risk — declining to draw code that's actually correct, on the
theory that it "doesn't work," when the real problem was never reachable by a real visitor.

## The rule this implies

**A visual check run through a hidden Browser pane can report a false negative.** Before
trusting a zero/blank/degenerate visual result:

- Check whether the pane is displayed or hidden (`tabs_context`'s own status line says which).
- If hidden, either bring it to front before re-checking, or — often faster and more
  conclusive — verify with a unit test that mocks the specific browser API in question
  (`requestAnimationFrame`, `IntersectionObserver`, etc.) to the condition actually being
  tested for, the way `usage-indicator.test.tsx` already did for this fix: mocking
  `requestAnimationFrame` to schedule nothing proved the bug and the fix in a plain jsdom
  test, with no dependency on the pane's own visibility at all.

A live render is still worth doing when the pane is genuinely visible — it catches things a
unit test's mocked environment can't (real paint, real color, real layout interaction). The
rule is narrower than "don't trust the pane": it's "check whether the pane can currently see
anything before treating what it reports as evidence."
