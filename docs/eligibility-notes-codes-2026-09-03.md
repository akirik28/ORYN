# `eligibility_notes`: prose to codes

**Date:** 2026-09-03. **Why this doc exists:** b9 diagnosed a real defect —
`opportunity_matches.eligibility_notes` stored a rendered sentence, in whatever locale was
active at compute time, so the language froze into the row. Live and confirmed: 69 English
rows against Turkish-preference students, all in one QA account. b9's own recommendation was
"convert it to match `reason_codes`' shape" — codes stored, translated at render — and to stop
and report the shape rather than half-convert it if the parameter problem made this bigger than
a session. It didn't. This is the full conversion: matching.ts's core, the migration, and every
real read site, verified with a green gate.

## The bug, precisely

`computeEligibility` (`lib/opportunities/matching.ts`) used to take a `locale` argument and
return a fully rendered sentence. `refreshOpportunityMatches` (`persist-matches.ts`) calls it
once per opportunity, per refresh, with whatever `locale` its own caller happened to pass —
the current page's active locale for the three page-render callers, or `DEFAULT_LOCALE`
(English) for the one caller with no request context (`getCounselorState`'s scheduled-job
path). The result gets written straight into `opportunity_matches.eligibility_notes` and read
back verbatim by every surface that shows it. Nothing re-renders it later. A student who
mostly browses in Turkish but whose last refresh happened to run in English (or vice versa —
this is not asymmetric) keeps seeing that frozen language on this one field, on every page,
until something recomputes it in the "right" locale again.

## The fix: codes + params, following `reason_codes`' own shape

`reason_codes` (same table) already does exactly what b9 pointed at: store a code, translate
it at render time. `eligibility_notes` couldn't copy that shape directly — every one of
`reason_codes`' 8 values is parameterless, but roughly half of `computeEligibility`'s ~16
findings name a specific fact (a country, a citizenship list, a grade, restriction prose) that
a bare code would lose. The new shape:

```ts
export type EligibilityNoteCode =
  | "already_applied" | "already_not_interested"
  | "age_below_minimum" | "age_above_maximum" | "age_unknown" | "age_eligibility_unverified"
  | "country_unknown" | "country_not_eligible"
  | "citizenship_unknown" | "citizenship_not_eligible"
  | "citizenship_restriction_on_file" | "residency_restriction_on_file"
  | "country_eligibility_unverified"
  | "grade_unknown" | "grade_not_eligible" | "grade_eligibility_unverified"
  | "not_yet_computed";

export interface EligibilityNote {
  code: EligibilityNoteCode;
  params?: Record<string, string | number>;
}
```

`computeEligibility` now returns `EligibilityNote[]` (empty, never null — matching
`reason_codes`' own `NOT NULL DEFAULT '[]'` convention) and **no longer accepts a `locale`
parameter at all** — not simplified, structurally incapable of reintroducing this exact bug,
since there's nothing left in the write path that could freeze a locale into anything.
`eligibilityMessages` (the object holding every real sentence, shared with
`lib/counselor/eligibility.ts`) is unchanged — still takes params + locale, still returns a
string. A new `renderEligibilityNotes(notes, locale)` is the only thing that turns codes back
into prose, and it's the only place any of these codes ever becomes a display string. Four
messages that used to live inline in `computeEligibility` (`alreadyApplied`,
`alreadyNotInterested`, the two age-hard-exclusion sentences) moved into `eligibilityMessages`
alongside the rest, plus a new `notYetComputed` — see below.

`not_yet_computed` is the one code `computeEligibility` itself never produces. It's
`lib/opportunities/browse.ts`'s own fallback for "no match row exists yet" — included in the
same enum so it flows through the same render pipeline as every real finding, rather than
needing a special case at that one call site.

## The migration

`0115_eligibility_notes_codes.sql`: `text` → `jsonb`, `NOT NULL DEFAULT '[]'::jsonb`, same
convention as `reason_codes` on this exact table. **Existing values are discarded, not
converted** — old prose can't be reliably parsed back into a code, especially once free-text
opportunity restriction prose is interpolated into a sentence, and Rule 4 (AGENTS.md) forbids
inventing a best-guess in its place. Every row's `eligibility_notes` becomes `'[]'::jsonb`, the
same value a genuinely fresh, unresearched row already gets. This is not a real loss:
`eligibility_notes` has always been a snapshot recomputed on essentially every real page view
(`refreshOpportunityMatches` runs on `/opportunities`, `/opportunities/[id]`, and the
dashboard). The next such view recomputes it correctly, in codes, for that student — no
backfill script, no one-off recompute run as part of shipping this migration. That's a
deliberate scope boundary: this session did not re-invoke `refreshOpportunityMatches` against
the 69 affected live QA rows, consistent with the standing rule against writes to shared
database state as a side effect of anything other than the feature actually asking for one.
Whoever wants those 69 rows correct sooner than their next natural page view can trigger it
directly; this fix makes that trivial (`refreshOpportunityMatches(userId)` — `locale` no
longer matters) rather than doing it unasked.

## Every real read site, and what changed at each

Checked exhaustively — grepped every reference to `eligibility_notes`/`eligibilityNotes` across
`lib/` and `app/`, not assumed from memory:

- **`app/(app)/opportunities/page.tsx` (`ForYouView`, the "For You" tab)** — real locale now
  threaded through and rendered before the card. This is the fix's primary target: this
  surface never had an established English-only precedent to preserve, it simply displayed
  whatever locale happened to be frozen into the row — the exact bug. `locale` was already
  resolved one function up; this just carries it the rest of the way.
- **`app/(app)/opportunities/[id]/page.tsx` (detail page)** — same treatment. This page already
  resolves a real `locale` for `takeSentences` two lines away; it simply never threaded it into
  `resolveStoredEligibility`. Now it does.
- **`app/(dev-preview)/design-preview/opportunity-detail/page.tsx`** — the detail page's
  dev-preview twin, same fix, same reasoning.
- **`lib/opportunities/browse.ts` / Browse tab** — **left English-only, deliberately.**
  `matching.ts`'s own header comment already named `browse.ts` (and, historically, the detail
  page) as outside an earlier i18n pass's scope; `browseOpportunities` has never had a `locale`
  parameter and `BrowseAllView` (its one caller) has never resolved one. Fixing that is a real,
  separate gap — not the frozen-locale bug this task was scoped to. `resolveStoredEligibility`
  defaults to English specifically so this file's behavior stays byte-identical to today.
  `browse.ts`'s own "no match row yet" fallback is now `{code: "not_yet_computed"}` rather than
  a hand-typed string, flowing through the same render call as everything else.
- **`lib/opportunities/home-strip.ts` / the home page's rotating strip** — `eligibilityNotes` is
  now `boolean`, not text. Checked the actual consumer (`OpportunityStripCard`) first: it only
  ever renders a generic warning badge on truthiness, never the note's own content — a
  presence flag was already all this surface used, just typed as `string | null` before. No
  locale question here at all now.
- **`lib/dev/fixtures.ts` (`buildFixtureHomeStrip`)** — same boolean shape, for the dev-preview
  strip mirror.
- **The digest** — checked, does not exist as application code yet. `0114_email_digest.sql`
  adds two `profiles` columns for a future periodic email digest; no reader of
  `opportunity_matches` for it exists anywhere in `app/` or `lib/` today. Nothing to update;
  named here so whoever builds it starts from `renderEligibilityNotes`, not from the old shape.
- **The counselor** — `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility` is a
  **separate, live computation** that calls `eligibilityMessages` directly at request time with
  a real locale — it never reads the stored `eligibility_notes` column at all, so it was never
  exposed to this bug and needed no change here.

## `refreshOpportunityMatches`'s now-vestigial `locale` parameter

`computeOpportunityMatch`/`computeEligibility` dropping `locale` leaves
`refreshOpportunityMatches`'s own `locale` parameter with nothing left to do internally — it
was only ever forwarded to the one call this fix changed. Not removed: that function has four
external callers (three page renders, `lib/counselor/state.ts`), and rippling a cosmetic
signature change through page-render files outside this fix's own cleared territory
(`persist-matches.ts`/`matching.ts` only, per dispatch) during a night with several other lanes
active in exactly that kind of file was judged not worth the added surface area for a change
with no behavioral upside. Documented in the function's own header comment rather than left
unexplained.

## Verification

Full gate green: `tsc --noEmit` clean, `eslint` 0 errors (2 pre-existing warnings plus 2 new
ones from the deliberately-kept vestigial `locale` params, all warnings not errors), full suite
389 files / 5916 passed / 2 expected-fail. `matching.test.ts`'s 27 `.notes` assertions rewrote
from regex-on-prose to code/params checks — a strictly stronger pin than before: a wrong
*finding* now fails the test, not only a wording change, and nothing can pass on a coincidental
substring match anymore. `__tests__/social/posts-schema.test.ts`'s pinned migration-count
tripwire bumped 114 → 115 with its own narrative line, matching this file's established
per-migration convention.
