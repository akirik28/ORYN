# `lib/vocabularies/languages.ts` i18n — 2026-09-01

Branch `oryn/languages-i18n-2026-09-01`. Pushed, not merged — merge owner is peer session
oryn-a7, who offered this task after merging `oryn/first-run-i18n-2026-09-01`.

## What this closes

The last of three files `check:i18n`'s scanner fix (`a25d18ce`) surfaced as untranslated —
`lib/scoring/completeness.ts` and `features/profile/field-config.ts` were fixed the same
night in the prior branch; this is `lib/vocabularies/languages.ts`, 16 strings across 8
CEFR proficiency levels (Native, Bilingual, A1–C2 — label + hint each).

This isn't a cosmetic gap. A student records a language proficiency to make an actual
comparable claim against a university's stated requirement (the file's own header comment:
CEFR is "the standard European universities actually state their requirements in") — the
Journey page's Languages section is where that happens, and it was English-only for a
Turkish-locale student.

## What changed

`lib/vocabularies/languages.ts`:
- `languageProficiencyLabel(value, locale = DEFAULT_LOCALE)` — the one pre-existing export,
  extended with an additive `locale` param (same pattern as every other lib/-side accessor
  this session's i18n passes have threaded a locale through). English behavior for existing
  callers that don't pass `locale` is unchanged.
- `languageProficiencyHint(value, locale)` — new. Nothing in the app currently reads
  `ProficiencyLevel.hint` (confirmed by grep before writing this — `LANGUAGE_PROFICIENCY_OPTIONS`
  drops it, the old `languageProficiencyLabel` never touched it). The type's own doc comment
  says it's meant to be "shown under the option" — a real, still-unbuilt UI feature, not
  something this pass is on the hook to build. Translated and given a working accessor
  anyway, so whoever eventually wires up that UI finds working Turkish rather than another
  untranslated string to discover later.
- New private `LANGUAGE_PROFICIENCY_TR`, keyed by `value` (the CEFR code — already a stable
  identifier, unlike `label`/`hint`), same shape as `dimensionLabel`/
  `completenessChecklistLabel`'s established accessor pattern.

`features/profile/field-config.ts`: added the 8 CEFR `label` strings (not `hint` — the
select's `options` never carried hint text) to the existing `FIELD_TEXT_TR` dictionary, so
`localizeFields()` — the resolver built in the prior pass — correctly translates
`LANGUAGE_FIELDS`'s `proficiency` select options, which come from
`LANGUAGE_PROFICIENCY_OPTIONS` (imported from this file). Hand-duplicated rather than
imported from `languages.ts`'s own new map: the two dictionaries are keyed differently (by
CEFR `value` there, by exact English string here) for genuinely different consumers, and
this file's own established convention is a flat hand-written literal dictionary throughout
— introducing a one-off cross-file derivation for 8 short, externally-standardized,
essentially-frozen strings would be more machinery than the drift risk justifies. Verified
byte-for-byte identical between the two files by direct grep before committing.

Also translated `field-config.ts`'s own `"Proficiency"` field label (→ "Yeterlilik") —
oryn-a7 flagged this specifically: it's a `field-config.ts`-native string (the select
field's own label, not one of the 16 CEFR strings), and it turned out to already be in the
dictionary from the prior pass (added alongside `SKILL_FIELDS`'s "Proficiency (optional)"),
just never exercised by a test because `__tests__/profile/field-config.test.ts`'s exhaustive
check excluded the whole `LANGUAGE_FIELDS` array. Removed that exclusion now that the array
has nothing left untranslated — full coverage restored, no array-level exception needed any
more.

`app/(app)/profile/page.tsx`: the one call site (`languageProficiencyLabel(item.proficiency)`,
the subtitle under a stored language name) now passes the page's already-resolved `locale`.

## Tests

New `__tests__/vocabularies/languages.test.ts` — English matches each level's own stored
`label`/`hint` for every value (and omitting `locale` behaves like `"en"`); Turkish is real
and distinct for every value, not a silent fallback; a legacy/unrecognized proficiency value
falls back to the raw string for `label` (existing behavior, preserved) but to `null` for
`hint` (no meaningful raw-value fallback for a sentence); Native/Bilingual translate
distinctly from the CEFR-ladder values, matching the file's own stated reasoning for why
they sit outside the A1–C2 scale.

`__tests__/profile/field-config.test.ts`'s exhaustive "every label/option-label has a
Turkish string" test no longer excludes `LANGUAGE_FIELDS` — it was the last array-level
exception; now every real `FieldConfig` array in the file is walked with none skipped.

## Verification

All 4 gates green: lint, typecheck, full suite (205 files / 3018 tests, zero flakes), build.

**On the cookie-vs-toggle verification method** (raised by oryn-a7 mid-task): confirmed
empirically that `lib/i18n/actions.ts`'s `setLocale()` sets `oryn_locale` as `httpOnly:
true` unconditionally, and once that cookie exists on this browser profile (it does — the
switcher has been used repeatedly tonight, and cookies aren't port-scoped on `localhost`), a
`document.cookie` write from `javascript_tool` is silently dropped — confirmed live on a
never-before-used port, not just reasoned about. This exact finding already existed in
`reference_oryn_dev_environment_quirks.md` (written ~8 hours earlier by a different
session) — re-derived and empirically reconfirmed rather than taken on faith, and flagged
in that file for whoever holds the separate, stale "cookie is known-good" note to reconcile
against it. Used the real toggle for this pass's live verification (the only working
mechanism on this account), same discipline as every prior pass: reset back to English
immediately after, cancelled rather than saved the one dialog opened.

**Live, both locales**: the founder's real account already has three language records —
confirmed all three render the correct translated label as the stored-value subtitle:
English → "C1 — İleri Düzey", German → "A1 — Başlangıç Düzeyi", Turkish → "Anadil" — exact
matches to the new dictionary, proving `languageProficiencyLabel`'s fix end to end on real
stored data, not just a fresh form. Opened the real "Add language" dialog: field label
"Yeterlilik" (Proficiency) and the language-name placeholder "örn. İngilizce, Türkçe" both
correct; opened the proficiency dropdown and confirmed 6 of 8 CEFR options rendering
correctly in place (C2 — Ustalık, C1 — İleri Düzey, B2 — Üst Orta Düzey, B1 — Orta Düzey,
A2 — Temel Düzey, A1 — Başlangıç Düzeyi — Native/Bilingual already confirmed via the three
stored records above). Closed via Cancel, not Save. Zero console errors. Reset language
back to English before finishing.

## Scope boundaries

- `LANGUAGE_NAME_SUGGESTIONS` (46 language names — English, Turkish, German, ...) left
  untranslated on purpose, matching the established convention for `suggest`-type fields'
  suggestion lists (as opposed to fixed `select` options) — same treatment as
  `COUNTRY_SUGGESTIONS`, `SKILL_NAME_SUGGESTIONS`, and every other suggestion array in
  `lib/vocabularies/*` left alone in the prior `field-config.ts` pass. A genuinely separate,
  larger task if it's ever wanted.
- `.hint` translated but not wired into any UI — noted above, a pre-existing gap this pass
  didn't introduce and wasn't asked to close.
- Did not touch `lib/story-bank/collect.ts` or `lib/moderation/report-status.ts` — the two
  smaller files oryn-a7's scanner also surfaced, still open, not part of this assignment.
- Did not touch `opportunities` table, no live AI calls, no unresolved writes left on the
  founder's account beyond the transient locale toggle (reset before finishing).
- Did not merge to main — pushed only, per oryn-a7's ownership of this branch's merge.
