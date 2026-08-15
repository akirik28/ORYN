# Chat 2 Handoff

Written into the repo per this build's own protocol — Chat 3 (Adversarial QA / Product
Audit / Final Polish) should start here, `current-state.md`, `known-issues.md`,
`design-system.md`, and `product-decisions.md`, not any prior conversation transcript.

## What this pass was

World-Class UI/UX/Brand/Interaction Design over Chat 1's functionally-complete build,
**plus** one founder-directed scope addition mid-pass: a narrow V1 social/network layer
(optionally-shareable profiles, mutual-consent connections, "currently looking for"
status). The social-scope reasoning — including the minor-safety calls made unprompted
(mutual consent over an open follow, authenticated-only sharing, no people-search
directory) — is in `product-decisions.md`'s "Chat 2 pass" section; read that before
touching `connections`/`public_profiles`/`is_public`/`looking_for`.

**Sandbox constraint that shaped this whole pass**: no Docker, no live Supabase project,
no `.env.local` — identical to Chat 1's environment. Every authenticated route (all of
`app/(app)/`, `app/(onboarding)/`) renders `NotConfiguredNotice` and cannot be exercised
normally. Built `app/(dev-preview)/design-preview/` (dev-only, hard 404s in production —
see `design-system.md`) to visually verify presentational components against realistic
fixture data instead. **This means most authenticated pages were redesigned via careful
code editing and cross-referencing against patterns already verified live in the
preview harness — not individually pixel-checked in a browser.** See "What was and
wasn't visually verified" below for the honest breakdown. If real credentials exist by
the time Chat 3 runs, that's the single highest-value first move: `npm run dev` against
a real Supabase project and walk every page a logged-in student would see.

## Design system

Full detail in `design-system.md` — summary:

- **Brand tokens**: `--brand-primary` and a derived hover/strong/soft/subtle/border ramp,
  `color-mix()`-derived once (not duplicated per theme), layered on top of Chat 1's
  existing shadcn tokens (kept, not replaced — low risk, already wired everywhere).
  `--success`/`--warning`/`--info`/`--error` status tones, replacing scattered raw
  `emerald-*`/`amber-*`/`red-*` Tailwind literals across the app.
- **Typography**: Newsreader (serif) for headings/statements-to-the-student, Geist (sans,
  unchanged) for UI chrome. One token change (`--font-heading`) re-skins every `CardTitle`
  and `DialogTitle` in the product automatically, since that hook already existed.
- **Motion**: `MotionConfig reducedMotion="user"` globally in the root layout —
  every animation in the product respects `prefers-reduced-motion` with zero
  per-component work. `lib/motion.ts` centralizes duration/easing.
- **Shape**: radius used with intent (plain data = `rounded-lg/xl`, a card with its own
  identity = `rounded-2xl`, the one dominant hero element per page = `rounded-3xl`) —
  not a new scale, just a discipline for the existing one.
- **Primitives**: `components/oryn/*` — `PageHeader`, `SectionHeader`, `InsightCard`,
  `ActionCard`, `StatusBadge`, `ConfidenceIndicator`, `DeadlineBadge`, `SourceBadge`,
  `EmptyState`, `ErrorState`. Every redesigned page composes from these now.

## Major surfaces redesigned

- **Home dashboard** (`app/(app)/dashboard/page.tsx` + `features/dashboard/dashboard-view.tsx`)
  — split into data-fetching page + presentational `DashboardView` specifically so it
  could be fixture-rendered. Hero score card, numbered weekly-priority cards (matches the
  master spec's own worked example almost exactly), calm "avoid" callout,
  `DeadlineBadge`-driven "Due soon", real (not placeholder) opportunity-match preview
  (wired `refreshOpportunityMatches` + top-2 read into the page — previously a static
  "matches appear here" string with no actual query). **Fully visually verified**, light
  and dark, desktop and mobile, via the preview harness.
- **App shell** (`features/app-shell/*`) — sidebar active-item now a sliding
  `layoutId`-animated pill (separately namespaced for desktop vs. mobile — see
  design-system.md's responsive section for why); brand-tinted icon chips throughout.
  **Visually verified.**
- **Landing + auth** (`app/page.tsx`, `app/(auth)/*`) — landing hero got the serif
  headline treatment, brand-tinted step icons, scroll-triggered entrance motion.
  Landing **fully live-verified** (only page reachable with zero config, in both light
  and dark, desktop and mobile). Auth pages (login/signup/forgot/reset) got the same
  heading treatment and a subtle radial brand glow matching the landing hero, but only
  `NotConfiguredNotice` itself could be live-checked (**verified**) — the actual forms
  are unverified beyond typecheck/lint, since `AuthLayout` gates on Supabase before
  rendering them.
- **Onboarding** (`features/onboarding/onboarding-wizard.tsx`) — serif step titles,
  brand-tinted toggle pills, card-contained layout matching the auth pages. **Fully
  visually verified** via the preview harness (the wizard is a pure client component
  with no server data dependency, so unlike most authenticated surfaces it mounts
  directly with zero fixtures needed).
- **University exploration** — the world map (`world-map-explorer.tsx`) had its dark hue
  literals corrected from a stray 264° to the actual brand 272° (a pre-existing, subtle
  off-brand inconsistency, not something this pass introduced). Detail page
  (`app/(app)/universities/[id]/page.tsx`) restyled with `PageHeader`/`SectionHeader`,
  the "Your outlook" panel promoted to the brand-tinted `rounded-3xl` hero treatment.
  Requirement checklist (`requirement-evaluation-badge.tsx`) rebuilt on `StatusBadge`
  with five genuinely distinct tone+icon pairs (see design-system.md — this was a
  chat-1-handoff explicit warning: don't collapse `unknown`/`needs_manual_review` into a
  flat "incomplete"). Consolidated a duplicate `SourceBadge` component
  (`features/system/source-badge.tsx`, one call site) into the shared
  `components/oryn/source-badge.tsx` primitive and deleted it. **World map + region-pill
  fallback fully live-verified** (desktop and mobile, via the preview harness); detail
  page and requirement badges verified via typecheck/build + reuse of already-verified
  primitives, not pixel-checked live.
- **Profile** (`app/(app)/profile/*`, `features/profile/*`) — score section promoted to
  the brand hero treatment, `AchievementSection` (the generic CRUD shell reused across
  all 9 achievement types + goals) restyled once for leverage across the whole page.
  Radar/bar charts switched to the `brand-primary` token (were already single-hue, no
  categorical palette decision needed — see design-system.md on why the `dataviz` skill
  wasn't invoked here). Peer benchmark's honest `n=0` empty state left untouched on
  purpose. **Not live-verified** — no fixture built for this page (time-boxed; the
  10-achievement-type page has a lot of surface and lower marginal risk since it's
  mostly the already-verified `AchievementSection`/badge primitives).
- **Advisor** (`features/advisor/*`) — added `AdvisorContextStrip`, a compact row of
  "what Oryn already knows" chips (biggest gap, upcoming deadline count, weekly time
  budget) above the chat, directly answering the master spec's explicit "don't build a
  generic chatbot with no memory of the student" instruction. Message bubbles and empty
  state re-tinted to brand tokens. **Not live-verified** (needs a real conversation to
  render meaningfully; the context-strip data-fetching was typecheck-verified only).
- **Opportunities** (`features/opportunities/opportunity-card.tsx`) — match tiers and
  deadlines rebuilt on `StatusBadge`/`DeadlineBadge`. **Not live-verified.**
- **Plan + Applications** — `PageHeader`/`EmptyState` throughout;
  `ApplicationStatusControl` (new) is the first UI in the product that can actually
  change an application's status (previously `updateApplicationStatus` existed as a
  server action with zero call sites — a real, if small, functional gap this pass
  closed) and triggers the acceptance-moment celebration on a genuine `→ accepted`
  transition. **Acceptance moment fully live-verified** (exported standalone for the
  preview harness specifically to check the animation); the status `<Select>` and the
  rest of the applications pages are typecheck-verified only.
- **Global search** — was a bare input + flat list (explicitly flagged by chat-1-handoff
  as under-designed). Rebuilt as a keyboard-first command palette
  (`features/search/command-palette.tsx`, Cmd/Ctrl+K, debounced, type-grouped results,
  arrow-key navigation), reachable from the header search icon in both desktop and
  mobile chrome; the dedicated `/search` page kept as a deep-linkable fallback, restyled
  to match. **Fully live-verified**, including the open/close/keyboard-toggle
  interaction and — found during that verification — a real bug: the palette's search
  call had no error handling, so an unconfigured/unreachable backend surfaced as an
  unhandled dev-overlay crash instead of a graceful message. Fixed (try/catch +
  "Search isn't available right now" state) and reverified before moving on.

## Important frontend architecture introduced this pass

- **Page-fetches / `*-view.tsx`-renders split**, demonstrated by
  `dashboard-view.tsx`. Worth applying to any future data-heavy page redesign — it's
  what made fixture-based preview possible without a second copy of the markup, and it's
  better separation of concerns regardless of the sandbox constraint that motivated it.
- **`components/oryn/*`** — the primitive layer described above. New pages should
  compose from these before reaching for a bespoke `<div>`.
- **`lib/motion.ts`** — shared Motion timing constants, mirroring the CSS
  `--duration-*`/`--ease-emphasized` tokens.
- **`lib/dev/fixtures.ts`** + `app/(dev-preview)/design-preview/`** — see design-system.md.

## Functional changes made during UI work (cross-boundary, done carefully)

The operating brief allowed "small backend adjustments... required to support a
genuinely better experience," never touching scoring/admissions/evidence/RLS/AI
semantics. Everything below is additive or a real, narrow bug fix — nothing here changes
existing business logic:

- **V1 social scope** — new migration (`0023_social_v1.sql`), new `lib/social/*`, new
  `/connections` and `/u/[id]` routes, a "Visibility" section on Settings. Full reasoning
  in `product-decisions.md`. **Not run against a live Postgres** — same "no Docker here"
  limitation as every migration in this repo's history; review + `supabase db reset`
  before trusting in a shared environment.
- **Dashboard's opportunity preview now real** — previously a static string with no
  query; now calls the existing `refreshOpportunityMatches` + reads top-2, same pattern
  `/opportunities` already used.
- **`ApplicationStatusControl` built** — `updateApplicationStatus` existed with zero
  call sites before this pass; there was genuinely no way to change an application's
  status from the UI. Now wired, with the acceptance-moment trigger.
- **Command-palette search error handling** — see above; a real crash-on-misconfiguration
  bug, found and fixed during this pass's own verification.
- **`notification_category` gained `'connection'`** — additive enum value (migration),
  used by the new connection-request/accepted notifications.

## Known visual limitations

- **Newsreader (serif) intermittently fails to load in this sandbox** — see
  design-system.md's Typography section. Not a code issue (verified the raw network path
  works via `curl`; the failure is specific to the `next dev` process's own fetch, and
  resolves with a clean `.next` cache + restart). If Chat 3 sees a system-serif fallback
  instead of the intended Newsreader in a screenshot, that's why — check a fresh restart
  before assuming the font config is broken.
- **A pre-existing hydration mismatch, found not introduced**: Base UI's `Progress`
  component (`components/ui/progress.tsx`, used by onboarding and application
  readiness) renders a different `aria-valuetext` server vs. client
  (`"%20"` vs `"20%"`) — cosmetically harmless (only the ARIA string, not the visible
  bar width) but a real hydration warning. Strong suspicion: the sandbox's system
  locale is Turkish (`tr-TR` formats percent as `%20`, prefix-style) while the browser
  client defaults to English — a server/client `Intl` locale mismatch, which would also
  reproduce on a real server deployed with a non-English system locale. Not fixed this
  pass — didn't want to guess at Base UI's locale-pinning API without documentation
  access under this pass's time budget. Worth a real fix (likely an explicit `locale`
  prop on the Progress root, if Base UI exposes one).
- Several surfaces (profile achievement forms, advisor chat with real messages,
  opportunity card in situ, applications list, requirement checklist in situ) are
  typecheck/build-verified and built from patterns already confirmed live elsewhere, but
  were not individually opened in a browser — see the per-surface notes above.

## Known mobile limitations

Verified at 375px: landing, university region-pill fallback, dashboard hero (via preview
harness), acceptance moment. Everything else inherits already-mobile-tested primitives
(the `(app)` layout's `MobileNav`/`Sheet` pattern is unchanged Chat 1 architecture) but
wasn't independently re-checked at mobile width this pass.

## Performance considerations

No new heavy dependencies added. The command palette and acceptance-moment burst are
both plain DOM/SVG + Motion, no new libraries. The world map's existing code-splitting
(`next/dynamic`, `ssr: false`, mobile never mounts it) was left untouched — still the
right architecture. Newsreader is self-hosted at build time by `next/font/google`
exactly like Geist already was — no runtime Google Fonts request ships to the browser.

## Things Chat 3 should specifically attack

1. **Every page not marked "fully live-verified" above** — open each one against a real
   Supabase project and actually look at it. Priority order: profile (largest untested
   surface), applications list + detail, opportunities, advisor with real messages,
   university detail + requirement checklist with real data.
2. **The V1 social feature end-to-end** — sign up two test accounts, share a public
   profile link, send/accept a connection request, verify the notification fires, verify
   a private profile really is invisible to a third account. This was built carefully
   but has zero live testing (no Docker in this sandbox).
3. **The Progress hydration mismatch** — confirm the Turkish-locale theory, decide
   whether it reproduces on the actual deploy target, fix if it does.
4. **Command palette on a real backend** — the error-handling path was tested (backend
   unreachable); the success path (real results, grouped correctly, keyboard nav
   landing on the right href) was not.
5. **Dark mode across every redesigned surface** — spot-checked on the surfaces that
   were live-verified; not exhaustively swept.
6. **Newsreader actually loading** in whatever Chat 3's environment is — confirm it's
   not just this sandbox's flakiness masking a real config problem.
7. General adversarial pass per your own mandate — this pass optimized for coherent
   visual language over exhaustive edge-case hunting, consistent with Chat 2's scope.

## Verification

```
npm run lint        -> clean
npm run typecheck   -> clean
npm run test         -> 108/108 passing, 18 files
npm run build         -> succeeds, all routes compile (including new /connections,
                          /u/[id], and the dev-only /design-preview routes, which
                          statically prerender to a 404 in production as intended)
```

## Git handoff

Two commits this pass: the V1 social-scope backend slice, and (pending, at the end of
this session) the full UI/UX pass. See those commits' own messages for the itemized
diff. No secrets in the tree.
