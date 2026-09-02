# Does the age gate actually close? — mechanism verified, one real design gap named precisely

Investigation only, per the assignment — the threshold (14) is untouched, `lib/legal/age-
policy.ts` unmodified. Three questions, each answered from live data and source, not the
design doc's own claims.

## 1. Re-measured the null population live — two different numbers, and they diverge for a real reason

11 profiles, live right now:

| Bucket | Count | Who |
|---|---|---|
| `onboarding_completed = false`, `birth_year` null | 3 | Persona A Test, Oryn QA Sweep, Claude UI QA — all QA fixtures, redirected to `/onboarding` before ever reaching the birth-year check |
| `onboarding_completed = true`, `birth_year` null | **4** | oryn.qa.a, oryn.qa.b, Deniz Kaya (all QA), **Ada Sarp KIRIK — the founder's own account** |
| `onboarding_completed = true`, `birth_year` set | 4 | Mei Tanaka, Ada Yilmaz, Daniel Okafor, Elif Demir — all QA, all seeded with a value already |

The design doc's "4 of 11" figure is **still exactly right today** — but only once matched to
the population it's actually about (`onboarding_completed = true AND birth_year IS NULL`, the
specific gap `/confirm-age` exists to close). A cruder "any null birth_year" query returns 7,
which is also true but answers a different question (it includes the 3 stuck pre-onboarding,
who the confirm-age gate was never meant to catch — they hit an earlier, working gate first).

**How many rows vs. how many students, answered separately as asked:**
- Rows with the gap the gate targets: **4**.
- Real students affected: **1** — the founder's own account. The other 10 profiles (including
  3 of the 4 in the targeted bucket) are QA personas; the domains alone confirm it
  (`mailinator.com`, `example.com`, `orynqa.test`, `oryn.dev`, plus one `gmail.com` QA
  persona named for exactly that purpose) once cross-referenced against which one row uses
  the founder's real school domain (`my.uaa.k12.tr`, matching this repository's own git
  authorship).

Worth stating plainly: the founder's own real account has not been through `/confirm-age`
either. The mechanism is not just unexercised in the abstract — it has not yet run for the one
case that currently matters.

## 2. Traced every door, not just the one everyone knows about

**The layout redirect itself is sound.** `(app)/layout.tsx` checks `onboarding_completed`
then `birth_year`, in that order, redirecting to `/onboarding` or `/confirm-age`.
`(confirm-age)/layout.tsx` mirrors both checks in reverse (bounces to `/onboarding` if
incomplete, to `/dashboard` if `birth_year` is already set) — a three-way split with no loop,
confirmed by reading both files, not assumed from the comment claiming it.

**Searched for the other doors — job routes, API routes, actions outside `(app)` — against
every place `birth_year`/`isLikelyAdult` is actually read, not a guess about where they might
be:**

- **Opportunity eligibility** (the age-restricted-opportunity case Phase 11 names): traced
  `refreshOpportunityMatches`/the eligibility engine to its only three callers —
  `opportunities/page.tsx`, `opportunities/[id]/page.tsx`, `dashboard/page.tsx`. All three are
  under `(app)`. **No job route calls this path at all** — `discover-opportunities` builds the
  shared catalog and writes `minimum_age`/`maximum_age` onto the *opportunity* row, it never
  reads a *student's* birth year. This specific age-sensitive decision has no bypass door
  today.
- **AI advisor / weekly plan**: `birthYear` is fetched into `buildStudentAdvisorContext()` but
  grepped every prompt-building file (`weekly-plan.ts`, `advisor-prompt.ts`,
  `advisor-chat.ts`) — none of them interpolate it into anything sent to the model. The one
  place age-scaling is real, `research-generator.ts` (fixed earlier tonight by another lane,
  commit `318aba1d`), uses `graduationYear`, not `birth_year`, with a clean "Graduation year
  not on file" fallback when absent — verified directly, not inferred from the commit message.
- **`isLikelyAdult`** (contact-info visibility, a different purpose than signup eligibility
  per `age-policy.ts`'s own comment): both real callers —
  `profile/professional-actions.ts`, `profile/page.tsx` — are under `(app)`, and the function
  itself treats a `null` input as "no" (fails toward hiding contact info, the safe direction),
  so even a theoretical direct call with no birth year on file can't expose anything it
  shouldn't.
- **`lib/social/public-profile-authorization.ts`**: exists, references `birth_year` in its own
  comment, but has **zero callers anywhere in `app/` or `features/`** — dead code today, not a
  live door. Worth re-checking the moment the social/public-profile feature is switched on,
  since nothing has verified its birth-year handling yet.
- **Dev-preview**: `app/(dev-preview)/design-preview/dashboard/page.tsx` exists alongside the
  real one. Not investigated further — it's a design-QA fixture, not a path a real student
  reaches, and out of scope for "can a student bypass the gate."

**Conclusion on this question: no bypass door found for the app surfaces that actually make an
age-sensitive decision today.** The gate is a single, correctly-ordered door for the two
things that currently check age (opportunity eligibility, contact-info visibility), because
neither of those checks has a job-route or unauthenticated path into it yet. This could change
the moment either surface grows a background job of its own (opportunity eligibility
recomputed on a schedule rather than on render, for instance) — the finding is about today's
code, not a permanent guarantee.

## 3. Logging vs. enforcing — real, but by documented design, not by accident

Both flagged call sites do exactly what their names suggest — log, don't block:

- `confirm-age/actions.ts:48-50` (`submitBirthYear`, the backfill path): saves whatever year is
  entered, unconditionally, then logs `birth_year_backfill_below_minimum_age` only if it's
  under 14. **Never reverts the write, never blocks the redirect to `/dashboard`.**
- `settings/actions.ts:110-112` (`updateBirthYear`, self-edit on an existing account): same
  shape exactly — saves first, logs `birth_year_settings_update_below_minimum_age` after,
  never blocks.

**Neither is silent or accidental** — both carry real comments explaining the choice, and
`updateBirthYear`'s explicitly cross-references `confirm-age`'s as "the same reasoning": an
*existing* account correcting or backfilling its own on-file value is a materially different,
lower-stakes decision than `completeOnboarding`'s refusal of a *brand-new* signup, and there is
no guardian-consent mechanism in this codebase to responsibly act on a below-14 self-report
yet. That's a real, arguable product position, not a bug masquerading as one.

**But the net, cumulative fact is real regardless of intent, and worth stating on its own
rather than only through the two comments that already excuse it individually**: `completeOnboarding`
is the *only* hard stop in the system. Once an account exists, **nothing anywhere prevents its
`birth_year` from being set to, or edited to, a value corresponding to under 14** — confirmed
by reading both functions directly, not trusted from their comments. A student could pass the
gate once with a valid year and later edit it downward in Settings with no consequence beyond
a log line nobody sees unless someone is actively watching for it. Whether that residual gap
is worth closing (e.g., `updateBirthYear` refusing an edit that would cross the line, distinct
from `confirm-age`'s backfill case) is the same class of product decision the file's own
comments already flag as unresolved — not something to decide by editing the threshold or the
enforcement quietly in the course of an audit.

## Summary

| Question | Answer |
|---|---|
| Does the gate mechanism (redirect logic) work? | Yes — traced both layouts directly, three-way split, no loop |
| Is the null population still what the design doc claims? | Yes, exactly (4), once matched to the right query; 7 is a different, also-true number for a different population |
| How many real students are affected right now? | 1 — the founder, who also hasn't been through the gate yet |
| Can a student reach an age-sensitive decision through a door other than the gate? | Not found — every live age-sensitive check (opportunity eligibility, contact visibility) is page-gated only; the AI paths don't use birth_year at all currently |
| Does logging below-14 events actually block anything? | No, by two separate, documented, cross-referenced design decisions — not a silent gap, but a real one worth a deliberate decision either way |
