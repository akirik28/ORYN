# Evidence upload flow — audit

**The question:** one evidence file exists across eight students with completed
onboarding. Is that low interest, or a broken path? The two look identical from the
outside — this document is the difference.

**Method:** full read of every file in the path (listed below), cross-checked against
the live `oryn-qa-scratch` project via read-only SQL (`pg_policies`, `information_schema`,
`storage.objects`, the actual data). No writes were made until the "What was fixed"
section — everything above it is investigation only, same discipline as
`DATA_RIGHTS_AUDIT.md`. Live browser verification of the upload UI was not attempted:
this session's Supabase project rate-limits new signups (hit and confirmed via network
response on a previous task tonight), and no credentialed test account was available —
a known constraint, not something skipped by oversight. It wasn't needed here: the
live-data findings below are conclusive on their own.

## The answer: low interest, not a broken path — with one real, narrow exception

The single existing evidence row is not organic. Its storage filename is
`ORYN_QA_Test_Evidence_Economics_Club.pdf` — a deliberate test upload, not a student's.
That upload exercised the entire path — file picker → server validation → storage write
→ `evidence_files` insert → the linked activity's own status update → the signed-URL
read on the Documents page — and every step of it is correct:

- The file is present in the `evidence` bucket at the path the row claims.
- `evidence_files.verification_status` is `evidence_added`, never `verified` — matches
  Phase 21 exactly.
- The linked `activities` row's own `evidence_status` was correctly updated to
  `evidence_added` in the same request.
- Storage RLS (`evidence owner insert/read/delete`, all scoped to
  `(storage.foldername(name))[1] = auth.uid()`) and table RLS on `evidence_files`
  (select/update/delete scoped to `user_id = auth.uid()`, no insert policy for the
  regular client) are both exactly what the code assumes.

So the one time this feature was actually exercised, it worked, completely, end to end.
That's evidence the path isn't broken for the common case — not proof by itself, so it
was checked against the rest of the picture:

**There's no shortage of material to attach evidence to.** Of the 8 accounts with
completed onboarding, 7 have real achievement data across the 9 evidence-linkable
tables — 25, 18, 16, 6, 5, 5, and 2 items respectively; only one has just 1. If the
constraint were "students haven't logged anything yet," that would show up here. It
doesn't. Students are populating real achievement data and consistently not attaching
files to any of it — the pattern of genuine low interest, not the pattern of a feature
nobody can reach.

**Everything the copy says is true.** `documents.banner` and
`documents.uploadDialog.statusNotice` both tell the student, in plain language, that
uploading sets "Evidence added," not "Verified," and that it stays self-reported until
independently verified. Read against the actual code path, this is accurate, not
aspirational — nothing here overclaims what happens on upload.

**The one real exception, found reading the schema, not guessed:**
`education_records` and `test_scores` are both listed in `EVIDENCE_LINKABLE_TABLES`
(`lib/validation/evidence.ts`) — a student can already select either one in the "this
supports" dropdown and successfully upload a file — but neither table was ever given
the `evidence_status` column the other seven achievement tables got in migration 0004.
Confirmed against the live schema (`information_schema.columns` — zero rows for either
table). `uploadEvidence()`'s status-mirroring write
(`app/(app)/documents/actions.ts`) has therefore always failed for these two,
**silently**: the write's result was never checked. The `evidence_files` row and the
storage upload both still succeed — a student attaching evidence to a transcript or a
test score today sees a normal success message, and their file is genuinely saved — but
the achievement item's own status never reflects it. Not the cause of the low-usage
number itself (no evidence row for either table exists yet — nobody has hit this path,
successfully or not), but a real, confirmed defect, fixed below.

## What was fixed

1. **`supabase/migrations/0079_education_test_score_evidence_status.sql`** — adds
   `evidence_status evidence_status not null default 'self_reported'` to both tables,
   identical shape to the other seven. **Written, not applied** — same discipline as
   every migration tonight; a human applies it.
2. **`app/(app)/documents/actions.ts`** — the status-mirroring update after a successful
   evidence upload now checks its own result and logs (`console.error`) on failure
   instead of discarding it. Deliberately still best-effort (doesn't fail the whole
   upload) — the `evidence_files` row is the record that matters and is already saved
   by that point — but a future version of this exact gap, on any table, will now be
   visible in logs instead of invisible everywhere.
3. **Tests**: `__tests__/documents/evidence-linkable-schema.test.ts` — pins migration
   0079's shape, and a derived check (doesn't hardcode table names) that every table in
   `EVIDENCE_LINKABLE_TABLES` has an `evidence_status` column somewhere in migration
   history, so this class of gap fails a test the next time a table is added to that
   list without one. `__tests__/social/posts-schema.test.ts`'s migration-numbering
   tripwire updated to 79, with 0079's own entry in its running history, per that test's
   own instructions — every remote branch and every local worktree checked first (none
   had claimed 0079).

## What was found but not fixed — a decision, not a bug

**No UI anywhere displays `evidence_status` on the achievement item itself.** Grepped
every `.tsx` file for `evidence_status`/`evidenceStatus`: the only surface that shows
anything is the standalone Documents page (a flat list — filename, which item it
supports, a view/delete action). The achievement's own card
(`features/profile/achievement-section.tsx` and everywhere else an activity/award/etc.
renders) shows nothing — no badge, no icon — to indicate whether evidence exists for it.
A student who uploads evidence for "Economics Club President" sees no visible change on
the activity itself; only a separate page, one hop away, shows the file exists.

This is not a regression — nothing here broke, this was very likely simply never built.
Whether it belongs on the roadmap is a product call, not made here: it's a real
UI/discoverability gap worth having, but building new display surface on achievement
cards is a materially different scope than fixing what's already broken, and the right
design (a badge? which of possibly several card variants — dashboard summary vs. full
profile vs. onboarding review?) deserves its own decision rather than being improvised
into this pass.

**It's also a plausible second contributor to low usage, independent of interest.** If
evidence never becomes visible where a student is actually looking (their own
achievement list), the entire feature is easy to forget exists after the first visit to
Documents — a design-discoverability effect, separate from the "isn't wanted" reading
and worth the founder having both hypotheses rather than only one.

## Full path traced (for the next person who needs to touch this)

`features/documents/upload-evidence-dialog.tsx` (client, gated on having any linkable
item at all — `lib/profile/list-linkable-items.ts`) → `uploadEvidence()` in
`app/(app)/documents/actions.ts` (MIME/size validation, ownership check via the
RLS-scoped client, storage write via the RLS-scoped client, `evidence_files` insert via
the admin client — deliberately, per migration 0065's comment: the table's RLS has no
insert policy at all, specifically so a direct client insert can never forge
`verification_status: 'verified'`, and the admin-client insert here hardcodes
`evidence_added`, never client-controlled) → `app/(app)/documents/page.tsx` (list +
10-minute signed URLs, RLS-scoped client) → `features/documents/evidence-row.tsx`
(display + delete, no status shown — see above).
