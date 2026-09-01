# How much of Oryn is actually bilingual

Measured 2026-09-01 on `main`. The founder's requirement is explicit —
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

**19 of 171 `.tsx` files under `app/` and `features/` are locale-aware. 152 are not.**

Of those, 78 student-facing files contain roughly **247 user-facing English strings** with
no Turkish path. Excluded from that count: `(dev-preview)` routes, which `notFound()` gates,
and `/admin`, which only staff see.

| Area | Files with untranslated text |
|---|---|
| `features/profile` | 16 |
| `features/universities` | 9 |
| `features/settings` | 8 |
| `app/(app)/profile` | 6 |
| `features/advisor` | 4 |
| `features/opportunities`, `features/onboarding` | 3 each |
| eight more areas | 1–2 each |

Sampled to confirm these are real: `features/profile/progress-view.tsx` alone carries
"Back to profile", "Where you stand", "Next area to strengthen", "How your profile has
changed over the last …", `title="Not enough history yet"`.

## Read the 247 as a floor, not a total

The count comes from grepping JSX text nodes of two or more words plus
`label`/`placeholder`/`title`/`aria-label` props. That misses single-word labels ("Save",
"Details", "Compare"), strings inside template literals, strings held in arrays and
constant maps, and every `toast.error(...)` message. The true number is higher; how much
higher is not worth measuring precisely, because the decision it informs — how big is this
job — is already answered by the order of magnitude.

## What this means for a launch date

A Turkish student switching to Turkish today gets a translated shell, translated legal
pages and translated counselor reasoning wrapped around a profile, university and settings
experience still in English. That is a coherent slice, not a broken one — but it is not the
requirement, and the gap is concentrated in exactly the surfaces a student spends the most
time in.
