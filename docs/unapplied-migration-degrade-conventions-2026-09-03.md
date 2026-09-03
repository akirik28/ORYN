# How this codebase handles an unapplied migration, by surface — 2026-09-03

CEO's question, verbatim: after three surfaces tonight (the feedback form's two-message
split, the admin panel's proactive-disable warnings, the export table's excluded-with-reason
list) each handled the same underlying state differently, is that a real convention or three
independent good decisions that happen to agree?

**Answer: neither, cleanly.** It's two written-and-consistent conventions, one real rule that
has been followed correctly everywhere it applies but was never stated anywhere until this
doc, and one area (admin-facing reads) that turns out to be three individually-reasoned
shapes rather than one template — each defensible, none of them wrong, just not the same
shape as each other. No genuine, unreasoned inconsistency was found in ~65 sites checked.

Scope: every call site in `app/`, `features/`, `lib/` (production code only, tests excluded)
that detects an unapplied migration and does something about it — either via the four shared
functions in `lib/supabase/errors.ts` (`isUndefinedTableError`, `isUndefinedColumnError`,
`columnExistsLive`, `isUndefinedFunctionError`), a raw `?? default` explicitly motivated by
one, or `lib/export/tables.ts`'s static exclusion list. Roughly 65 sites read in full.

---

## 1. Admin-facing controls the admin could press: a real, template-consistent convention

~20 sites, near-identical wording every time: **"Not set up yet — migration N (table) needs
to be applied before [X] will work."**, paired with disabling the control itself. This is
unambiguously deliberate, not coincidence — the copy is close to verbatim across
`app/(app)/admin/actions.ts` and the eight `reportTableLiveness`-based checks in
`lib/admin/queries.ts`.

| Site | Message |
|---|---|
| `grantQuota` (migration 0096) | "Quota grants aren't set up in the database yet — migration 0096 needs to be applied first." |
| `isJobControlsTableLive` → Scheduled Jobs section (0095) | "Not set up yet — migration 0095 (job_controls) needs to be applied before disabling a job will work." |
| `isFeedbackReportsTableLive` → Moderation's Feedback section (0113) | "Not set up yet — migration 0113 (feedback_reports) needs to be applied before student feedback will appear here." |

If you're building a tenth of these: copy the closest existing site's wording exactly rather
than composing new phrasing. The template is real; treat it as one.

## 2. A field or one-time UI moment a student would see: simply doesn't render

The pattern `curriculum_other_text` (migration 0109) established explicitly in its own admin
section's comment: *"the student-facing [check] makes a feature simply not render at all... a
'not set up yet' message is meaningless to a student who can't act on it."* Confirmed
consistent everywhere it applies:

- Onboarding/profile editor: the "other curriculum" text field is spliced out of the rendered
  field array entirely when its column isn't live — not shown disabled, not shown at all.
- The one-time "Welcome to Ultra" banner (migration 0092) simply never fires while unapplied.

This is the deliberate *inverse* of §1 — same underlying check, opposite audience, opposite
UI response, and both are correct for their audience: an admin can act on "migration N isn't
applied," a student cannot.

## 3. A student-facing write: the rule nobody wrote down, followed correctly anyway

This is the actual finding worth having. Every student-facing *write* action that touches an
unapplied migration's column does one of two things — either it returns a specific,
distinguishable, "retrying won't help" error, or it silently retries the same write without
the missing field and lets the core action succeed. Both groups are internally consistent;
neither is randomly chosen. Read closely, the dividing line isn't "is the field important" —
it's narrower and sharper than that:

**Does silent failure leave the student believing something happened that didn't, with no
way to find out otherwise?**

- **Yes → explicit error, stated as retry-won't-help.** `submitFeedback` (0113): a silently
  dropped complaint is a complaint the founder never sees and the student never learns wasn't
  received. `updateNotificationPreferences`/`updateResponseMode`/`updateAdvisorInstructions`
  (0090/0091/0111): a silently-failed save leaves a toggle looking changed in the UI while the
  database still holds the old value — the exact "false thank-you" shape this fleet named as
  the failure mode to avoid tonight, already avoided in three other places before tonight's
  feedback form made it explicit for a fourth.
- **No → silent retry without the field, core write still succeeds, logged not shown.**
  `sendAdvisorMessage`'s `degraded` flag (0088): the reply itself saves and renders normally;
  only the "this used a cheaper model" disclosure is lost, and the file's own comment says so
  directly — *"The reply itself must still save; the disclosure just won't survive a reload
  until it lands."* CV-import's `source` tag on skills/languages (0084), `match_confidence` on
  opportunity matches (0086): the skill, language, or match itself is saved correctly; only a
  secondary quality/provenance tag is missing. The upgrade-prompt dismissal columns (0093) go
  further still — failing completely silently, not even logged — defensible because the worst
  case of a lost dismissal is the same prompt reappearing once more, which is annoying but
  self-correcting and creates no false belief about anything permanent.

Nobody stated this rule before writing any of the seven sites above; each one independently
reasoned its own case correctly (four of them say so in their own comments) and happened to
agree. That's the "worth knowing before a fourth" CEO asked about — not that it's been done
wrong, but that the next person doing it right will be re-deriving a rule that already exists
in seven scattered comments instead of reading it in one place.

*(Student-facing **reads** feeding rendering — not writes — are a different, already
well-documented mechanical question: `lib/supabase/errors.ts`'s own header covers `?? default`
vs. named-select-needs-`isUndefinedColumnError` in detail, with `resolvePlanTier` as its own
named clean example. Not re-litigated here.)*

## 4. Admin-facing reads: three reasoned shapes, not one template — and that's fine

Unlike §1's write-controls, admin-facing *reads* split three ways, each with its own stated
logic, none of them wrong:

- **Stat/count cards** (page-view traffic, community post/message counts): render `"—"` with
  a plain informational hint ("Not measured — no pageview tracking exists yet. This is not a
  zero.") — nothing to *do* from a read-only card, so no "migration N" instruction, just
  honesty about what isn't known.
- **Activity/audit-style lists** (`getAdminActivityTimeline`, migrations 0097/0098): fully
  silent — an empty list, no banner at all. This looked like a real gap on first read and
  turned out not to be one: the function's own comment states the reasoning directly —
  *"an empty timeline is the honest state either way, 'not set up' and 'set up but nothing
  happened yet' degrade to the same list"* — a message here would add noise, not signal,
  since there's nothing to distinguish.
- **A read feeding a paired write control** (`getAdminUserList`'s `ultra_gift_expires_at`,
  migration 0106): the read silently blanks just that one column for every row rather than
  losing the whole list (confirmed live-caught and fixed 2026-09-03 — it used to fail the
  entire query) — and the same admin screen's Ultra-gift control separately shows §1's
  templated warning and disables itself. The silent blank and the visible warning are the
  same mechanism applied to two different roles on one page, not two things disagreeing.

## 5. The export table list: a different axis, not a fourth response type

`lib/export/tables.ts`'s `EXPORT_EXCLUDED_TABLES` isn't a runtime UX response at all — it's a
compile-time decision about whether a table participates in the student's account data export,
enforced by `__tests__/export/tables.test.ts` rather than checked live. Three of its five
entries are reasoned around an unapplied migration specifically (`deadline_notification_log`,
`university_notification_log`, `feedback_reports`), each with the identical one-line reason:
*"migration N is not applied anywhere yet — would export as permanently empty until it is."*
Consistent with itself, and orthogonal to §§1-4 rather than a competing convention.

---

## If you're adding the next one

1. **Is this a control an admin could press?** Use §1's exact template — copy the closest
   existing site's wording, don't compose new phrasing.
2. **Is this a field/moment a student would see with no action attached?** It should simply
   not render, per §2 — no message, nothing shown as missing.
3. **Is this a write a student triggers?** Ask §3's question directly: if this silently
   failed, would the student end up believing something happened that didn't, with no way to
   notice? Yes → a specific, retry-won't-help error. No → log it, retry without the field, let
   the core write succeed silently.
4. **Should this table be in the student's account data export?** `lib/export/tables.ts` —
   `EXPORT_TABLES`/`EXPORT_PARTICIPANT_TABLES` if yes, `EXPORT_EXCLUDED_TABLES` with a reason
   if not yet (mirroring the "would export as permanently empty" phrasing if the reason is
   simply that the migration isn't applied).
5. Whichever of 1-4 applies, detect the state with `lib/supabase/errors.ts`'s four functions —
   read that file's own header first. It documents two real traps that have each cost a
   silent, live production-shaped failure before being caught: `PGRST204` vs `42703` for a
   write (a `42703`-only check is inert on the exact path it exists to protect), and
   named-select-vs-wildcard-select for a read (only a named `.select()` list errors on a
   missing column the way a write does — `select("*")` silently omits it, no error to catch).
