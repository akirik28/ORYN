# Rename visual verification — 2026-09-03

Live pass across the merged product (`main` at `e29a6426`, later confirmed current
through `f8e80466`) after six-plus rename lanes landed: message catalogues, legal
text, the directory rename, scripts, logos, and the data-triage doc. Nobody had
opened the running app since the lanes merged. This is that check. Report only —
nothing here was fixed by this pass; each finding names the file for whoever owns it.

**Overlap note, added after the fact:** `docs/rename-verification-2026-09-03.md`
(the whole-tree reconciliation, merged `188bc7b3`, landed on `origin/main` while this
doc was being written) independently found the same headline gap below —
`lib/requirements/copy.ts` / `lib/counselor/copy.ts`, plus several more files in the
same category this pass didn't individually trace (`lib/ai/{fee-text,
opportunity-context,student-context,weekly-plan}.ts`,
`lib/opportunities/reverification/adjudicate.ts`, and others) — via a whole-tree grep
count rather than live call-chain tracing. Two independent methods landing on the same
file is good corroboration, not a coincidence worth suppressing, so finding 1 below is
left in place with a note rather than deleted — read it as *confirmed twice*, and read
the reconciliation doc for the fuller file list. This pass's distinct contribution is
what a static grep can't do: confirming the string actually reaches a live render (the
`evaluate.ts` → `counseling-adapter.ts` chain), a live API call proving the advisor's
self-introduction is clean, and a live re-check of `/privacy`/`/kvkk` in Turkish —
which the reconciliation doc explicitly could not do ("deliberately not
live-rendered... no design-preview equivalent") for the same shared-session-cookie
reason this doc's Method section works around.

## Method, and why it isn't a straight click-through

The shared Browser-pane profile is carrying a persisted, real auth-token cookie for
the founder's own account. This surfaced live, twice independently tonight (44 found
it first; this pass found it again, on a freshly-started dev server on a port never
used before, while reading `document.cookie` for an unrelated reason) — confirming a
cookie is scoped by host, not by port, so a new `next dev` port is not a clean
session the way it was assumed to be earlier tonight.

Given that, this pass never navigated to a real `(app)` or `(admin)` route in the
browser — not even to look. Two things made that workable rather than crippling:

- **`http://127.0.0.1:<port>` instead of `http://localhost:<port>`** against the same
  dev server. Cookies are host-scoped, not port-scoped, and the leaked cookie was set
  against `localhost` specifically — `127.0.0.1` never receives it. Verified live
  (`document.cookie` came back empty on first load), not assumed. Every screenshot
  and page read below was taken this way.
- **`/design-preview/*` routes**, which render the real production components
  (`DashboardView`, `AdvisorChat`, `StrategyPanel`, `PlanTierView`, `ControlRail`,
  etc.) against synthetic fixture data, unauthenticated by design. This is what
  covered Dashboard, Advisor, Opportunities, Universities, Settings/Plan, Profile,
  and Kumanda below.

Two real surfaces have no `/design-preview` mirror and touch nothing that render-tests
without an account: **Applications' live view** and the **standalone Plan (weekly
actions) page** (as opposed to `/design-preview/plan`, which is actually the
Settings/Plan-tier — Ultra comparison — screen, a naming collision worth knowing
about). For both, verification is a `git grep -n Oryn` restricted to the real
route/component files rather than a live render — a materially weaker check than a
screenshot, stated as such rather than silently treated as equivalent. Both came back
clean (findings below).

Turkish was checked by actually setting `oryn_locale=tr` via `document.cookie` on the
cookie-free `127.0.0.1` origin, then confirming `document.documentElement.lang` read
`"tr"` after reload, every time, before trusting any Turkish text on screen — this
codebase has a known prior bug where a preview fixture hardcoded `locale="en"` and
every Turkish check against it silently rendered English. That trap wasn't hit here
because the two pages Turkish actually mattered for (`/privacy`, `/kvkk`) are real,
public, unauthenticated pages, not fixtures.

Console was checked on every page load. The only error present anywhere, on every
single page, was `WebSocket connection to 'ws://127.0.0.1:.../hmr' failed` — an
artifact of loading the app on `127.0.0.1` while webpack's HMR client targets
`localhost` by default. Confirmed as the *only* recurring error and not treated as a
finding: no real user hits this, since nobody browses the real app via `127.0.0.1`.
No other console error occurred on any surface, including the ones below with real
copy bugs.

## Findings

### 1. A real, live cluster of unrenamed strings outside the message catalogue — independently confirmed twice tonight

*(Same files the whole-tree reconciliation names — see the overlap note above. Kept
here because the confirmation method is different and adds something: not just that
the string exists, but that it's wired into a real render, not orphaned.)*

`messages/en.json` and `messages/tr.json` are clean — zero "Oryn" in either file, confirmed
by direct grep. But a separate body of hardcoded reasoning-copy string literals in
`lib/*.ts` — never routed through the message catalogue at all — was outside whatever
swept those two files, and is still live:

- **`lib/requirements/copy.ts` — 32 occurrences, both locales.** Every one is a
  literal string a real evaluation would return: "Oryn couldn't read the conditions
  attached to this requirement…", "Oryn hangisini kastettiğini tahmin etmeyecek…",
  "Oryn will never mark it satisfied…", and so on, across every `noStructuredRuleReason`
  / `gateCopy` / `recencyCopy` / `provenanceCopy` / `testScoreCopy` branch in the file.
  Traced the call chain rather than assumed it from the filename:
  `lib/requirements/evaluate.ts` imports these exports directly, and
  `lib/universities/counseling-adapter.ts` imports `evaluateRequirement` from
  `evaluate.ts` and assigns its `reasoning` field straight through — that adapter's own
  doc comment says the field is "either `evaluateRequirement`'s own reasoning,
  **verbatim**, or static factual copy," and its return type is a plain `reasoning:
  string` at four separate call sites. This is not dead code and not a fixture: it's
  the real requirement-check reasoning shown on a real university's real requirement
  cards. (I saw this exact category of text — "Needs review… but Oryn can't confirm
  Mathematics is one of your three A-levels" — live in the browser on
  `/design-preview/university-detail`, but that specific sentence traced back to
  `lib/dev/fixtures.ts`'s own hand-written fixture reasoning, not to `copy.ts` — the
  fixture happens to mimic the shape `copy.ts` produces for real evaluations, which is
  how I found `copy.ts` in the first place.)
- **`lib/counselor/copy.ts` — at least `missingInfoWhyLine()`** ("Oryn doesn't have
  this information yet — needed for confident recommendations." / the Turkish
  equivalent), called from `lib/counselor/evidence.ts`, part of the same live
  Counselor Core system `/advisor` and the university outlook both read from.
- **`lib/opportunities/lifecycle.ts` — `nonActionableOpportunityReason()`** ("Oryn
  isn't showing this opportunity right now." / Turkish equivalent), called from
  `lib/counselor/eligibility.ts`.

I did not individually trace every one of the ~15 other files a full-tree grep
surfaced with the identical shape (real quoted string literals, not comments) — among
them `lib/entities/resolve.ts`, `lib/validation/requirements.ts`,
`lib/admissions/outlook.ts`, `lib/admissions/system-shape.ts`,
`lib/benchmarking/index.ts` and `compute.ts`, and the three feature-flag "not enabled"
messages in `lib/social/*.ts` / `lib/messaging/*.ts`. Given the three I did trace all
turned out live, I'd treat the rest as likely the same category rather than assume
they're inert — worth a dedicated pass, not just these three files.

**Separately worth naming: some of this same copy feeds live AI prompts, not just
UI text.** `lib/ai/weekly-plan.ts`, `lib/ai/opportunity-context.ts`, and
`lib/ai/student-context.ts` all build system-prompt text with "Oryn" still in it
("Oryn's Counselor Core has already identified…", "Real opportunities Oryn has
already verified…", "no score to quote, Oryn has not assessed this"). I live-tested
the advisor's *self-introduction* specifically (see next finding) and it came back
clean — but that only exercises `ADVISOR_SYSTEM_PROMPT` in isolation. These three
files are a different injection point (student-context assembly, weekly-plan
generation, opportunity-matching context) that I did not live-test, since exercising
them for real needs a real student's data. A live weekly-plan generation or an
advisor reply that happens to quote one of these lines back could plausibly still
say "Oryn."

### 2. The advisor's own self-introduction — live-verified, clean

This was flagged as the single most visible failure mode if it were wrong, so it got
a real check, not just a source read. `ADVISOR_SYSTEM_PROMPT`
(`lib/ai/advisor-prompt.ts`) reads correctly in source ("You are the **Proxola**
Advisor…"), and I confirmed it holds under an actual model call: a small throwaway
script (kept in the session scratchpad, not the repo) imported the real
`ADVISOR_SYSTEM_PROMPT` and the real `AnthropicProvider` class directly — no database
read, no usage-logging write, no real student — and sent "In one or two sentences,
introduce yourself and what you help me with." The live reply:

> "I'm your **Proxola** Advisor — I help you figure out what to actually work on next
> to strengthen your university/career profile, based on your real activities, gaps,
> and time available…"

Zero "Oryn" in the response. This could not be checked through the browser: the
design-preview counselor page hardcodes `aiConfigured={false}` on `<AdvisorChat>`
specifically to stop a preview harness from ever triggering a real, costed API call by
accident, so the chat input there is permanently disabled ("The AI counselor isn't
configured yet") regardless of whether a real key is present. The direct-provider
script was the only way to get a genuine live reply without either using someone's
real session or wiring a preview page to do something it's deliberately built not to.

### 3. Two design-preview fixtures are stale where the real pages are already correct

Both look identical in shape: a fixture page hardcodes English copy in its own JSX
rather than importing the real, already-fixed component or the real message-catalogue
key, so the catalogue fix never reached it.

- **`app/(dev-preview)/design-preview/auth/page.tsx:50`** — hardcodes `New to ORYN?
  Create an account`. The real page, `app/(auth)/login/page.tsx:35`, correctly calls
  `t("newToProxola")`, and both catalogues have the fixed string
  (`messages/en.json:1399`, `messages/tr.json:1399`). Real surface: fixed. Preview
  mirror: stale.
- **`app/(dev-preview)/design-preview/university-detail/page.tsx:206,222,362,363`** —
  hardcodes "Oryn estimate:" / "Oryn tahmini:", "Oryn's admissions-system research",
  and the "Oryn hasn't recorded which specific program…" line in both locales. The
  real page, `app/(app)/universities/[id]/page.tsx` (lines 421, 464, 713), correctly
  says "Proxola estimate:" / "Proxola tahmini:", "Proxola's admissions-system
  research", "Proxola hasn't recorded…". Real surface: fixed. Preview mirror: stale.

Neither of these is what a student would ever see — but this fleet has been using
`/design-preview/*` as its primary tool for exactly this kind of check all night, so a
stale fixture risks giving whoever checks it next a false alarm (or, worse, false
confidence in the opposite direction on a page that IS still broken).

### 4. `companyPrivacyEmail` — confirmed still open, not a new finding

Lane 2's own commit already flagged this ("companyPrivacyEmail left unresolved").
Confirmed unchanged: `lib/legal/content.ts:130` still reads
`privacyContactEmail: unresolved("companyPrivacyEmail")`. The general contact address
is resolved (`contactEmail: "hello@proxola.com"`, correct, confirmed live on the
landing page footer) — only the privacy-specific one is still a placeholder.

## Confirmed clean (no "Oryn" found, live-checked)

All of the following were checked with `find` (a case-insensitive substring search
against the live rendered page) plus a full `get_page_text` read, and none turned up
anything:

- **Landing page (`/`)** — clean *except* one item: the `FEATURES` array's first
  entry still reads "**ORYN** assesses your academic, leadership, research, and
  extracurricular depth…" This is the same gap Lane 3 already named in its own commit
  message (the three `FEATURES` title/description pairs are untranslated Figma-source
  marketing copy, called out as a separate, larger undertaking than that lane's
  scope) — not new, but still live and worth surfacing since it's on the very first
  screen anyone sees.
- **Dashboard** (`/design-preview/dashboard`) — hero, "Your next move," the weekly
  focus block, the opportunity strip (content confirmed present and correct via DOM
  read — the strip's own screenshot capture was unreliable in this pane, a known
  hidden-pane/scroll-timeout tool artifact, not a rendering bug; re-shot twice, DOM
  content stood regardless), profile dimensions, "One thing not to do," university
  outlook. All correctly branded.
- **Advisor / Counselor** (`/design-preview/counselor`) — "Your strategy room,"
  "Proxola answers from your actual profile," the priorities list, "One thing not to
  do," the suggested-questions chips. `AdvisorMessage`'s attribution label
  (`components/proxola/advisor-message.tsx`) renders the literal string `"Proxola"` —
  correct — even though the object key it's stored under is still named `oryn` and the
  component's own doc comments still say "Oryn" throughout; neither is user-visible.
- **Opportunities** (`/design-preview/opportunities`, `/opportunity-detail`) — cards,
  match tiers, eligibility notes, source badges.
- **Universities** (`/design-preview/universities`, `/compare`) — clean, aside from
  finding 1 and 3 above on the detail page specifically.
- **Settings / Plan — Ultra comparison** (`/design-preview/plan`) — "Your plan," the
  feature cards, the comparison table.
- **Profile** (`/design-preview/journey`, `/portfolio`, `/quick-add`) — clean, aside
  from one low-priority item: a synthetic portfolio fixture entry in
  `lib/dev/fixtures.ts:1117` titled "Oryn — a career-planning tool for students" (a
  sample *student's own project*, dev-fixture-only, never shipped to a real user).
- **Kumanda** (`/design-preview/kumanda`) — the admin rail wordmark specifically
  called out as a concern reads "**Proxola** / CONTROL," correctly fixed. Real
  aggregate data is flowing (11 students, $5.51 AI spend last 30 days, $90.40 total
  monthly cost) — migrations are live, not stuck showing "not set up yet." The one
  "Not set up" card present (Remaining Credit) is gated on a genuinely-unset optional
  env var (`ADMIN_STARTING_CREDIT_USD`) in this worktree, unrelated to migrations.
- **Applications, Plan (nav/weekly-actions)** — no live render possible (see Method);
  `git grep -n Oryn` against the real route + component files
  (`app/(app)/applications/*`, `features/applications/*`, `app/(app)/plan/*`,
  `features/dashboard/weekly-focus.tsx`, `generate-plan-button.tsx`) found only two
  hits, both doc comments, zero user-visible strings.
- **Legal pages, English** (`/privacy`, `/terms`, `/kvkk`) — clean.
- **Legal pages, Turkish** (`/privacy`, `/kvkk` at `oryn_locale=tr`, `html lang="tr"`
  confirmed each time) — clean, and this is the specific re-verification 44 couldn't
  finish before finding the session-cookie problem. All four suffix forms named as a
  spot-check were found live and correct, split across the two pages: **Proxola'ya**
  dön (dative), **Proxola'nın** ne topladığı (genitive), **Proxola'da** reklam takip
  araçları yoktur (locative), **Proxola'yı** işleten şirket (accusative). Checked for
  the wrong (front-vowel) forms too — `Proxola'ye`, `Proxola'nin`, `Proxola'yi`,
  `Proxola'de` — zero matches anywhere on either page. `/terms` has one very minor,
  non-user-visible item: two anchor hrefs (`#what-oryn-is`, `#what-oryn-is-not`) still
  carry the old name — the visible link text itself correctly reads "Proxola nedir" /
  "Proxola ne değildir."

## Confirmed correctly *un*touched (not findings)

Kumanda's research-queue / ops-log content shows `oryn-d0`, `oryn-4e`, `oryn-3f`,
`oryn-bd`, and the QA account emails `oryn.qa.a` / `oryn.qa.b` throughout — these are
the fleet's own session codenames and test-account identifiers, explicitly on the
protected list, and correctly untouched by every rename lane. Naming this explicitly
so it doesn't get investigated again as a possible miss.

## Not this pass's finding, but worth naming: the logo asset

The founder separately flagged (and 44 already fixed and merged, `1af72609`, ahead of
this doc landing) that `logo-full.png` had an opaque white background and rendered too
small in the sidebar. I built an independent fix in parallel before that landed —
same root cause, same method (flood-fill from the edges, un-premultiply against white,
not a global colour-key) — then discarded it once the rebase conflict surfaced that
44's version was already merged and more complete (all nine call sites resized, not
just the sidebar; both source-crop bugs fixed; icons regenerated as a precaution).
Verified 44's merged output directly (corner alpha `(0,0,0,0)`, confirmed, not just
read from the commit message) rather than taking it on trust. Nothing of mine is in
this branch or needs to be.

## What this pass did not check

Console errors were checked on every page visited above, but this pass did not click
through every interactive control on every surface (opening every modal, submitting
every form) — the sweep was "read every major surface for stale strings, broken
renders, and errors," not a full interaction-level QA pass. Applications and the
standalone Plan page's live behavior (not just their static strings) remains
unverified for the reason stated in Method.
