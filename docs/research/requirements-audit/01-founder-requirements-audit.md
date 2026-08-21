# Founder Requirements Audit — Drive Product Docs vs. Live Code

**Branch**: `oryn/requirements-audit`, forked from `oryn/opportunity-dimension-tagging` at `daf59ab`.
**Date**: 2026-08-21. **Scope**: research/audit only — no code changes, no schema changes, no
Supabase writes (all database checks in this and prior branches were read-only `execute_sql`
SELECTs). **Assigned by**: the "ORYN multi-agent coordination" session, under authority the actual
founder confirmed directly in chat (see `docs/handoffs/requirements-audit.md` for the exact
confirmation record). Report destination per the founder's own explicit instruction is the
coordination session, not a direct founder report — this document is what gets reported.

## Method

Two Drive documents were identified as the primary product-requirement sources (by title search,
never by a pasted/guessed file ID, per this project's established Drive-access discipline):

- **"ORYN — Product & MVP Decision Register"** (Product & Strategy folder, `fileId`
  `1t0zA_E9pVjvs-kDobYMWUh2F8RN3r3dsE1fNuhmsT6U`, last consolidated 2026-08-18, modified
  2026-08-20T16:37) — 18 numbered sections, English.
- **"ORYN Programlama"** (Programlama folder, `fileId` `1Vb6atNsDiH_jiKm8T_js4-CwqW_sWeIPqmtAre713Wc`,
  dated 15 Ağustos 2026, modified 2026-08-17T21:21) — 37 numbered sections, Turkish, with a
  dated §37 "18 AĞUSTOS 2026 — GÜNCEL FOUNDER KARARLARI" addendum that explicitly supersedes
  earlier conflicting items within the same document (notably §33 and §34 — see below).

Both were read in full. The "ORYN" and "ORYN Database" Drive folders were enumerated to confirm
no other product-decision documents exist outside these two (plus a Legal & Privacy register,
read in full for context, and three status/measurement Reports, not treated as requirement
sources). Every extracted requirement was checked against the live repository at this branch's
base commit (`daf59ab`) using direct file reads, targeted greps, and — where the requirement
concerns live data rather than code shape — read-only production queries already run in prior
branches this session (`opportunities`=369 rows, `universities`=1019 rows, verified against the
correct Supabase project by row-count cross-reference, not by trusting the project's own name).

Five requirements were flagged by the assignment for full-depth verification and were each
investigated by a dedicated background agent (or, for visual identity, directly by this session
after a live-preview path proved unavailable — see Limitations). The remaining sections got a
lighter, single-pass spot-check: enough to place a status and cite real evidence, not exhaustive.
That depth difference is marked explicitly on every item below — this document follows the same
confidence-labeling discipline as the rest of this research package (`high`/`medium`/`low`, or
here, `full`/`spot-check`/`not verified this pass`) rather than presenting uniform certainty it
doesn't have. Where a Drive document and the live code disagree, this document records both sides
and does not pick a winner — several of the founder's own decisions were later revised in chat in
ways no document fully captures, and it is not this audit's place to guess which supersedes which.

## Leading with the contradictions and stale-documentation findings

### 1. `docs/known-issues.md`'s visual-identity conflict entry is now stale (not a live contradiction)

`docs/known-issues.md` records, from an earlier session, that commit `401a894` ("Rework visual
system to a high-contrast dark black-blue theme," 2026-08-15) contradicts both Drive documents'
light-theme mandate, and logs this as an open, unresolved conflict too consequential to guess at.

That was accurate on 2026-08-15–17. It is no longer the state of the code. Commit `3192962`
(`app/layout.tsx`, 2026-08-18T00:37:17+03:00), titled **"fix: default to light theme, not dark
(Founder Requirement 3 / P1)"**, reverted the root layout to light as the deliberate default. The
commit lands on the *same date* as "ORYN Programlama" §37's own addendum reaffirming light theme
("Site dark/gloomy olmamalı... logo mavisi esas alınır"). `app/layout.tsx:38-51` carries a long,
dated, self-aware comment explaining exactly this: light is now the one deliberate default,
`:root` (no class) already carries light tokens, and the `.dark` block in `app/globals.css` (lines
135-172, confirmed present and fully defined) is intentionally kept but genuinely inert — no
`.dark` class is applied anywhere (`grep -rn 'className=.*"dark' app features components` → zero
hits; confirmed directly in `app/layout.tsx:52-55`'s actual className string, which contains only
font variables and `h-full antialiased`).

**Status: Implemented**, full-depth verification, direct code read + git history. The
`docs/known-issues.md` entry describing this as open should be updated by whoever owns that file
next — this audit did not edit it, since updating another session's shared tracking doc wasn't
part of the assigned scope, but leaving it as-is risks a future session re-litigating a
already-closed question.

### 2. A live, verifiable bug: the Toaster is still hardcoded to dark theme

`components/ui/sonner.tsx:9-12` hardcodes `theme="dark"` on the Toaster component, with a comment
claiming: *"Matches the app's one locked theme (`app/layout.tsx` sets `dark` statically on
`<html>`)."* That claim is false as of `3192962` — `app/layout.tsx` does not set a `dark` class
anywhere (confirmed above). This comment is a leftover from the pre-2026-08-18 dark-theme era that
was never updated when the root theme flipped back to light.

Effect: toast notifications render using `sonner`'s dark visual mode (its `data-theme="dark"`
internal styling) while every surrounding surface in the product is light. The four CSS custom
properties this component does override (`--normal-bg/-text/-border`, `style` block at lines
31-38) resolve correctly to light-mode values since they reference the live `--popover`/
`--foreground`/`--border` tokens — but anything in `sonner`'s own default dark-mode stylesheet
*not* covered by those four properties (shadow, default chrome) is unaffected by the override and
still renders dark. This is exactly the kind of thing the assignment asked to be found by
measuring the live system rather than trusting a document: neither Drive doc mentions toasts
specifically, but both mandate the product "must not be dark/gloomy," and this component
currently, verifiably is, in a way its own comment incorrectly claims it isn't.

**Status: Contradicted (code vs. its own stated intent)**, full-depth, direct code read. Trivial
fix (`theme="dark"` → remove the prop, or set `theme="light"`) but out of this audit's scope to
apply — this is a research/audit branch, not an implementation one.

### 3. A genuine, unresolved scope ambiguity: does the search standard extend to Connections?

`docs/product-decisions.md:113-114`, dated **"Chat 2 pass — V1 social/network scope
(founder-approved, 2026-08-15)"**, records a deliberate, reasoned decision: *"No people-search /
student directory. Global search (`lib/search/`) only ever searches your own data — it was not
extended to search other students. Discovery in V1 is link-only,"* citing minor-safety stakes.

The Decision Register's §6 ("Search Interaction Standard"), consolidated **2026-08-18** — three
days later — sets a general canonical-autocomplete-driven search interaction pattern. Read
literally and generally, it would apply everywhere search exists, Connections included; Agent 1's
verification (below) found no Connections search of any kind, confirming the 2026-08-15 carve-out
is still exactly what's live. This audit did not find explicit text in either document directly
addressing "does the general standard override the specific Connections carve-out" — it is
possible these were never meant to conflict (a general UI pattern standard vs. a narrower
data-scope/privacy decision are different kinds of claims), but a future reader applying §6
literally to Connections would be building against the founder's own explicit, dated, reasoned
2026-08-15 decision. Recorded here, not resolved.

**Status: Ambiguous scope, not a code defect** — both sides are real, dated, and traceable; this
audit takes no position on which should govern future work here.

---

## Section A — The five requirements flagged for full-depth verification

Each of these was investigated by a dedicated background agent (or directly, for #3), independent
of this document's authorship, then cross-checked here.

### A1. Canonical autocomplete (Decision Register §5)

**Status: Partially Implemented.**

What's real: a genuine `canonical_entities`/`entity_aliases` architecture
(`supabase/migrations/0038_canonical_entity_registry.sql:621-674`), a `search_canonical_entities()`
RPC ranking exact > alias > prefix > trigram with unaccent folding, `features/entities/
entity-combobox.tsx`, `lib/entities/search.ts:184-203`, `lib/entities/field-policy.ts:79-151`.
University search ("Har" → Harvard, alias handling) is unit-tested
(`__tests__/universities/alias-search.test.ts:28-56`). Manual/custom-entry marking via
`verification_state='user_submitted'` is implemented for entity fields
(migration `0038:686-744`).

What isn't: AP coursework uses an entirely different, weaker mechanism —
`lib/vocabularies/subjects.ts:21-145`'s `COURSE_NAME_SUGGESTIONS` is a plain substring list with no
id, no verification state, no custom-entry marking (the file's own comment: *"there is nothing to
link to... never rejected"*, `suggest-input.tsx:25-28`). `courses`/`test_scores` have no
unmapped/custom column, despite the identical pattern (`StudentInterest.is_custom`,
`types/database.ts:566`) existing and being used elsewhere in the schema — the pattern was
available and simply wasn't applied here. Reconciliation between custom and canonical entries
exists only as an offline manual report (`scripts/reconcile-custom-vocabulary.ts`), not a runtime
queue a real session could act on. **Contradicted**: literal "typing a single character surfaces
matches" examples in the spec fail outright — `MIN_QUERY_LENGTH = 2` is enforced everywhere
(`entity-combobox.tsx:14`, `university-search-box.tsx:11`, `lib/entities/search.ts:13,190`).
UCL/alias deduplication works and is tested, but through an app-layer workaround
(`lib/universities/canonical.ts:1-34`, `duplicate-supersessions.json`) because the real migration
(`0043_university_duplicate_supersession.sql`) was never applied — `docs/founder-blocked-
backlog.md:268-282` documents roughly 63 further unresolved orphan-duplicate pairs.

### A2. Search interaction standard (Decision Register §6)

**Status: Partially Implemented.**

Works as specified on University Explorer (`app/(app)/universities/page.tsx:361-368`, real
Enter-submitting form plus a Search button), on profile pages, and on the global Cmd+K palette
(`features/search/command-palette.tsx:101-113`, `lib/search/index.ts:31-40`, which correctly
dedupes via superseded-id exclusion). The Opportunities search box has zero typeahead —
`features/opportunities/opportunity-filter-bar.tsx:85-93` is a bare `<Input name="q">`. Connections
search doesn't exist at all — see the ambiguity flagged above.

### A3. Visual identity — light theme, ORYN-logo-blue (Decision Register §11 / ORYN Programlama §34/§37)

**Status: Implemented, with one live regression.** See the two lead findings above (stale
known-issues.md entry; sonner.tsx's stale dark hardcode). One additional confirmation worth
recording: the brand blue `--brand: oklch(0.477 0.29 272)` is defined identically in both `:root`
and the (unused) `.dark` block (`app/globals.css:69` and `:142`) — the logo-blue anchor doesn't
drift by mode, matching both documents' instruction that it "carry brand recognition through
primary actions and accents." No other hardcoded `dark` class application was found anywhere
under `app/`, `features/`, or `components/` (checked directly, not sampled); the only
`next-themes`-adjacent references left in the codebase are `app/layout.tsx`'s own comment
explaining why the provider was deliberately removed, and the stale `sonner.tsx` prop above — i.e.
this was a real, mostly-complete migration with one missed call site, not a half-finished one.

**Limitation on this item specifically**: a live browser render was not obtained. `preview_start`
repeatedly failed with a fixed pre-flight check against port 3000 ("in use by 'node' (PID 22179),
not a preview server") regardless of the configured target port (3417 and 4891 were both tried via
`.claude/launch.json`); killing that PID was declined as an unauthorized, disruptive action against
what is very likely another session's live dev server. The finding above rests on direct source
inspection (the theme tokens a browser would actually load) plus a dated, explicit code comment
independently corroborated by git history — strong, but not a pixel-verified screenshot.

### A4. Post-signup CV import with NEW/UPDATE/DUPLICATE/CONFLICT review-diff (ORYN Programlama)

**Status: Not Implemented** (the review-diff specifically; the underlying import path only
partially exists and only inside onboarding).

CV *export* (`app/(app)/profile/cv/page.tsx`, `buildPortfolio()`) is a different, already-built
feature and was correctly not confused with import. CV *import*/extraction
(`extractCVData`/`uploadAndExtractCV`) exists only in `app/(onboarding)/onboarding/actions.ts:8-13,
32` and `features/onboarding/steps/import-step.tsx` — zero hits anywhere under `app/(app)/
profile/**`, meaning there is no *post-signup* re-import entry point at all, only the one-time
onboarding path. Onboarding-optional/never-blocks-signup is genuinely implemented
(`import-step.tsx:137-146` skip path; `lib/validation/onboarding.ts:68-79` optional field; no gate
in `onboarding-wizard.tsx:242-244`).

The specific NEW/UPDATE/DUPLICATE/CONFLICT four-state review-diff does not exist — the onboarding
review UI only offers include/edit/remove plus a low-confidence flag
(`import-step.tsx:205-262,222`); those exact terms exist elsewhere in the codebase but attached to
an unrelated subsystem (canonical-entity resolution: `lib/entities/audit.ts:15`, `lib/entities/
resolve.ts:87`, `lib/entities/backfill.ts:14`, `lib/acquisition/precedence.ts:46`). This is a
tracked, known gap, not a silent one: `docs/MASTER-EXECUTION-STRATEGY.md:307-315` already names
this exact flow ("P6 — CV/profile sync... Upload → extract → canonical resolution → diff against
existing profile → NEW/UPDATE/DUPLICATE/CONFLICT → user confirms → save") as planned future work.
Related gaps found alongside it: idempotency (raw `.insert(rows)`, no upsert/dedup key,
`actions.ts:151-193`), merge-not-replace (no re-import entry point to merge against), and
evidence/source linkage (plain `source text` column; the CV-import branch tags some record types
`"cv_import"` but the education branch tags none, defaulting to `'manual'` — indistinguishable
from hand-entry; no FK to the stored CV file; the separate `evidence_files` system is never written
by CV import). The `cv-uploads` storage bucket has an owner-delete RLS policy but no app code
anywhere calls delete on it or lists its contents — there is no document-manager UI for CVs at all.

### A5. Opportunity filtering with type-specific facets (ORYN Programlama)

**Status: Partially / Not Implemented on the requirement's central claim.**

Core filters are real but narrow: `lib/opportunities/browse.ts:42-64` implements category,
country, remote, free, cycle-status, and free-text (title + organization only — never description).
The filter bar UI (`features/opportunities/opportunity-filter-bar.tsx:81-142`) exposes exactly
these six. Missing despite the columns already existing on `Opportunity`
(`types/database.ts:1040-1094`): age, grade, international/Turkish eligibility, deadline range,
financial aid, verified status, a saved-status filter, and personalized relevance as a filter
(`match_score` currently only drives the "For you" tab's sort order, not a filter). The
`location_mode` tri-state column (online/in-person/hybrid) exists but is entirely unused — only a
boolean `remote_allowed` checkbox is wired to the UI. There is no city/region column at all, only
country.

Type-specific facets — the requirement's central claim — are **not implemented at the data-model
level**: `Opportunity` is a single flat type shared across every category, with zero references
anywhere to team_size, wet_lab, housing_included, school_nomination, credit_bearing,
session_dates, delegation, weekly_commitment, work_authorization, or nomination_required. The
code's own comment admits this directly (`opportunity-filter-bar.tsx:52-56`: "columns don't exist
yet"). Progressive disclosure (different filters shown per category) is not implemented — the
filter bar is a server component with no conditional branching on category. On the positive side:
"structurally supported, not keyword-faked" is not violated by what *does* exist — free-text
search really does only match title/org rather than pretending to search description text it
doesn't index, and `computeEligibility` (`lib/opportunities/matching.ts:62-86`) correctly treats
unknown fields as unknown rather than guessing — the gap is coverage, not dishonesty about
coverage. URL/state persistence is real for the six filters that exist (`q/category/country/
remote/free/cycle/page/view`, `app/(app)/opportunities/page.tsx:31-40,50-56,180-186`) but there are
no active-filter chips or per-filter remove controls, and no distinct mobile treatment was found.

---

## Section B — Broader pass (spot-check depth, not exhaustive)

These were checked once, directly, against a specific real code location — real evidence, but
shallower than Section A's agent-depth investigation.

| # | Requirement (source) | Status | Evidence |
|---|---|---|---|
| B1 | AI Role — provider abstraction (Decision Register §10 / AGENTS.md) | **Implemented** | `lib/ai/provider.ts:54-56` defines a real `AIProvider` interface with `generateStructured<T>`; six call sites use it (`lib/ai/research-generator.ts:53`, `weekly-plan.ts:56`, `opportunity-extraction.ts:67`, `cv-extraction.ts:88`, `requirement-extraction.ts:62`, `interpret-requirement.ts:41`, `essay-outlines.ts:92`), concretely implemented by `lib/ai/anthropic-provider.ts:81`. Matches the spec's exact interface shape. |
| B2 | Opportunities must be excellent — quality bar (Decision Register §9) | **Implemented** | Real 5-state `verification_state` enum on `Opportunity` (`types/database.ts:1077`: `verified_current \| verified_historical \| verified_derived \| unverified \| conflicting`), cross-verified against a live production query run in the prior `opportunity-dimension-tagging` branch: 166 `verified_current` / 202 `unverified` / 1 `conflicting` of 369 total. The bar exists and is enforced in the data, not just the type. |
| B3 | Periodic freshness/refresh system (Decision Register §4 / AGENTS.md Phase 30) | **Partially Implemented** | Freshness fields (`last_checked_at`, `data_status`, etc.) are real and used across several migrations and `lib/opportunities/discover.ts`, `lib/universities/sync-us-universities.ts`, `lib/requirements/discover.ts`. Four job route handlers exist and are properly secured (`app/api/jobs/{deadline-reminders,discover-opportunities,discover-requirements,sync-university-data}/route.ts`, bearer-auth via `CRON_SECRET`, fail-closed by design per `docs/environment-variables.md:25` — verified by that doc's own explicit note that it read the guard function directly). But there is no scheduler wiring them up: no `vercel.json`, no cron config anywhere in the repo. `docs/environment-variables.md:25` says so itself: `CRON_SECRET` is "**Required if the four background jobs are ever scheduled**" (emphasis in the source) — present tense, not yet true. The jobs are built and safely invocable by hand or by an external trigger; nothing currently calls them periodically. |
| B4 | Internationalization-ready (Decision Register §12) | **Partially Implemented** | `lib/i18n/format.ts` is real, but narrow: a single `DEFAULT_LOCALE = "en-US"` constant feeding `Intl.NumberFormat`/currency formatting, with an explicit comment framing this as "one constant here is what a future locale switch changes." That is a genuine, deliberate readiness decision — but there is no actual multi-language capability today: no `app/[locale]` routing segment exists, no translation framework (`next-intl`, `react-i18next`, etc.) is present. "Ready for" is fair; "is" would not be. |
| B5 | Location personalization (Decision Register §13) | **Not Implemented / weak** | No location-based filtering or proximity logic found in `lib/opportunities/` or `lib/universities/`. Consistent with A5's finding that `Opportunity` has country only, no city/region, and no proximity field is wired to any UI. |
| B6 | Location + minor privacy guardrails (Decision Register §14 / Legal & Privacy register / AGENTS.md) | **Partially Implemented, and possibly correctly incomplete** | The specific AGENTS.md instruction ("do not unnecessarily expose full birth date if birth year is sufficient") is followed exactly: `types/database.ts:91` has `birth_year: number \| null`; there is no `birth_date` field anywhere in the schema. No explicit consent-collection fields (age-gating, parental consent) were found — every "consent" hit in the codebase is about mutual-consent *connection requests* (`supabase/migrations/0023_social_v1.sql`, `0024_fix_connection_privacy_leak.sql`), a different meaning entirely. This may not be a gap needing escalation: the Legal & Privacy register itself is framed as "not legal advice" and explicitly lists formal legal review as still-required future work, which reads as the founder consciously deferring consent-flow implementation until that review happens rather than an oversight. Flagged for awareness, not as a contradiction. |
| B7 | Connections MVP social discovery (Decision Register §7) | **Partially Implemented** | `features/connections` is a real, built feature (matches `docs/known-issues.md`'s record of commit `bcfa64c`). But discovery is link-only by deliberate 2026-08-15 decision (`docs/product-decisions.md:113-114`) — no student directory, no people-search. See the scope-ambiguity flagged above regarding whether §6's general search standard was meant to reach this feature. |
| B8 | Matching logic as three separate concepts — Match Score / Selectivity / ORYN Confidence (ORYN Programlama) | **Implemented** | All three are real, distinct fields, not one conflated opaque score: `matchScore` (`lib/opportunities/matching.ts:144,161` — `clampScore(relevanceScore * 0.4 + profileNeedScore * 0.6)`, gated on `eligible`), `selectivity` (`lib/admissions/outlook.ts`, `lib/universities/sync-us-universities.ts`, `lib/opportunities/ingest.ts`), and `confidence` (`lib/opportunities/discover.ts`, `persist-matches.ts`, `ingest.ts`). Not independently checked for correctness of the underlying formulas — `lib/admissions/outlook.ts` in particular is reported elsewhere as actively being revised by another session lane, so this audit deliberately did not dive into it further to avoid duplicating that work. |
| B9 | Database/data coverage priority (Decision Register §3) | **Directionally consistent, not deeply verified** | Live row counts (`universities`=1019, `opportunities`=369) are consistent with a US/UK-first coverage priority based on prior branches' work in this session, but this audit did not re-derive a country-by-country breakdown to confirm the stated priority order is actually reflected in acquisition volume. |

**Not independently code-verifiable by nature** (positioning statements, process/governance
principles, or point-in-time prioritization lists rather than checkable product behavior):
Product Positioning (§1), MVP Principle (§2), 10-Person MVP Pilot (§8), Product Governance/
No-Surprise Rule (§15), Current Priority Order (§16, and separately ORYN Programlama's own
"current status"/"build order" sections — time-bound by construction, likely already stale
relative to actual repo state given how much has shipped since 2026-08-17).

---

## Section C — Not independently verified this pass

Both Drive documents contain substantially more sections than the above. In the interest of not
fabricating findings for material this audit did not actually check, the remainder is listed here
by topic rather than given a status. A few are already corroborated by prior, independent session
work recorded in `docs/known-issues.md` and are noted as such — corroborated, not re-verified.

**Already corroborated by `docs/known-issues.md` (built by prior sessions, not re-checked here):**
- Essay Story Bank / "Story Notes" — the exact Hook → Context → Conflict → Action → Turning Point →
  Reflection → Connection-to-Future structure ORYN Programlama specifies was confirmed built,
  matching exactly, by a prior session.
- CV Generator — confirmed to exist as a distinct export-direction feature (A4 above independently
  re-confirmed this); the five named CV type variants ORYN Programlama specifies were not
  individually itemized against the code this pass.
- Messaging/DMs — built despite ORYN Programlama §33's original V1 exclusion, per explicit,
  repeated later chat instruction that superseded it; already logged as a resolved, intentional
  supersession, not a live conflict.

**Not verified this pass, no prior corroboration found — genuinely open for a future audit pass:**
ORYN Programlama's onboarding-flow specifics, interest-category taxonomy, location/format/budget
capture, academic-profile fields beyond what Section A/B already touched, the 9-section
LinkedIn-style profile layout, the Activity data model, Discover-page filters as a concept distinct
from Opportunity filtering (A5 covers Opportunities specifically; whether a separate "Discover"
surface exists with its own filter set was not checked), the Opportunity Database schema wishlist,
Application Tracker, Essay Helper's full flow (distinct from the Story Bank structure already
corroborated), Quick Capture (explicitly marked future/not-yet in the source document itself),
ORYN for Schools, Sponsored Opportunities, the revenue model and investment-principle sections
(business, not product/code, by nature), the technical-architecture section, the Student/
Opportunity/Social/Outcome Graph "product data principle," and §36's university detail-page IA
including the Oryn Outlook labels (Extreme Reach/Reach/Competitive/Strong/Likely) — this last one
specifically skipped because it overlaps with `lib/admissions/outlook.ts`, which another session
lane is reported to be actively revising; auditing it now risked stale findings by the time anyone
reads this.

---

## Section D — Drive folder inventory

- **"ORYN"** root (`10Ca-Tsmr1u7L0L_oJXDW9-PVfPujxl6x`): contains Legal & Privacy, Product &
  Strategy, Reports, Programlama, and ORYN Database subfolders, plus two documents created
  2026-08-21 ~08:05–08:08 UTC by the coordination session itself ("ORYN — Prompt Arşivi (Tüm Ajan
  Görev Tanımları)" and "ORYN — Durum, Boşluk Analizi ve Yol Haritası (2026-08-21)") — independent,
  incidental confirmation that the coordination session's described activity (building a prompt
  archive and a roadmap) is real, found while enumerating folders for an unrelated reason.
- **"Product & Strategy"**: exactly one document (the Decision Register audited above) — no hidden
  additional product-decision docs.
- **"Programlama"**: exactly one document (ORYN Programlama, audited above).
- **"Legal & Privacy"**: exactly one document (the Legal & Privacy Working Register — full read,
  informed B6 above, itself explicitly "not legal advice").
- **"Reports"**: three documents (Verified Data Acquisition: Architecture/Pilot/Coverage;
  University & Opportunity Enrichment — Canonical Report; Cialfo Public Intelligence & Data Gap
  Audit) plus an Archive subfolder — status/measurement reports, not requirement sources, not
  deeply read this pass.
- **"ORYN Database"** (`1XrI35NFS4LFS5SzETTeEQ1pOzpjCHIcC`): data-acquisition subfolders only
  (`00_Data_Dictionary_and_Audit` through `99_Archive`), matching ORYN Programlama §29 exactly —
  confirmed to contain data corpora, not additional product-decision documents, and correctly out
  of scope for this audit.

---

## Confidence key

- **Full** (Section A): investigated by a dedicated agent or direct multi-file code read, with
  file:line citations for every claim, cross-checked against at least one other source (a test
  file, a live query, git history, or a second document) where possible.
- **Spot-check** (Section B): one direct, real code check per item — genuine evidence, not
  exhaustive coverage of every edge case a full audit would find.
- **Not verified** (Section C): listed for completeness of the source material, no status assigned,
  explicitly not to be read as a finding.

## Limitations

- No live browser render was obtained for any requirement (see A3) — all findings rest on direct
  source inspection, git history, and (for B2/B9) prior read-only production queries, not on
  visually observing the rendered app. This is real, direct evidence of what the app *will* render
  (the code that produces it), not a substitute for actually seeing it.
- Three of the five Section A items were produced by background agents whose work this document
  synthesizes and cross-references but did not independently re-verify line-by-line; each agent's
  citations were spot-checked, not fully re-run.
- This audit checked what the code *does*, not whether any given requirement was a good product
  decision. Several items in Section C were deliberately skipped rather than guessed at.

## Status counts

Across the 5 full-depth items (Section A) + 9 spot-checked items (Section B) = 14 statused
requirements:

- **Implemented**: 4 (A3 visual identity, B1 AI provider, B2 opportunity quality bar, B8 matching
  three-concept split)
- **Partially Implemented**: 7 (A1 autocomplete, A2 search standard, A5 opportunity filtering, B3
  freshness jobs, B4 i18n-ready, B6 minor privacy, B7 connections discovery)
- **Not Implemented**: 2 (A4 CV import review-diff, B5 location personalization)
- **Contradicted** (code vs. its own stated intent): 1 (sonner.tsx dark-theme hardcode)
- **Stale documentation** (not a code defect — a tracking doc needs updating): 1
  (`docs/known-issues.md`'s visual-identity entry)
- **Ambiguous scope, not adjudicated**: 1 (Connections search vs. the general search standard)
- **Not independently code-verifiable by nature**: 6 (Section B's positioning/process items)
