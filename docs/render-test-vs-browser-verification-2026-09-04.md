# Render test or real browser? A decision, not a preference

CEO's ask, after a sibling lane proved a real bug with a render test instead of the shared
browser pane: decide when each is the right tool, write it down, so lanes stop re-deciding
this from scratch (three did, independently, the same night). Not "browser is risky, prefer
tests" — the two catch genuinely different, non-overlapping failure classes. Neither
substitutes for the other; picking wrong either wastes effort chasing a tool limitation for a
question the other technique never had, or produces false confidence in something that was
never actually rendered.

## The rule

**A render test proves what the code computes and what ends up in the DOM. It cannot prove
how that DOM looks.** jsdom (the test environment) parses HTML/CSS and builds a real DOM
tree, but it does not run a layout engine — `getBoundingClientRect()`, real flexbox/grid
resolution, viewport-relative units, and `@media`/`@container` queries are either absent or
unreliable. If the question is "does the right text/element/link appear, conditioned on the
right data," a render test answers it completely and permanently. If the question is "does it
fit, wrap, clip, or look right at some width," only a real browser can answer it — no amount
of DOM inspection substitutes for an actual layout pass.

## Two real cases, not hypotheticals

**Render test was the right (and only necessary) tool**: Oxford's self-contradicting
`SourceBadge` on the compare page — a `university_statistics` row with every headline figure
null but a real, populated `source` URL, so the badge cited a source for numbers that weren't
there. This is pure conditional logic (should this badge render, given this exact data shape)
with zero layout component. `__tests__/universities/compare-page-render.test.tsx` (`main`)
proved the bug by calling `CompareUniversitiesPage` directly against this real captured row
and asserting `rows.get("statisticsSource")?.[oxfordCol]?.textContent === "—"` — a screenshot
would have shown the identical thing, once, non-repeatably; this proves it on every future run
and would fail loudly the moment a regression reintroduced the contradiction.

**Only a real browser could have caught this one**: `features/profile/score-radar.tsx`'s own
header comment records a real, live-only bug — SVG dimension labels sit at a fixed radius
from center; a long label ("Leadership", "Exploration") extends past the SVG's `viewBox`, and
the outermost `<svg>` element's default `overflow: hidden` silently clipped them to
"Leadershi"/"ploration". The label *text* was present and correct in the DOM the whole
time — `element.textContent` would have read "Leadership" with zero indication anything was
wrong. Only opening the actual rendered page showed the clipped glyphs. No render-test
assertion on this component's output could have found it; the bug was never in what the code
computed, only in where the pixels landed.

## When a render test suffices — use it, don't reach for the browser

- Conditional rendering: does element X appear/not appear for this exact data shape (null
  fields, empty arrays, a specific enum value, a specific locale).
- Text and formatted-value correctness: exact strings, number formatting, which translation
  key or interpolated value shows.
- DOM structure and composition: row/element order, presence of a link with the right `href`,
  an attribute value, whether a child component received the props it should have.
- Anything a real bug turned out to be conditional logic for, not layout — which is most of
  what "I need to see it rendered to believe it" requests actually turn out to mean, per both
  cases above and tonight's B5/B6/C6 passes, all of which used a render test or direct-source
  verification rather than the shared pane.

**The recipe, concretely** (full working template:
`__tests__/universities/compare-page-render.test.tsx`):
1. `// @vitest-environment jsdom` pragma at the top of the file (the project default is
   `"node"`).
2. `vi.hoisted()` + `vi.mock()` per server dependency the page calls unconditionally —
   typically `@/lib/security/dal`, `@/lib/i18n/locale`, `next-intl/server`,
   `@/lib/supabase/server`, plus any always-called logging/analytics call.
3. `__tests__/stubs/mock-supabase-table.ts`'s `MockSupabaseClient` for the data layer — a real
   in-memory filter over seeded rows (`.eq`/`.neq`/`.in`/`.maybeSingle`/`.single`/`count:
   "exact"`), not a call-spy, so a wrong column or a missing filter actually changes the
   result the way a real `WHERE` clause would. **Current gap, real today**: no `.rpc()`,
   `.upsert()`, `.delete()`, `.gt`/`.lt`/`.gte`/`.lte`, `.like`/`.ilike`, or joined/nested
   `.select()` support — a page whose queries need one of these needs the harness extended
   first (add to that file, per its own header — don't hand-roll a second, competing mock).
4. Call the page's own async function directly with real or realistically-captured data,
   `render()` the resolved element via `@testing-library/react`, assert on
   `container.querySelector`/`.textContent` — genuine execution of the real code path.
5. **Prove it can fail before trusting it**: temporarily feed the fixture the value the bug's
   *absence* would produce, confirm the exact expected assertions (and only those) go red,
   revert. Non-negotiable here the same as everywhere else this session applies it — a render
   test that passed on the first try is not yet trusted.

## When a real browser is required — and what to do about it

Visual layout (overflow, wrapping, clipping — the ScoreRadar case above), responsive/mobile
breakpoints, real computed CSS and dark-mode token resolution, animation/motion, and hover/
focus states that depend on genuine browser behavior are all outside what jsdom can answer at
all, regardless of how the test is written.

**The team policy (CEO, 2026-09-04), settled — not a per-lane choice**: a lane needing
visual/layout proof writes a render test if the question is answerable that way at all (most
"I need to see it" requests turn out to be, per the two cases above); if it genuinely can't
be (real layout, responsive, CSS, motion), it says so plainly in its report rather than
opening its own dev server. **Live visual checks happen at two points only**: the integrator,
once, after merge; or the founder's own QA account (A7) — never a lane running `next dev`
(any form, any bundler) on its own worktree. This isn't a workaround for the tool limitation
above — it's the actual policy, decided once disk pressure made the reason concrete: nine
lanes each holding open a dev server is nine lanes' worth of accumulating `.next` build
output, and disk hit ~700MB free the same night from exactly that pattern on a much smaller
scale. The narrow remaining gap — seeing your *own unmerged* worktree's change live, before
an integrator ever touches it — is accepted as out of scope for a lane to solve itself;
render tests plus honest reporting cover the rest.

**If you are the integrator, verifying after merge** — full mechanics, root cause, and the
exact limits: `docs/worktree-dev-server-hazards-2026-09-04.md`.
`preview_start({url: "http://127.0.0.1:<port>/design-preview/..."})` against whichever dev
server is already running is the one live-verification path this policy still uses — it
needs no server-starting action at all, so it doesn't collide with the policy above. Never
`localhost` (cookie/session risk, not port-scoped — see that doc's §3) and never any route
under this app's own authenticated pages in the shared pane, on the strength of "it's just
for looking" — that risk is independent of and prior to everything else in this document.

## If you're not sure which one you need

Ask what the bug report or the spec claim is actually about. "Shows the wrong thing" or
"shows something it shouldn't, given this data" → render test. "Looks wrong," "doesn't fit,"
"breaks on mobile," "the animation is off" → browser, no substitute exists. When genuinely
unsure, write the render test first — it's cheaper, faster, permanent, and if the bug turns
out to be conditional logic rather than layout, it was also the *sufficient* proof, not just
a first step toward the real one.
