# What a "zero user-visible Oryn" sweep structurally cannot see

Not another leak hunt — a map of the *category* of surface tonight's sweeps couldn't have
caught, starting from the one confirmed instance (`lib/ai/refine-achievement.ts`, already
fixed) and generalizing from there. **Report, not fix** — three more live instances found,
none touched, all bigger than the one-liner CEO fixed herself.

## The structural gap, stated once, precisely

Every rename pass tonight worked from one of two definitions of "where text lives": **JSX
literals** (a string sitting directly in a component) and **message-catalog entries**
(`messages/en.json`/`tr.json`, read via `t()`). Both are real, both were swept well — confirmed
again this pass, message catalogs are still clean.

**There is a third place text lives that neither definition covers: a plain string constant or
return value inside a `lib/` file — business logic, not UI, not a catalog — that a page later
renders by interpolating a variable (`{someResult.field}`), or that gets concatenated into an
AI prompt.** A JSX sweep has no reason to open `lib/admissions/outlook.ts`; nothing there looks
like UI. A catalog sweep has no reason to either; nothing there is a `t()` call. The text is
real, it reaches a real screen or a real model call, and it sat outside both checks' own
definition of what needed checking — not because either check was done carelessly, but because
neither check's *scope* was drawn to include "prose returned by a `lib/` function."

This is the same shape as the confirmed AI-prompt leak, one level removed: there, the fixed
string ships as *model input*; here, the string ships as *page output* — but in both cases the
text sits in a `.ts` file that nobody's sweep definition treated as a place prose lives.

## Confirmed live, student-facing, not fixed

**`lib/admissions/outlook.ts`'s `NOT_APPLICABLE_REASONS`/`NOT_APPLICABLE_REASONS_TR`** (lines
204-213, 230-239) — the explanation shown when a target's admission system doesn't support a
reach/competitive/likely rating (AGENTS.md §16.2's own "Unknowns" mechanism). Both the English
*and* the Turkish translation say "Oryn" — the Turkish one twice in one sentence
("Oryn'ın Zorlu/Rekabetçi/Olası ölçeği... Oryn ayrıca..."). **Confirmed rendered, not just
computed:** `app/(app)/universities/[id]/page.tsx:265` reads `outlook.notApplicableReason`
into a local, line 436 renders it directly — `{notApplicableReason}` — on the real university
detail page. Two languages, one real screen, unfixed.

**`lib/universities/counseling-adapter.ts`** (lines 558-612) — `"Oryn only computes an
admission outlook..."`, `"Oryn can't currently verify..."`, and two more via template
literals interpolating the university name. `buildUniversityCounselingView`'s output reaches
`app/(app)/universities/compare/page.tsx` and `features/universities/university-card.tsx` —
both real, rendered surfaces, not previews.

**`lib/admissions/system-shape.ts:689`** — a Denmark-specific admission-mechanism sentence
("Oryn cannot tell which track a specific student is pursuing..."), same file family and same
shape as `outlook.ts` above; not traced to its exact render path with the same certainty as
the other two, named here because it's the same pattern in the same directory and worth the
next pass confirming directly rather than assuming clean by association.

None of these three were fixed this pass — each is a multi-sentence, sometimes bilingual edit,
past the one-liner threshold this task was scoped to report rather than touch.

## A correction to an earlier "acceptable leftover" call

CEO's own dispatch tonight named `lib/opportunities/cycle-label-quality.ts`'s four hits as
"comment-only." **They aren't comments — they're string literals in a `detail:` field**
(e.g. `detail: "Refers to Oryn's own research process..."`). The practical conclusion still
holds, for an adjacent reason: traced its only consumer (`lib/opportunities/ingest.ts`) and
`lib/requirements/shape-audit.ts`'s equivalent hit (only consumer: `lib/requirements/ingest.ts`)
— both are ingestion/admin tooling, never reached by a student. Low priority for the same
reason CEO's call was right, but "comment" and "internal-tool-only string" are different
claims, and the record should say which one is true.

## Checked and clean — categories that could plausibly have had the same gap and didn't

**Email.** `lib/digest/*.ts`, `lib/parent/invite-email.ts` — zero real hits (one comment-only
"Oryn proposing" in `digest/build.ts`, correctly left alone).

**File export.** `lib/admin/cohort-csv.ts`, `app/api/admin/export-cohort/route.ts`,
`app/(app)/documents/actions.ts` — clean.

**Metadata/OpenGraph.** Swept all 45 files exporting `generateMetadata` — every hit was a
comment. The root `app/layout.tsx` title/description ("Proxola — Your Personal Career
Operating System") is correct. No `manifest.ts`/`opengraph-image.tsx` exists to check.

**Structured errors and notifications.** `lib/notifications/*.ts` and the error-returning
action files (`settings/actions.ts`, `admin/actions.ts`) — clean; the earlier-flagged hits in
those two were confirmed comment-only on a second, closer read.

**Zod schemas.** No `.describe()`/`.refine()` message text anywhere in `lib/validation/` or
`lib/ai/` mentions the old name — checked because a schema's `.describe()` text is exactly the
kind of string an LLM call sees (it's sent as part of the tool schema) without being a
`SYSTEM_PROMPT` constant, so it shares the AI-prompt category's own risk shape. Clean.

**`oryn_public` is correctly untouched, not a new miss** — a real, structural enum value
(`lib/social/posts-visibility.ts`, `posts-input.ts`), already on the standing forbidden list
CEO named before any lane started. Named here only to rule it out explicitly, since a blind
grep for "oryn" surfaces it and a careless read could double-count it as a finding.

**Genuinely out of scope, not a defect:** `lib/monitoring/sentry-envelope.ts:94`'s
`logger: ... ?? "oryn"` is an error-tracking tag sent to Sentry, never rendered to a user —
noted, not chased.

## For the next global string change, not just this one

The generalized check this pass produces: **for any rename or global copy change, trace every
exported function in `lib/` whose return type is (or contains) a `string`, and check what its
caller does with the result** — render it via JSX interpolation, or hand it to an AI provider
call — rather than sweeping by file *location* (JSX files, catalog files) and assuming that
covers every place prose can originate. A function's home directory says nothing about whether
its return value is data or copy; `lib/admissions/outlook.ts` looks exactly like `lib/tier/
plan-tier.ts` from the outside, and only one of them returns prose a student reads.

## What this pass did not do

Did not fix any of the three live findings — all past one-liner scope, reported per this
task's own instruction. Did not trace `system-shape.ts`'s exact render path with the same
certainty as the other two. Did not exhaustively enumerate every `lib/` function's return type
by hand (a mechanical pass — grepping for string-returning exports and cross-referencing their
importers — would be the way to make this exhaustive rather than representative; not attempted
here, named as the natural next step if this category needs a full sweep rather than a spot
check).
