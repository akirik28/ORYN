# Does the CV import path actually work? — 2026-09-02

Spec Phase 53 item 3 is "enter **or import** their profile." Tonight's MVP re-measurement
confirmed the *enter* half from live data and never touched *import*. Method, per CEO's own
instruction: let live data point first, then read the path against Phases 26/60/61's specific
requirements — the same method that found the Job D bug (money spent, nothing produced).

## Live data first — corrected a premise, then got a real answer

**Two `cv_extraction` rows exist in `ai_usage`, not three** — checked directly
(`select feature, count(*) from ai_usage where feature ilike '%cv%'`), no variant naming
hiding a third. Both real: `claude-sonnet-5`, ~5k input / ~3k output tokens, ~$0.06 each,
2026-08-24 and 2026-08-29.

**Both produced real, saved profile items — this is not the Job D signature.** Checked every
CV-import-destination table (`education_records`, `activities`, `awards`, `projects`,
`research_experiences`, `work_experiences`) for rows belonging to each extraction's user,
correlated by timestamp:

- User `026e9295...` (extraction 08-29 08:09:45): 13 rows land at 08:10:13-14 — 28 seconds
  after extraction, across education/activities/projects/research in one batch.
- User `ccf2161e...` (extraction 08-24 06:40:58): rows land in a spread from 06:42:27 through
  06:52:59 — ten minutes, several distinct save events across education/activities/projects/
  research/skills/awards, not one instant bulk write.

The second pattern in particular looks like a real, incremental review — a student actually
going through sections, not a rubber-stamped bulk confirm. Neither extraction shows the
"cost money, produced nothing" shape. **First confirmation either way, and it's positive.**

One caveat worth naming rather than smoothing over: user `026e9295` also has an earlier batch
of profile rows from 2026-08-23, a full day before either known extraction. Can't attribute
those to CV import from `ai_usage` data alone — plausibly manual entry, or an import that
predates this session's earlier fix to `ai_usage`'s own write path (an RLS-scoped-client bug
found and fixed tonight meant AI usage silently went unlogged for a period). Not resolved
here; noted so it isn't mistaken for a third extraction that simply didn't log.

## The four spec requirements, checked against the actual code

### 1. Never save AI-extracted items directly — Upload → Extract → Structure → Review → confirm → Save

**Confirmed, structurally.** `extractCVData` (`lib/ai/cv-extraction.ts`) only extracts and
returns data — it never writes to a profile table. Saving happens exclusively through
`importReviewedCvItems` (`app/(app)/profile/import/actions.ts`) or the onboarding-completion
path, both **separate** functions the client can only reach after a review UI has rendered
the extracted items and the student has explicitly acted. Confirmed by reading both call
sites, not inferred from naming.

**But the two review UIs are not equivalent, and one is missing real editing:**

- **`features/onboarding/steps/import-step.tsx`** (onboarding): full edit — an editable title
  `Input`, an `EntityCombobox` for organization/school (with real entity-linking, not just
  free text), a per-item delete button, and an include/exclude checkbox. Matches Phase 60's
  "Student can: edit / delete / confirm" exactly.
- **`features/profile/cv-import-flow.tsx`** (the later-added surface — its own comment: "a
  student who joined with an empty profile... had no way to use it again"): **include/exclude
  checkbox only.** No editable title, no organization field, no per-item delete. A
  low-confidence item is flagged with a warning label, but there is no way to *fix* it before
  saving — only include it as-is or leave it out entirely.

This is a real gap, not a design variation: the newer, more-often-reachable surface (post-
onboarding, from `/profile`) has strictly less capability than the one built first, and less
than Phase 60 names. **Not fixed here** — porting `EntityCombobox` integration and editable
fields into `cv-import-flow.tsx` is a real UI change, not a one-line correction, and touches
i18n/entity territory this pass didn't scope into. Flagged with the exact comparison so
whoever picks it up has the working reference implementation already in the same codebase.

### 2. AI output must be schema-validated (Phase 26 / non-negotiable #9)

**Confirmed.** `CVExtractionSchema` (Zod, `lib/ai/cv-extraction.ts`) is passed to
`provider.generateStructured(...)`, the same validated-structured-output pattern every other
AI feature in this codebase uses. Every structured category (education, activities, awards,
projects, research, workExperience) carries per-item `confidence: "high" | "medium" | "low"`.

Minor, not a violation: `skills` and `languages` are plain string arrays with no per-item
confidence — defensible, since a skill/language name is a much lower-ambiguity claim than a
dated achievement with an organization, but worth naming since Phase 60 says "confidence per
extracted item" without carving out an exception for these two.

### 3. On parse failure, never discard the document (Phase 61)

**Confirmed, and more literally than expected.** The file upload to Supabase Storage
(`cv-uploads` bucket, private) happens **before** extraction is attempted at all
(`app/(onboarding)/onboarding/actions.ts`) — the function's own comment states this
explicitly: "The upload always succeeds independently of extraction... a parsing failure
never loses the file." Checked the actual code, not just the comment: `supabase.storage
.from("cv-uploads").upload(...)` runs first, `extractCVData` runs second, inside its own
try/catch. A student's document is never at risk from an extraction failure — it's already
durably stored by the time extraction is even attempted.

**"Log the failure" — real gap found and fixed.** The catch block around extraction has five
branches: rate-limit exceeded, AI provider unconfigured, unsupported file type,
`CVExtractionFailedError` (the actual "extraction/parsing failed" case), and a fallback for
anything else. The first three are validated, expected conditions; the fallback branch
already had `console.error`. **`CVExtractionFailedError` — the literal case Phase 61 is
about — was the one branch with no logging at all**, silently returning the friendly
message with nothing server-side to show a systematic problem (a schema drift, a provider
behavior change) was happening. Fixed: now logs `.cause` (the real underlying error
`extractCVData` wrapped, not this file's own generic message). New test suite pins this and
guards the other branches' existing, correct behavior against a future regression.

### 4. Confidence per item, and a review count

**Confirmed** on both review surfaces: `foundItems`/similar copy states the count of items
found, and low-confidence items are visually flagged (`onboarding`'s version defaults nothing
special beyond the flag; `profile`'s version defaults low-confidence items to **unchecked**,
so a shaky extraction never lands without the student actively opting it in — a good,
deliberate default, confirmed by its own inline comment).

## What was fixed vs. reported, and why the line was drawn there

**Fixed** (small, single-purpose, no design decision required): the missing
`console.error` for `CVExtractionFailedError`, plus a new 5-case test suite for
`uploadAndExtractCV` (previously zero coverage) pinning it.

**Reported, not fixed:**
- `cv-import-flow.tsx`'s missing field-editing — a real UI build, not a correction, and the
  working reference implementation already exists in this codebase (`import-step.tsx`) for
  whoever takes it.
- The 2026-08-23 profile-row batch on user `026e9295` that predates both known extractions —
  named as an open question, not resolved.
- `skills`/`languages` having no per-item confidence — named as a minor, defensible gap
  against a literal reading of Phase 60, not acted on.

No live database writes made during this audit beyond what the new test suite exercises
against mocks. Both reviewed users' data was read, never modified.
