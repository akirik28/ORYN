# Signup + the public profile — and a duplicate-key bug caught before it shipped

Branch `oryn/i18n-signup-profile-2026-09-01`, based on `1eea467d`. Package:
`app/(auth)/signup/page.tsx` (4 strings), `app/(auth)/_components/signup-form.tsx` (2
strings), `app/(app)/u/[id]/page.tsx` (3 strings, the public profile — and the file CEO
flagged for indexing `OPEN_TO_LABELS` directly, correct today only because the page has no
locale awareness at all).

## The real scope was much bigger than the counted strings

Consistent with every other package tonight, the counted numbers (4/2/3) were a floor, not
a ceiling — the counting script misses single-word labels and everything inside a
template literal or ternary, and `u/[id]/page.tsx` is a genuinely large page. Translated
everything user-facing found by reading the file end to end: the two auth files needed 10
distinct strings (not 6 — `Display name`/`Email`/`Password`/the password hint, and both
branches of the submit button's ternary, none of which the script's "2+ word JSX text
node" heuristic catches). The public profile needed 20 — 8 contact-field labels alone
(`Email:`, `Phone:`, `LinkedIn:`, `GitHub:`, `Website:`, `Instagram:`, `X / Twitter:`,
`Discord:`), plus section headings, the private-profile notice (a sentence with an
embedded link), a pluralized mutual-connections count, and an interpolated "Class of
{year}"/"Looking for: {value}" pair. Translating only the 3 counted strings would have
left a half-translated page — exactly the "partly translated" trap
`docs/i18n-coverage.md` warns is worse than not touching a file at all.

## A real bug, caught by typecheck before it reached anyone

First pass at editing `messages/en.json`/`tr.json` anchored my new content at the end of
the file and added a top-level `"auth": { "signup": {...} }` block — not knowing an `auth`
key already existed earlier in the same file (`auth.login`, `auth.resetPassword`, from the
already-merged auth-landing lane). Two top-level keys with the same name is syntactically
valid JSON but semantically means "the second one wins" once `JSON.parse` reads it — so my
edit silently discarded `auth.login`/`auth.resetPassword` from the parsed catalog.
`npm run typecheck` caught it immediately: every file referencing `auth.login`/
`auth.resetPassword` (four files, none of them mine) failed with "key does not exist",
because the flattened catalog type no longer had those keys. Fixed by merging `signup` in
as a third sibling inside the existing `auth` object instead of a second top-level one, and
re-verified both files have zero duplicate top-level keys and identical key sets
(1,001 each) before moving on. Worth naming plainly: this was exactly the kind of mistake
this session's own instructions warn about, and the gate caught it before a commit, let
alone a push — which is what the gate is for.

## Two i18n test guards needed extending, both legitimately

- **"Turkish is actually translated, not copied from English"**
  (`__tests__/i18n/locale.test.ts`) failed on five new identical-value pairs:
  `contactDiscord`/`contactGithub`/`contactInstagram`/`contactLinkedin`/`contactTwitter`.
  Correct behavior, not a bug — these are the platforms' own brand names, the same
  reasoning the file already applies to AP/IB/A-Level. Added them to the guard's explicit
  allowlist with that reasoning stated, matching the file's own established comment style.
  `contactEmail`/`contactPhone`/`contactWebsite` are genuinely translated ("E-posta:",
  "Telefon:", "Web sitesi:") and are correctly NOT in that list — the asymmetry is what
  proves these five were a deliberate choice, not the whole block left in English.
- **"no un-reviewed `#` inside a plural block"** failed on `publicProfile.mutualConnections`,
  which uses ICU plural syntax. Added it to `BOUNDED_BELOW_1000` with the actual reasoning:
  a mutual-connections count between two individual teenage students cannot plausibly reach
  four digits, so `#`'s locale-native number formatting (vs. the rest of the product's
  `formatNumber` en-US pin) can't disagree in a way that matters here.

## Verified live — self-view and the embedded-link sentence specifically

Started this worktree's own dev server (`next dev -p 3721`, backgrounded via Bash — the
`preview_start` collision with another chat's running server is a known quirk from earlier
tonight). Confirmed via the live accessibility tree, Turkish, self-viewing the persisted
account's own public profile:

- The private-notice sentence with its embedded Settings link (`t.rich()`) rendered as one
  natural sentence with a real, clickable "Herkese açık profil" link in the middle — not
  two disconnected text fragments around a broken placeholder.
- `classOf` interpolation: "2028 mezunu".
- Section headings: "Beceriler", "Portföy", "Açık olduğu alanlar", "İletişim".
- `openToLabel` accessor, called from this page instead of indexing `OPEN_TO_LABELS`
  directly as before: "Girişim ekibi" (Startup team) rendered correctly.
- A contact field label: "Telefon:" (the actual phone number is the account's real one, not
  quoted here).

**Not verified live**: `/signup` itself — the persisted browser session on this machine is
already authenticated, and the route correctly redirects a signed-in visitor away before
the page renders, so there was no logged-out browser available to exercise it. The English
and Turkish strings themselves compile, typecheck, and pass every catalog-parity guard, and
`signup-form.tsx` follows the exact `useTranslations`/`useLocale` pattern already proven
live on `command-palette.tsx` in the previous i18n branch — but this one page's live render
is asserted from the pattern, not observed directly, and is worth a real check by whoever
has a logged-out session handy.

## Verification

- `npm run lint` / `npm run typecheck` / `npm test` (199 files, 2967 tests) / `npm run
  build` — all clean, after the duplicate-key fix.
- `__tests__/i18n/label-accessors.test.ts`, `__tests__/i18n/translation-keys.test.ts`,
  `__tests__/i18n/locale.test.ts`, and the coverage test — 29 tests, all passing after
  extending the two guard lists above.
- `npm run check:i18n` — neither `signup` nor `u/[id]` appear in the untranslated or
  partly-translated tables anymore.
- No `opportunities` table touched. No DB writes at all.

## Scope boundaries

- `auth.resetPassword.requirements` already holds the identical English password-hint
  sentence `auth.signup.passwordHint` now also holds. Left as two separate keys rather than
  one shared one, matching this catalog's established per-namespace-owns-its-own-copy
  convention (`search.view.placeholder` / `search.commandPalette.inputPlaceholder` did the
  same in the previous branch despite an identical value) — not deduplicated here.
- Catalog conflicts in `messages/{en,tr}.json` with other lanes' concurrent branches are
  expected; not rebased around, per CEO's standing instruction for this push.
