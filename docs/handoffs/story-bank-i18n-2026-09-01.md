# `lib/story-bank/collect.ts` i18n — 2026-09-01

Branch `oryn/story-bank-moderation-i18n-2026-09-01`. Pushed, not merged — merge owner is
peer session oryn-a7, who offered both this and `lib/moderation/report-status.ts` after
merging `oryn/languages-i18n-2026-09-01`.

## What this closes, and what it doesn't

oryn-a7 offered two files from `check:i18n`'s Data-modules list. Only one needed fixing:

**`lib/story-bank/collect.ts` (7 strings) — fixed.** `SOURCES`' 7 category labels
("Activity", "Project", "Award", "Research", "Volunteering", "Work", "Sports") reach a
student two ways: directly, as the "· Activity" text under each item in
`features/profile/story-bank.tsx`'s experience picker, and indirectly, through the
essay-outline AI prompt (`lib/ai/essay-outlines.ts:78`, `` `- [${e.category}] ${e.title}...` ``)
— the model then writes that bracketed word back into the outline it returns to the
student. Same "the AI prompt is a student-facing surface" reasoning this session's other
i18n passes have applied, not a new argument invented for this file.

**`lib/moderation/report-status.ts` (4 strings) — checked, not fixed, on purpose.** Traced
both of its only two consumers (`features/admin/report-review-control.tsx`,
`app/(app)/admin/page.tsx`) before touching anything — both are exclusively inside the
`/admin` route, an operator-only moderation-review control (an admin selects
Open/Reviewing/Resolved/Dismissed for a reported message). No student-facing rendering
anywhere. This is the same category oryn-a7 had already separately excluded for
`lib/jobs/schedule.ts` and `lib/acquisition/verification.ts` — "operator strings that
should stay English" — oryn-a7 just hadn't checked this specific one before offering it.
Left untranslated; reported back rather than translated on the assumption that "offered"
meant "confirmed in scope."

## What changed

`lib/story-bank/collect.ts`:
- New `SOURCE_LABEL_TR`, keyed by `table` — already this array's own stable identifier (a
  real DB table name), so no new key field was needed, unlike the completeness-checklist
  fix earlier tonight where the English label itself had been doing double duty as an
  identity and needed splitting out.
- New `sourceLabel(table, englishLabel, locale)` helper and a translated `"Untitled"` →
  `"Başlıksız"` fallback for the (very unlikely in practice — every real achievement form
  requires a title or sport) case of a row missing both `title` and `sport`.
- `collectStoryBankExperiences` gains an additive `locale` param (default English, same
  pattern as every other lib/-side function this session's i18n passes have threaded a
  locale through) and now bakes the translated `category`/`title` directly into each
  returned `StoryBankItem` — not a separate accessor callers must remember to invoke, since
  nothing outside this file treats `category` as an identity (confirmed: it's only ever
  displayed, never matched/compared against), so there was no stable-key risk to guard
  against here.

Both call sites already had `locale` resolved for other reasons and needed one line each:
`app/(app)/profile/story-bank/page.tsx` (added `resolveLocale()`, wasn't calling it before)
and `app/(app)/profile/story-bank/actions.ts` (already called `resolveLocale()` for the AI
rate-limit check two lines above the `collectStoryBankExperiences` call).

`lib/ai/essay-outlines.ts` — untouched. It already receives whatever `category` the caller
handed it and interpolates it as-is; now that `actions.ts` passes `locale` through to
`collectStoryBankExperiences`, the string arriving at the prompt is already correct by
construction.

## Tests

New `__tests__/story-bank/collect.test.ts` — mocks `SupabaseClient` following the existing
pattern from `__tests__/deadlines/notify-if-threshold-crossed.test.ts` (a chainable
per-table query-builder stub), scoped to the locale behavior specifically rather than full
field-mapping coverage of all 7 source tables (which had no test before this pass either).
Confirms: English is the default when `locale` is omitted; all 7 source tables' categories
translate correctly under Turkish (one populated row per table, checked by id); the
`"Untitled"`/`"Başlıksız"` fallback for a row missing both `title` and `sport`.

## Verification

All 4 gates green: lint, typecheck, full suite (210 files / 3066 tests, zero flakes),
build.

**Live, both locales**, real toggle (no `/design-preview` fixture covers this page, and the
httpOnly-cookie method confirmed dead on this account in the prior pass) — disclosed as a
real write, reset to English immediately after, same discipline as every prior pass
tonight. The founder's real account has 15 story-bank experiences across 5 of the 7 source
types (no volunteering or work-experience records) — all 15 showed the correctly translated
category under Turkish: 6× "· Faaliyet" (Activity), 4× "· Proje" (Project), 3× "· Ödül"
(Award), 1× "· Araştırma" (Research), 1× "· Spor" (Sports) — exact matches to the new
dictionary, on real stored data covering the majority of the source tables in one check.
Did not trigger the actual AI outline generation (would spend real Anthropic credits for a
check the code-reading + unit tests already cover — the prompt-builder code itself is
unchanged, only the string it receives is now correctly localized upstream). Zero console
errors.

## Scope boundaries

- `lib/moderation/report-status.ts` deliberately not translated — see above.
- Did not touch `opportunities` table, no live AI calls.
- Did not merge to main — pushed only, per oryn-a7's ownership of this branch's merge.
