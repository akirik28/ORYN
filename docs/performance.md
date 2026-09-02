# Performance baseline — 2026-09-01, re-measured 2026-09-02

Phase 48 has never been measured. No document existed before 2026-09-01. This is a
measurement pass only — nothing in this doc was optimized; every number below is
what the codebase does today, checked directly rather than assumed. Where something
turned out fine, it's written down as fine, not omitted, because the next person
needs to be able to tell whether something regressed.

> ### Re-measured 2026-09-02, ahead of the first deploy — roughly 50 packages merged
> ### since the original pass. Confirmed what held, found two things that didn't exist
> ### before, and covered `/universities/[id]` for the first time.
>
> **Section 2's core finding still holds, unchanged**: `createClient()` is still not
> memoized (checked `lib/supabase/server.ts` directly), the dashboard/advisor
> duplicate chain is structurally identical to what's described below (re-read
> `app/(app)/dashboard/page.tsx` in full; same functions, same call sites, same
> "known duplicate" comments still in place), and query counts in the chain's own
> functions are unchanged (`assembleScoringFacts`: 13 reads, matching exactly).
>
> **New since 2026-09-01, and it makes section 2's finding worse, not just
> unchanged**: `app/(app)/layout.tsx` — which wraps *every* authenticated page, not
> just dashboard/advisor — now fetches `profile_scores` in its own `Promise.all`
> (alongside two `notifications` queries for the bell/unread-count, the "changed
> notification bell" work). Real, deliberate work with a clear reason in its own
> comment (the account menu needs qualitative per-dimension data, not just the raw
> `profile_strength_score` column), and it correctly batches into the *existing*
> `Promise.all` rather than adding a separate round trip. But it's a fourth
> `profile_scores` read stacking on the three already traced below
> (dashboard's own, `getCounselorState`'s, `buildStudentAdvisorContext`'s) — through
> its own fresh, unmemoized `createClient()` — since it's a layout, it now runs this
> extra read on **every single page a student visits**, not just dashboard/advisor.
>
> **`/universities/[id]`, traced for the first time (section 5, new below)**: worse
> than the dashboard/advisor chain, not comparable to it — six distinct duplicate-read
> categories on one page, up to ~25 round trips for one full render, and the same
> "raw `profiles` table, not routed through the memoized `getCurrentProfile()`"
> pattern recurring in a second place.
>
> **Unchanged, re-checked directly**: client-component ratio (83 of 198 `.tsx` files
> now vs. 80 of 179 — the ratio slightly *improved*, 41.9% vs. 44.7%, so tonight's ~19
> new `.tsx` files skewed Server Component). No bundle analyzer installed. No
> `unstable_cache` anywhere. Zero page renders call an external provider directly —
> section 4's "clean" finding still holds exactly as measured. Bundle size grew from
> 2.9MB to **3.4MB** total client JS (~17%, consistent with the merge volume); still
> no per-route breakdown available from this Turbopack build (`app-build-manifest.json`
> still doesn't exist) — same tooling gap, not re-investigated further this pass.

Five areas now (`/universities/[id]` added as its own section) — the original four
in the order that first assignment ranked them, plus the new one.

> ### Fixed 2026-09-02: `getProfileScores(userId)`, the top recommendation, built and
> ### wired — with a measured after-number, not an assumed one, and one real
> ### methodology surprise along the way.
>
> **Built** `lib/security/dal.ts`'s `getProfileScores(userId)`, `cache()`-wrapped,
> mirroring `getCurrentProfile()`'s exact shape (constructs its own `createClient()`
> internally rather than accepting one as a parameter — load-bearing, not style, per
> this doc's own "What actually memoizing this needs" above). Wired into all seven
> call sites that co-occur with each other in a real request: the layout (every page),
> `app/(app)/dashboard/page.tsx`, `app/(app)/advisor/page.tsx`,
> `app/(app)/universities/[id]/page.tsx`, `lib/counselor/state.ts`'s
> `getCounselorState` (feeds both dashboard and advisor — a duplicate this document
> hadn't separately named before this pass), `lib/opportunities/persist-matches.ts`'s
> `refreshOpportunityMatches` (called twice per dashboard render on its own, already
> documented above), and `lib/admissions/persist.ts`'s `refreshAdmissionOutlook`. The
> last two keep a conditional fallback to a direct query when called with an explicit
> admin/background-job client (`refreshAdmissionOutlook` from `scanStaleOutlooks`,
> `getCounselorState` from the weekly-plan path) — that path has no request/cookies
> for the memoized helper's own `createClient()` to read, so it isn't a fit there, and
> forcing it through anyway would have been the same category of "helper that looks
> like a fix and changes nothing" this doc already warned against, just via a
> different mechanism than a mismatched `supabase` argument.
>
> **Not touched, on purpose**: `app/(app)/profile/page.tsx`, `lib/benchmarking/*`, and
> `lib/scoring/monthly-review.ts` also read `profile_scores`, but none were part of the
> chains this document measured and reported duplication for — `benchmarking/cohort.ts`
> in particular reads *many* students' scores at once via the admin client, a
> structurally different query this helper isn't shaped for at all. Extending the fix
> there is a real, obvious follow-up, not a gap in this pass — flagged rather than
> quietly done, per the instruction not to manufacture more work than what was measured.
>
> **The before number, precisely**: `profile_scores` had **three** independent reads
> on a single `/dashboard` or `/advisor` render (the layout's, the page's own, and
> `getCounselorState`'s), plus **two more** from `refreshOpportunityMatches` firing
> twice in that same render (direct + inside `getCounselorState`) — five logical calls
> to fetch identical rows, not the two or three this document had separately named
> before tracing the fix precisely. `/universities/[id]` had three (layout, the page's
> own, `refreshAdmissionOutlook`'s).
>
> **The after number — proved live, not assumed from reading the code.** Two things
> made "just trust `cache()`" not good enough here: this codebase had never actually
> tested that `cache()` dedupes (no existing test for `getCurrentProfile()`/
> `verifySession()`'s own dedup either — its correctness has always rested on trusting
> React's documented behavior plus production use, not a regression test), and a
> direct probe proved that trust can't extend to every context blindly:
>
> - **A bare Vitest call of a `cache()`-wrapped function, called twice with the same
>   argument, does NOT dedupe** — 2 real calls, not 1. No active Next.js
>   request-render scope exists outside the real server runtime for `cache()` to
>   attach to. Ruled out unit tests as a way to verify this fix at all.
> - **A Next.js Route Handler does NOT dedupe either** — three calls to
>   `getProfileScores(sameUserId)` from inside one `GET` handler fired **three** real
>   queries, not one. Route Handlers are plain functions Next.js invokes directly;
>   they are not part of the React Server Component render tree `cache()` actually
>   scopes itself to. This is a genuinely new, generalizable finding, not specific to
>   this fix — any future code assuming a `cache()`-wrapped helper dedupes inside an
>   `/api/**/route.ts` handler (including every `/api/jobs/*` cron route) is wrong to
>   assume that, and should verify the same way this entry did.
> - **A real Server Component page render is where it actually works.** A temporary
>   dev-only page (`/design-preview/verify-cache-dedup`, removed after this
>   measurement — not part of this commit) called `getProfileScores(sameUserId)`
>   three times in one render, instrumented with a real invocation counter on the
>   underlying query: **3 logical calls → 1 real query fired**, confirmed on three
>   independent requests (curl twice, a real browser render once), with a same-render
>   sanity check that a *different* `userId` right after correctly did **not** share
>   that cache entry (1 logical call → 1 real query) — ruling out "the counter is
>   stuck at 1" as an alternative explanation for the first result.
>
> **So: five duplicate reads collapse to one, confirmed by direct measurement of the
> actual mechanism this fix depends on, from the same kind of entry point
> (`layout.tsx`/`page.tsx`) every real call site actually is** — not a Route Handler,
> not a bare test, the one context that was actually load-bearing.
>
> **Does this close `/universities/[id]`'s remaining duplication? No — it closes one
> of six.** `profile_scores` was one of the six duplicate-read categories section 5
> names for that page. The other five — `universities` fetched 3×, `loadSupersessionMap`
> 2×, `university_statistics` 2×, `university_requirements` 2×, and raw `profiles`
> read outside `getCurrentProfile()` a second time inside `refreshAdmissionOutlook` —
> are untouched by this fix, since none of them are `profile_scores`. Section 5's
> `/universities/[id]` still has its own real duplication and, per this session's
> earlier judgment, is a second package if it's worth pursuing — not something this
> pass closed "for free."
>
> **Verification**: all 4 gates green (242 files / 3,416 tests). One existing test
> (`__tests__/security/computed-writes-use-admin-client.test.ts`) needed updating —
> it pinned the literal source text of the old inline `profile_scores` query in
> `persist-matches.ts` as part of a real security regression check (reads must stay
> RLS-scoped, writes must use the admin client); updated the assertion to check for
> the new shared-helper call instead of the old inline query, preserving the same
> underlying property it was protecting (`getProfileScores` also only ever uses
> `createClient()`, never an admin client).

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

**Amended after review (2026-09-01): the first pass of this section undercounted
`getUpcomingDeadlines`'s call sites (missed a third) and, more importantly,
described a fix that would pass every gate without actually removing the
duplication. Both are corrected below — see "What actually memoizing this
needs."**

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
   - `buildStudentAdvisorContext` also calls `getUpcomingDeadlines(supabase, userId, 5)`
     internally
3. `getUpcomingDeadlines(supabase, userId, 4)` directly, in the same
   `Promise.all` as several other reads

`/advisor` calls the identical chain (`getCounselorState` →
`buildStudentAdvisorContext`) and additionally calls
`getUpcomingDeadlines(supabase, userId, 10)` directly — a *third* call site for
that function codebase-wide, not two. All three: `dashboard/page.tsx:91` (limit
4), `advisor/page.tsx:36` (limit 10), `lib/ai/student-context.ts:185` (limit 5).
**Not documented anywhere before this pass.**

`assembleScoringFacts` has **four** call sites codebase-wide, not two:
`lib/counselor/state.ts:97` and `lib/ai/student-context.ts:162` (the pair that
actually co-occurs in one dashboard/advisor render — this is the real
duplicate), plus `app/(app)/profile/page.tsx:163` (its own separate render,
not a duplicate on its own) and `lib/scoring/persist.ts:47` inside
`recomputeCareerProfile` (fired from write-path Server Actions after achievement
edits, never from a page render — also not a render-time duplicate). Only the
first pair is the finding; naming all four here so nothing is left for someone
else to have to re-derive.

### What each duplicated call actually costs, counted directly from the functions

| Function | Reads it performs | Called how many times per render, and with what arguments |
|---|---|---|
| `refreshOpportunityMatches` (`lib/opportunities/persist-matches.ts`) | 5 parallel reads (`profiles`, `profile_scores`, `student_interests`, `opportunities`, `saved_opportunities`) + 1 write (`opportunity_matches` upsert) | **2**, identical arguments (`userId`, `locale`) both times |
| `assembleScoringFacts` (`lib/scoring/assemble-facts.ts`) | 13 parallel reads, one per achievement/profile table | **2** per dashboard/advisor render, identical arguments (`userId`) — see the 4-call-site note above for the other two, non-duplicating sites |
| `getUpcomingDeadlines` (`lib/deadlines/upcoming.ts`) | up to 9 reads across its three sub-sources (applications/targets/universities, saved-opportunities/opportunities, target-universities/deadlines/universities) plus its own `loadSupersessionMap` call | **2** per render, but with a **different `limit` each time** — dashboard: 4 vs. 5; advisor: 10 vs. 5. Argument mismatch, not just a missed cache — see below |
| `loadSupersessionMap` (`lib/universities/canonical.ts`) — a 1-query read of a 9-row table, per its own comment | called independently inside `getTargetUniversitiesWithDetails`, inside *each* of the two `getUpcomingDeadlines` calls, and inside `buildStudentAdvisorContext` | **≥4** |
| raw `profiles` table (not routed through the memoized `getCurrentProfile()` — see below) | read directly inside `refreshOpportunityMatches`, inside `getCounselorState`'s own query, and inside `buildStudentAdvisorContext` | **≥3** |
| `student_interests` | read directly inside `refreshOpportunityMatches` and again inside `buildStudentAdvisorContext` | **2** |
| `ai_recommendations` | read with an overlapping filter by the dashboard directly and inside `buildStudentAdvisorContext` | **2** |
| `opportunity_matches` | read by the dashboard's own preview query and again, unfiltered by score, inside `getCounselorState` | **2** |

Every row above is a genuine second (or third, or fourth) round trip for data
already fetched once in the same render — not a guess, traced from the actual
`Promise.all` calls in `app/(app)/dashboard/page.tsx`, `app/(app)/advisor/page.tsx`,
`lib/counselor/state.ts`, and `lib/ai/student-context.ts`.

### The tool for fixing this already exists in the codebase, applied narrowly — but not sufficient by itself

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
auth functions it started on. **That makes this a smaller lift than it would be
in a codebase starting from zero, but it is not a drop-in fix for these
particular functions** — see below for why, and for what the fix actually is.

### What actually memoizing this needs

`cache()` memoizes on argument *identity*, not on what the arguments mean.
`createClient()` (`lib/supabase/server.ts`) is **not itself memoized** — it
builds a fresh `createServerClient` on every call, with no `cache()` wrapper.
`getCounselorState` awaits its own `createClient()` call; `buildStudentAdvisorContext`
awaits a second, independent one. So the two `assembleScoringFacts(supabase, userId)`
calls traced above arrive with **two different `supabase` object references** —
a `cache()` wrapper around `assembleScoringFacts` would see them as two
different calls and miss both times, doing all the same round trips this
document already counted, while looking fixed. Same problem for
`loadSupersessionMap(supabase)`, which takes no argument but `supabase`.

`getUpcomingDeadlines` has a second, independent reason `cache()` alone
wouldn't help even with a memoized client: its three call sites pass **three
different `limit` values** (4, 10, 5). Those are legitimately different calls —
memoization is correctly a miss on different arguments. Deduping this one needs
the call sites reconciled (fetch once at the largest limit a render actually
needs and slice down, rather than three independent fetches), not a cache
wrapper.

So the actual fix is at least three separate pieces of work, not one:

1. **Memoize `createClient` itself** with `cache()` — the enabling step, and
   genuinely the same one-line pattern `lib/security/dal.ts` already uses for
   `verifySession`/`getCurrentProfile`. Once request-scoped calls to
   `createClient()` return the same object, `cache()` on `assembleScoringFacts`
   and `loadSupersessionMap` starts actually deduping.
2. **Or, more invasively:** drop the `supabase` parameter from the memoized
   functions' signatures entirely and have them call the (now-memoized)
   client internally, keying `cache()` purely on `userId`. Cleaner call
   sites, bigger diff.
3. **Reconcile the `getUpcomingDeadlines` limits separately.** No amount of
   memoization fixes 4-vs-10-vs-5 — this needs the three call sites agreeing
   on one fetch.

None of this weakens the finding: the duplication traced above is real either
way, and "the tool is already in this codebase, proven" is still the right
frame. What's corrected is that it's an enabling step plus two follow-on
fixes, not a single wrapper — see Recommendation 1.

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

**This section is about page renders specifically — not a blanket "external
calls are fine."** What's established below is narrower and, read correctly,
better: pages never call an external provider at all, so the question of
whether a *page render* re-fetches or caches an external call doesn't arise.
It says nothing about whether the background jobs themselves ever fetch the
same URL redundantly across runs — that's a different question this pass
didn't check, since it's a job-scheduling question, not a render-time one.

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

## 5. `/universities/[id]` — traced for the first time, 2026-09-02

Same method as section 2: read every function the page actually calls, in full, and
count `.from(...)` calls directly rather than estimate. `app/(app)/universities/[id]/page.tsx`
is 842 lines; the trace covers it plus `lib/admissions/persist.ts`
(`refreshAdmissionOutlook`), `lib/requirements/persist.ts`
(`refreshRequirementEvaluations`), and `lib/requirements/facts.ts`
(`assembleRequirementFacts`), which it calls into.

**Six distinct duplicate-read categories on one page — more than the dashboard/advisor
chain, not a smaller version of it:**

| Data | Fetched by | Times per render |
|---|---|---|
| `universities` row (this university) | `generateMetadata` (name only), the page itself (`select("*")`), `refreshAdmissionOutlook` (name + country) | **3** |
| `loadSupersessionMap` (the 9-row supersession table) | `generateMetadata`, the page itself | **2** |
| `profile_scores` (this student) | the page's own `Promise.all`, `refreshAdmissionOutlook` | **2** |
| `university_statistics` (this university) | the page's own `Promise.all`, `refreshAdmissionOutlook` | **2** |
| `university_requirements` (this university, full `select("*")`) | the page's own `Promise.all`, `refreshRequirementEvaluations` | **2**, identical query both times |
| `profiles` (this student) | raw, direct in `refreshAdmissionOutlook` — **not** routed through the memoized `getCurrentProfile()`, even though the page itself calls `getCurrentProfile()` separately a few lines later | **≥2** distinct paths |

That last row is the same shape section 2 already named for the dashboard chain
("raw `profiles` table, not routed through `getCurrentProfile()`") — it isn't a new
kind of problem, it's the same one recurring in a second place, which is itself worth
knowing: the fix in Recommendation 1 below, if applied to `createClient()` and the
memoized helpers generally, would close this instance too, not just the dashboard one.

**Why this happens, structurally**: `generateMetadata` and the page component are two
*separate* render passes (a documented Next.js App Router behavior, not a bug) — each
builds its own `createClient()` and calls `loadSupersessionMap`/reads `universities`
independently, with nothing shared between them. Inside the page itself,
`refreshAdmissionOutlook` and `refreshRequirementEvaluations` are called with **no**
`supabase` argument, so each constructs its own fourth and fifth `createClient()` — by
design, per their own doc comments, both are meant to be safely callable from
anywhere (a page render, a scheduled sweep), which is a real and reasonable design
goal; the cost is that "callable from anywhere" also means "shares nothing with a
render that already has the data" once the page's own `Promise.all` already fetched
the same tables.

**Total round trips for one full render** (a page with both a saved target and
applicable requirements — the "everything renders" case, not an edge case for a
student actively evaluating universities): 2 (`generateMetadata`) + 2
(`loadSupersessionMap` + full `universities` row) + 9 (the page's own `Promise.all`:
programs, requirements, deadlines, statistics, sources, target, profile_scores,
rankings, metrics) + up to 6 (`refreshAdmissionOutlook`: target lookup + 4 parallel
reads + 1 write) + up to 6 (`refreshRequirementEvaluations`: requirements + 4 parallel
facts reads + 1 write) + 2 (`getCurrentProfile()` + `student_requirement_evaluations`)
≈ **25–28 round trips for one page view.** No AI/model call anywhere in this chain
(checked directly — `refreshAdmissionOutlook` and `refreshRequirementEvaluations` are
both explicitly documented as deterministic, no-AI, and grepping both files plus
`lib/requirements/evaluate.ts` for any AI-provider import confirms it), so this is a
database-round-trip cost specifically, not an added AI-spend cost — worth being
precise about, since the two are easy to conflate and only one of them is what this
section measured.

**What's already good practice here, stated as clearly as the problems**: within each
individual function, the reads that *can* run in parallel already do (the page's own
9-query `Promise.all`, `refreshAdmissionOutlook`'s 4-query `Promise.all`,
`assembleRequirementFacts`' 4-query `Promise.all`) — nothing in this trace found a
*sequential* chain of awaits that should have been one `Promise.all` within a single
function. The waste here is entirely cross-function duplication, not serial
round-tripping.

### Fixed 2026-09-02: the other five categories, and the open question measured rather than assumed

`profile_scores` (category 1 of 6, above) was already closed by the `getProfileScores`
helper before this pass started. The remaining five — `universities` (3x),
`loadSupersessionMap` (2x), `university_statistics` (2x), `university_requirements` (2x,
identical query both times), and raw `profiles` bypassing `getCurrentProfile()` — are
closed the same way: four new `cache()`-wrapped helpers in
`lib/universities/detail-reads.ts` (`getUniversity`, `getUniversityStatistics`,
`getUniversityRequirements`, `getSupersessionMap`), each constructing its own
`createClient()` internally for the identical reason `getProfileScores` does (see that
function's own comment) — plus routing `refreshAdmissionOutlook`'s one raw `profiles` read
through `getCurrentProfile()` on the request-scoped path, mirroring the `scoresPromise`
conditional-fallback shape it already used for `profile_scores` (background-sweep callers
that pass an explicit admin `client` keep their own direct queries; there is no
request/cookie for the memoized helpers to read there).

**This section's own open question — whether `cache()` actually spans `generateMetadata`
and the page component, two separate Next.js render passes — was measured, not assumed,**
the same way the `getProfileScores` package proved its own dedup. A bare Vitest call or a
Route Handler can't answer this (§2 already established neither gives `cache()` a real
render scope to key on), and the real `/universities/[id]` route can't be exercised
end-to-end here either: it requires an authenticated session, this environment has no
usable test-account credentials, and creating one would be a live write this project's own
standing rule refuses ("no writes to shared live DB, not even a self-cleaned test"). So the
measurement used a temporary, dev-only diagnostic route instead
(`app/(dev-preview)/design-preview/cache-measure/`, deleted before this commit, alongside
temporary `console.log` instrumentation in `detail-reads.ts`, also reverted) — it needs no
auth at all, calls the same shared helpers `generateMetadata` and the page body call, for a
real `universities` row (LSE). Three findings, each confirmed against the real dev server,
not inferred:

- **`cache()` does span `generateMetadata` and the page component.** `getSupersessionMap()`
  and `getUniversity(id)`, each called once from a `generateMetadata`-equivalent and once
  from the page body, produced exactly **one** `[MEASURE] ... MISS` log line each per
  request, not two — confirmed by grepping the dev server's own stdout after each hit.
- **No cross-request leakage.** A second, independent request produced its own fresh set of
  misses (the counts reset), not zero — `cache()` is correctly per-request, never reusing a
  prior visitor's result.
- **Different arguments are correctly not conflated.** Calling `getUniversity` a second
  time in the same request with a different (fake) id produced a genuine second miss for
  that id, not a spurious hit against the real one already cached.

**What this changes for the round-trip count** (same "everything renders" scenario as the
25-28 figure above — a target saved and requirements applicable, computed from the code
post-fix, the same read-every-function-in-full method as the rest of this section, not a
live trace of an authenticated request):

| Stage | Before | After | Why |
|---|---|---|---|
| `generateMetadata` | 2 | 2 | Unchanged — still the first access, still 2 real reads, but now the *only* two for `universities`/supersession in the whole render. |
| Page's own supersession + full `universities` row | 2 | 0 | Both now cache hits against `generateMetadata`'s reads. |
| Page's own `Promise.all` (9 entries) | 9 | 9 | Same count — `university_requirements`/`university_statistics` are now cache-wrapped calls, but this is still their first access, so each is still one real read here. The saving shows up downstream, not here. |
| `refreshAdmissionOutlook` (target lookup, profile, scores, stats, university, program, write) | up to 6 | up to 4 | `profiles` (now `getCurrentProfile()`), `profile_scores`, `university_statistics`, and `universities` are all cache hits by this point; target lookup, the conditional program read, and the write are unchanged. |
| `refreshRequirementEvaluations` (requirements, 4 facts reads, write) | up to 6 | up to 5 | `university_requirements` is now a cache hit; the 4 student-fact reads and the write are unchanged and out of this section's scope. |
| Final `Promise.all` (`getCurrentProfile()` + `student_requirement_evaluations`) | 2 | 1 | `getCurrentProfile()` is now a cache hit (whichever of `refreshAdmissionOutlook` or this call runs first pays for it once). |
| **Total** | **~25-28** | **~19-21** | **6 round trips removed** — matches summing each category's own before/after independently (universities 3→1, supersession 2→1, statistics 2→1, requirements 2→1, profiles 2→1 — five savings of one each, plus the shared-first-access counting above). |

Not closed by this pass, named precisely rather than left implicit: `university_programs`
fetched 3x is real (page's `Promise.all`, `refreshAdmissionOutlook`'s conditional
`programRes`, and `assembleRequirementFacts`' course-level reads are three genuinely
different queries, not the same row — no dedup opportunity here, only three distinct
questions), and `target_universities` is read with two different filters
(`eq("university_id", id)` in the page, `eq("id", targetUniversityId)` in
`refreshAdmissionOutlook`) that resolve to the same row when the caller is this page —
worth a look, but outside the six categories this document named, so not fixed
speculatively here.

Gate: lint/typecheck/3484 tests (one updated — `computed-writes-use-admin-client.test.ts`'s
`university_requirements` source-text pin, same shape as the `profile_scores` update the
prior package made, checking for the new shared-helper call rather than the old inline
query, preserving the same underlying RLS-vs-admin-client property)/build, all pass.

---

## Recommendations (not applied — for visibility, ranked by what they'd buy)

1. ~~Memoize `createClient()` with `cache()` — the single enabling step.~~
   **Done differently, 2026-09-02 — turned out not to be needed as its own
   step.** `getProfileScores` (item 2) achieves the same effect the way
   `getCurrentProfile()` always has: it's the *outer* function that's
   `cache()`-wrapped, and it constructs its own `createClient()` internally
   — since `cache()` memoizes the whole call including everything inside it,
   an unmemoized `createClient()` never matters as long as nothing calls it
   from *outside* an already-memoized wrapper. This was option 2 from this
   item's own original text ("drop `supabase` from the memoized functions'
   own signatures"), not option 1 (a standalone memoized `createClient()`) —
   the standalone version was never built and isn't needed for this fix to
   work; it would only matter for a *different* function that wanted to
   accept a client as a parameter and still dedupe, which none of the
   `profile_scores` call sites needed to.
2. ~~Add a `getProfileScores(userId)` memoized helper...~~ **Built and
   wired, 2026-09-02 — see the dated entry above this list for the full
   before/after, including the proof that it actually dedupes (and where it
   doesn't).** Five duplicate `profile_scores` reads per dashboard/advisor
   render collapse to one, confirmed live. `/universities/[id]`'s other five
   duplicate-read categories are untouched — this closed one of six, not the
   whole page.
3. **Reconcile section 2's `getUpcomingDeadlines` (limits 4/10/5) and thread
   the page's own `supabase` client into `refreshAdmissionOutlook`/
   `refreshRequirementEvaluations` on `/universities/[id]`** rather than
   letting each construct its own. The former already accepts an optional
   `client` parameter — the page just isn't passing it, a one-line change.
   The latter would need the same parameter added. Neither removes the
   *data* duplication (a shared client doesn't dedupe two different
   `.from("profile_scores")` calls on its own — item 2's approach is what
   does that for `profile_scores` specifically); this item removes the
   *client-construction* overhead (cookie parsing + object init, 4–5 times
   down to 1–2) and is safe to do independently of items 1–2.
4. **Install `@next/bundle-analyzer`.** Turns section 1's "71 non-leaf client
   components, unranked" and section 3's "3.4MB total, no per-route number"
   into one real, actionable, ranked list — which specific boundaries and
   which specific routes are actually worth touching. What it costs: an
   official Vercel/Next.js package (published in step with this project's own
   Next.js 16.x line), one dependency of its own
   (`webpack-bundle-analyzer`), and it's a `devDependency` — it never ships
   to the production bundle it measures. Setup is a few lines in
   `next.config.ts` (wrapping the existing config export) plus running the
   build with an `ANALYZE=true` env var to get the report; no ongoing
   runtime cost.
5. **Wrap global-data reads (`universities`, `opportunities` catalogue) in
   `unstable_cache`.** Closes the literal Phase 27 gap in section 4 without
   touching anything personalized.

Nothing above was implemented in this pass, 2026-09-01 or 2026-09-02 — each is
scoped enough to be a follow-up someone can pick up directly from this
document. Deliberately not implemented tonight either: this is the night
before a first deploy, and speculatively touching the request-scoped client
every authenticated page depends on, right before that deploy, trades a
measured-but-unproven performance gain against a real regression risk with no
time left to catch it. Recommendation 3's one-line client-threading is the
exception worth reconsidering — it's additive (an optional parameter already
exists on one of the two functions) and behavior-preserving by construction,
not a restructuring.

## Method

- Client-component counts: `grep -rl '"use client"' app features --include="*.tsx"`,
  cross-checked against a manual read of each top-level page component and a
  per-file import count for the leaf/non-leaf split.
- Duplicate queries: read `app/(app)/dashboard/page.tsx`,
  `app/(app)/advisor/page.tsx`, `lib/counselor/state.ts`,
  `lib/ai/student-context.ts`, `lib/opportunities/persist-matches.ts`,
  `lib/scoring/assemble-facts.ts`, `lib/deadlines/upcoming.ts`,
  `lib/universities/canonical.ts`, `lib/universities/queries.ts`,
  `lib/security/dal.ts`, `lib/supabase/server.ts`, `app/(app)/profile/page.tsx`,
  and `lib/scoring/persist.ts` in full; every query count in the table above
  is a direct count of `.from(...)` calls in those files, not an estimate.
  Every call site for `getUpcomingDeadlines` and `assembleScoringFacts` was
  found with `grep -rn "functionName(" --include="*.ts" --include="*.tsx" .`
  rather than assumed from the files already read, which is what caught the
  third `getUpcomingDeadlines` site on the first amendment to this document.
- **2026-09-02 re-measurement**: re-read `app/(app)/dashboard/page.tsx` and
  `lib/supabase/server.ts` in full to confirm section 2 unchanged, rather than
  trusting the 2026-09-01 text. Read `app/(app)/layout.tsx` in full (not
  covered by the original pass — a real gap in that pass's own file list,
  since a shared layout's queries apply to every page it wraps) to find the
  new `profile_scores` read. Traced `/universities/[id]` (section 5) with the
  identical method: `app/(app)/universities/[id]/page.tsx`,
  `lib/admissions/persist.ts`, `lib/requirements/persist.ts`, and
  `lib/requirements/facts.ts` read in full, every `.from(...)` counted
  directly, checked both for AI-provider calls (grep across all four files
  plus `lib/requirements/evaluate.ts`, zero results) and for whether either
  refresh function's read is already covered by data the page itself fetched.
  Client-component and bundle-size numbers re-run with the exact commands
  from the original pass, same tools, for a like-for-like comparison.
- Bundle size: `npm run build` (Next.js 16.3.1, Turbopack) on this branch,
  then `du -sh .next/static/chunks` and an inspection of
  `.next/build-manifest.json`.
- External calls: `grep` for `lib/providers` imports across `app/` and
  `features/`, and for `unstable_cache` across the whole repo.
- No AI/model calls were made in this pass. No migration, code change, or
  data write was made in this pass — this document is the only artifact.
