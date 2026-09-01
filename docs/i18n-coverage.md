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
Turkish that comes back — and nor does anything measure the English. There is no
output-quality eval suite in either language; the tests around these surfaces assert what goes
into the prompt and that usage is logged, never what the model says. Checking whether counsel
keeps the demanding-mentor register costs real model calls against a nearly-spent balance.
The mechanism is asserted in `__tests__/ai/output-language.test.ts`; the register is not.

So the honest status is: a Turkish student now gets Turkish counsel, and nobody has read it.
That is better than certainly-English, and it is not the same as verified. A Turkish eval pass
is the missing piece, and it is a founder decision because it costs credit.

## Measuring clipping: force layout first, or every element reads as clipped

The `scrollWidth` vs `clientWidth` check that found the mobile-nav truncation has a failure
mode worth knowing before trusting a run of it. **A backgrounded or hidden Browser pane tab
zeroes `document.body.clientWidth`** while the DOM and JS context stay alive, so every
element reports as clipped and the sweep returns a page full of false positives.

Call `resize_window` with explicit dimensions first to force real layout, then measure. Found
by the lane doing the cross-cutting UI audit, 2026-09-01, after a sweep came back implausibly
red.

The direction of the error is worth noting too: it produces false *positives*, not false
negatives. So a clean result from a hidden pane is still clean — it is a red result that
needs re-running.

## The product says "sen", and eight strings say "siz"

Found by a lane consolidating the eligibility copy, who noticed the two implementations of
the same message address the student differently — `lib/counselor/copy.ts` formally
("doğum yılınız", "sizinki"), `lib/opportunities/matching.ts` informally ("doğum yılını
ekle"). Measured across all 1,028 catalog strings: **85 informal markers against 8 formal
ones.** Informal is the house style by a wide margin and in every package translated on
2026-09-01.

So register is not an open decision here — it is settled, and the eight are slips. Five of
them sit in `universities.browsePage` / `comparePage`, which is one package drifting rather
than eight independent mistakes.

**Two things this exposes about method.** The `docs/known-issues.md` table that documented
the two implementations compared their *English* and concluded the drift was "symmetric, not
worse in one language". Reading the Turkish showed otherwise: one speaks to the student as a
stranger and the other doesn't, which no English comparison could surface. A translated
product needs both languages read, not one checked and the other assumed faithful.

And the measurement itself needed two passes. The first regex reported 11 formal strings and
two were false positives — `"(n={size})"` matched on the English word "size", and "kendi
yazın" is a noun rather than an imperative. A third, `messaging.thread.blockConfirmDescription`'s
"ikiniz de … gönderemezsiniz", may be genuine plural ("both of you") rather than polite
address, and is flagged as needing a reader rather than a pattern.

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

It also, until `a25d18ce`, never opened a `.ts` file at all — `walk` collected `.tsx` and
stopped. That is a different kind of miss from the ones above: not a pattern too narrow to
catch a string, but a whole file extension the scan could not see. `features/profile/
field-config.ts` holds ~173 labels, placeholders and select options for every achievement
form, and `lib/scoring/completeness.ts` holds the checklist whose labels become the
dashboard's top three actions for a new profile; neither appeared in any number this file
quotes. The script now prints them in a separate **Data modules** section, deliberately not
folded into the total, because a `label:` in `lib/` may be student copy or an operator string
and only the consumer settles it.

An earlier version of this file said 247 across 78 files. That came from a line-based
`grep`, which cannot see JSX text sitting on the line *after* its opening tag — the ordinary
way this codebase formats JSX. Same criteria, better reading of them; the floor moved up,
it did not move for a different reason.

A third kind, found 2026-09-01: a component's own **default parameter value** for an
optional prop — `function Foo({ title = "English text" })` — is invisible to the scanner
regardless of word count, because it walks JSX call-site markup (`<Foo title="...">`)
looking for literal props, not the component's own function signature where the fallback
lives. `NotConfiguredNotice`'s five-word `title`/`description` defaults rendered in
production every time (all three top-level layouts called it with zero props) and never
appeared in any count this file quotes; the same shape let `GeneratePlanButton`'s
`"Thinking…"` pending label through too, compounding with the single-word miss above.
When auditing a component's own props for this, grep the component's signature for
`= "[A-Z]` — the script won't find it.

## The other three guards, audited the same way — one real hole, one tightened, two named

`check:i18n` had three scope failures found on 2026-09-01. CEO's question, asked directly:
what does the same "what does it not look at" audit find in the other three standing i18n
guards (`__tests__/i18n/translation-keys.test.ts`, `label-accessors.test.ts`,
`locale.test.ts`)? Answered per-guard below — fixed where the fix was cheap and unambiguous,
named where it wasn't, and said plainly where a guard turned out sound, because a page that
only lists failures reads like a product that's all failures.

**`translation-keys.test.ts` had a real hole, and it hid the guard's own reason for
existing.** `namespaceBindings`' regex expected `const t = useTranslations("x")` or
`const t = await getTranslations("x")` — not `const t = (await getTranslations("x")) as
Translator`, the extra-parens shape every Server Component needing the `Translator` cast
actually uses, because `await x as Y` doesn't parse the way the cast intends. A file using
that shape didn't fail, didn't get counted as skipped — its translator binding simply never
entered `seen`, so the file contributed nothing to `checked` and nothing to `skipped`, with
no signal anywhere that it hadn't been looked at. Three files had this: `features/advisor/
counselor-priorities.tsx`, and — the one worth sitting with — `app/(app)/opportunities/
[id]/page.tsx`, **the exact file whose exact bug this guard was built to catch** (its own
top comment: the page called an `eligibilityUnknown` badge against the wrong namespace,
found only by reading rendered text). Had that bug come back, this guard would not have
seen it. Fixed: the regex now tolerates the optional wrapping parens. `checked` moved from
1055 to 1068 real calls now verified — no offenders among them, so the fix closes a hole,
it doesn't reveal a live bug behind it. `skipped` moved 4 → 8 for the honest reason: these
three files' `t` also collides with a `: Translator`-typed helper parameter, the same
already-correct shadowing logic every other file with this shape already triggers — raised
the ceiling assertion from `<8` to `<12` to match, with the reasoning recorded inline.

**Named, not fixed: the shadowing that catches the collision above is file-scoped, not
function-scoped, and throws away real coverage to stay safe.** Once a name is flagged
ambiguous, *every* call to that name in the whole file is skipped — including calls in a
completely different, unambiguous function that never sees the `: Translator` parameter at
all. Concretely: `CounselorPriorities()`'s own `t("needsMoreInfoTitle")` and its siblings are
just as resolvable as any other call in the file (one binding, one namespace, no ambiguity)
but are discarded anyway because a *different* function three functions down,
`RecommendationCard`, receives a same-named `t` as a parameter. The correct fix is
function-scoped resolution — and that needs real scope tracking (matching braces per
function body, distinguishing a param list from a call), not a regex tweak, so it wasn't
attempted here rather than shipping something that looks precise and silently misparses a
nested arrow function. This is the single highest-value next investment in this guard: it is
currently under-counting its own best cases, on the pages CEO's own example bug lived in.

**Named, not fixed, and not really fixable by this kind of guard: `t(\`x.${y}\`)` and
`t(someVar)`.** Already excluded by design (the guard's own comment says so), re-confirmed
here rather than re-litigated: this session's earlier manual sweep already checked all 12
live dynamic-key call sites against their real TypeScript/Zod types and found them clean —
a one-time audit, not a standing guard. Properly automating it needs type-aware resolution
(what values can `y` actually hold at this call site), which is a different kind of tool
than a source-text regex.

**`label-accessors.test.ts`: the file-level exemption was correspondingly coarse, tightened,
no live bug found.** The "a module defining an accessor may index its own map" exemption
skipped the *entire file* once it matched `export function ...Label(Short)?(` anywhere in
it — not just the specific map that accessor wraps. Every current accessor file happens to
own exactly one map, so this was harmless today, but the scanner never verified that
one-to-one shape held; it just trusted it. Rewrote the exemption to pair each map with its
own accessor's exact name (`DIMENSION_LABELS` ↔ `dimensionLabel`, etc.) and skip only that
pairing, so a second, unrelated map indexed directly in an accessor file would now be
caught. Verified with a standalone replay of the old logic against every file in scope
before touching the real test: zero offenders either way — the tightening is real, the
current codebase just doesn't happen to need it yet.

**`label-accessors.test.ts`'s directory list (`app`, `features`, `components`, `lib`) is not
missing anything live.** CEO's own suspicion — `scripts/` or `types/` unreachable — checked
directly: neither directory contains a single file matching the locale-aware signature this
guard looks for (`grep` for `useTranslations`/`getTranslations` across both turns up nothing
but the coverage script's own source, matching itself). A hole with no live instance is a
note, and this is one: worth remembering if either directory ever grows real component code,
not worth widening the scan for today.

**`locale.test.ts` is the soundest of the three, and it's worth saying why rather than just
asserting it.** It doesn't sample source code with a regex — it walks the full, complete
JSON of both catalogs, every key, every value, with no partial-file or partial-directory
surface area to have a blind spot in. Its "Turkish is actually translated, not copied from
English" test is a genuine answer to "how do you catch a scaffolded-and-never-filled-in
catalog": an exact-equality allowlist of 19 deliberately-identical entries (loanwords,
proper nouns, numeric templates), each with its own recorded reason, so a new identical pair
fails loudly instead of joining the list unnoticed. **What it cannot do, and no string-diff
check could:** prove a Turkish value that *differs* from English is actually correct
Turkish rather than a wrong or garbled translation that simply isn't a copy-paste. That's
not a scope gap to widen — it's the edge of what comparing two strings can prove at all;
closing it needs a bilingual reviewer or a semantic (LLM-based) check, a different kind of
tool than this file. Also checked and clean: no orphaned third locale file sitting in
`messages/` outside the two the parity test actually imports; the duplicate-key detector
tracks the full nested path via a brace-depth stack, not just top-level keys, despite its
own comment leading with "top-level" (a documentation-vs-behavior gap worth a one-line fix
sometime, not a coverage gap — it is already checking more than it says it is); and its
line-based JSON walker would silently miss a duplicate inside a single-line compact object
(`"key": { "a": 1, "a": 2 }`) — checked, zero such lines exist in either 1000+-line catalog
today, a formatting-dependent fragility worth naming, not fixing blind.

**One thing worth naming across all four guards, today's and the three above:** every
failure was a scope failure, not a logic failure. `check:i18n` did exactly what its regex
said over a narrower domain than anyone realized; so did all three of these. None were
wrong about what they checked — each was silently checking less than its own name promised.
The useful question about any of these checks going forward isn't "is it correct" — it
already is, by its own narrow definition — it's "what does it not look at."

## What this means for a launch date

A Turkish student switching to Turkish today gets a translated shell, translated legal
pages and translated counselor reasoning wrapped around a profile, university and settings
experience still in English. That is a coherent slice, not a broken one — but it is not the
requirement, and the gap is concentrated in exactly the surfaces a student spends the most
time in.
