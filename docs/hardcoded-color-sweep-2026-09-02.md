# Every surface that structurally cannot go Ultra — 2026-09-02

**Status:** report only. No code changed. Read-only throughout — `grep`/`Read` against the
checked-out source, nothing else. `app/globals.css`, `Sidebar`, and the shell were read, never
written — oryn-4e's territory, respected.

**Method:** grepped `app/`, `features/`, `components/` for literal `#hex`/`rgb()`/`rgba()`
colors and inline `linear-gradient()`/`radial-gradient()` strings, and separately for Tailwind
utilities pinned to fixed palette names (`bg-slate-900`, `text-amber-600`, etc.) rather than
theme tokens. Every hit below was opened and read in context — one grep match on `#143` turned
out to be an issue number in a comment, not a color, which is exactly why. Sorted by how much
of the screen each surface owns, not by hit count.

## 0. The one sentence

**Three surfaces own almost the entire authenticated app's visible area and are all
hardcoded: the page ground, the sidebar, and one dark hero-card gradient reused verbatim
across seven pages.** Everything past those three is real but small by comparison. A
meaningful set of hardcoded colors elsewhere are semantic — quota warnings, destructive
actions, difficulty ratings — and must stay exactly as fixed as they are now.

## 1. The big three — these decide whether the app reads as "one product"

### 1a. The page ground — `app/(app)/layout.tsx:126`

```
style={{ background: "linear-gradient(145deg, #DDDAF5 0%, #D8DFF5 30%, #DDD8F2 55%, #D4DBF0 100%)" }}
```

On the single outermost `<div>` of the entire authenticated shell (`min-h-svh`, full
viewport). **Every authenticated page in the product renders on top of this.** Already
named by oryn-a7 as one of the two root causes of "hala mavi" — confirmed here at the exact
line.

**Verdict:** needs tier-awareness. This is the single largest and most consequential surface
in the whole sweep.
**Mechanism:** inline `style` prop — no CSS rule, including a `[data-tier="ultra"]` selector,
can reach it as written. Two ways in: (a) replace the literal with a CSS custom property
(e.g. `background: var(--shell-ground)`, with `--shell-ground` defined tier-aware in
`globals.css` the same way `--tier-glow` already is — one definition, this call site never
touches tier logic again), or (b) a JS ternary on `tier` inside the `style` object, the
pattern this session's own map work used. (a) is the better fit here specifically: one call
site, one property, no per-instance branching needed.

### 1b. The sidebar — `features/app-shell/sidebar.tsx:43` (+ `:68`)

```
style={{ background: "linear-gradient(175deg, #17153A 0%, #0E0D26 55%, #0A0920 100%)" }}
```

214px wide, `h-svh` (full viewport height), `sticky`, visible on every authenticated page at
`lg` and above. The second root cause oryn-a7 named, confirmed at the exact line. A third,
much smaller hardcoded color lives in the same file: `:68`, `#7B75F5`, a 3px-wide active-nav
indicator bar — real, but negligible area next to the background it sits on.

**Verdict:** needs tier-awareness (the background). The 3px indicator is a genuine "should
it move too" question but low-stakes either way given its size.
**Mechanism:** same as the page ground — inline `style`, needs a tier-aware CSS custom
property, not a class Tailwind's `ultra:` variant could reach as written.

### 1c. The dark hero-card gradient — one literal, eight call sites, seven files

```
style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}
```

Byte-identical (a two-stop short variant appears once), copy-pasted across:

- `features/dashboard/dashboard-view.tsx:143` — the dashboard's own greeting/score hero,
  the first thing a student sees after login.
- `features/applications/applications-view.tsx:57`
- `features/catalog/features-view.tsx:179`
- `app/(app)/universities/page.tsx:346`
- `app/(app)/universities/[id]/page.tsx:304`
- `app/(app)/universities/compare/page.tsx:68` **and** `:160` (two hero sections in one file)
- `app/(app)/profile/portfolio/page.tsx:33`

**Not found by oryn-a7's accidental discovery — found here by grepping the literal itself
once the pattern was suspected from the dashboard hit alone, then confirmed present verbatim
in six more files.** This is the single highest-leverage item in this whole sweep: one CSS
change fixes eight instances, not eight separate edits.

**Verdict:** needs tier-awareness — arguably as urgent as the sidebar, since it's the
above-the-fold hero on seven of the app's core pages, not a persistent chrome element but
recurring everywhere a student actually looks.
**Mechanism:** inline `style`, same shape as 1a/1b — but because it's the *same* literal in
eight places, the right fix is a shared class (e.g. `.oryn-dark-hero { background:
var(--hero-gradient); }`, `--hero-gradient` tier-aware in `globals.css`) rather than eight
individual token swaps. Fixing this file-by-file would recreate the exact copy-paste problem
that made it hard to find in the first place.

**Riding along in the same cards, worth fixing in the same pass since they're the same
family and same mechanism:** the decorative glow-blob circles inside these heroes —
`dashboard-view.tsx:148,153` (`rgba(61,53,232,0.12)`, `rgba(107,100,240,0.08)`),
`features-view.tsx:184,189` (`rgba(107,100,240,0.5)`, `rgba(184,106,0,0.4)`),
`applications-view.tsx:62` (`rgba(61,53,232,0.12)`). Same inline-style problem, smaller area,
same fix shape.

## 2. Real, smaller, still worth doing

- **`features/app-shell/user-menu.tsx:73`** — `linear-gradient(135deg, #7B75F5, #3D35E8)`,
  the account-avatar circle. Small (a few dozen px), but persistent in the topbar on every
  authenticated page. Inline style; same CSS-custom-property fix as the big three, smaller
  stakes.
- **`features/applications/applications-view.tsx:66,91`** — heading text `#A09CF8` and a
  frosted-glass card (`rgba(255,255,255,0.42)` + `backdropFilter: blur(22px)`) sitting on top
  of the hero from §1c. Same family, same file, worth bundling with that fix.
- **`features/app-shell/notification-bell.tsx`** — the widest single cluster of hardcoded
  values found (16 hits: trigger button, popover panel, borders, three separate text-color
  shades, the unread dot). Small footprint (a 34px trigger; the popover only renders on
  click), but if the goal is "nothing left that quietly stays Standard-colored," this is the
  most internally-inconsistent file in the sweep. Mix of inline `style` and Tailwind
  arbitrary-value classes (`text-[#6A6A7A]` etc.) — the arbitrary-value ones are reachable by
  a real generated class in principle, but in practice need the same literal-to-token swap as
  everything else.
- **`features/search/command-palette.tsx:142-153`** — the topbar search trigger
  (`#F4F4FA` fill, several arbitrary-value text/border colors). Small, always-visible.
- **`features/app-shell/usage-indicator.tsx:67`** — small white/bordered pill. Low area.
- **`features/documents/evidence-row.tsx:56,60`** — a frosted-glass row background and a
  small `#F0F0F6` chip. Per-row, so cumulative area scales with list length, but each
  instance is small.
- **`app/(app)/documents/page.tsx:47`** — a small `rgba(61,53,232,0.06)` info banner.

**Mechanism for all of the above:** same two options as §1 — a CSS custom property for the
inline-style cases, or swapping the Tailwind arbitrary-value hex for a semantic token class
(`text-muted-foreground` etc., or a new tier-aware one) for the arbitrary-value cases. None
of these need a new mechanism invented, just the same one applied more times.

## 3. Ambiguous — a design call, not a technical one

**`features/catalog/features-view.tsx:90-162`** — ten feature cards, each with its own fixed
gradient "tint" (`from-indigo-500/22 via-violet-500/12 to-transparent`,
`from-amber-500/22 via-orange-500/12 to-transparent`, and eight more, one per card, spanning
most of the Tailwind hue wheel). Not semantic — nothing in the naming ties a specific hue to a
specific meaning, they read as "give each card its own personality." Two honest readings:
(a) these already provide real per-card visual variety and don't need Ultra to add anything,
or (b) under Ultra they should shift toward the flame family too, for consistency with
everything else on the page (including this same file's own dark hero from §1c). **Not
naming a verdict here — this is a design preference, not a technical gap**, and the
"ten separate hues" pattern itself is arguably already in tension with AGENTS.md's own
"avoid rainbow dashboards" language regardless of tier, which is a pre-existing question this
sweep didn't go looking for and isn't the one being asked.

## 4. Correctly fixed — must NOT become tier-decorative

**Pre-authentication surfaces — no session exists to read a tier from, so there is nothing
to make tier-aware.** Checked, not assumed: `app/page.tsx` (public landing, `#0A0920`
background + purple accents), the whole `app/(auth)/` tree (login/signup/reset/forgot, plus
`_components/*` and the shared auth layout — all share the same lavender page-ground
literal §1a's fix should also cover, since it's pre-login not tier-driven), and
`app/(legal)/` + `features/legal/site-footer.tsx` (terms/privacy/footer — `SiteFooter` is
only ever mounted on the landing page and the legal-docs layout, confirmed by grep, never on
the authenticated shell). A visitor or a student mid-signup has no `plan_tier` to read.

**Admin tooling — tier is a student-facing concept; an admin operating the panel isn't "a
student on a plan."** `features/admin/**` (age-gate flags, budget warnings, scheduled jobs,
spend-per-user, status badges) and `app/(dev-preview)/design-preview/admin/`. Different axis
entirely, not a gap.

**`features/app-shell/dev-tier-preview-toggle.tsx`** — a dev-only debugging widget for
inspecting the current tier state. Should not itself be styled by the state it exists to
show — that would make the debug tool lie about what it's debugging.

**Semantic status/warning colors — the exact case oryn-a7 named directly
("a destructive-action red... must not become decorative because someone has a paid
plan"), found several real instances of it:**

- **`features/advisor/monthly-usage-meter.tsx:78-83`** — the AI-quota health gradient:
  `rose` (exhausted), `amber/orange` (low), an amber-to-violet transitional state, `indigo/
  violet/fuchsia` (healthy). **Worth flagging specifically, not just categorically**: this
  palette sits in the *same* warm amber/orange/red hue family the Ultra flame tokens use.
  If anyone ever "fixes" this by making it tier-aware, a Ultra student running low on quota
  and a Ultra student just seeing their own tier's normal color would become visually
  indistinguishable — the one place in this sweep where the correct answer (leave it fixed)
  and the vivid-everywhere instinct could actively collide if not caught.
- **`features/legal/draft-banner.tsx`**, **`features/legal/unconfirmed.tsx`** — amber
  "draft"/"unconfirmed" warning banners.
- **`features/onboarding/steps/import-step.tsx:276`** — `text-amber-600` on a
  "low confidence" CV-extraction label.
- **`features/profile/research-idea-studio.tsx:19-21`** — `emerald`/`amber`/`rose` for
  research-project difficulty (accessible/moderate/ambitious).
- **`features/settings/settings-view.tsx:170,172`** — a `rgba(201,53,53,...)` background +
  border + `#C93535` heading around what reads as the destructive/delete-account zone —
  the literal example oryn-a7 gave, found for real.
- **`features/dashboard/dashboard-view.tsx:329`** — `text-[#A0F0C0]` (light green),
  conditional on `profileChange.improved.length > 0` — "your score went up," a positive-
  delta indicator, same "fact, not a mood" shape as all of the above.

## Summary, for a quick read

| Surface | Area | Verdict | Mechanism |
|---|---|---|---|
| Page ground | Entire viewport, every page | **Fix** | Inline style → CSS custom property |
| Sidebar | 214px × full height, every page | **Fix** | Inline style → CSS custom property |
| Dark hero gradient | Above-the-fold, 7 pages, 8 call sites | **Fix** | One shared class, not 8 edits |
| User-menu avatar, hero blobs, applications glass card | Small, persistent | Fix | Same, smaller stakes |
| Notification bell, command palette, usage pill, evidence rows | Small/occasional | Fix | Mix of custom property + Tailwind arbitrary-value swap |
| Features-view's 10 card tints | Moderate, per-card | **Design call, not named here** | — |
| Auth/landing/legal | Large but pre-login | **Correctly fixed** | No tier exists to read |
| Admin panel + dev toggle | Moderate | **Correctly fixed** | Different axis (staff, not student) |
| Quota-health meter, draft/unconfirmed banners, confidence labels, difficulty scale, destructive zone, score-delta color | Small, semantic | **Correctly fixed** | Meaning would break if decorative |
