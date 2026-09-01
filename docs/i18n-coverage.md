# How much of Oryn is actually bilingual

Run it yourself: `npm run check:i18n` (`scripts/measure-i18n-coverage.ts`). Numbers below
are that command's output on `main`, 2026-09-01. The founder's requirement is explicit —
*"türkçe ingilizce seçeneği olmalı site için tamamen"*, full Turkish/English across the
whole site — so this file states the honest distance to it rather than the progress made.

## What is done, and done well

- **The message catalogs are in sync.** `messages/en.json` and `messages/tr.json` both hold
  19 keys, none missing on either side, and only one value is identical across locales
  (`nav.plan` — "Plan" is the same word in Turkish). No stub translations, no drift.
- **The app shell is translated** — sidebar, mobile nav, notification bell, user menu,
  language switcher.
- **The legal surface is translated**, through `lib/legal/content.ts`'s `getLegalCopy(locale)`.
- **The counselor's reasoning is translated**, along with 15 other files that branch on
  `locale === "tr"` where the string is generated rather than static.
- **The switcher persists correctly** — cookie first for the current browser,
  `profiles.preferred_language` after it so the choice follows the student to another
  device, with the failure reported rather than swallowed.

## What is not

**18 of 171 `.tsx` files under `app/` and `features/` are locale-aware. 153 are not.**

Of those, 86 student-facing files contain at least **332 user-facing English strings** with
no Turkish path. Excluded from that count: `(dev-preview)` routes, which `notFound()` gates,
and `/admin`, which only staff see.

| Area | Strings | Files |
|---|---|---|
| `features/profile` | 69 | 17 |
| `app/(app)/profile` | 36 | 6 |
| `features/settings` | 36 | 8 |
| `features/onboarding` | 31 | 3 |
| `features/universities` | 16 | 10 |
| `features/advisor` | 14 | 4 |
| `features/search`, `app/(app)/opportunities` | 12 each | 2 each |
| seven more areas | 1–10 each | 1–3 each |

**Rank by strings, not by files.** The two orderings disagree, and the file count is the
misleading one: `features/onboarding` is 3 files but 31 strings, while
`features/universities` is 10 files and only 16. A package scoped by file count would put
universities ahead of onboarding and be wrong about which is more work.

Sampled to confirm these are real: `features/messaging/conversation-thread.tsx` carries
"Conversation options", "No messages", "Write a message…", "Report this", "What's wrong
with this message?", "Submit report".

## The number hid partly-translated files, until it didn't

The first version of `check:i18n` skipped a file entirely once it contained a single
`useTranslations` call. So a file where half the strings had been converted counted as
locale-aware, dropped out of the untranslated total, and read as finished. Found by the lane
doing the translating, 2026-09-01 — and it is the same shape this whole document is about:
a confident number produced where the input was never looked at.

Fixed in the ruler rather than worked around. Raw strings are now counted in every file, and
locale-aware files with leftovers are listed separately as **partly translated**, because
those are precisely the ones a coverage number hides. The first run after the fix surfaced
42 such strings in 4 files — 20 of them in `features/dashboard/dashboard-view.tsx`, the
most-seen surface in the product, which had been reading as done.

**And then the same lane found the mirror-image flaw, which is the more interesting half.**
Once partly-translated files became visible, their counts turned out to overstate the work as
badly as the old behaviour understated it. The regex flags capitalised JSX text; it does not
parse conditionals. So in a file mixing the inline `locale === "tr" ? … : …` pattern with the
catalog, the *English branch of an already-bilingual conditional* reads as untranslated — one
file's twelve hits were all of that kind, confirmed by hand.

Teaching the script to parse JSX is a different tool. What it can say honestly is *which files
need a human to look*, so that is now what it says: partly-done files are listed by name with
their count marked as a ceiling, and they no longer contribute to the totals or the area
table. Numbers it publishes come only from files it can actually measure.

The operational lesson for anyone taking a package: use this script to decide *which files*
to prioritise, never to decide whether a file is *finished*, and never read a partly-done
file's number as remaining work. Inside a file, check by hand.

## The Turkish dotted-İ handling, finally measured rather than argued

This has been fixed and re-fixed several times and reasoned about in three separate file
comments, but the premise underneath it — *does the browser actually apply `lang` to CSS
`text-transform`?* — had never been tested. Tested 2026-09-01 in the app's own browser, by
reading `innerText`, which reflects the rendered transform:

| Element | Rendered |
|---|---|
| `lang="tr"`, `text-transform: uppercase`, text `iyi` | `İYİ` (U+0130) |
| `lang="en"`, same | `IYI` (U+0049) |
| no `lang` (inherits `<html lang="en">`) | `IYI` |

So the mechanism works, and the design built on it is sound. Two consequences worth stating,
because they invert the intuition:

**The bug is English text on a Turkish page, not Turkish text.** `app/layout.tsx` sets
`<html lang={locale}>`, so on a Turkish page *everything* inherits Turkish casing. Measured
inside a `lang="tr"` subtree: `"Signed in as"` → **`SİGNED İN AS`**, while `"Oturum açan"` →
`OTURUM AÇAN`, correctly. Translating a string therefore *removes* the need for any per-element
fix; the fix is only ever needed for the strings still awaiting translation.

**Which means passing `locale` to an element whose text is still English would cause the bug
rather than prevent it.** `components/oryn/eyebrow.tsx` already documents exactly this and
defaults to English for that reason — "a caller that translates `children` should pass the
locale it translated to." Audited all five call sites that pass `locale`, plus every
`ProfileSignal` caller, whose `heading` defaults to the English `"Profile signal"`: every one
pairs a translated string with its matching locale. No live instance of the inverted failure.

The reusable part is the probe. To check any suspect element:

```js
// in the browser console, on the page in question
const el = document.querySelector('<selector>');
({ lang: el.closest('[lang]')?.lang, rendered: el.innerText });
```

`innerText` shows what the transform actually produced, which `textContent` does not.

## The AI now answers in Turkish — and what that does not yet guarantee

Until 2026-09-01 every AI surface wrote English regardless of locale. `lib/ai/output-language.ts`
appends one shared instruction to each system prompt, driven by the student's stored
`preferred_language` rather than the request cookie — weekly plans are generated from cron,
where there is no request to read a cookie from.

Wired into five of the six surfaces that produce prose a student reads, from two different
locale sources on purpose:

- `advisor-chat`, `weekly-plan`, `research-generator` — from the student's stored
  `preferred_language`, because two of them also run from cron where there is no request.
- `essay-outlines`, `refine-achievement` — from `resolveLocale()`, passed by the Server Action
  that calls them. That prefers the cookie, and should: the student is reading the interface
  in that language right now, which beats a preference set months ago.

`counselor-explain` is the one still unwired — it takes neither the context nor a locale
today, and belongs with the advisor package.

The instruction says three things beyond "write in Turkish", each protecting a decision the
product already made:

- **Proper names and quoted source text stay verbatim.** A translated university or programme
  name cannot be checked against the source it came from, and traceability is the discipline
  the whole product rests on.
- **Don't invent a term where the language has none** — the position `lib/legal/content.ts`
  already took with KVKK vocabulary.
- **The voice doesn't change with the language.** Phase 57's register belongs to the counsel,
  not to English.

**What is not covered, and it is the important half.** Nothing measures the *quality* of the
Turkish that comes back. The eval suite is English-only, and checking whether Turkish counsel
keeps the demanding-mentor register costs real model calls against a nearly-spent balance.
The mechanism is asserted in `__tests__/ai/output-language.test.ts`; the register is not.

So the honest status is: a Turkish student now gets Turkish counsel, and nobody has read it.
That is better than certainly-English, and it is not the same as verified. A Turkish eval pass
is the missing piece, and it is a founder decision because it costs credit.

## A whole class of gap no string count can see

`npm run check:i18n` counts text. It cannot see a gap whose symptom is a *missing function
call* — a component reading an English-only `Record<Type, string>` map directly instead of
calling the locale-aware accessor beside it. There is no untranslated string to find; the
string is in `lib/`, correct, and simply never asked which language it should be in.

Found repeatedly: `page.tsx` and `progress-view.tsx` reading `DIMENSION_LABELS` /
`EVIDENCE_STATE_SHORT_LABELS` raw, `score-radar.tsx` reading `DIMENSION_LABELS_SHORT` raw,
and `lib/ai/student-context.ts` writing raw dimension *keys* into the model prompt — which
then came back out inside the counsel a student reads ("your career_exploration gap…").

Swept all thirteen exported label maps under `lib/` on 2026-09-01. Three have locale-aware
accessors (`scoring/labels.ts`, `scoring/signal.ts`, `social/open-to.ts`). Of the rest:

| Map | Student-facing consumers |
|---|---|
| `REQUIREMENT_CATEGORY_LABELS` | `universities/[id]/page.tsx`, `admin-requirement-form.tsx` |
| `SUBJECT_LABELS` | `universities/[id]/page.tsx` |
| `SEARCH_RESULT_TYPE_LABELS` | `command-palette.tsx`, `search-view.tsx` |
| `EVIDENCE_LINKABLE_LABELS` | `documents/page.tsx` |
| `SCORE_PROVENANCE_LABELS`, `CURRICULUM_LABELS` | none |
| `PORTFOLIO_CATEGORY_LABELS` | 3 in `features/profile/` — **deferred on purpose, see below** |

`PORTFOLIO_CATEGORY_LABELS` is shared with `cv-builder.tsx`, which produces a printed CV.
Localizing it would either mismatch the on-screen controls against the printed output or
require deciding what language a printed CV should be in — a product question, recorded in
the component rather than answered silently. Worth knowing before anyone "fixes" it.

**When taking a package, grep it for direct `LABELS[` indexing as well as running the
script.** The two find different things, and only one of them finds this.

## Read the 332 as a floor, not a total

The count matches JSX text nodes of two or more words plus
`label`/`placeholder`/`title`/`aria-label` props. It misses single-word labels ("Save",
"Details", "Compare"), strings inside template literals, strings held in arrays and const
maps, and every `toast.error(...)` message. The true number is higher; how much higher is
not worth chasing, because the decision it informs — how big is this job — is already
answered by the order of magnitude.

An earlier version of this file said 247 across 78 files. That came from a line-based
`grep`, which cannot see JSX text sitting on the line *after* its opening tag — the ordinary
way this codebase formats JSX. Same criteria, better reading of them; the floor moved up,
it did not move for a different reason.

## What this means for a launch date

A Turkish student switching to Turkish today gets a translated shell, translated legal
pages and translated counselor reasoning wrapped around a profile, university and settings
experience still in English. That is a coherent slice, not a broken one — but it is not the
requirement, and the gap is concentrated in exactly the surfaces a student spends the most
time in.
