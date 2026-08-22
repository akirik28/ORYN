# FEAT-2 lane close-out — 2026-08-22

Written for a cold session with none of today's context. If you're picking up FEAT-2's
territory (weekly plan/actions, reflection loop, application tracker, deadline engine,
notifications, monthly review, goals, time budget) tomorrow or later, this is the
resume point. Full detail lives in the docs cited inline; this file exists so you don't
have to read all of them to get oriented.

Line numbers cited below are accurate as of this write-up (2026-08-22, after PR #114
merged as `9eebe50`). If you're reading this later, re-check them against current
source before acting — don't trust a stale line number over your own grep.

---

## 1. Two real defects, in `lib/entities/search.ts`, that nobody owns

Found during the Phase 53 MVP checklist audit
(`docs/handoffs/feat2-mvp-checklist-audit-2026-08-22.md`, merged #114). Both are in the
canonical-entity search path shared by every `EntityCombobox` in the app (school search,
university search, etc.) — not FEAT-2's territory, not UI-1's territory either. As far
as I know, unassigned.

### 1a. Country-scoped search doesn't filter or effectively rank by country

**Symptom observed**: on the onboarding School field, with Country set to "United
States," searching "Lincoln High School" returned five Turkish schools (MEF Lisesi,
Vefa Lisesi, İstanbul Erkek Lisesi, Galatasaray Lisesi, Hisar School) — zero relevance
to the query text or the selected country. Reproduced twice, identically. Ruled out a
stale-render artifact by also searching a nonsense string (`Zzxqvyplmk Academy`), which
correctly fell through to the empty "Can't find your school?" state — confirming the
search function does respond to query content, it just doesn't respect country context.

**Mechanism** (`lib/entities/search.ts`):
- `searchCanonicalRegistry` (~line 75-93) calls the `search_canonical_entities` Postgres
  RPC with only the query text and entity types. **No location parameter is passed to
  the RPC at all.** Country/city context is applied only *after* the RPC returns, via
  `applyContextBoost` — which re-sorts rows the RPC already fetched. It cannot surface a
  correct result that didn't make the RPC's own fuzzy-match cutoff (`RESULT_LIMIT * 3`)
  in the first place.
- `applyContextBoost` (~line 59-72) compares `normalizeEntitySearchText(context.country)`
  against each row's `country_code` field. The caller (e.g.
  `features/onboarding/onboarding-wizard.tsx`, `context={{ country: country.trim() ||
  null }}`) passes the raw free-text country name — `"United States"`, not a code.
  `normalizeEntitySearchText` normalizes case/accents; it does not convert a name to a
  code. So the comparison is `"united states" === row.country_code`, which is
  structurally false for any row holding a real code (confirmed live: the Turkish
  schools' rows hold `country_code: "TR"`). **This boost has never fired for any
  country-scoped search anywhere `EntityCombobox` is used with a country context** —
  this is not specific to onboarding or to schools.
- **A second, independent bug, found by checking what a write actually produced**:
  creating a custom school via "Add your school" with country typed as "United States"
  wrote the literal string `"United States"` into `country_code` (confirmed via direct
  query — live row `canonical_entities.id = c20b9be3-0e60-4509-b008-371668c5f196`).
  Custom-entity creation doesn't normalize to a code either. So the column is
  inconsistently typed across the registry: real ISO-ish codes for professionally
  ingested rows, raw free text for user-submitted ones.

**What I checked**: both bugs live, via a real search and a real custom-entity write,
plus reading the RPC call site and the boost function. **What I did not check**: whether
`search_canonical_entities` itself (the Postgres function, migration 0038) could take a
location parameter without a signature change — I read the TypeScript call site, not the
SQL function body, so I don't know if the fix is "pass a param that already exists but
is unused" or "add a param to the RPC." Check the migration before estimating effort.

**Practical consequence**: any student outside the handful of countries with heavy
existing canonical coverage sees irrelevant results searching for their own school, with
no way to distinguish "search is broken" from "my school isn't in the system" — the
empty-state fallback only appears when the query matches *nothing*, not when it matches
the wrong country with higher trigram similarity than anything relevant.

### 1b. A self-reported, unverified entity is labeled "Linked to a verified entry"

**Symptom observed**: immediately after creating the custom school above — whose own
creation dialog correctly says *"Oryn will add this as unverified until someone checks
it against an official source"* — the School field's helper text switches to **"Linked
to a verified entry."** directly underneath.

**Confirmed against ground truth**: the row just created has
`verification_state: "user_submitted"` (same row, `c20b9be3-...` above). It is genuinely
unverified. The UI's claim is factually wrong for this specific, common case — any
custom entity created through this code path hits it. This directly contradicts
AGENTS.md §11's non-negotiable: *"Do NOT label something as independently verified
merely because [it exists as an entry]."*

**What I checked**: this one live reproduction, plus confirming `isCustom` is correctly
set (`lib/entities/search.ts` line ~202: `isCustom: row.verification_state ===
"user_submitted"`) at the search-result level — so the *data* needed to render this
correctly is available; the bug is in whichever component renders the helper text
choosing the wrong copy, or not checking `verification_state`/`isCustom` before showing
it. **What I did not check**: which component that actually is. I traced the data as
far as `EntityCombobox`'s search results and the onboarding wizard's usage of it, but
did not locate the specific helper-text render site inside `EntityCombobox` or a child
component — that's the next concrete step, not yet done.

**Why this one matters more than a cosmetic bug**: AGENTS.md's minor-safe design section
and non-negotiable #4 treat false verification claims as a trust violation, not a UI
nit — the audience is 14-18 year olds relying on Oryn's own claims about their data.

---

## 2. The Phase 53 checklist result — keep the boundary between "verified" and "verified-to-a-boundary"

Full write-up: `docs/handoffs/feat2-mvp-checklist-audit-2026-08-22.md` (merged #114).
This section exists because that distinction is the entire value of the audit, and it's
the first thing that gets lost if someone compresses this into "14/16 passed."

**14 of 16 items were walked live against real Supabase data on a real QA account and
work correctly.** Items 3-12, 14, and 16 were walked with a verdict recorded per item
(see the doc); items 1, 2, 12, 13, 15 carry full inline evidence because they either
surfaced a defect (1, 2), are the highest-stakes feature in the spec (12), or were the
two items closed out in the audit's final continuation (13, 15).

**Items 8 and 15 are not two separate failures — they are one missing credential,
observed from both ends of the same pipe:**

- Item 8 ("receive 3 prioritized actions") and item 15 ("complete actions") both
  terminate at `lib/plan/persist.ts`'s `getOrCreateWeeklyPlan`, which has **no
  deterministic fallback** — it unconditionally calls `generateWeeklyPlan(userId)`
  (`lib/ai/weekly-plan.ts`). Without `ANTHROPIC_API_KEY`, this throws
  `AIProviderNotConfiguredError`, which `app/(app)/plan/actions.ts` catches correctly and
  surfaces as an honest, non-crashing error: *"The AI Advisor isn't configured yet, so
  weekly plans can't be generated. See API_SETUP.md."* This is correct behavior per
  AGENTS.md Rule 4 and Phase 72 — not a bug.
- Because no plan can generate, **no `weekly_actions` row can ever exist** in an
  environment without the key. Item 15's own completion mechanism —
  `features/dashboard/weekly-focus.tsx`'s optimistic-toggle-with-rollback, and
  `updateActionStatus`'s RLS-scoped Supabase write in `app/(app)/plan/actions.ts` — is
  verified correct **on read**, and its client-side behavior is covered by 8 real RTL
  tests (`__tests__/dashboard/weekly-focus.test.tsx`, written during today's Package 5).
  But those tests mock the server action entirely; they don't exercise a real write. No
  real write could be exercised in this pass, because there was no real row to click.
- **I deliberately did not insert a `weekly_actions` row via SQL to force a live
  click-through.** That would test a state no real student's account can reach today,
  which defeats the audit's own purpose. If you're tempted to do this to "finish" item
  15 properly: don't — get `ANTHROPIC_API_KEY` configured (even a cheap/free-tier key in
  a dev project) and walk it for real instead, or explicitly accept the boundary as
  documented.
- One correction worth carrying forward: going into this audit I'd been treating items
  6, 8, and 14 as the AI-gated set. That's wrong for item 6 (profile analysis/scoring) —
  `lib/scoring/` has zero AI imports; `recomputeCareerProfile` is fully deterministic.
  The real AI-gated set is **8, 14, and 15**.

**Practical upshot, already acted on**: this finding is why `ANTHROPIC_API_KEY` moved
into its own called-out section on the founder's page rather than sitting under
"optional, any time" — per ORYN-CEO, it's now understood as the single credential
standing between the current state and a fully-walkable 16/16.

---

## 3. My own errors this session, and what changed because of them

Recorded because a close-out that only lists what worked teaches the next session
nothing about what actually goes wrong in this environment. All three fed into
standing org practice, not just personal lessons.

### 3a. A stray write to `oryn.qa.b` from my own session

While signed into my own account for a different check, I made a write that landed on
`oryn.qa.b` instead — a second QA account I wasn't supposed to be touching. I caught it
myself, specifically because I'd just adopted the practice of checking the session
cookie's decoded identity immediately before every write, not just at login. Verified
the blast radius directly against the database (my main account's data was untouched;
exactly one stray row existed on `qa.b`), deleted precisely that row, and reported it to
ORYN-CEO immediately and unprompted rather than after the fact. This is the incident
that led CEO to amend the org's QA-account rule (rule 28) to be explicit about
one-account-per-lane, checked at write time, not assumed from login time.

**Lesson for next time**: if you're driving a shared browser across a session that
touches more than one test account, the cookie can be wrong even when you're confident
it isn't. Check it right before the write that matters, not at the start of the session.

### 3b. A second identity flip on the same account, mid-session

Later, the same cookie-check-before-write practice caught a second, independent flip on
`oryn.qa.b` — this time before a save, not after. Two flips on the same account in one
session is not "I made a mistake twice"; it's a signal that something outside my own
actions might be changing the session. I escalated it as possible evidence of a shared
browser instance across two concurrently-running sessions rather than assuming it was
my own error repeated. CEO agreed, and the org's response was structural, not just a
warning: exclusive browser access was granted per lane, and the other session working
the same territory (UI-1) was stood down entirely until the audit finished. This is the
incident behind the org's current one-writer-at-a-time browser discipline.

**Lesson for next time**: a repeated identity anomaly is a different kind of signal than
a first one. Don't just fix it again — ask whether something outside your own control
changed, and say so before you have full proof, not after.

### 3c. A false "the whole app is hung" escalation — trusted a probe that raced the render

At one point I escalated what looked like a genuine infrastructure crisis: pages
appearing not to render, backed by real CPU/load-average data from a busy shared
machine. The detection method was the problem, not the app — I was relying on
`get_page_text` and a `document.querySelector('[aria-label="Loading"]')` DOM probe,
retried several times, and both can return a false "still loading" or empty result if
they run before the actual paint completes. A single real screenshot, taken directly
instead of trusting the probes, showed every page had been rendering correctly the
entire time.

I sent an immediate, precise retraction rather than a vague "sorry, my mistake": I kept
what was still true (the restart/teardown actions I'd taken were independently correct
regardless of the hang claim) and explicitly withdrew only the false part (the
follow-up "still broken" claim), naming exactly why — the detection method was racing
the render, not the product. This became one of six same-day instances org-wide of what
got named the "a true answer taken at the wrong instant" pattern: a stale `ListAgents`
ref, a stale status-doc line, a DOM-loading-probe read before paint, and others, across
four different sessions in one day.

**Lesson for next time**: when you need to know whether something actually rendered,
prefer a check that observes the *result* — a screenshot, or reading real content off a
container you know should be populated — over one that queries an *intermediate* state
(a loading flag, a probe that can legitimately return "not yet"). This is now standing
guidance, not just something that happened to me once.

---

## 4. Status

Nothing released, nothing left running that needs a handoff — the browser was already
returned to UI-1 for the onboarding step-desync diagnosis (now the top item on the
board, per CEO, as a direct result of §1-2 above). The `feat2-mvp-audit` worktree and
its dev server are still up; I'll tear them down once I'm told they're no longer needed,
per my own practice of verifying clean before removing rather than removing on a timer.

This closes out FEAT-2's work for this session.
