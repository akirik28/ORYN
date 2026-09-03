# Internal-detail leak sweep — 2026-09-03

Report only. Nothing in this document has been fixed yet, per instruction — the point was
size and shape before a fix pass, the same discipline as the reuse-audit in
`oryn/student-i18n-errors-2026-09-03`.

## Why this sweep, separate from the error-string audit

That audit found four things incidentally while translating hardcoded strings: a raw
Postgres error reaching a client (`documents/actions.ts`), a raw MIME type in an exception
message (`UnsupportedCVFileTypeError`), `AIProviderNotConfiguredError` naming the provider,
and a partial-import summary joining raw DB category codes into a sentence. All four are
already fixed in the merged branches. Nobody had looked for this *class* of defect on
purpose — this sweep does that, across every student-facing surface, not just the files that
happened to have a hardcoded English string on them too.

## Method

Five sub-searches, each targeted at one shape of leak, run against every student-facing
route group (`app/(app)`, `app/(onboarding)`, `app/(auth)`, `app/(confirm-age)`) and every
component under `features/` and `components/` that those routes render. `app/(app)/admin`
and `features/admin` were searched too, for completeness, but findings there are marked
admin-only and not counted toward student reach:

1. Raw error objects/messages interpolated into copy returned to a client or rendered in
   JSX (`error.message`, `String(error)`, bare `${error}`, `error instanceof Error ? error.message : ...`).
2. Internal enum, status, or DB-code values rendered without going through a label/translation
   lookup, including the specific shape of the fixed partial-import bug: a raw value falling
   through to a bare `.replace(/_/g, " ")` or template literal instead of a translated label.
3. Provider, infrastructure, or environment-variable names, and references to developer-only
   files (`API_SETUP.md`, `.env.local`) — searched both in component source and, separately,
   by scanning the full flattened message catalog for the literal env-var/file-name shapes,
   since a leak can be baked into *translated* copy and invisible to a source-only grep.
4. Table/column identifiers appearing in rendered text.
5. Stack traces or exception objects reaching a client instead of `console.error`.

## Findings

### A. Provider/infrastructure names and developer-only references, baked into translated copy

**Four instances, all in the message catalog, in both `en` and `tr`.** This is worse than a
missing translation: someone already translated "set this environment variable" and
"see API_SETUP.md" into Turkish, which makes it read as reviewed, intentional copy rather
than an obvious leftover. Confirmed exhaustive by flattening the entire English catalog and
matching every string against `API_SETUP`, `.env`, `_API_KEY`, `_SECRET_KEY`,
`NEXT_PUBLIC_`, `supabase`, `anthropic`, `tavily`, `postgres` — these four are the complete
set, not a sample.

| # | Key | English content | Rendered by | Reachability |
|---|-----|------------------|-------------|---------------|
| 1 | `dashboard.planNotConfiguredDescription` | "Add ANTHROPIC_API_KEY to enable weekly plans — see API_SETUP.md." | `features/dashboard/dashboard-view.tsx`, when `planError === "not_configured"` | **Highest of the four** — the dashboard is the most-visited page in the product (already documented elsewhere as such). Any deployment missing `ANTHROPIC_API_KEY` shows this to every student on their first screen. |
| 2 | `opportunities.browsePage.noMatchesNotConfigured` | "Opportunity discovery isn't configured yet in this environment (needs TAVILY_API_KEY). See API_SETUP.md." | `app/(app)/opportunities/page.tsx`, when Tavily isn't configured **and** zero opportunity rows exist yet | Reachable in a real early-launch deployment (an empty opportunity catalog with no discovery key set is a plausible soft-launch state, not just a broken one). |
| 3 | `profile.cvImport.notConfiguredDescription` | "This needs ANTHROPIC_API_KEY to be set — see API_SETUP.md. You can still add everything to your profile manually." | `app/(app)/profile/import/page.tsx`, when `isAIConfigured()` is false | Reachable the same way as #1 and #2 — a missing AI key doesn't break the whole app, so a deployment could plausibly ship in this state without anyone noticing until a student hits this exact page. |
| 4 | `system.notConfiguredTitle` / `system.notConfiguredDescription` | "Supabase isn't configured yet" / "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to enable accounts and data. See API_SETUP.md for step-by-step instructions." | `app/(app)/layout.tsx`, `app/(onboarding)/layout.tsx`, `app/(auth)/layout.tsx`, `app/(confirm-age)/layout.tsx` — every top-level layout | **Lowest of the four**, deliberately listed last: Supabase credentials are required for auth itself, so a deployment missing them can't function at all — this is a local-dev-setup safety net, not a state a real, working deployment would ever be in. Still a real instance of the class; just not one a real student will hit. |

Shape of the fix: rewrite, not translate, matching the precedent already set for
`AIProviderNotConfiguredError` in the merged branches — say what's unavailable to the
student in plain language, log the real missing variable server-side. All four already have
a `console.error`-free path today (they're proactive UI checks, not caught exceptions), so
the fix also needs to add the server-side log that's currently missing, not just reword the
client copy.

**Status:** #1–#3 fixed (`oryn/dev-setup-message-split-2026-09-03`) — copy simplified to
what the unavailability means for the student and what they can still do; #1 needed no new
log (`app/(app)/dashboard/page.tsx` already `console.error`s the real
`AIProviderNotConfiguredError`, whose own message carries the env var and doc pointer), #2
and #3 each got a new `console.error("[scope] ... ANTHROPIC_API_KEY/TAVILY_API_KEY is not
set. See API_SETUP.md.")` at the render site, matching the pattern already used by every
`AIProviderNotConfiguredError` catch and every `SUPABASE_SECRET_KEY not configured` log
elsewhere in the codebase — not a new mechanism. #4 (Supabase) deliberately untouched, per
explicit founder instruction to leave it last or not at all.

### B. Internal DB code falling through to a bare, unlabelled render

**One instance, currently dormant, not currently reachable, but not protected against
becoming reachable.**

`features/applications/requirement-chip-grid.tsx:32` and
`features/applications/requirement-checklist.tsx` (same pattern, same file family) both do:

```ts
const typeLabel = tHas.has(`typeLabels.${requirement.requirement_type}`)
  ? t(`typeLabels.${requirement.requirement_type}`)
  : requirement.requirement_type.replace(/_/g, " ");
```

The fallback — a raw DB value with underscores swapped for spaces, always English-shaped,
never translated — is exactly the shape of the already-fixed partial-import bug
(`workExperience` shown raw to a student). Checked whether it currently fires: every
`application_requirements` row a student can have comes from exactly one place,
`createApplication`'s `DEFAULT_REQUIREMENTS` list in `app/(app)/applications/actions.ts`
(`application`, `transcript`, `test_score`, `essay`, `recommendation`, `portfolio`,
`interview`, `financial_aid`) — no student-facing action exists to add a requirement with
any other type. All eight of those values have a `typeLabels` entry in both catalogs
(checked directly, not assumed). So the fallback is dead code today, not a live leak.

Why it's still worth reporting: nothing enforces that `DEFAULT_REQUIREMENTS` stays a subset
of `typeLabels`'s keys. A ninth default requirement type added without its matching
translation key would silently activate this exact fallback for every student's default
checklist, the same way `ultra_interest_registered` silently went unlabelled until the
kumanda sweep found it. `translateAchievementValidationError`'s own exhaustiveness test
(`__tests__/validation/achievement-error-messages.test.ts`, merged branch) is the model for
closing this properly — assert every value `DEFAULT_REQUIREMENTS` can produce has a
`typeLabels` entry, so a future addition fails loudly instead of shipping this dormant
fallback live.

### C. Raw error objects interpolated into copy

**No new instances beyond what's already fixed.** Checked systematically: every
`error.message`/`err.message` interpolation across `app/(app)`, `app/(onboarding)`,
`app/(auth)`, `app/(confirm-age)`, and `features/` traces back to one of:

- The `documents/actions.ts` and `onboarding/actions.ts` `"Upload failed: ${message}"`
  cases — already reviewed and fixed in the merged branch, matching `app/(auth)/actions.ts`'s
  own deliberate precedent (SDK error text stays in whatever language the SDK returns it in;
  the app-authored prefix is what gets translated).
- `RateLimitExceededError.message` (`connections/actions.ts`, `messages/actions.ts`) — the
  shared, already locale-aware error class from the merged branches.
- Five hits in `app/(app)/admin/actions.ts` and one in
  `app/(app)/universities/[id]/requirement-actions.ts`'s `suggestRequirementRule` — all
  `requireAdmin()`-gated, not student-facing.
- One `toast.error(errorMessage)` in `features/admin/sections/growth-confirm-action-button.tsx`
  — admin-only surface.
- Dozens of `throw new Error(...)` calls across `lib/advisor/retention.ts`,
  `lib/universities/queries.ts`, `lib/plan/persist.ts`, `lib/digest/run.ts`,
  `lib/jobs/detect-stale-data.ts`, and similar — all inside scheduled jobs, admin queries, or
  ingest pipelines whose errors are caught and logged server-side, never returned to a
  client. Spot-checked rather than traced individually given the volume; none of these
  modules are imported by a student-facing route.

### D. Table/column identifiers in rendered text

No instances beyond the requirement_type case already covered in B.

### E. Stack traces reaching a client

**None found — and one file worth naming as a clean precedent, not a finding.**
`app/(app)/error.tsx`, the route-level error boundary for the entire `(app)` segment (every
page under Advisor, Applications, Dashboard, Documents, Opportunities, Plan, Profile,
Universities), only ever passes `error.digest ?? error.message` to `console.error` — the
actual rendered UI is two translated strings (`t("description")`, `t("tryAgain")`) and a
retry button. This is exactly the shape every finding above should end up in; worth keeping
as the reference example when fixing A and B.

## Summary by reachability

| Reachability | Count | Items |
|---|---|---|
| Reachable today, real deployment scenario | 3 | A1 (dashboard), A2 (opportunities), A3 (CV import) |
| Reachable only in a broken/non-functional deployment | 1 | A4 (Supabase, every layout) |
| Not currently reachable, no test protecting the dormancy | 1 | B (requirement type fallback) |
| Checked, confirmed clean | 2 categories | C (no new instances), D (none), E (verified clean, one file named as good precedent) |

Six real items total (four in A, one in B, plus A4 counted separately by reachability). Shape
of the fix pass: A is four rewrites (not translations) in the message catalog plus adding the
missing server-side logs, ordered by the reachability column above; B is one small
exhaustiveness test plus leaving the fallback as a safety net, not removing it. Nothing here
needs new architecture — same shape as the error-string audit's own fixes.
