# i18n readiness

ORYN stays in its current (English) display language for now — this is an architecture
audit and incremental groundwork, not a translation pass. See AGENTS.md's "Internationalization-
ready from day one" section for the founder requirement this responds to.

## Current state (measured, not assumed)

- **No i18n framework is installed.** No `next-intl`/`i18next`/`react-intl`/`@formatjs`/lingui
  in `package.json`, no `messages/`/`locales/`/`i18n/` directory, no `next.config.ts` i18n
  config, no `useTranslations`/`t()` call pattern anywhere.
- **All UI copy is inline JSX string literals.** A heuristic scan found roughly 43-63 of the
  ~95 `.tsx` files under `app/`/`features/` contain literal user-facing text directly in JSX
  (the range reflects scan strictness, not precision) — a clear majority, with zero
  message-catalog infrastructure to extract them into yet.
- **Dates are already in reasonable shape.** `date-fns` is the established date-formatting
  library (`formatDistanceToNow`, `differenceInCalendarDays`, etc.) across 9 files. Unlike a
  bare `.toLocaleDateString()`, `date-fns` functions take an explicit `locale` option
  (defaulting to English if omitted) — deterministic today, and each call site is a natural,
  contained place to thread a locale through once one exists. Not done in this pass (no real
  locale to thread yet, and touching 9 call sites for a parameter nothing reads would be
  premature).
- **Numbers/currency were not in the same shape — fixed this pass.** Found and fixed 4 bare
  `.toLocaleString()` call sites (`features/universities/university-card.tsx`,
  `app/(app)/universities/[id]/page.tsx` ×2, `app/(app)/admin/page.tsx` ×2 — 5 total call
  sites across 3 files). Unlike `date-fns`, a bare `.toLocaleString()`/`Intl.NumberFormat()`
  with no explicit locale argument resolves against the *runtime's* default ICU locale — for
  a Server Component, that's the Node process's own locale, not the visiting student's, so
  the same number could render with different separators across environments, or (once this
  product is ever actually localized) simply never move with a student's chosen language at
  all. New `lib/i18n/format.ts` (`formatNumber`, `formatCurrency`, unit-tested in
  `__tests__/i18n/format.test.ts`) wraps `Intl.NumberFormat` with one explicit, named
  `DEFAULT_LOCALE` constant — the single place a future locale switch changes, not scattered
  call sites.
- **Unicode-safe search already exists, independent of this pass.**
  `lib/entities/normalize.ts`'s `normalizeEntitySearchText` does NFKD normalization, strips
  combining diacritics, and specifically handles the Turkish dotless-ı/dotted-i case — real
  infrastructure already exercising the exact class of bug generic English-only string
  handling misses, built for the canonical-entity registry, not for this pass.
- **One existing `Intl` precedent**: `lib/acquisition/normalize.ts` already uses
  `Intl.DisplayNames` for country-code → name lookups (hardcoded to `["en"]"` today — a real,
  reasonable target for the same locale-threading treatment once there's a locale to thread).
- **No behavior found depending on an English display string for logic** (spot-checked; every
  conditional/comparison found in this audit branches on a typed value — an enum member, a
  category key, a boolean column — never on a rendered label string). This is the property
  that actually matters for i18n-readiness at the logic layer; worth re-checking if a future
  pass finds a counterexample, but nothing here needed fixing.

## Recommended path forward (not attempted this pass — sequencing, not a rewrite)

1. **Pick a message-catalog library when actual translation work starts** — `next-intl` is
   the most common fit for App Router (server + client component support, no extra routing
   config required for a single-locale start). Don't add the dependency before there's a
   second locale to justify it; an unused i18n library sitting in `package.json` is dead
   weight, not "readiness."
2. **Extract strings page-by-page, starting with the highest-traffic surfaces** (dashboard,
   onboarding, navigation) rather than a single repo-wide sweep — mirrors how this session's
   canonicalization fixes landed as separate reviewable commits rather than one giant diff,
   and lets copy quality get re-reviewed by a human alongside each extraction instead of
   batch-approved.
3. **Thread a `locale` option through the existing `date-fns` call sites** once a second
   locale is real — the date-fns locale packs (`date-fns/locale`) cover this without a
   library swap.
4. **Revisit `Intl.DisplayNames(["en"])`** in `lib/acquisition/normalize.ts` at the same time.
5. **Pluralization**: no plural-sensitive string was found needing fixing in this pass (the
   few "N item(s)" spots already branch on count in code, e.g.
   `${count} mutual connection${count === 1 ? "" : "s"}`) — this pattern doesn't generalize to
   languages with more than two plural forms, so a real message-catalog library's plural
   rules (not more inline ternaries) should replace it once translation starts, not before.
6. **Layout tolerance for longer text** — not audited this pass (needs visual review per
   surface, better done once real translated strings exist to test with rather than
   speculatively).
