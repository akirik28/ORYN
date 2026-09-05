# Onboarding audit — 2026-09-02

Full audit of Phase 3 (the 5-screen onboarding wizard), resumed after the connections-gating
interrupt. Supersedes `onboarding-audit-progress-2026-09-02.md` (deleted; its two confirmed
findings — screen-2 validation sequencing, birthYear's hard-required status — are folded in
below, re-verified live rather than just carried over).

Method: source read of every file in the flow, cross-checked against a live walkthrough of
`app/(dev-preview)/design-preview/onboarding` (unauthenticated, mounts the real
`OnboardingWizard` directly — confirmed still the only way to walk this live without a real
account) attached to the shared `next dev` server at `localhost:3000`, which was verified to
be on the exact commit (`6cefc740`) this audit's own branch was rebased onto. Screens 1-4 were
walked end to end, including filling every field and testing custom-entry paths. Screen 5
(CV import) was walked up to but not including the actual file upload or the final "Finish"
submit — both would trigger a real AI-extraction call and a real `completeOnboarding()`
write respectively, and this browser profile has previously been found to carry a persisted,
possibly-real authenticated session (`reference_oryn_dev_environment_quirks.md`); neither risk
is necessary here since the save path is fully traceable from source. That specific limitation
is called out again in the relevant section below.

## 1. Screen-by-screen

### Screen 1 — Goals (`step === 0`)

Multi-select pills, five options, matches spec exactly. No required minimum — confirmed in
both `goNext()` (no `step === 0` check) and the schema (`goals: z.array(z.string()).max(10)`,
no `.min()`). Persisted only if non-empty, into `career_goals` with `category: "onboarding"`,
and only on first-ever completion (see idempotency note in §3).

### Screen 2 — School / curriculum / birth year (`step === 1`)

Re-verified live (previous partial audit had this from a source read only). `goNext()` runs
three independent, sequentially-gating checks, each with its own `return`:
country/school/curriculum → graduation year (format) → birth year (format, then the real
`meetsMinimumSignupAge` policy check, its own distinct message). All five bounds match
`CompleteOnboardingSchema` exactly, so there is no field that can pass the client and fail the
server — the specific bug the code's own comment documents as previously real ("would sail
through every step, get rejected only at the final Finish click, and land the student on step
4 staring at a graduation-year error with no graduation-year field in sight") is now closed for
every required field, not just the one it was first found on.

`birthYear` has no default value (deliberate — "a pre-filled year would be silently wrong for
almost everyone") and is the one field the product cannot work around: `lib/counselor/
eligibility.ts` degrades every one of the 139 age-gated opportunities to "can't check this"
without it, and the field was previously collected nowhere in the product at all (6 of 11
accounts had it null, 5 already onboarding_completed — see the schema's own comment). Required
here, checked twice (client for UX, server because the client check can't be trusted), exactly
as intended.

**New, live-only finding — not a bug, but worth recording:** the school field
(`EntityCombobox`) surfaces a real product behavior worth double-checking. Typing a school
name with no canonical match offers "Can't find the school you're looking for?", which opens a
modal (Name/City/Country) with an honest disclaimer: *"Oryn will add this as unverified until
compared against an official source."* Good — matches the evidence-status philosophy exactly.
But once added and linked, the field then displays **"Linked to a verified entry"**
(`linkedToVerified`, `features/entities/entity-combobox.tsx:205`) — unconditionally, for any
non-null `entityId`, with no check of the entity's own status. `lib/entities/resolve.ts:106`
confirms the data model already distinguishes this: *"A student cannot create a verified
[row]... `user_submitted` row, queued for verification."* So the same entity, seconds after
being disclosed as unverified, is then labeled verified. This is the same category of issue
flagged elsewhere tonight (a reassuring label not backed by actual state) — small surface,
wide blast radius (`EntityCombobox` backs every organization field across onboarding and the
main profile forms, not just schools). Recommend fixing `linkedToVerified` to branch on the
entity's real status rather than mere presence of an id; flagging rather than fixing inline
here since this branch is docs-only and the component is shared well beyond onboarding —
proposing it as an immediate, tightly-scoped follow-up (see final section).

### Screen 3 — Interests (`step === 2`, `InterestsStep`)

Live-verified: 16 suggestion chips (search-filtered), free-text custom entry via Enter, remove
via badge ×. No required minimum (`interests: z.array(z.string().min(1)).max(20)`, no
`.min()`). One tool-level false alarm during testing: the automation's "Return" key action did
not register as a real Enter keydown on the first attempt (the chip didn't appear); resending
as "Enter" worked immediately and the custom interest ("Robotics") was added correctly. Noting
this so it isn't mistaken for a product bug on a future pass — it was a test-tooling key-name
mismatch, confirmed by the second attempt succeeding cleanly on the same field with no code
changes.

### Screen 4 — Target geography (`step === 3`)

Live-verified: six toggle pills (USA/UK/Europe/Canada/Turkey/Not sure), matches spec exactly.
No required minimum, confirmed both live (advanced with nothing selected) and in schema
(`.max(6)`, no `.min()`).

### Screen 5 — Import profile (`step === 4`, `ImportStep`)

Three options rendered exactly per spec: **Upload CV**, **Enter manually**, **Skip for now**.
Live-verified the choice screen and the CV-upload dropzone's empty state (correct copy: "PDF,
DOCX, or plain text — max 10MB", matching `SUPPORTED_CV_MIME_TYPES`/`MAX_CV_SIZE_BYTES` in
`app/(onboarding)/onboarding/actions.ts` exactly).

**Finding: "Enter manually" and "Skip for now" are the identical path**, not two different
ones. Both buttons call `setMethod("manual")` (`features/onboarding/steps/import-step.tsx:182-199`)
and land on the exact same notice card. The subtitles promise different things —
`enterManuallyHint`: *"Add things yourself"* (implies doing it now) vs. `skipForNowHint`:
*"Do this later"* (implies deferring) — but both then show the identical
`manualNotice`: *"No problem — you can add activities, awards, projects, and more from your
Profile at any time."* A student who picks "Enter manually" expecting an inline form instead
gets told to come back later, which is the "Skip for now" promise. Not a functional break —
nothing is lost or blocked, onboarding still finishes cleanly — but it's a real, visible copy/
expectation mismatch worth a product call: either give "Enter manually" its own lightweight
form, or collapse the two options into one (the current three-way choice screen is arguably one
option too many if two of the three behave identically).

## 2. CV import: does review genuinely gate the save? (non-negotiable #10)

Yes, traced end to end, source-confirmed at every step:

1. **Upload → extraction never writes achievement data.** `uploadAndExtractCV`
   (`app/(onboarding)/onboarding/actions.ts:37-105`) uploads the raw file to the private
   `cv-uploads` storage bucket, runs `extractCVData`, and **returns** the structured result to
   the client. Nothing here touches `education_records`, `activities`, `skills`, `languages`,
   or any other profile table.
2. **The review screen only ever updates local component state.** `handleFile()`
   (`import-step.tsx:128-144`) takes that returned extraction and calls `setReviewedItems`/
   `setReviewedSkills`/`setReviewedLanguages` — React state owned by the wizard, passed down as
   props. `updateItem`/`updateSkill`/`updateLanguage` (edit) and `removeItem`/`removeSkill`/
   `removeLanguage` (delete) are pure client-side array operations on that same state. No
   function in this file calls a server action or touches Supabase directly.
3. **The include/exclude checkbox and hard delete are deliberately two different affordances.**
   Unchecking an item's checkbox disables its fields (soft, reversible) without removing it
   from the list; the trash icon (`removeItem`/`removeSkill`/`removeLanguage`, each with an
   `aria-label`) removes it outright. Both are genuinely wired to visible, working controls —
   confirmed by reading each `onClick`/`onCheckedChange`/`onChange` handler directly, not just
   checking the handlers exist.
4. **The save is one atomic call, triggered only by the wizard's own Finish button.**
   `finish()` (`onboarding-wizard.tsx:191-229`) is the only place `extractedItems`/
   `extractedSkills`/`extractedLanguages` are read out of that review state — and it filters on
   `.included` right there, so an unchecked item is never even placed in the payload sent to
   the server. That payload, plus every other screen's answers, goes to `completeOnboarding()`
   in one `startTransition` call. There is no per-screen or per-item save before this.
5. **The server re-validates and writes once, guarded against double-submission.**
   `completeOnboarding` (`app/(onboarding)/onboarding/actions.ts:107-241`) re-parses the whole
   payload against `CompleteOnboardingSchema`, and gates every "secondary write" (goals,
   interests, education record, and the CV-import inserts) behind
   `shouldRunOnboardingSecondaryWrites`, which re-derives eligibility from the **profile row on
   file**, never from client-submitted state — a deliberate fix (per its own comment) for a
   prior live bug where a stale tab or retry produced duplicate rows. Confirmed empirically:
   see §4, zero secondary-table rows exist for any account that never finished onboarding.

Live testing stopped short of clicking the actual "Finish" button or uploading a real file, for
the reason stated in the Method note above (real AI cost + real write risk against a possibly-
authenticated persisted session in this browser profile) — but every step of the chain above
was confirmed from the actual source that runs, not inferred.

## 3. Skills/languages: the newly-live half of CV import

Migration `0084_skills_languages_source.sql` adds `source text not null default 'manual'` to
**both** `public.skills` and `public.languages` in one migration — confirmed live via direct
query against the production database (`qtcvcflzxbuagvvwahhu`):

```
table_name | column_name | is_nullable | column_default
skills     | source      | NO          | 'manual'::text
languages  | source      | NO          | 'manual'::text
```

Both are applied, not just one — the restart-context note specifically named `skills.source`,
but the same migration covers `languages.source` too, and both are confirmed live.

`insertCvImportSkills`/`insertCvImportLanguages` (`lib/profile/cv-import.ts:232-314`) were
written defensively for exactly this migration being unapplied: insert with
`source: "cv_import"` first, and only on a `42703`-class "column doesn't exist" error, retry
without it. With the column now live, every call takes the first branch — the `source` tag
that lets "a student — and Oryn's own scoring — tell an imported claim from one typed by hand"
(the file's own header comment) is now actually written, for the first time since this feature
shipped. This closes the gap the restart-context message described: skills and languages
extracted from a CV are no longer silently discarded, and are now correctly provenance-tagged
on save. Dedup (case-insensitive name match, checked before insert) and the 15-skill cap are
both real, pre-insert checks — confirmed by reading the logic, not just its presence.

## 4. The three accounts that never finished onboarding

Queried directly against production (read-only):

| display_name | onboarding_step | every profile field (country/school/grad_year/birth_year/curriculum) | created_at == updated_at |
|---|---|---|---|
| Persona A Test | null | all null | yes, to the microsecond |
| Claude UI QA | null | all null | yes, to the microsecond |
| Oryn QA Sweep | null | all null | yes, to the microsecond |

Checked every secondary table `completeOnboarding` can write to (`career_goals`,
`education_records`, `skills`, `languages`, `student_interests`) for all three user ids: **zero
rows in every table.** This confirms the atomicity claimed in §2 — nothing partial ever lands,
for these three or in general.

**The honest answer to "where did they stop" is that the data structurally cannot say, and
that is itself a finding worth naming.** `onboarding_step` reads like a progress tracker but
isn't one: a repo-wide search shows it is written in exactly one place in the entire codebase
(`app/(onboarding)/onboarding/actions.ts:169`), always the literal string `"completed"`. No
code ever sets it to an intermediate value, and the wizard holds all five screens' state in
client-side React only — there is no per-screen save to observe a stall in. All the row data
tells us is that these three accounts were created and never triggered a single subsequent
write of any kind — consistent with abandoning somewhere before finishing screen 2's required
fields (the earliest point anything would need to be correct to proceed), but no more precise
than that.

**Recommendation, not implemented here (out of scope for a docs-only audit branch):** if
diagnosing onboarding drop-off matters going forward, `onboarding_step` needs to actually be
written after each screen transition, not just once at the end. Right now it cannot answer the
question its own name implies it should.

## 5. Verdict: does it feel like a government form?

**No.** Reasoning, weighing the whole flow rather than any one screen:

- One question (or a tight cluster of related ones) per screen, a single always-visible
  progress bar, and a Back button that works from every step.
- Real, human reasoning shown at the one point that could otherwise feel invasive — the
  birth-year field explains *why* ("stops every opportunity card saying 'Oryn can't check
  this'") rather than just demanding a number.
- Nothing beyond screen 2 is mandatory, and skipping is stated plainly rather than hidden
  behind a maze — "No problem, you can add this later" is the actual, honest copy, not a dead
  end.
- Client and server validation are symmetric everywhere it matters, so there is no
  fill-out-the-whole-form-then-get-rejected moment — confirmed as a fixed, formerly-real bug
  class, not an assumption.
- Visually: generous whitespace, one accent color, no gauges/meters/decorative charts, nothing
  that reads as "compliance paperwork."

The one place that pulls slightly toward form-like is screen 2 itself — five fields at once,
all required — but the birth-year explanation and the working school-autocomplete (with an
honest "unverified" disclaimer on custom entries, modulo the `linkedToVerified` mislabel in
§1) keep it from feeling bureaucratic. The two real findings in this audit (the verification
label, and "Enter manually"/"Skip for now" converging) are both small and specific, not signs
of a deeper government-form problem.

## Summary of findings

1. **`linkedToVerified` mislabels a self-added, unverified entity as verified**
   (`features/entities/entity-combobox.tsx:205`) — real, source-confirmed, shared component
   (schools + every achievement-category organization field). Not fixed on this branch;
   recommend a small, separately-verified follow-up given the blast radius.
2. **"Enter manually" and "Skip for now" are the same screen**, despite differently-promising
   subtitles (`import-step.tsx:182-199`, `messages/en.json:673-677`). Minor, non-blocking;
   flagged for a product/copy decision, not fixed here.
3. **`onboarding_step` cannot answer "where did a student stop"** — written to exactly one
   value, exactly once, at full completion. Not a bug in the strict sense (nothing is broken),
   but a real gap if drop-off diagnosis is ever wanted. Documented, not implemented.
4. Everything else checked — CV-import's review-gates-save chain (non-negotiable #10),
   edit/delete per item, the now-live skills/languages provenance tagging, screens 1-4's
   validation and optionality, and the three stuck accounts' actual database state — held up
   under both a source read and a live walkthrough, with no daylight between the two.

---

## ✅ 2026-09-05 audit — two findings closed, one still open

`linkedToVerified` mislabels a self-added unverified entity as verified → **Closed** — current
`features/entities/entity-combobox.tsx` branches correctly on `isCustom`.

`onboarding_step` written to exactly one value once, can't show drop-off point → **Closed** —
commit `06d02ab2` (2026-09-04), "Record onboarding step transitions for drop-off analysis".
Verified via `git merge-base --is-ancestor 06d02ab2 origin/main`.

Still open, re-confirmed 2026-09-05: "Enter manually" and "Skip for now" are the identical path
(`features/onboarding/steps/import-step.tsx` both call `setMethod("manual")`) despite different
subtitle copy.
