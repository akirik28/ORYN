# Empty / loading / error state audit (B11)

Scope: every page under `app/(app)/**` and every component under `features/**`, excluding
the files reserved for the concurrent Counselor Core / entity-search package (see
"Out of scope" below). Goal per AGENTS.md PHASE 43/44/45: no genuinely-empty screen is a
blank rectangle or ad-hoc "No X found" string when the shared primitive already exists,
every route shows a content-shaped skeleton (not a frozen screen) while it loads, and a
failed fetch/mutation shows human-readable text instead of a raw error or a silent no-op.

## What already existed (before this pass)

Three shared primitives already existed in `components/oryn/` and were already the
dominant pattern across the app — this was not a from-scratch build:

- **`EmptyState`** (`components/oryn/empty-state.tsx`) — icon + title + optional
  description + optional action, dashed-border card. Already used on 17+ pages/components
  (Applications, Connections, Documents, Messages, Opportunities, Plan, Search,
  Universities, Universities Compare, `not-found.tsx`, `AchievementSection`,
  `PortfolioView`, `RegionGridExplorer`, `RecommendationsSection`, and the
  Counselor-Core-owned `dashboard-view.tsx` / `counselor-priorities.tsx`, left untouched
  per scope).
- **`ErrorState`** (`components/oryn/error-state.tsx`) — warning-toned box with an icon,
  a description, and an optional retry action. Used by the route-level `app/(app)/error.tsx`
  boundary and by `app/(app)/u/[id]/page.tsx` for its "couldn't load the full portfolio"
  case — this second usage is close to a textbook match for AGENTS.md PHASE 45's own
  example ("We couldn't refresh this university's information right now... last verified
  data is still shown below").
- **`PageSkeleton`** (`components/oryn/loading-skeleton.tsx`) — a `list` / `cards` /
  `detail` variant skeleton. Every one of the 16 `loading.tsx` files under `app/(app)/**`
  already used it (Admin, Advisor, Applications + `[id]`, Connections, Documents,
  Messages, Opportunities, Plan, Profile, Search, Settings, `u/[id]`, Universities +
  `[id]` + `compare`). `Profile`'s `loading.tsx` also covers `/profile/cv`,
  `/profile/history`, `/profile/portfolio`, and `/profile/story-bank` (Next's implicit
  Suspense boundary wraps everything nested under a segment that has no closer
  `loading.tsx` of its own), so all four of those routes already get an instant skeleton
  even though none of them has a dedicated `loading.tsx` file.
- Route-level `app/(app)/not-found.tsx` (catches every `notFound()` call — applications,
  messages, opportunities, `u/[id]`, universities) already renders through `EmptyState`,
  and `app/(app)/error.tsx` (the route error boundary for the whole `(app)` segment)
  already renders through `ErrorState` with a retry + "back to dashboard" action.

Given that, this pass was a consistency audit against an already-fairly-mature baseline,
not a greenfield build. No second/duplicate error or skeleton primitive was created —
`ErrorState` and `PageSkeleton` already covered what the brief asked for.

## What was fixed

Five call sites were hand-rolling their own dashed-border/plain-text empty box instead of
`EmptyState`, despite conveying materially the same "not enough data yet" information as
the pages that already used it. Each was swapped for `EmptyState`, reusing the exact
existing wording (split into title/description where the original was one sentence, never
adding a new claim):

1. `features/profile/peer-benchmark.tsx` — the "not enough comparable Oryn students yet"
   cohort box (`<div className="rounded-lg border border-dashed ...">`) → `EmptyState`
   with a `Users` icon.
2. `features/profile/story-bank.tsx` — the "add experiences first" prompt → `EmptyState`
   with the `NotebookPen` icon (already imported for the page's own header).
3. `features/profile/cv-builder.tsx` — the "add achievements first" prompt → `EmptyState`
   with a `FileText` icon.
4. `app/(app)/profile/history/page.tsx` — the "not enough history yet" box → `EmptyState`
   with the `TrendingUp` icon (already imported for the delta badges on this same page).
5. `app/(app)/connections/page.tsx` — the nested "Accepted connections will appear here."
   line (inside the "Your connections" section, distinct from the page's own top-level
   `isEmpty` case which already used `EmptyState`) → `EmptyState` with `className="py-6"`,
   matching the same compact-nested convention `AchievementSection` already established.

One "frozen button with no explanation" case, the specific anti-pattern AGENTS.md PHASE 44
calls out ("Do not show frozen buttons"): `features/applications/new-application-dialog.tsx`
rendered a plain `<Button disabled>` with no indication why when a student has no
un-applied target universities left. Added a native `title` tooltip reusing the exact
explanation already given by the page's own `EmptyState` description
("Save a university you're targeting to start an application") — no new copy, no new UI
pattern, just makes the existing reason discoverable on the disabled control itself.

No new shared component was built. `EmptyState`, `ErrorState`, and `PageSkeleton` already
existed, already covered every shape this pass needed (icon+title+description+action for
empty; icon+description+retry for error; list/cards/detail for loading), and the fixes
above are pure swaps onto them — not a rebuild.

## What was checked and left alone (already correct, or a deliberate/contextual choice)

- **Detail pages that hide a subsection with no data** (`universities/[id]/page.tsx`'s
  Programs/Research strengths/Requirement check/Sources sections;
  `opportunities/[id]/page.tsx`'s eligibility/requirements/fields/sources sections) —
  these `? <section>… : null` around independently-optional facts on an otherwise
  populated record page, the same pattern a Wikipedia infobox uses for missing fields.
  Not the "student expected a list and got a blank rectangle" case PHASE 43 is about;
  boxing every possibly-absent subsection in a full `EmptyState` would clutter a page
  that's already showing real content. Left as-is.
- **Secondary widgets that just don't render when empty** (`RecentActivityStrip`,
  `AdvisorContextStrip`, `CompareBar`, the `u/[id]` skills section, the public
  `RecommendationsSection` for non-connections) — correct "hide, don't show empty" UX for
  a strip/badge/floating-tray that isn't the page's primary content. Left as-is.
- **Compact popovers/dropdowns** (`CommandPalette`, `NotificationBell`, `EntityCombobox`
  (out of scope), `SuggestInput`) — each already has its own inline no-results / error /
  "you're all caught up" text sized for a ~320-384px popover. The full `EmptyState` card
  (icon circle + `py-12` padding) would be oversized inside a dropdown; the existing
  compact copy already matches house tone. Left as-is.
- **`app/(app)/admin/page.tsx`** — four dense list sections ("No reports filed yet.",
  "No provider calls recorded yet.", etc.) hand-roll a one-line muted string instead of
  `EmptyState`. Deliberately left alone: this is the PHASE 51 "minimum useful internal
  operational interface," not a student-facing page, its sections have no corresponding
  "add" action (you can't manually create a provider-health row), and boxing four
  one-line admin table sections in dashed-border icon cards would add visual weight to a
  page whose whole point is to stay a lightweight ops view. Flagged for the
  UI-simplification pass to reconsider only if/when admin gets real design attention.
- **Inline form/dialog mutation errors** (`AchievementSection`'s save error,
  `UploadEvidenceDialog`, `NewApplicationDialog`, the CV-import retry message in
  `ImportStep`, per-message retry in `AdvisorChat`) — all use a small
  `<p className="text-destructive">` next to the submit button, or a `sonner` toast for
  optimistic-update rollback (`OpportunityActions`). This is a different, equally
  intentional convention from `ErrorState` (which is for "a whole section/page failed to
  load," not "this specific save failed") and is already consistent across every dialog
  in the app. Not converted — doing so would be a UX policy change, not a safe swap onto
  an existing pattern, and none of these silently fail: every one surfaces text and lets
  the student retry.
- **`features/advisor/advisor-chat.tsx` empty thread state** — a custom centered panel
  with a `Sparkles` icon and clickable suggested-prompt chips, richer than plain
  `EmptyState` (its "action" would just be static text, not four clickable starters).
  Converting it would be a downgrade. Left as-is.
- **`app/(app)/advisor/page.tsx`** — if `getCounselorRecommendations` throws, the
  `CounselorPriorities` panel is simply omitted (logged server-side, nothing rendered) per
  an existing, explicitly-commented design choice: "a failure here should never take down
  the chat itself... this only guards the unexpected one." The deterministic pipeline
  already has its own honest empty/low-confidence states for the ordinary case. This is
  graceful degradation of a secondary panel, not a crash or a stuck UI, and the file it
  would touch most naturally (`lib/counselor/index.ts`) is reserved for the concurrent
  Counselor Core package. Left alone; noted here rather than changed.

## Out of scope (per this task's explicit file boundaries)

Not read or touched: `app/(app)/dashboard/page.tsx`, `app/(dev-preview)/design-preview/page.tsx`,
`features/dashboard/**` (incl. `weekly-focus.tsx`, `counselor-week-fallback.tsx`,
`dashboard-view.tsx`), `features/entities/entity-combobox.tsx`, `lib/entities/search.ts`,
`lib/counselor/**`, and the associated test files. These almost certainly have their own
empty/loading/error handling (the dashboard's `try/catch` around
`getCounselorState`/`buildCounselorDashboardContract` was visible only via a repo-wide
grep, never opened) — that's the concurrent package's call to make, not this pass's.

## Left for the UI-simplification pass to decide

These are functioning correctly today but are stylistic/consistency calls that belong to
whoever owns the incoming simplified-UI redesign, not this audit:

- Whether `app/(app)/admin/page.tsx`'s four inline "No X recorded yet." lines should ever
  move to a shared primitive, or whether admin intentionally stays lower-fidelity than the
  student-facing app (see above).
- Whether the two error-surfacing conventions (`ErrorState` for section/page failures vs.
  inline destructive text / toast for form-submission failures) should be unified into one
  primitive, or should stay deliberately distinct as they are today.
- Whether compact-popover empty/error copy (`CommandPalette`, `NotificationBell`) should be
  restyled to visually echo `EmptyState` (smaller icon, same border-dashed language) purely
  for family resemblance, even though the current plain-text version already reads fine at
  that size.
- Icon choices made in this pass (`Users` for peer-benchmark, `NotebookPen` for story bank,
  `FileText` for the CV builder, `TrendingUp` for progress history) are reasonable but not
  precious — swap freely if the redesign standardizes on a different icon set per section.

## Files touched

- `features/profile/peer-benchmark.tsx` — swapped hand-rolled empty box for `EmptyState`.
- `features/profile/story-bank.tsx` — swapped hand-rolled empty box for `EmptyState`.
- `features/profile/cv-builder.tsx` — swapped hand-rolled empty box for `EmptyState`.
- `app/(app)/profile/history/page.tsx` — swapped hand-rolled empty box for `EmptyState`.
- `app/(app)/connections/page.tsx` — swapped nested "Accepted connections will appear
  here." line for `EmptyState`.
- `features/applications/new-application-dialog.tsx` — added a `title` tooltip to the
  disabled "Start an application" button explaining why it's disabled.

## Files created

- `docs/empty-loading-error-state-audit.md` (this file).

No new component was created; no existing component's props or behavior changed —
`EmptyState`, `ErrorState`, and `PageSkeleton` were adopted as-is at every fixed call site.
