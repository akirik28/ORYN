# Shared UI primitives & design-token audit (B10)

Compiled 2026-08-20, branch `oryn/counselor-data-quality-v1`. Scope per founder brief:
audit `components/ui/*` (shadcn-based) and `components/oryn/*` (this product's own composed
primitives) plus every consumer in `features/**` and `app/**`, and consolidate **only**
obvious, zero-visual-risk duplication — hand-rolled logic that should call an existing
primitive instead, or ad hoc Tailwind that an existing primitive already renders
identically. Do not restyle, do not restructure pages, do not touch the token palette.

**Off-limits this pass** (owned by a concurrent session, not read-modified here):
`app/(app)/dashboard/page.tsx`, `app/(dev-preview)/design-preview/page.tsx`,
`features/dashboard/**`, `features/entities/entity-combobox.tsx`, `lib/entities/search.ts`,
`lib/counselor/types.ts`, `lib/counselor/index.ts`, `lib/counselor/strengths.ts`,
`lib/counselor/dashboard-contract.ts`, and their test files.

**Result: zero code edits.** Every real inconsistency found below fixes cleanly *only* by
changing rendered color/spacing/background — i.e. fails the "confirm zero visual/behavioral
change" bar this pass was given. All are documented as candidates instead. Large parts of
the primitive layer are already a single, well-enforced source of truth — see §1–§3 for the
evidence, not just the assertion.

`docs/design-system.md` (Chat 2, prior pass) is the living style-decision doc and is treated
as authoritative here — this audit verifies current code against it, not the other way
round.

---

## 1. Design tokens — `app/globals.css`

One `:root` block (light) + one `.dark` block, no competing token definitions anywhere
else in the repo (`grep -rn ":root\|^\.dark" --include=*.css` outside `app/globals.css`:
no hits; `app/globals.css` is the only non-`node_modules` CSS file in the project).

- Status tones (`--success`/`--warning`/`--info`/`--error`) and the `--brand-primary-*`
  ramp are each defined once and consumed via `@theme inline`, exactly as
  `docs/design-system.md`'s "Brand tokens" section describes — verified current, not stale.
- No second, competing color system found (no inline hex/rgb palette file, no second
  Tailwind config layering colors — this project has no `tailwind.config.*`; token
  authority is entirely `app/globals.css`).
- **Verdict: consistent.** Not touched, per instructions not to redesign the palette even
  where individual *consumers* misuse it (§4.1, §4.2).

## 2. `components/ui/*` (shadcn-based) — adoption census

| Primitive | Consumers in `features/`+`app/` | Note |
|---|---|---|
| `Button` / `ButtonLink` | pervasive (dozens) | Consistent; `ButtonLink` exists specifically so `nativeButton={false}` is never forgotten when rendering a Button as a `<Link>` — good single-purpose wrapper, not duplicated. |
| `Input`, `Select`, `Textarea`, `Label`, `Checkbox`, `RadioGroup` | pervasive | No ad hoc `<input>`/`<select>` styling found standing in for these. |
| `Dialog` | used throughout (edit dialogs, CV review, etc.) | No hand-rolled modal overlay found anywhere (`grep "fixed inset-0.*z-50"` outside `components/ui/*`: zero hits) — every modal goes through `Dialog`/`Sheet`. |
| `Sheet` | `MobileNav`, filter drawers | Same verdict. |
| `DropdownMenu` | `OpportunityCard`, admin report table, notification bell, user menu | Consistent. |
| `Tabs` | `features/profile/portfolio-view.tsx` (only confirmed real tab-switching UI) | No page found reimplementing a tab bar with raw buttons + manual `role="tab"` bookkeeping. |
| `Popover`, `Tooltip`, `Avatar`, `Checkbox`, `RadioGroup`, `Separator` | used where relevant | No duplication found. |
| `Badge` | 7 files (`portfolio-view`, `story-bank`, `research-idea-generator`, `evidence-row`, `interests-step`, `u/[id]/page.tsx`, `admin/page.tsx`) | 6 of 7 use it "straight" (default/outline/secondary variant, no color override) — token-driven, correct. The 7th (`admin/page.tsx`) is the one real misuse — see §4.1. |
| `Skeleton` | `features/universities/university-explorer-hero.tsx` only | Only user of `animate-pulse` in the whole `features/`+`app/` tree (`grep -rl animate-pulse`: just this file + the primitive's own definition) — no duplicate hand-rolled shimmer placeholder found elsewhere. Other "loading" states in the app use a `Loader2` spinner instead (`upload-evidence-dialog.tsx`, `import-step.tsx`) — a different, deliberate pattern (transient action vs. content placeholder), not a duplicate of `Skeleton`. |
| `Progress` | `onboarding-wizard.tsx`, `app/(app)/profile/page.tsx`, `app/(app)/applications/page.tsx`, `app/(app)/applications/[id]/page.tsx` | See §4.4 for one near-duplicate outside this list. |
| `Card`/`CardHeader`/`CardContent`/etc. | **1 file**: `features/onboarding/steps/import-step.tsx` | See §4.3 — effectively unused; the product's real "card" language is `components/oryn/{action-card,insight-card}.tsx` plus per-page bespoke containers, not this primitive. Not a bug to fix in this pass (would mean restyling ~23 files), but worth the redesign session knowing. |
| `Alert`/`AlertTitle`/`AlertDescription` | **0 files** | Fully unused. See §4.5. |
| `sonner` (`Toaster`/`toast()`) | 8 files, 12 `toast.*()` call sites | Consistent transient-notification usage. Two files use a *persistent* inline banner instead of a toast (`app/(auth)/login/page.tsx` post-redirect error, `advisor-chat.tsx`'s failed-message tint) — correctly not toasts, since they describe standing state rather than a one-off event. |

## 3. `components/oryn/*` — the product's real status/feedback language

This is the actual single source of truth for status color, deadline urgency, confidence,
and empty/error states — and it is enforced, not just declared:

- **`StatusBadge`** (`components/oryn/status-badge.tsx`) is the only place `StatusTone →
  className` is decided. Every other status-flavored badge in the product composes on top
  of it rather than reimplementing tone logic:
  - `DeadlineBadge` (`deadline-badge.tsx`) — urgency → tone → `StatusBadge`.
  - `OutlookBadge` (`features/universities/outlook-badge.tsx`) — admission outlook → tone → `StatusBadge`.
  - `RequirementEvaluationBadge` (`features/universities/requirement-evaluation-badge.tsx`) — requirement status → tone+icon → `StatusBadge`.
  - `APPLICATION_STATUS_TONE` in `app/(app)/applications/page.tsx:15-24` — application status → `StatusTone`, passed straight into `<StatusBadge tone=... />` at line 92.
  - `OpportunityCard` (`features/opportunities/opportunity-card.tsx:30-59`) — match tier / selectivity / cycle-status, all → `StatusTone` → `StatusBadge`.
  - 7 confirmed consumers total (`grep -rl StatusBadge features app`), all following this shape **except** `app/(app)/admin/page.tsx` — see §4.1.
- **`ConfidenceIndicator`** has exactly one direct consumer, `SourceBadge`
  (`source-badge.tsx:3,28`), which is itself used in 2 places
  (`app/(app)/opportunities/[id]/page.tsx`, and the university detail page). No hand-rolled
  confidence bar/dot found competing with it — files that render the word "confidence"
  elsewhere (`dimension-bars.tsx`, `advisor/page.tsx`, `profile/page.tsx`) are passing the
  raw `DataConfidence` value through as data/text, not re-drawing the indicator (one
  exception, §4.4).
- **`EmptyState`** — 13 direct consumers, plus `AchievementSection`
  (`features/profile/achievement-section.tsx:18,151`), which wraps it once and is reused
  for all ~13 profile sections (Goals, Activities, Research, Skills, ...) via an
  `emptyStateText`/`emptyStateIcon` prop rather than each section hand-rolling its own.
  Total effective coverage: every full-page/full-section empty state in the app goes
  through this component. The handful of *inline* "no items yet" one-liners that don't
  (`conversation-thread.tsx:178`, `world-map-explorer.tsx:244`, three plain-text rows in
  `admin/page.tsx:112,138,166,184`) are single-line status text inside a dense list/chat/
  hover-legend context, not a page-level empty state — using `EmptyState`'s icon+dashed-
  border treatment there would be a visual change (denser context, but not layout-
  compatible), so left as-is and not counted as duplication.
- **`ErrorState`** — 1 consumer. Low n, but no competing "we couldn't load X" pattern found
  elsewhere to consolidate against.
- **`ActionCard`** / **`InsightCard`** / **`PageHeader`** / **`SectionHeader`** /
  **`SourceBadge`** / **`Pagination`** — each has exactly one implementation, each is
  reused everywhere that shape of content appears (5, 4, 15, 8, 2, 1 consumers
  respectively), no second copy of any of them found.

**Verdict: this layer is exactly what `docs/design-system.md` says it should be, and it is
holding.** The one real leak is documented next.

---

## 4. Findings (candidates only — none applied)

Each of these fails this pass's "zero visual/behavioral change" bar, so none were edited.
Ranked by confidence/impact for whoever picks this up next.

### 4.1 `app/(app)/admin/page.tsx:13-25` — hand-rolled status→color map bypassing `StatusBadge`

```ts
const STATUS_CLASS: Record<string, string> = {
  healthy: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  succeeded: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  ...
  down: "border-red-500/30 text-red-700 dark:text-red-400",
  ...
};
```

Consumed 3× (lines 91, 130, 158) as `<Badge variant="outline" className={STATUS_CLASS[x]}>`.
This is the exact pattern the founder brief names as the model example, and it's a direct
violation of `docs/design-system.md`'s own stated policy ("`status-badge.tsx` is the *only*
place this mapping should be decided — a new status badge should reuse it, not invent its
own color logic," citing `APPLICATION_STATUS_TONE` in this same codebase as the correct
worked example, at `app/(app)/applications/page.tsx:15-24` — see §3). It's also the only
raw Tailwind-palette color usage (`emerald-500`, `red-700`, etc.) found anywhere in
`features/`+`app/` outside two small text labels (§4.2).

**Why not fixed here:** swapping to `StatusBadge` changes the rendered pixels, not just the
source: `Badge variant="outline"` has no background fill, so today's pills are
transparent-with-tinted-border-and-text; `StatusBadge`'s tones (`border-success/25
bg-success/10 text-success`, etc.) add a soft background fill that isn't there today, and
the hue shifts from Tailwind's default `emerald`/`amber`/`red` swatches to this product's
`--success`/`--warning`/`--error` tokens. Low risk to fix (admin-only page, "Not linked
from navigation" per its own copy, not in any redesign scope found) — recommended as a
same-shape swap: `STATUS_CLASS: Record<string,string>` → `STATUS_TONE: Record<string,
StatusTone>` (mirroring `APPLICATION_STATUS_TONE`), then `<StatusBadge label={x}
tone={STATUS_TONE[x] ?? "neutral"} />` in place of the three `<Badge className=...>` call
sites.

### 4.2 Hardcoded Tailwind palette colors bypassing the `--success`/`--warning` tokens (2 more sites)

- `features/onboarding/steps/import-step.tsx:222` — `text-amber-600` for "Low confidence —
  please check", instead of `text-warning`.
- `features/universities/admin-requirement-form.tsx:135` — `text-emerald-700
  dark:text-emerald-400` for a save-success message, instead of `text-success`.

Same category as §4.1 (raw palette color instead of the product's status token) but
standalone text, not a badge — flagging separately since the fix shape is different (a
class swap, not a component swap) and the hue drift would be smaller but still real
(`amber-600` ≠ `--warning`'s oklch value; not zero-diff).

### 4.3 `components/ui/card.tsx` is essentially unused (1 of ~24 card-shaped containers)

`grep -rl 'components/ui/card"' features app` → 1 file. Meanwhile ~23 files render their
own "rounded-xl/2xl border ... p-4/5/6" container by hand (`opportunity-card.tsx`,
`university-card.tsx`, `dashboard-view.tsx` [off-limits, not modified], `story-bank.tsx`,
`cv-builder.tsx`, `not-configured-notice.tsx`, `compare-bar.tsx`, and 16 more — full list
available via `grep -rln -E "rounded-(xl|2xl) border(-[a-z-]+)? (bg-card|p-[456])" features
app`). This isn't obviously a bug: `docs/design-system.md` describes `ActionCard` and
`InsightCard` (not the shadcn `Card`) as the product's actual composed-card primitives, and
the shape/radius section explicitly assigns different radii to different card *meanings*
(`rounded-xl` ordinary, `rounded-2xl` a "thing with its own identity", `rounded-3xl` the one
hero element per screen) — a single generic `<Card>` wrapper would fight that intentional
variation. Documenting because the redesign session should know this primitive is dead
weight before deciding whether to delete it, extend it, or adopt it more broadly — not
something to silently swap in per-file, since every swap would restyle a page (ring vs.
border, fixed `--card-spacing` padding vs. each page's current bespoke padding).

### 4.4 `features/profile/dimension-bars.tsx:24-29` — hand-rolled progress bar, close to but not identical to `Progress`

```tsx
<div className="h-1.5 overflow-hidden rounded-full bg-muted">
  <div className="h-full rounded-full bg-brand-primary transition-[width] duration-700 ease-out" style={{ width: `${score}%` }} />
</div>
```

vs. `components/ui/progress.tsx`'s `ProgressTrack`/`ProgressIndicator`
(`h-1 w-full ... bg-muted` / `h-full bg-primary transition-all`). Functionally the same
"track + fill" shape (and `bg-brand-primary` == `bg-primary` today, since
`--brand-primary: var(--primary)` — see `app/globals.css:93`), but: track height differs
(`h-1.5` vs `h-1`), transition duration differs (`duration-700` explicit vs. `Progress`'s
default `transition-all`, effectively ~150ms), and hand-rolled version has no
`role="progressbar"`/`aria-valuenow` (Base UI's `Progress` primitive provides these for
free). A real accessibility improvement if swapped, but the height and animation-speed
change are visible — not swapped here.

### 4.5 `components/ui/alert.tsx` is fully unused (0 consumers)

`grep -rl 'components/ui/alert"' features app` → no results. Meanwhile at least two pages
hand-roll an inline destructive/warning banner instead: `app/(auth)/login/page.tsx:20`
(`rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive` for an invalid-link
error) and the failed-message tint in `advisor-chat.tsx:141`. Neither is an exact match for
`Alert`'s rendered output (`Alert` adds a border + `bg-card`; these don't), so not a
drop-in swap. Flagging as a second "fully-built, zero-adoption primitive" alongside `Card`
(§4.3) for the redesign session to make a deliberate call on, rather than something to wire
up incidentally in this pass.

### 4.6 Duplicated inline "topic chip" className string (2 of 3 call sites byte-identical)

- `features/universities/university-card.tsx:131` — `"rounded-full border bg-muted/50
  px-2 py-0.5 text-xs text-muted-foreground"`
- `app/(app)/universities/compare/page.tsx:106` — **identical string.**
- `app/(app)/universities/[id]/page.tsx:332` — same pattern, different padding
  (`px-3 py-1`).

Two files render byte-identical markup for the same concept (a university's research-topic
tag). Not swapped onto `Badge` (visually different — `Badge outline` has no background
fill and uses `text-foreground`, not `text-muted-foreground`) and not extracted into a new
shared component in this pass, since introducing new shared UI surface across
`features/universities` and `app/(app)/universities` risks colliding with in-flight
redesign work on those exact pages, and the brief scopes this pass to wiring *existing*
primitives, not authoring new ones. Lowest-risk, highest-confidence candidate for a
`TopicChip` extraction whenever the redesign session next touches these three files.

### 4.7 Duplicated inline "toggle pill" base className (2 of 4 call sites byte-identical)

Four filter/onboarding components each define a local pill-button base class as a `const`:

- `features/opportunities/opportunity-filter-bar.tsx:9` — `px-3.5 py-1.5`
- `features/universities/filter-sheet.tsx:29` — `px-3 py-1.5`
- `features/universities/region-grid-explorer.tsx:6` — `px-4 py-2`
- `features/onboarding/onboarding-wizard.tsx:37` — `px-4 py-2` (**identical to
  region-grid-explorer's**, both `"rounded-full border px-4 py-2 text-sm font-medium
  transition-colors duration-(--duration-fast)"`)

Each then branches into selected/unselected variants with different colors/logic around
this shared base, so the actual *rendered* chip differs by call site even where the base
string matches — this is a toggle-button pattern (interactive, `aria-pressed`-style state),
not a static `Badge`, so there's no existing primitive to redirect these to. Documenting the
2-file exact match for visibility; not extracting a shared constant in this pass since doing
so (a) touches 4 files across 2 features for a one-line saving each and (b) would mean
introducing a new small shared export, which strays toward "new design-token system"
territory the brief explicitly says to avoid deciding unilaterally.

---

## 5. Confirmed non-issues (looked like duplication, isn't)

- **`features/entities/suggest-input.tsx` vs. `features/universities/university-search-box.tsx`
  vs. `features/entities/entity-combobox.tsx`** (off-limits, read for context only, not
  modified): all three implement the same interaction skeleton (click-outside-to-close,
  arrow-key highlight, `role="listbox"`/`role="option"`, Escape/Enter). This looks like
  triplicated combobox logic at a glance, but each file's own doc comment explains a real
  contract difference the others don't have: `SuggestInput` is free-text-allowed
  (`suggest-input.tsx:16-28`, "the typed text IS the value, never rejected"), and
  `UniversitySearchBox` navigates to a result instead of filling a form field
  (`university-search-box.tsx:13-24`, explicitly "Deliberately not EntityCombobox itself").
  Already-justified differentiation with the reasoning left in the code, not an accidental
  fork — not flagged as a fix candidate.
- **Filter/toggle pills throughout `features/universities/*` and `features/opportunities/*`**
  (raw `<button>`/interactive `rounded-full border` elements, not `<Badge>`): these are
  stateful selection controls (active/inactive, hover, focus), not display badges — `Badge`
  has no notion of a pressed/selected state, so this is the right primitive boundary, not a
  missed consolidation. See §4.7 for the one real (minor) sub-finding within this category.
- **`app/(app)/layout.tsx:68`** — the one page-width container (`mx-auto w-full max-w-6xl
  px-4 py-6 md:px-8 md:py-10`) is defined once at the shell level; individual pages that
  narrow further for readability (`applications/[id]`, `opportunities/[id]`,
  `universities/[id]`, `search`, etc., each picking their own `max-w-2xl`..`max-w-5xl`) are
  making a per-content-type width choice on top of the shared shell, not duplicating the
  shell itself.
- **`STATUS_ICON`/`STATUS_LABEL` in `features/applications/requirement-checklist.tsx:13-25`
  and `status-control.tsx`'s `STATUS_OPTIONS`**: these back an interactive cycle-button and
  a `<Select>`, respectively — not display badges — so they're correctly not routed through
  `StatusBadge` (which has no click/interactive affordance). Not a finding.

---

## 6. Summary

| | |
|---|---|
| Files read in full | all of `components/ui/*` (23 files), all of `components/oryn/*` (11 files), `app/globals.css`, `docs/design-system.md`, plus ~35 consumer files across `features/`+`app/` |
| Code edits made | **0** |
| Findings documented | 7 (§4.1–4.7), ranked by confidence |
| Confirmed non-issues written up | 4 (§5) |
| Top candidate for a follow-up pass | §4.1 — `app/(app)/admin/page.tsx`'s `STATUS_CLASS` map: the exact pattern named in the founder brief, a direct violation of `docs/design-system.md`'s own written policy, isolated to one internal (nav-unlinked) page, and mechanically identical in shape to the already-correct `APPLICATION_STATUS_TONE` pattern in the same codebase. |

No `.tsx` files were touched this pass, so no `tsc`/`eslint`/test run was required or
performed.
