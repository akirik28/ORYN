# Deadline-urgency ramp check — 2026-09-02

CEO's ask, closing an item oryn-31's semantic-color audit
(`docs/ultra-flame-semantic-color-audit-2026-09-02.md`) left open: three status ramps —
deadline urgency, admission outlook, application/requirement status — each embed a
`tone="brand"` middle tier flanked by fixed `error`/`warning`/`success` steps. If flame
moves the middle but not the ends, the ramp can visually invert (a 14-day deadline reading
hotter than the 3-day one beside it). oryn-bd attempted this check and couldn't — the test
account had no deadline countdown rendering. **Answer: it does not invert. All three ramps
confirmed live, in both English and Turkish, with computed color values, not source
reading alone.**

Branch: `oryn/deadline-ramp-check-2026-09-02`, off `e83b7a9e`.

## Why this was checkable now when it wasn't for bd

bd's test account had no live deadline data to render against. The `/design-preview`
harness (`app/(dev-preview)/design-preview/`) mounts real presentational components
against fixture data instead — `PreviewShell`'s fixtures already include a mixed-urgency
deadline set (6/12/21/28/43/60 days, plus one overdue item), so the ramp's full range is
reachable without needing a real account in a specific state. Same harness the mobile audit
used, same `?tier=ultra` toggle.

## Method

`getComputedStyle` on every rendered `StatusBadge` (the shared component all three ramps
render through — `components/oryn/status-badge.tsx`) on `/design-preview/dashboard?tier=
ultra` and `/design-preview?tier=ultra`, reading actual `background-color`/`color`, not
eyeballing screenshots. Cross-checked against source for the one call site that bypasses
`StatusBadge` entirely (`requirement-checklist.tsx`, below).

## Result: the brand tier's computed hue is identical across all three ramps, and unmoved by tier

| Surface | Label | Computed color (Ultra) | Hue |
|---|---|---|---|
| Deadline (`deadline-badge.tsx`, ≤14d) | "12 days left" | `oklch(0.399 0.170 271.996)` | 272.0° |
| Outlook (`outlook-badge.tsx`, competitive) | "Competitive" | `oklch(0.399 0.170 271.996)` | 272.0° |
| Application status (`applications-view.tsx`, in_progress) | "Devam ediyor" (tr) | `oklch(0.399 0.170 271.996)` | 272.0° |

All three resolve to the exact same OKLCH value, to the fourth decimal — not merely similar,
identical, because all three read the same `--brand-primary` custom property through
`status-badge.tsx`'s single `TONE_CLASS.brand` mapping. That value is indigo (H272°), not
flame (flame red measures 28.3° per 31's audit) — confirmed by direct computation, not
inferred.

The neighboring fixed tiers stay exactly where they were, confirmed on the same page load:
`error` (3-day / extreme-reach / rejected) computes a warm red distinct from flame,
`warning` (7-day / reach) a warm amber, `success` (strong/accepted) green, `neutral`
(30-day+) grey. Sampled at 6/12/21/28/43/60 days and one overdue item across both English
and Turkish renders (the harness defaulted to `tr` on one page, `en` on another; the brand
hue was identical in both, confirming the result isn't locale-dependent) — 18 badges read
in total, spanning every tone the ramp uses. No inversion at any step: the visual order
(error hottest → warning → brand → neutral coolest, ends anchored, middle indigo throughout)
reads the same on Ultra as on Standard, because the middle simply doesn't move.

## Why: the mechanism this depends on was reverted before it reached these components

`app/globals.css`'s `[data-tier="ultra"]` block carries its own dated comment: a blanket
`--brand-primary` override — which *would* have moved all three ramps' middle tier toward
flame — was tried and reverted the same night, specifically because of 31's audit findings
about `--destructive` proximity and `profile-signal.tsx`'s tone reversal. Confirmed still
reverted on current main (`e83b7a9e`): `--brand-primary` and its `-soft`/`-strong`/`-border`
derivatives are declared once, outside any `[data-tier="ultra"]` block, and
`status-badge.tsx`'s `TONE_CLASS.brand` (`border-brand-primary-border bg-brand-primary-soft
text-brand-primary-strong`) carries zero `ultra:`/`tier-` classes — grepped, not assumed.
Same for `outlook-badge.tsx` and `applications-view.tsx`: neither file contains an
`ultra`/`tier-` token anywhere.

`requirement-checklist.tsx:62` (`requirement.status === "in_progress" && "text-brand-
primary"`) is the one call site 31 flagged as bypassing `StatusBadge` — a fix at the badge
level alone wouldn't have reached it. Checked directly: it also carries no tier-aware
classes and reads the same untouched `--brand-primary` variable, so it's unaffected by the
same mechanism, for the same reason. Not independently live-rendered (it wasn't reachable
in the harness's current fixtures), but the conclusion doesn't depend on rendering it — the
CSS variable it reads is the same one confirmed unmoved above.

## The caveat this needs, matching the mobile audit's pattern

This is clean *because* the blanket mechanism was reverted before anyone touched these
three components individually — not because someone checked the ramp and decided it was
safe. Two other places in the app *do* carry a deliberate, per-component Ultra treatment
today (`eyebrow.tsx`'s rule-bar, `opportunity-card.tsx`'s match-tier glow) — proof that
per-component migration is an active, ongoing pattern, not a closed chapter. **If a future
change adds `.tier-grad-text`/`.tier-glow-sm`/an `ultra:` variant directly to
`deadline-badge.tsx`, `outlook-badge.tsx`, or the `brand` row of either status-tone map —
the exact "per-component decision made against 31's list" the revert comment names as the
intended path forward — this check needs to be redone.** It is not evidence that the ramp
is safe against that change; it's evidence that the change hasn't happened yet.

## Bottom line

Closed, not just unconfirmed: all three ramps' brand tier is byte-identical to
`--brand-primary`, itself confirmed untouched under `[data-tier="ultra"]`, live-verified
across 18 badges in two locales. No inversion today. The finding is contingent on the
current mechanism (token-level, not per-component) holding — re-check specifically if
either badge component picks up a direct tier-aware class the way `eyebrow.tsx` and
`opportunity-card.tsx` already have.
