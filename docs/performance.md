# Performance baseline — 2026-09-01

Phase 48 has never been measured. No document existed before this one. This is a
measurement pass only — nothing in this doc was optimized; every number below is
what the codebase does today, checked directly rather than assumed. Where something
turned out fine, it's written down as fine, not omitted, because the next person
needs to be able to tell whether something regressed.

Four areas, in the order the assignment ranked them.

---

## 1. Client components — which ones need to be

**80 of 179 `.tsx` files under `app/` and `features/` carry `"use client"`** (44.7%).
By directory:

| Directory | `"use client"` files |
|---|---|
| `features/profile` | 14 |
| `features/universities` | 12 |
| `features/settings` | 8 |
| `features/app-shell` | 6 |
| `features/opportunities` | 5 |
| `app/(auth)` | 5 |
| `features/saved` | 4 |
| `features/connections` | 4 |
| `features/onboarding` | 3 |
| `features/applications` | 3 |
| `features/advisor` | 3 |
| `features/admin` | 3 |
| `features/entities` | 2 |
| `features/documents` | 2 |
| `features/dashboard` | 2 |
| `features/search`, `features/messaging`, `app/(dev-preview)`, `app/(app)` | 1 each |

The count alone doesn't say whether that's a problem — the question that matters is
how much of each tree a given boundary pulls in.

**The page level is clean.** Checked the top-level component every `page.tsx`
actually renders (`DashboardView`, `SettingsView`, `SearchView`, `FeaturesView`,
and by extension the others following the same convention) — every one is a
Server Component. Nothing in this codebase makes an entire page client-side at
the root; every "use client" boundary starts somewhere *inside* a server-rendered
tree, not at the top of one. That's the good version of this architecture, and it's
consistent, not a lucky sample.

**Leaf vs. non-leaf, checked rather than assumed:** of the 80 `"use client"`
files, **9 are true leaves** (no import of another `features/` or `components/`
file — a small interactive widget with nothing under it to drag along) and
**71 import at least one further local component.** That 71 is not on its own
evidence of a problem — a client component composing other UI it owns is normal
— but it does mean "how much does this boundary pull in" is a real per-component
question this pass didn't answer file-by-file. That would need either a bundle
analyzer's actual module graph or a manual trace of each of the 71, and 71 manual
traces wasn't a proportionate use of a measurement-only pass. Flagging as the
concrete next step in this area, not doing it speculatively now.

**No bundle analyzer is installed** (`@next/bundle-analyzer` is not a
dependency, nothing configures one in `next.config.ts`). That's the tool that
would turn "71 non-leaf client components" into "these 5 pull in 200KB each,
these 40 pull in 4KB each" — the actual, ranked answer to which boundaries are
worth pushing down. Recommending it as the next concrete step, not installing it
in this pass.

---

## 2. Duplicate queries per render

Checked by tracing every function `/dashboard` and `/advisor` actually call,
not by sampling. Both pages route through the same chain
(`getCounselorState` → `buildStudentAdvisorContext` → `assembleScoringFacts`),
so a duplicate anywhere in that chain hits both of the product's two most-visited
authenticated pages, not an edge case.

**This is real, and some of it is already known — the code says so.** Two of the
duplicates below are already documented in the functions' own comments as
"known, deliberate inefficiency," landed additively rather than restructured. A
third, and the cross-table pattern underneath all of them, was not previously
written down anywhere I could find.

### The chain, traced

`/dashboard` calls, per render:
1. `refreshOpportunityMatches(userId, locale)` directly
2. `getCounselorState(userId, locale)`, which itself calls:
   - `refreshOpportunityMatches(userId, locale)` again — **documented duplicate**
     (`lib/counselor/state.ts:92`'s own comment: "a known, small duplicate read")
   - `assembleScoringFacts(supabase, userId)` directly, *and*
   - `buildStudentAdvisorContext(userId)`, which calls `assembleScoringFacts`
     again internally — **documented duplicate**
     (`lib/counselor/state.ts:81-87`'s own comment: "one duplicate round of
     ~10 lightweight parallel queries per Counselor page load")
   - `buildStudentAdvisorContext` also calls `getUpcomingDeadlines` internally
3. `getUpcomingDeadlines(supabase, userId, 4)` directly, in the same
   `Promise.all` as several other reads

Step 2's `getUpcomingDeadlines` and step 3 are the same function, same user,
same page render — called twice. **Not documented anywhere before this pass.**

### What each duplicated call actually costs, counted directly from the functions

| Function | Reads it performs | Called how many times per `/dashboard` render |
|---|---|---|
| `refreshOpportunityMatches` (`lib/opportunities/persist-matches.ts`) | 5 parallel reads (`profiles`, `profile_scores`, `student_interests`, `opportunities`, `saved_opportunities`) + 1 write (`opportunity_matches` upsert) | **2** |
| `assembleScoringFacts` (`lib/scoring/assemble-facts.ts`) | 13 parallel reads, one per achievement/profile table | **2** |
| `getUpcomingDeadlines` (`lib/deadlines/upcoming.ts`) | up to 9 reads across its three sub-sources (applications/targets/universities, saved-opportunities/opportunities, target-universities/deadlines/universities) plus its own `loadSupersessionMap` call | **2** |
| `loadSupersessionMap` (`lib/universities/canonical.ts`) — a 1-query read of a 9-row table, per its own comment | called independently inside `getTargetUniversitiesWithDetails`, inside *each* of the two `getUpcomingDeadlines` calls, and inside `buildStudentAdvisorContext` | **≥4** |
| raw `profiles` table (not routed through the memoized `getCurrentProfile()` — see below) | read directly inside `refreshOpportunityMatches`, inside `getCounselorState`'s own query, and inside `buildStudentAdvisorContext` | **≥3** |
| `student_interests` | read directly inside `refreshOpportunityMatches` and again inside `buildStudentAdvisorContext` | **2** |
| `ai_recommendations` | read with an overlapping filter by the dashboard directly and inside `buildStudentAdvisorContext` | **2** |
| `opportunity_matches` | read by the dashboard's own preview query and again, unfiltered by score, inside `getCounselorState` | **2** |

Every row above is a genuine second (or third, or fourth) round trip for data
already fetched once in the same render — not a guess, traced from the actual
`Promise.all` calls in `app/(app)/dashboard/page.tsx`, `lib/counselor/state.ts`,
and `lib/ai/student-context.ts`.

### The tool for fixing this already exists in the codebase, applied narrowly

React's `cache()` — Next.js's built-in per-request memoization, which turns
"the same function called twice with the same arguments in one render" into one
actual database round trip — **is already used in this codebase**, in exactly
two files: `lib/security/dal.ts` (`verifySession`, `getCurrentProfile`) and
`lib/i18n/locale.ts` (`resolveLocale`). That's why `getCurrentProfile()`
specifically is *not* a duplicate here — it's the one `profiles` read that's
already protected.

None of the ~10 data-fetching functions in the chain above
(`assembleScoringFacts`, `refreshOpportunityMatches`, `getUpcomingDeadlines`,
`loadSupersessionMap`, `buildStudentAdvisorContext`, `getCounselorState`,
`getTargetUniversitiesWithDetails`) are wrapped in it. The pattern is proven,
in production, in this exact codebase — it just wasn't extended past the two
auth functions it started on. That makes this a smaller lift than it would be
in a codebase starting from zero, and is the concrete next step this area
points to. Not applied in this pass, per the instruction to measure first.

---

## 3. Bundle size per route

**Total client-side JS: 2.9MB** across `.next/static/chunks` after a production
build (`next build`, Turbopack, this session).

**Per-route breakdown is not available from this build setup.** Checked directly
rather than assumed: `next build`'s own console output on Next.js 16 + Turbopack
lists routes with only a static (`○`)/dynamic (`ƒ`) marker, no size column —
unlike the classic webpack build output, which used to print a "First Load JS"
figure per route. `.next/build-manifest.json` exists but its `pages` map is
effectively empty for an App Router build (one `/_app` entry, 0 files) — it's a
Pages Router-era artifact Turbopack doesn't populate the way it used to.
No `app-build-manifest.json` was generated either.

Getting a real per-route number needs `@next/bundle-analyzer` (not currently a
dependency) or manually mapping the hashed chunk filenames in
`.next/static/chunks` back to routes, which the build doesn't expose a manifest
for. **2.9MB total is the honest baseline this pass can report** — installing
the analyzer is the concrete next step for turning it into a per-route number,
and it's the natural pairing with section 1's leaf/non-leaf question: the
analyzer answers both "which route is heavy" and "which client boundary made it
heavy" from the same data.

Every real route in the app renders dynamically (`ƒ`) — only `/apple-icon.png`
and `/icon.png` are static (`○`). That's expected and correct for an
authenticated, personalized product, not a gap: there is no page here that
*could* be static without either faking personalization or serving one
student's dashboard to another.

---

## 4. Repeated external calls

**Clean, checked directly.** `grep`ing `app/` and `features/` for any import of
`lib/providers/*` (the shared layer for Tavily, College Scorecard, and OpenAlex
— `lib/providers/fetch-json.ts`'s `fetchProviderJson`) returns **zero results.**
No page render, ever, calls an external provider directly. Every real caller is
either a one-shot CLI script (`scripts/*.ts`) or a background-job library
function (`lib/opportunities/discover.ts`, `lib/universities/sync-us-universities.ts`,
`lib/requirements/discover.ts`) reached only through the `/api/jobs/*` cron
routes — never a student's own page load.

That means the actual answer to "is a university/opportunity read cached or
re-fetched per request" is: **neither — a page never talks to an external
provider at all.** Every student-facing read goes to Supabase, which the
background jobs populate on their own schedule. Phase 27's "repeated external
calls" risk, read literally, doesn't exist in the current architecture, and
that's worth writing down precisely because it's easy to assume otherwise.

**A related but distinct gap, surfaced by the same question:** Phase 27 also
asks for caching of *global public data* specifically (data identical for every
student — the `universities` table, the `opportunities` catalogue). Checked for
`unstable_cache` (Next.js's data-cache primitive, the mechanism that would let
identical-for-everyone data be computed once and reused across requests) across
the whole codebase: **zero uses.** Every page that reads `universities` or
`opportunities` does a fresh Supabase round trip on every single request, mixed
in with that request's personalized queries, with no distinction between the
part of the query that's the same for every student and the part that isn't.
This is a real, unaddressed instance of what Phase 27 asks for — separate from
the external-API question, which is fine — and is the concrete next step for
this area.

---

## Recommendations (not applied — for visibility, ranked by what they'd buy)

1. **Wrap the ~10 duplicated data-fetching functions in `react`'s `cache()`.**
   Directly removes the ≥2x-4x duplicate reads traced in section 2, on the
   product's two busiest pages. The pattern is already proven in this
   codebase (`lib/security/dal.ts`, `lib/i18n/locale.ts`) — this is extending
   an existing convention, not introducing a new one.
2. **Install `@next/bundle-analyzer`.** Turns section 1's "71 non-leaf client
   components, unranked" and section 3's "2.9MB total, no per-route number"
   into one real, actionable, ranked list — which specific boundaries and
   which specific routes are actually worth touching.
3. **Wrap global-data reads (`universities`, `opportunities` catalogue) in
   `unstable_cache`.** Closes the literal Phase 27 gap in section 4 without
   touching anything personalized.

Nothing above was implemented in this pass. Each is scoped enough to be a
follow-up someone can pick up directly from this document.

## Method

- Client-component counts: `grep -rl '"use client"' app features --include="*.tsx"`,
  cross-checked against a manual read of each top-level page component and a
  per-file import count for the leaf/non-leaf split.
- Duplicate queries: read `app/(app)/dashboard/page.tsx`,
  `app/(app)/advisor/page.tsx`, `lib/counselor/state.ts`,
  `lib/ai/student-context.ts`, `lib/opportunities/persist-matches.ts`,
  `lib/scoring/assemble-facts.ts`, `lib/deadlines/upcoming.ts`,
  `lib/universities/canonical.ts`, `lib/universities/queries.ts`, and
  `lib/security/dal.ts` in full; every query count in the table above is a
  direct count of `.from(...)` calls in those files, not an estimate.
- Bundle size: `npm run build` (Next.js 16.3.1, Turbopack) on this branch,
  then `du -sh .next/static/chunks` and an inspection of
  `.next/build-manifest.json`.
- External calls: `grep` for `lib/providers` imports across `app/` and
  `features/`, and for `unstable_cache` across the whole repo.
- No AI/model calls were made in this pass. No migration, code change, or
  data write was made in this pass — this document is the only artifact.
