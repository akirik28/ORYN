# Mobile responsiveness audit — 2026-09-02

Phase 47: test at minimum phone, tablet, laptop, desktop; don't just shrink desktop cards
into unusable mobile ones. Nobody had run this against real, authenticated, rendered pages
before tonight, because nobody could reach one. Walked the real student path — dashboard,
plan, opportunities (both tabs), a university detail page, applications, advisor, settings —
at 320px (the real floor), 375px (phone), and 768px (tablet), on `oryn.qa.b`, read-only.

## Result: one real, precisely-diagnosed bug, on the one page it matters most to get right

**Dashboard, `/dashboard`, below 768px: the "University Outlook" and "Opportunities" cards
overflow their container by ~130px (375px) to ~153px (320px), with no scrollbar to reach the
clipped part — the content is just gone, not scrollable-to.** Confirmed identically at both
320px and 375px; confirmed **fixed** at 768px (tablet) — this is specifically a
sub-`md`-breakpoint bug, not present at tablet width or above.

### Root cause, not just the symptom

`features/dashboard/dashboard-view.tsx:437-472`:

```tsx
<div className="grid gap-10 md:grid-cols-2 md:gap-8">
  <section style={glassCard} className="glass-card-offset2 p-6">   {/* University Outlook */}
    ...
  </section>
  <section style={glassCard} className="glass-card p-6">            {/* Opportunities */}
    ...
  </section>
</div>
```

The wrapper has no base `grid-cols-1` — below `md` (768px), `grid-template-columns` is
unset, so the grid falls back to implicit single-column auto-sizing. Per CSS Grid/Flexbox
spec, a grid item's default `min-width` is `auto`, not `0` — it won't shrink below its own
content's intrinsic minimum width. Neither `<section>` here sets `min-w-0`, so each one
individually refused to shrink, forcing the (single, implicit) grid track to size to their
content's ~473px minimum regardless of the ~343px actually available.

**This codebase already has the fix in the same file, two callsites away, and gets it
right there**: line 348's sibling section (`className="glass-card min-w-0 p-6 md:p-7"`) has
`min-w-0` and renders correctly at every width tested (343px inside a 343px container, both
320px and 375px). The individual list items inside the broken section
(`<span className="min-w-0 truncate text-sm ...">`, line 454) already use the identical
pattern correctly, one level down — the fix that's missing is one level up, on the
`<section>` itself, not a new pattern for this codebase to learn.

**Confirmed live, not just read** — `getBoundingClientRect()` on the actual rendered DOM,
both widths:

| Viewport | Container width | Section width | Clipped |
|---|---|---|---|
| 375px (phone) | 343px | 473px | ~130px (~26%) |
| 320px (floor) | 343px | 473px | ~153px (~32%) |
| 768px (tablet) | — | 336px / 336px | none — `md:grid-cols-2` correctly applies |

Width is driven by content, not viewport — that's why it's identical at 320 and 375, and
why the floor makes it proportionally worse rather than differently broken.

### What this looks like to a student, and what it doesn't

Not a deceptive failure — the *card* itself never lies, same shape as the Browse-sort
finding from [[project_oryn_opportunity_deadline_coverage]]. What a student on a phone
actually experiences: the right ~30% of the "University Outlook" list (badges, and likely
additional universities beyond the first) and the "Opportunities" section is rendered
off-screen with nothing to scroll to reach it — silently missing, not visibly broken. Given
oryn-a7's own framing of the dashboard as the page that matters most (Phase 7: three actions
+ a gap block is already a lot of vertical content on a phone), this is exactly the kind of
"shrunk into something unusable" failure Phase 47 names, on the highest-traffic page in the
product.

**Not fixed in this pass** — read-only audit, matching the assignment ("report what's
actually broken"). The fix is a one-line, already-proven-safe addition
(`min-w-0` on both `<section>` elements at lines 438 and 472), but leaving it for a build
package rather than applying it here.

## Everything else checked

| Page | 375px | 320px | Notes |
|---|---|---|---|
| Dashboard | **Broken** (above) | **Broken**, worse | Fixed at 768px |
| Plan | Clean | — | Cards, regenerate button, reflection panel all readable |
| Opportunities — For you | Clean | — | Card grid stacks cleanly |
| Opportunities — Browse all | Clean | Clean | Category pills wrap; filter fields stack vertically instead of the desktop side-by-side layout |
| University detail (MIT) | Clean | — | Hero, programs list, dates section — zero wide elements anywhere in the full DOM, not just the visible viewport |
| Applications | Clean | — | The 3-column requirement checklist (Application/Essay/Financial aid/Interview/Portfolio/Recommendation) reflows and wraps correctly — the highest-risk "table-like" control on this page |
| Advisor (strategy panel) | Clean | — | Priority list, deadline badges wrap correctly |
| Settings | Clean | — | Account card, form fields, buttons all sized and spaced correctly |

Checked via `document.body.scrollWidth > window.innerWidth` (the mechanical check) plus a
full-DOM sweep for any element wider than the viewport (`getBoundingClientRect().width`,
excluding the decorative, intentionally-oversized `blob-drift` background elements) on every
page — not just a glance at what's in the fold — plus a screenshot per page for the judgment
call Phase 47 actually asks for. Every page in this table came back with zero wide elements
except the dashboard.

## A methodology note, not a product finding

Mid-audit, the dashboard and `/plan` both intermittently rendered with an empty or
near-invisible `<main>` — once with a real console error (`TypeError: Cannot read properties
of undefined (reading 'usedIsKnown')`, inside React DOM's own compiled bundle). Chased this
before reporting it, rather than flagging a scary-looking crash on the top-priority page
without checking: the server response was a clean 200 every time (confirmed via network
log), the failure was never viewport-specific (reproduced identically at 375px with no
resize involved), and the console showed live `[Fast Refresh] rebuilding` / `[HMR]
connected` events *during* the same window — origin/main advanced from `18ad7e01` to
`710db574` while this audit was running, meaning other sessions were actively merging and
the shared dev server was hot-reloading underneath this test session in real time. A
screenshot during one such episode showed the actual page content rendered but at
near-zero opacity — a `motion`/framer-motion fade-in animation caught mid-transition, the
signature of a component remount from Fast Refresh, not a data or rendering failure.
**Production has no HMR or Fast Refresh at all** — this specific failure shape is
structurally confined to testing against a live, shared dev server that other lanes are
actively pushing to, not something a real deployed build or a real student could hit. Not
reported as a product bug; recorded here so a future dev-server-based UI pass doesn't
mistake the same symptom for one.

## Summary

- One real bug: `features/dashboard/dashboard-view.tsx`'s "University Outlook" and
  "Opportunities" cards overflow ~26-32% off-screen below 768px, with no way to scroll to
  the clipped content. Root cause is a missing `min-w-0` on two `<section>` elements — the
  same fix this exact file already applies correctly two callsites away. Confirmed at 320px
  and 375px; confirmed fixed at 768px. Not fixed in this pass.
- Six other pages across the real student path (plan, opportunities both tabs, a university
  detail page, applications, advisor, settings), including the two highest table/grid-risk
  surfaces (the browse filter bar, the application readiness checklist), checked clean at
  375px with a full-DOM overflow sweep, not a glance — three of those spot-checked clean at
  320px too.
- One intermittent rendering artifact chased to its actual cause (concurrent HMR from other
  sessions' merges on the shared dev server) and explicitly not reported as a product defect,
  since production has no equivalent failure mode.
