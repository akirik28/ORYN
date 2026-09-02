# Onboarding audit — partial, stopped for the connections-gating MVP task

Interrupted by a fleet-wide pause + immediate redirect to a higher-priority, MVP-blocking
task (gate connections the same way messaging is gated). Recording genuine progress before
switching, not a finished audit — pick up from here.

## Confirmed: a live walkthrough is possible after all, for the client-side wizard

`app/(dev-preview)/design-preview/onboarding/page.tsx` mounts the real `OnboardingWizard`
directly, no auth, gated only on `NODE_ENV !== "production"` — walked screens 1-2 live in the
browser (Turkish locale rendered correctly, clean/uncluttered visual first impression, no
console errors). Did not attempt the CV-upload step live — that would hit a real AI
extraction call and/or a real write path from a component that has no way to know it's in a
preview context, which is exactly the kind of live-write risk to avoid; that step still needs
a code-only read.

## Verified: the required-field sequencing on the school/birth-year screen is correct, and was itself a recent fix

Live-testing with everything empty only ever surfaced ONE error message ("fill your country,
school, and curriculum") — reads like birth year and graduation year aren't required. That's
an artifact of short-circuit validation, not the real behavior: read
`features/onboarding/onboarding-wizard.tsx`'s `goNext()` directly and confirmed three
sequential, independently-gating checks for `step === 1` — country/school/curriculum, then
graduation year, then birth year (format check, then the actual `meetsMinimumSignupAge`
policy check with its own distinct message) — each with its own `return` that blocks
`setStep` from advancing. Confirmed live afterward: filled country/school/graduation-year,
left birth year blank, expect (not yet re-tested after the redirect) the birth-year-specific
error to surface next rather than silently advancing.

The `goNext()` comment is worth reading directly — it documents a REAL bug that existed here
before ("graduationYear had no client-side check at all until this one... would sail through
every step, get rejected only at the final Finish click, landing the student on step 4
staring at a graduation-year error with no graduation-year field in sight") and was already
fixed. Good sign for this screen specifically; have not yet checked steps 3-5 for the same
class of gap.

## Confirmed directly from the schema: birthYear is a hard-required field, with its own reasoning on file

`lib/validation/onboarding.ts`'s `CompleteOnboardingSchema.birthYear` has no `.optional()`
and carries a real, historically-grounded comment: it was previously collected nowhere in the
product, 6 of 11 accounts had it null (5 of those already onboarding_completed), an optional
field here "would reproduce exactly that." Server-side re-check exists in `completeOnboarding`
independent of the client check, per the wizard's own comment ("the server check exists so it
can't be bypassed, not because this one is unreliable").

## Not yet done — pick up here

- Steps 3-5 (interests, target geography, CV import) — neither validation logic nor live
  walkthrough attempted yet.
- The CV-import review screen specifically: does the save genuinely wait for review (non-
  negotiable #10)? Do edit and delete both work per extracted item? This needs a code read
  of the review component + `completeOnboarding`'s handling of `extractedItems`/
  `extractedSkills`/`extractedLanguages` (all `.optional()` in the schema, confirmed above,
  consistent with "skip for now" being real for this step specifically — not yet confirmed
  against the actual save path).
- Live data: the 3 accounts with `onboarding_completed: false` (Persona A Test, Oryn QA
  Sweep, Claude UI QA — established during the age-gate audit) — whether anything in the
  schema (an analytics event, a partial-save column) records which step they reached. Not
  yet queried.
- The overall "does it feel like a government form" verdict — not enough of the flow seen
  yet to answer honestly; the two screens covered so far read well (calm copy, real
  reasoning shown to the student for why birth year is asked, no visual clutter).
