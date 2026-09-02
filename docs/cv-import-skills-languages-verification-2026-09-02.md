# CV-imported skills/languages — verified against live data, 2026-09-02

**Status:** documentation only, no code change (none needed — the fix was the migration
itself, already correctly coded for months). Gates green (typecheck/lint — no source file
touched). **Author lane:** oryn (this session), at oryn-a7's request, right after the
founder applied migrations 0075–0088 during the fleet pause. **Branch:**
`oryn/cv-skills-languages-verify-2026-09-02`.

## The ask

`skills.source`/`languages.source` (migration 0084) are now live. CV extraction has always
pulled skills and languages, and the insert has always degraded to a no-op without that
column — confirm the real path works now rather than assuming the degrade's absence means
success; check whether skills/languages are actually editable in the review step (Non-
Negotiable #10); verify a saved row gets `source: 'cv_import'`, not a silently-won
`'manual'` default; and check whether either of the two real CV extractions in `ai_usage`
ever produced a saved skill or language.

## Schema, confirmed live

```sql
select table_name, column_name, column_default, is_nullable
from information_schema.columns
where table_name in ('skills','languages') and column_name = 'source';
```

```
languages | source | 'manual'::text | NO
skills    | source | 'manual'::text | NO
```

Both columns exist, `NOT NULL`, default `'manual'`. Confirms the founder's migration batch
landed exactly as described.

## The insert mechanism, traced directly

`lib/profile/cv-import.ts`'s `insertCvImportSkills`/`insertCvImportLanguages` both:

```ts
let { error } = await supabase.from("skills").insert(baseRows.map((row) => ({ ...row, source: "cv_import" })));
if (error && isMissingColumnError(error, "source")) {
  ({ error } = await supabase.from("skills").insert(baseRows));
}
```

Always attempts the insert *with* `source: "cv_import"` first; only on a confirmed
missing-column error does it retry without the field, which is what let the row save
*something* before today rather than losing the achievement entirely — at the cost of that
row landing with the column's own `'manual'` default, indistinguishable from a hand-typed
skill. `isMissingColumnError` delegates to `lib/supabase/errors.ts`'s
`isUndefinedColumnError`, itself corrected earlier tonight for the PGRST204-vs-42703 gap
(`docs/known-issues.md`'s own entry on that fix) — so this specific fallback was already
correctly triggering, not silently swallowing, even before today's migration. **With the
column now live, the fallback branch is dead code in this environment**: every insert
succeeds on the first attempt, with the correct, distinguishing `source` value.

Both call sites (`app/(onboarding)/onboarding/actions.ts`'s first-time onboarding save,
`app/(app)/profile/import/actions.ts`'s post-onboarding re-import) pass the student's own
*reviewed* `skills`/`languages` arrays into these functions — confirmed by reading both
action files directly, not assumed from the shared-helper doc comment alone.

## Non-Negotiable #10 — checked first, per the assignment

Skills and languages were never at risk of "saving invisibly" in the sense the assignment
worried about, because they were already fully rendered as editable items in the review
step, in both places a CV can be imported — checked directly, not carried forward from
[[project_oryn_cv_review_parity]]'s earlier claim:

- `features/onboarding/steps/import-step.tsx` (lines 319–410ish): a `Card` per skill/
  language with a `Checkbox` (include/exclude), an editable `Input` for the name, a
  category/proficiency `Select`, and a remove `Button` — the same shape as every other
  reviewed achievement category on the same screen.
- `features/profile/cv-import-flow.tsx`: the identical section titles
  (`skillsSectionTitle`/`languagesSectionTitle`, shared translation keys), confirmed present.

So the review step was always honest about what would be saved; only the final write
silently dropped what the student had already reviewed and kept checked.

## Live history — neither real extraction produced a saved skill or language

`ai_usage` has exactly 2 `cv_extraction` rows, ever:

| user | extraction time |
|---|---|
| `ccf2161e-4992-49ce-88b4-a76293f1dc1d` | 2026-08-24 06:40:58 |
| `026e9295-1a83-4192-b57a-326aa2807b45` | 2026-08-29 08:09:45 |

Cross-referenced against every skill/language row either account has today:

- `ccf2161e...`: 2 skills (Python, Java) created **06:49:06** and **06:49:22** the same
  day — 8+ minutes after the extraction, one at a time with real gaps, not a batch — and 3
  languages created **a full week later** (08-31). All read `source: 'manual'`. This is a
  genuinely separate manual-entry session, not a mislabeled CV-import artifact; the timing
  alone rules out a same-request batch insert.
- `026e9295...`: zero skills, zero languages, ever.

**Neither extraction ever resulted in a saved skill or language row.** Whether either
extraction's raw output actually *contained* skills/languages in the first place isn't
independently recoverable: `product_events.cv_imported`'s `metadata.itemCount` (24 and 22
respectively) is a combined total across every category, not broken out, and the raw
extraction JSON isn't persisted anywhere once the review step completes. Named as a real,
honest limit of what the stored data can answer, not guessed past.

## Live end-to-end upload — attempted, not completed, stated precisely

Tried to drive a real upload through `/profile/import` on `oryn.qa.b` (confirmed via
`auth.users`/`profiles` to be a clean account, `e9eba798...`, with zero prior CV imports —
distinct from both accounts above). Injected a real `.txt` test file (a short CV with
explicit Skills/Languages sections) into the page's file input via the standard
`DataTransfer` technique, dispatching `input`/`change`. Three attempts; each time the
`files` property read back empty moments later, before any component handler visibly ran —
no "Reading your CV…" state ever appeared, and no Server Action request reached the network
log. Consistent with a Fast Refresh/HMR remount on the shared dev server (this session
observed multiple other lanes actively pushing to `main` throughout the attempt window),
not with anything in the product's own code — but stated as an attempt that didn't
complete, not silently dropped. **No AI spend occurred from these attempts**, since no
request ever reached the server.

Given the source trace above (both insert functions' now-dead fallback, both review
surfaces' pre-existing completeness, the shared error-classifier's own prior correction)
plus the live schema and history checks, the mechanism is verified with strong,
multi-angle evidence — short of a fully driven browser upload, which this pass's tooling
couldn't complete tonight.

## What this deliberately did not do

- No code change — the fix was entirely the migration; the application code was already
  written correctly (and already correctly classified its own degrade condition, per an
  earlier fix tonight) months before this column existed.
- No retry of the live upload via a different mechanism (e.g., a disposable Node script
  calling the Server Action directly, bypassing the browser) — considered, not attempted,
  since the source-level evidence was already strong enough and the founder's own "no
  deadline, take the time to do this properly" framing didn't require forcing a workaround
  under time pressure.
- No broader audit of what else migrations 0075–0088 unblocked — oryn-a7's own message
  named `carried_forward`/`university_notification_log`/`last_changed_at`/`match_confidence`/
  `advisor_messages.degraded` as also newly live; each is presumably its own verification
  task for whoever's assigned it, not folded in here.

## Verification

```
typecheck   clean
lint        clean
```

No test or build impact — no source file was touched, only `docs/known-issues.md` and this
handoff doc.
