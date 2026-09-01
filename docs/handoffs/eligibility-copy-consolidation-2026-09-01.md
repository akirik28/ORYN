# Eligibility copy consolidation — 2026-09-01

Branch `oryn/eligibility-copy-consolidation-2026-09-01`. Pushed, not merged — merge owner
is peer session oryn-a7, per their own instruction when assigning this task.

## Root cause

`docs/known-issues.md` had an open, founder-decision-pending entry: two independently
written implementations of the same four eligibility restrictions (age, country,
citizenship, grade level) each produced their own English sentence for the same
underlying condition —

- `lib/opportunities/matching.ts`'s `computeEligibility()`, feeding the Opportunities
  browse cards and opportunity detail pages.
- `lib/counselor/copy.ts`'s `eligibilityCopy` object, called from
  `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility()`, feeding
  `recommendation.warnings[0]` on the Advisor page's priority cards.

A student who opened an opportunity from the Advisor page and clicked through to its own
detail page read two different English sentences about the exact same restriction — and,
after this session's earlier i18n-advisor pass translated both sides faithfully rather
than reconciling them, two different Turkish sentences too. The full 10-condition
comparison table is preserved in `docs/known-issues.md`'s now-resolved entry.

That doc's own recommendation leaned toward keeping `copy.ts`'s wording, reasoning that
its call sites already threaded a resolved `Locale` and its sentences were marginally more
complete. That lean did not hold up once actually checked against the rest of the
product's Turkish.

## What was actually decided, and why

**`matching.ts`'s wording won.** Two independent findings, not a coin flip:

1. **Register mismatch.** `copy.ts`'s Turkish used the formal `siz` register
   ("doğum yılınız", "sizinki"). Every other Turkish string in the product — signup, the
   public profile, search, and `matching.ts`'s own existing Turkish — uses informal `sen`.
   Peer session oryn-a7 independently ran a full count across `messages/tr.json`: **85
   informal vs. 8 formal markers across all 1,028 catalog strings.** `copy.ts`'s formal
   register was an unnoticed outlier, not a deliberate choice anyone had made — there is no
   comment or decision record anywhere justifying it as intentional.
2. **Length.** `matching.ts`'s English is shorter and more direct, matching the product
   spec's own stated copy preference (Phase 56: "Prefer... over...", favoring plain short
   sentences over fuller explanatory clauses).

**What was preserved from `copy.ts` despite it losing:** two of its ten sentences were
genuinely more informative, not just wordier. The citizenship-known-ineligible and
grade-known-ineligible branches stated what's currently on file ("citizenship on file is
{onFile}"; "you're currently grade {N}") — real information a student can use to catch a
data-entry mistake on their own profile. `eligibilityMessages.citizenshipNotEligible` and
`eligibilityMessages.gradeNotEligible` keep that detail; only the surrounding sentence
structure is the terser `matching.ts` version. Both call sites already had the necessary
data in scope (`citizenshipCountries.join(", ")` / the computed `grade`), so this was
additive, not a data-plumbing change.

## What was built

`lib/opportunities/matching.ts` gained one new export, `eligibilityMessages` — ten
locale-aware sentence-builder functions (`ageUnknown`, `countryUnknown`,
`countryNotEligible`, `citizenshipUnknown`, `citizenshipNotEligible`,
`citizenshipRestrictionOnFile`, `residencyRestrictionOnFile`,
`countryEligibilityUnverified`, `gradeUnknown`, `gradeNotEligible`) — with a doc comment
explaining the decision above. `computeEligibility()`'s body was rewritten to call these
instead of its own inline `locale === "tr" ? ... : ...` ternaries; behavior is unchanged,
only the sentence text moved to a shared, importable location.

`lib/counselor/eligibility.ts` now imports `eligibilityMessages` from
`@/lib/opportunities/matching` alongside its existing `isSameCountry` import (that file
already imported from `matching.ts`, so this follows established precedent rather than
introducing a new cross-module dependency direction), and its ten relevant
`eligibilityCopy.X(...)` call sites now call `eligibilityMessages.X(...)` with the same
argument shapes. `dataNotFound` and `notVerified` — the two messages with no `matching.ts`
counterpart (a missing/unfetched opportunity row, and one that failed its own verification
check) — are untouched, still calling `eligibilityCopy` from `copy.ts`.

`lib/counselor/copy.ts`'s `eligibilityCopy` object was trimmed from twelve entries to two
(`dataNotFound`, `notVerified`), with a comment pointing at `matching.ts` for the rest and
at the now-resolved `docs/known-issues.md` entry for why. Nothing else in that file
changed — `gapWhyLine`, `alreadyStrongWhyLine`, `verifiedActiveLine`, `missingInfoWhyLine`,
`requirementCategoryLabel`, `requirementActionTitle` are all unrelated to eligibility and
were left alone. Confirmed via repo-wide grep that only `eligibility.ts` and `copy.ts`
itself ever referenced `eligibilityCopy` — no other consumers, so the trim was contained.

## Test changes

`__tests__/counselor/eligibility.test.ts` had three assertions pinned to `copy.ts`'s old
exact wording via `toMatch()` regex (my working assumption going in — that this suite only
asserted the `verdict` enum — was wrong for these three cases specifically):

- `"country eligibility hasn't been verified"` → updated to match the new shared text,
  `"country eligibility not verified yet"`.
- Two Turkish regexes (`/ülke uygunluğu henüz doğrulanmadı/`, `/yaş şartı/`) needed a case-
  insensitive flag added: the new shared sentences put those words at the start of the
  sentence, capitalized, where the old `copy.ts` wording had them lowercase mid-sentence.
  Both are plain ASCII/Latin-1 case pairs (Ü/ü, Y/y) that JS's `/i` flag folds correctly —
  unlike the dotted-İ/dotless-ı pair this session has hit elsewhere, this is not that bug.

`__tests__/opportunities/matching.test.ts` needed no changes — its regex assertions
(`toMatch(/age/i)` etc.) are loose enough to survive the wording move unaffected.
`__tests__/counselor/eligibility-and-urgency-contracts.test.ts` needed no changes — it
asserts only the `verdict` enum, never note text.

## Verification

All four gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — all
clean. Full-suite `npm test` showed 3 unrelated failures (`entity-combobox.test.tsx`,
`onboarding-wizard.test.tsx`, `refresh-matches-admin-degradation.test.ts`) that do not
import any file touched by this change; re-run in isolation, all 3 passed, confirming
load-dependent flakiness under the full parallel run rather than a regression.

**Live, both locales, same real opportunity, same real student** (this worktree's own dev
server, port 3901, against `oryn-qa-scratch`): found "JA Company Programme (Europe)"
(age-restricted 15–18, no country/citizenship data) via direct query — a real opportunity
this student's profile (`country: Turkey`, `graduation_year: 2028`, no birth year on file)
triggers both the age-unknown and country-eligibility-unverified notes for.

- Opportunities page card, Turkish: *"Yaş şartı var — kontrol etmek için doğum yılını
  ekle. Ülke uygunluğu henüz doğrulanmadı — kısıtlamalar için resmi sayfayı kontrol et."*
- Advisor page warning, same opportunity, Turkish: *"Yaş şartı var — kontrol etmek için
  doğum yılını ekle."* — the first sentence, byte-identical (the Advisor only surfaces
  `warnings[0]`).
- Same pair, switched to English via the real Settings language toggle: Opportunities
  page *"Has an age requirement — add your birth year to check. Country eligibility not
  verified yet — check the official page for restrictions."*; Advisor page *"Has an age
  requirement — add your birth year to check."*

No console errors on either page, either locale. This is the exact defect the consolidation
targeted, reproduced and confirmed fixed on a live opportunity rather than inferred from
code reading alone.

## Scope boundaries

- `computeEligibility()`'s `savedStatus === "applied"` / `"not_interested"` branches, and
  its hard minimum/maximum-age-exceeded messages, were left untouched — they have no
  counterpart anywhere in `copy.ts`/`eligibility.ts`'s ten conditions at all (confirmed by
  reading `eligibility.ts` in full: it explicitly does not re-check a known age, only
  whether the fact is on file, by design — see that file's own comment on the age block).
- Did not touch `opportunities` table or any DB row — this is a pure code/copy change.
- Did not merge to main — pushed only, per oryn-a7's explicit instruction.
