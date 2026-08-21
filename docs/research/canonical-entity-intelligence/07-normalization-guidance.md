# 07 — Normalization Guidance

The mission brief asks this package to "test normalization against difficult multilingual
examples" and "search for false-positive cases." This document does that literally — every claim
below was run, not assumed, against `lib/acquisition/normalize.ts`'s actual functions (copied
verbatim into a throwaway Node script, since no TS toolchain was available in this session) and,
where relevant, against the live `oryn-qa-scratch` Postgres instance directly. One hypothesis
below turned out to be **wrong on first principles and corrected by testing** — kept in below
deliberately, because the correction process is itself the guidance: verify normalization claims,
never reason about Unicode case-folding from memory alone.

**Important scope correction, added after `17`**: everything below is about
`lib/acquisition/normalize.ts` (`dbNormalizedName()`/`nameKey()`), which powers only the
university/ROR acquisition pipeline's identity matching. It is a **different function** from
`lib/entities/normalize.ts`'s `normalizeEntitySearchText()`, which powers the live, production,
student-facing search/backfill/audit/dedup path every school/employer/organization field goes
through. The two do not share the same bugs — tested directly, not assumed, in `17` §2: the `ı`
finding below is **already fixed** in `lib/entities/normalize.ts` (an explicit pre-NFKD
`ı`→`i` step), so it affects only the acquisition pipeline, not live student search. The `ß`
finding below is **also broken** in `lib/entities/normalize.ts` — confirmed by a fresh test,
`normalizeEntitySearchText("Universität Straße 5")` → `"universitat straße 5"`, ß untouched —
so it is more urgent than this document alone suggests, since it sits on the production path.
Read `17` §2 alongside this document rather than treating the fix below as covering both
functions.

## Tested and confirmed safe: the dotted-İ / plain-ASCII-I question

Hypothesis going in: JavaScript's locale-independent `.toLowerCase()` maps U+0130 (İ, Turkish
capital dotted I) to a *two-codepoint* sequence (`i` + U+0307 COMBINING DOT ABOVE) rather than
plain `i` — true, confirmed directly (`"İ".toLowerCase()` → `"i̇"`). The worry: since
`nameKey()`'s diacritic-strip regex runs *before* `.toLowerCase()`, this stray combining mark
would survive to the final `[^a-z0-9]` fold and get treated as a word boundary, splitting a name
in two.

**Tested and found not to happen.** `"İ".normalize("NFD")` decomposes to `I` (U+0049) +
`◌̇` (U+0307) *before* lowercasing even runs — U+0130 does have a canonical (not merely
compatibility) decomposition, contrary to this session's first assumption. So the combining mark
is already present when the diacritic-strip regex runs, gets removed then, and `.toLowerCase()`
afterward sees a plain ASCII `I`. Confirmed: `nameKey("İstanbul Teknik Üniversitesi")` and
`nameKey("Istanbul Teknik Üniversitesi")` are byte-for-byte identical (`"istanbul teknik
universitesi"`), and so are `nameKey()` outputs for Boğaziçi/Bogazici, Özyeğin/Ozyegin,
Üsküdar/Uskudar, İzmir/Izmir, and Türkiye/Turkiye pairs tested the same way. **No action needed
here** — recorded so a future session does not re-litigate this specific worry.

## Verified, live, and serious: `ı` (dotless lowercase i, U+0131) is not accent-strippable

Turkish `ı` is not an accented `i` — it is a separate base letter with no diacritic to remove, so
none of `nameKey()`'s or `dbNormalizedName()`'s steps (NFD decomposition, combining-mark strip)
touch it at all. What happens to it next differs by function, and both outcomes are wrong in
different ways.

### In `nameKey()` (TypeScript-side matching/dedup key): the letter is silently deleted

`nameKey()`'s final fold step, `.replace(/[^a-z0-9]+/g, " ")`, treats **any** non-ASCII-alnum
character as a word boundary — including `ı`, which has no ASCII form and no diacritic for the
earlier steps to strip. Tested against real Turkish institution/place names already relevant to
ORYN's own market:

| Input | `nameKey()` output | What's wrong |
|---|---|---|
| `Yıldız Teknik Üniversitesi` (a real, major Turkish technical university) | `"y ld z teknik universitesi"` | Three `ı`s each become a space; one word becomes three fragments |
| `Kadıköy` | `"kad koy"` | Split into two fragments, letter lost |
| `Çankırı` | `"cank r"` | Trailing `ı` vanishes with no trace at all (word-final before end-of-string) |
| `Sabancı Üniversitesi` | `"sabanc universitesi"` | Final `ı` of "Sabancı" deleted with no visible seam (word-final before a space) |
| `İSTEK Okulları` | `"istek okullar"` | "Okulları" → "okullar" — final letter silently dropped |

This is not a cosmetic issue: it is unpredictable information loss (a mid-word `ı` splits a
token; a word-final `ı` disappears without even leaving a space) in a code path
(`lib/acquisition/identity.ts`'s `resolveIdentity()`, via `nameVariants().map(nameKey)`) whose
entire purpose is matching identity strings correctly. It also means, structurally, that two
genuinely different Turkish strings could reduce to the same mangled key (a "false-positive"
collision risk, not merely a false-negative), even though this session did not find a live pair
that actually collides this way — the two candidates tried, `"Kırık kale"` vs `"Kırıkkale"`, do
*not* currently collide (`"k r k kale"` vs `"k r kkale"`), which happens to be reassuring for that
one pair but is not a guarantee about the wider space of real Turkish names, given how much
information the fold step is discarding.

### In `dbNormalizedName()` (TypeScript-side, meant to mirror the DB's own convention): the letter
survives, but that itself is the bug

`dbNormalizedName()` stops before the alnum-fold step, so `ı` survives untouched —
`dbNormalizedName("Kırıkkale")` → `"kırıkkale"` (real `ı`, U+0131, still present). This sounds
safer than deletion, but **it is not what the database actually does**, and this function's own
docstring is explicit that matching the database's convention exactly is the entire point of its
existing: *"it must match the database's OWN convention exactly (`lower(unaccent(x))`)... or a new
row's uniqueness can silently drift from what `canonical_entities_identity_uq` actually
enforces."* Directly tested against live Postgres:

```sql
select unaccent('Kırıkkale');              -- 'Kirikkale'  (ASCII i)
select unaccent('İSTEK Okulları');         -- 'ISTEK Okullari'
select unaccent('Yıldız Teknik Üniversitesi'); -- 'Yildiz Teknik Universitesi'
```

Postgres's `unaccent()` extension correctly folds `ı` → `i`. **`dbNormalizedName()` does not — it
leaves `ı` as `ı`.** So `dbNormalizedName("Kırıkkale")` = `"kırıkkale"` while the database's own
`lower(unaccent('Kırıkkale'))` = `"kirikkale"` — two different strings for the same input,
depending only on which side computes it. This is exactly the drift scenario the function's own
comment warns about, and it is **live today, for any new insert**, not only a historical artifact.

### Confirmed already live in stored data, not just a future risk

Querying `canonical_entities` directly for every row whose `display_name` contains `ı` or `İ`:
**26 of 26 sampled rows** (every Turkish-script entity with such a character, `LIMIT 30` minus the
2 non-Turkish false-positive matches on the regex) have a stored `normalized_name` that disagrees
with `lower(unaccent(display_name))` computed fresh. Examples, verbatim:

| `display_name` | Stored `normalized_name` | What Postgres's own convention computes |
|---|---|---|
| `İstanbul Erkek Lisesi` | `i̇stanbul erkek lisesi` (contains a literal combining-dot character, U+0307) | `istanbul erkek lisesi` |
| `Sabancı University` | `sabancı university` (real `ı`) | `sabanci university` |
| `MEF Okulları` | `mef okulları` | `mef okullari` |
| `Terakki Vakfı Okulları` | `terakki vakfı okulları` | `terakki vakfi okullari` |

The stored form containing a bare combining-dot character (`i̇`, i.e. `i` + U+0307) does not match
either `nameKey()`'s or the current `dbNormalizedName()`'s output for the same input as tested in
this session — meaning whatever process actually wrote these specific rows used a *third*,
different normalization path than either current function, not identified by this session (out of
scope for a read-only research pass; flagged for Claude A to trace, not guessed at here).

**Practical consequence, stated precisely:** `canonical_entities_identity_uq` is a unique index
keyed on the *stored* `normalized_name` column, not a recomputed expression. Since every sampled
Turkish-script row's stored value already disagrees with the database's own documented convention,
a future insert for the *same real institution* that correctly computes `normalized_name` via
`lower(unaccent(...))` (the way `create_or_resolve_user_submitted_entity()`'s live *lookup* already
does, safely, since that function recomputes from `canonical_name`/`display_name` at query time
rather than trusting the stored column) would **not** collide against the existing malformed row at
the index level. A hypothetical future acquisition-pipeline insert path that trusts
`dbNormalizedName()` (or any correctly-`unaccent()`-matching computation) to prevent a duplicate
would not be protected by the unique index for any of these 26+ entities. This is this session's
single highest-severity concrete finding — see `09`/`11`.

## What this document recommends (not implements)

1. Trace and fix `dbNormalizedName()` to fold every letter Postgres's `unaccent()` folds beyond
   simple diacritic removal — confirmed so far: `ı`→`i` (`İ`→`i` already works once NFD runs
   first, no fix needed there) and `ß`→`ss`. Likely a small, explicit addition (e.g.
   `.replace(/ı/g, "i").replace(/ß/g, "ss")`, placed correctly relative to the existing
   NFD/diacritic-strip/lowercase chain) rather than a rewrite — but scope the fix as "match
   `unaccent()`'s ruleset," not "handle Turkish," since this session independently confirmed the
   identical mechanism breaks a second, unrelated language. Worth checking `unaccent()`'s full
   rules file for other such letters (Danish/Norwegian `ø`, ligature `æ`/`œ`) before considering
   the fix complete, though this session did not find a live example of either to justify testing
   them as anything more than a documentation note.
2. Separately decide, deliberately, what `nameKey()` *should* do with `ı`/`ß` — folding to
   `i`/`ss` (matching `dbNormalizedName()`'s fix) rather than deleting/splitting is almost
   certainly right, since `nameKey()`'s entire purpose is loose matching and silent deletion
   actively works against that purpose.
3. Lower priority: consider normalizing apostrophe *style* (straight vs curly) in
   `dbNormalizedName()`/the database convention itself — narrower and more cosmetic than 1-2, and
   unlike them is not a JS-vs-database disagreement (neither side currently handles it).
4. Audit (not guess-fix) the existing stored `normalized_name` values for every Turkish-script
   entity — a regenerate-and-diff pass, the same pattern this codebase already uses elsewhere
   ("regenerate full-spine fixture, apply the delta," per `docs/handoffs/claude-a-university-spine.md`)
   rather than a blind bulk UPDATE, since some rows may have additional hand-verified content in
   other fields worth preserving exactly as-is.
5. Add this exact case (`ı` and `ß` at minimum, and ideally the full Turkish-alphabet set:
   `ç, ğ, ı, ö, ş, ü` plus their capitals) as a permanent unit-test fixture for both functions once
   fixed, so this regressing again is caught mechanically rather than requiring another manual
   per-language audit.
6. Fix `ß` in `lib/entities/normalize.ts`'s `normalizeEntitySearchText()` too (`17` §2) — a
   one-line addition alongside its existing `ı`→`i` pre-NFKD step. Higher priority than items
   1-5 above in practice, since this function sits on the live student-facing search/backfill/
   audit/dedup path today, not only the acquisition pipeline.

## Verified, live, and the same bug in a second language: German `ß` (eszett)

Extending this session's testing beyond Turkish, per the mission brief's instruction to try
several target markets: German `ß` has no NFD decomposition (it is a distinct letter, not an
accented one — same structural shape as Turkish `ı`), so it passes through
`nameKey()`/`dbNormalizedName()`'s diacritic-strip step untouched, exactly like `ı` did. Tested
directly: `nameKey("Weißensee")` → `"wei ensee"` (split into two fragments, same failure mode as
`Yıldız`); `dbNormalizedName("Weißensee")` → `"weißensee"` (raw, unfolded). Confirmed directly
against live Postgres: **`unaccent('Weißensee')` = `'Weissensee'`** — the database's own
convention *does* fold `ß`→`ss`, exactly as it folds `ı`→`i`, and exactly as `dbNormalizedName()`
fails to. This means the fix recommended in `11` item 1 should not be scoped as "handle Turkish
`ı`" narrowly — it needs to cover every letter Postgres's `unaccent()` folds beyond simple
diacritic removal, and `ß` is a second, independently-confirmed member of that set alongside `ı`.
**No live `canonical_entities` row currently contains `ß`** (checked — zero matches), so this is a
defensive, mechanism-verified finding rather than a currently-manifested duplicate risk, unlike
the Turkish case — recorded now specifically so it doesn't have to be independently rediscovered
the first time a German institution name containing `ß` is acquired (art schools and some
place-name-derived institution names are the most likely source, per the "Kunsthochschule
Berlin-Weißensee" style of name).

## Verified, live, and lower-severity: apostrophe *style* (straight `'` vs curly `’`) is unhandled
by `dbNormalizedName()`, though it is not a JS-vs-database disagreement

Real live examples of apostrophes in `canonical_entities.display_name`: `Ca' Foscari University
of Venice`, `King's College London`, `Queen's University Belfast`, `Université Côte d'Azur`,
`Universita' degli Studi di Ferrara` (the last an Italian orthographic convention using a trailing
apostrophe in place of an accented `À/À`-style vowel some sources render without diacritics).
Tested: `nameKey()` correctly folds both straight and curly apostrophes to the same result (its
explicit `.replace(/[’'\`]/g, "")` step). `dbNormalizedName()` has no equivalent step, and neither
does Postgres's `unaccent()` (confirmed — `unaccent()` only folds accents, not punctuation) — so
**this is not a JS/database disagreement** the way `ı`/`ß` are, but it does mean the database's
own convention would fail to match, say, `"Ca' Foscari"` (straight apostrophe) against a
differently-sourced `"Ca’ Foscari"` (curly apostrophe) for the same real institution. Lower
priority than the `ı`/`ß` findings (both sides of the JS/DB boundary already agree with each
other here, and apostrophe-style collisions are narrower and more cosmetic than a deleted letter),
but worth a line in `11` for completeness rather than leaving it undiscovered.

## City-string and other formatting normalization

Separately from script/diacritic normalization: `citiesCompatible()` (`lib/acquisition/duplicates.ts`)
already handles the "Boston" / "Boston, MA" shape correctly (comma-segment comparison, first
segment matched) — confirmed by this session's own `09` audit, where every one of the 41 live
duplicate pairs has a `citiesCompatible() = true` city pair. No gap found here; recorded as
validated rather than re-derived.
