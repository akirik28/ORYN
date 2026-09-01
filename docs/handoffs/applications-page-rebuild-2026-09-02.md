# Applications page: the dead end, the nav gap, and the design rebuild

CEO-assigned, sourced from the founder's own "çalışmıyor" report plus the founder's Figma
("ORYN Design Handoff v1"). Four scope items: a real CTA on the empty state, promote
`/applications` to top-level nav, rebuild the card layout to the design, add a live "add
another university" affordance.

## The actual dead end, and where it really was

The empty state had an `action` slot and nothing in it — real, per spec Phase 43. But tracing
it further: the *create button itself*, not just the empty state, was the dead end. When a
student has no saved target university, `NewApplicationDialog` rendered a **disabled** button
with the reason as a `title` tooltip. A tooltip is invisible on any touch device — which is to
say, invisible to exactly the population this product is built for. That's very likely the
literal mechanism behind "çalışmıyor": a real 16-year-old on a real phone would see a greyed-out
button that does nothing when tapped, with no way to discover why.

Fixed at the source rather than only at the empty state: `NewApplicationDialog`'s no-targets
branch is now a real link to `/universities`, with the same reason as visible button text
instead of a hover-only tooltip. This one change also fixes the header's own "+ Add university"
button, which shares the component. The empty state additionally got its own explicit CTA
(spec Phase 43's actual requirement), so a student who scrolls past the header still has a way
out.

## The nav claim was half-true, and main had already fixed the other half

Checked `nav-items.ts` directly before changing it: `/applications` was already in
`PRIMARY_NAV`, and the desktop `Sidebar` renders every `PRIMARY_NAV` item as a full top-level
row — not under "More." `git log` shows it's been there since the UI Redesign V3 PR, well
before tonight. On **desktop, this was already fixed** by an earlier pass; the bug report likely
predates that PR or was written from the mobile view specifically.

**Mobile is where it was real.** `/applications` had no `mobilePrimary` flag, so
`mobile-nav.tsx` placed it in the "More" overflow sheet — two taps and a search through six
items, next to Settings and Documents, for a page with hard, dated deadlines. Fixed: added
`mobilePrimary: true`, widened the bottom bar from 5 real destinations + More (6 columns) to 6
+ More (7 columns), rather than displacing one of the original five — that was a separate,
already-considered decision (the file's own comments explain the reasoning) this task had no
new grounds to override.

**That width change had a real side effect, caught by measurement, not assumed away.**
Narrowing every column to fit a sixth pushed the existing `/universities` label
("Üniversiteler") into overflow — confirmed live (`scrollWidth` 55 vs. a 50px column at
375px), not theorized. Gave it a `shortLabelKey` too ("Üniv."), the same mechanism
`/opportunities` already uses. Re-measured every one of the six bottom-bar labels via
`scrollWidth`/`clientWidth` at both 375px and 320px after the fix: **zero truncated**, in
Turkish, which this codebase's own prior history already established as the tighter-fitting
language for this exact bar.

## The card rebuild, and one deliberate deviation from the literal mockup

Found the actual Figma source rather than working from a description alone —
`ORYN Design Handoff v1.zip` sits in `Desktop/Founder/` and its `src/App.tsx` has the real
`ApplicationsScreen` component a prior session already cited once for the existing hero/card
styling. Read it directly: exact colors, exact spacing, the 3-column chip grid with its exact
border logic (right border on the first two columns only, bottom border unless it's in the
last row).

**Brought the chip grid pattern over exactly; did not copy its content.** The mockup hardcodes
a different fake checklist per university — Penn shows "Common App, Transcript, SAT scores...",
Cambridge shows "UCAS form, Personal statement, Transcript, Reference." That's demo data for a
two-card mockup, not a real capability: `application_requirements` has no UK/UCAS-specific
requirement type, only the fixed 8-item set every application is seeded with
(`app/(app)/applications/actions.ts`'s `DEFAULT_REQUIREMENTS`). Rendering the mockup's literal
labels would have shown every student the exact same invented "UCAS form" text regardless of
what they actually saved — fabricated content, which this product's own rules forbid. The new
`RequirementChipGrid` component renders each application's *real* requirement rows instead,
through the same `typeLabels` catalog the detail page's checklist already uses. Read-only by
design: editing stays on `/applications/[id]`'s existing interactive checklist, so this doesn't
turn into N separate optimistic-update handlers per card.

**The readiness slot respects the contract exactly, unchanged from 2026-09-01's fix.** Checked
your note specifically: a `not_tracked` or `unmeasured` card shows neither a percentage nor a
progress bar — not "0%," nothing. Verified live (design-preview fixture, a submitted
application): the status pill and chip grid render, the percentage slot is simply absent.
`lib/applications/readiness.ts` itself was not touched.

**The "add another university" card is unconditional**, matching both the mockup's own
behavior and its own subtitle ("Save a university as a target first") — it always routes to
`/universities`, distinct from the header's dialog (which starts an application from an
*already-saved* target). Two different actions; didn't collapse them into one.

## Verified

Design-preview fixture extended with a submitted-status application (to exercise the
`not_tracked` case) and a genuinely empty, no-targets scenario (to exercise the actual dead-end
fix). Confirmed live in the browser, not assumed from the diff:
- Empty state's CTA and the header button both render as real links to `/universities`
  (`href` present, not `disabled`) when there are no saved targets.
- All three populated cards show their status pill, deadline, chip grid; only the two
  `measured`-readiness cards show a percentage and progress bar.
- Mobile bottom bar: 6 destinations + More, zero label truncation at 375px and 320px,
  measured via `scrollWidth`/`clientWidth`, not eyeballed.

Not verified: the authenticated `/applications` route itself — this worktree has no Supabase
credentials (consistent with every other worktree tonight), so real live data was never
reachable here; every check above went through the design-preview fixture route instead, which
renders the identical components.

4 gates green: lint, `tsc --noEmit`, `npm test` (218 files / 3,170 tests), production build.

## Not done, flagged rather than guessed at

Didn't reposition `/applications` within `PRIMARY_NAV`'s array order on desktop (currently:
..., Plan, Applications, [divider], Features, Saved, Documents, Settings) to sit *immediately*
adjacent to Documents with nothing between — "between Weekly Plan and Documents" is satisfied
in sequence but not in adjacency. Doing that precisely would mean moving Features/Saved out of
their current position or restructuring the primary/secondary tier boundary, a bigger change
than this bug report's evidence justified on its own. Say if the founder's design means this
literally; it's a small, contained follow-up if so.

Branch: `oryn/applications-page-rebuild-2026-09-02`. Pushed, not merged, per instruction.
