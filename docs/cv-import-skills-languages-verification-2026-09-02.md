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

## Update, same night — proven live end to end on an isolated dev server

oryn-a7 asked for exactly the gap this doc left open: a real, driven CV upload. Repeated
the browser attempt on a dedicated `next dev` on a scratch port (3100), in this branch's own
worktree, with no other lane able to touch it — removing the Fast Refresh/shared-server
variable named as the likely cause above.

**The file input's `files` genuinely persisted this time** (checked directly,
`input.files.length === 1` well after the injection) — ruling out a remount. **But the
component's `onChange` still never fired.** Confirmed via source, not inference:
`handleFile` sets `status: "uploading"` first thing, and that state was never observed
(`document.querySelector('main').innerText` stayed at the idle-state copy throughout, no
Server Action request ever reached the network log). Concluded this is a genuine
browser-automation limitation — a scripted `.files` assignment plus a synthetic `Event`
dispatch, however constructed, does not reliably produce the browser-trusted event React's
delegated listener expects for a native `<input type="file">`. This is well short of a
"CV upload is broken" finding: it explains why *this session's own scripted attempts*
couldn't drive it, and says nothing about a real click.

**Rather than keep fighting the browser, verified the save path directly**, bypassing the
client entirely. A small script (`scripts/_verify-cv-skills-languages-2026-09-02.ts`,
deleted immediately after this run, never committed) imported `./load-dotenv` first (the
established pattern from `scripts/run-ai-eval.ts`), then the real, unmodified
`extractCVData` (`lib/ai/cv-extraction.ts`) and `insertCvImportSkills`/
`insertCvImportLanguages` (`lib/profile/cv-import.ts`), and ran them in sequence against
real Anthropic and a real Supabase admin client, on `oryn.qa.b`
(`e9eba798-195d-4859-960c-4b8968df7819` — confirmed clean, zero prior skills/languages).
One environment note: standalone `tsx` execution can't resolve `lib/ai/cv-extraction.ts`'s
own `import "server-only"` (Next.js's bundler special-cases that package; plain Node does
not, and it isn't a real npm dependency in this repo) — worked around with a minimal local
stub package pointed to via `NODE_PATH`, isolated to this one run, never touching the real
`node_modules`.

**Result — real, live, verified against the database:**

```
Extraction — skills:    Python (programming), Public Speaking, Adobe Photoshop
Extraction — languages: Spanish (Conversational), Mandarin Chinese (Beginner)
Insert — skills:        { inserted: 3, skippedDuplicate: 0, skippedCap: 0 }
Insert — languages:     { inserted: 2, skippedDuplicate: 0 }
Live skills rows:        all 3 read source: "cv_import"
Live languages rows:     both read source: "cv_import"
```

Every row landed with the correct, distinguishing provenance value — **the first time this
has ever happened in the product's history**, confirmed directly, not inferred from the
migration or the source trace alone. `ai_usage` logged the real call correctly (3629 input /
467 output tokens, `claude-sonnet-5`, `feature: cv_extraction`), closing the loop on
[[project_oryn_structured_output_failure_audit]]'s own billing-correctness work from
earlier tonight. Test rows deleted immediately after (`DELETE ... WHERE user_id = ...` on
both tables); re-queried and confirmed 0 rows remain for that account — no trace left on
shared QA infrastructure.

**One thing worth naming precisely, not smoothed over**: `languages.proficiency` came back
`null` on both rows in this test, because the script's own quick mapping used the wrong
field name (`l.proficiency`, which doesn't exist on the raw extraction — the real field is
`statedLevel`). Checked whether this was a script bug or the real behavior before reporting
either way: `lib/profile/cv-import.ts`'s own `flattenCvLanguages` (the function the real UI
actually calls) hard-codes `proficiency: null` unconditionally too, keeping `statedLevel`
as a separate field — proficiency is deliberately left for the student to choose from a
fixed dropdown in the review step, not guessed from the model's free-text level. The
script's shortcut produced the same result as the real path, for the same underlying
reason, not by coincidence worth doubting.

**What remains genuinely unverified by this session**: the literal browser click →
file-picker → `onChange` chain, driven live. Not a gap left open by choice — a tooling
limit reached and reported honestly, distinct from the save-path question this update
closes. The two real historical `cv_extraction` rows in `ai_usage` (both predating the
`source` column, cited above) are the closest available evidence that this specific step
already works for real students today.

**Correction to this doc's own earlier framing**, per oryn-a7: calling the missing-column
fallback "dead code" understated what it is now — it's live infrastructure for the fresh
deploy the founder is planning (where `0084` won't have run yet), not a vestige. See
`docs/known-issues.md`'s own correction alongside this update.

## What this deliberately did not do

- No permanent code change — the fix was entirely the migration; the application code was
  already written correctly (and already correctly classified its own degrade condition,
  per an earlier fix tonight) months before this column existed. The one-off verification
  script was deleted immediately after this run, never committed.
- No broader audit of what else migrations 0075–0088 unblocked — oryn-a7's own message
  named `carried_forward`/`university_notification_log`/`last_changed_at`/`match_confidence`/
  `advisor_messages.degraded` as also newly live; each is presumably its own verification
  task for whoever's assigned it, not folded in here.

## Verification

```
typecheck   clean
lint        clean
```

No test or build impact — no permanent source file was touched (the verification script was
deleted after the run), only `docs/known-issues.md` and this handoff doc.
