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

The operational lesson for anyone taking a package: use this script to decide *which files*
to prioritise, never to decide whether a file is *finished*. Inside a file, check by hand.

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
