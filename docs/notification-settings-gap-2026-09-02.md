# "bildirim ayarı" — does a notification settings surface exist? No.

Answering the founder's question directly before anything else: **no per-category or global
notification off-switch exists anywhere in the product** — not in the UI, not in the schema, not
in the write path. Checked five independent places rather than one, since oryn-a7 flagged being
wrong twice tonight about something not being built.

## What was checked

1. **The Settings page itself**, `features/settings/settings-view.tsx`, read in full. Its actual
   sections: Account (email, display name, password, sign out), Your Record (scan CV), Preferences
   (language, location, birth year, citizenship, study capacity, visibility/looking-for), Danger
   Zone (export data, delete account). No notification section, no reference to `notifications`
   anywhere in the file.
2. **The schema.** `notifications` (migration 0012) has no preference/enabled column of its own,
   and there is no `notification_preferences` table anywhere in `supabase/migrations/` — grepped
   for `preference`, `toggle`, `channel`, `enable`, `disable` near "notification" across every
   migration and app/lib/features file; the only hits were `ENABLE ROW LEVEL SECURITY` boilerplate
   coinciding with the table name, not a real toggle. `profiles` (`types/database.ts`) has no
   notification-shaped column either — checked directly, not inferred from the table not existing.
3. **The write path — the actual enforcement point.** `lib/notifications/create.ts`'s
   `createNotification()` is the *only* function that inserts a row into `notifications`, and it
   unconditionally inserts whatever `{userId, category, title, body, link}` it's given — no
   preference lookup, no early return for a muted category. Every call site was enumerated (7,
   covering all 7 live categories): `messages/actions.ts`, `connections/actions.ts` (×2),
   `opportunities/persist-matches.ts`, `universities/data-change-scan.ts`, `plan/persist.ts`,
   `scoring/persist.ts`, `deadlines/scan.ts`. None of them checks anything before calling it
   either. There is exactly one choke point in this codebase and it has no gate.
4. **`app/(app)/notifications/actions.ts`**, read in full: `markNotificationRead`,
   `markAllNotificationsRead`, `markNotificationsRead` (the grouped-card version from this
   session's earlier aggregation work). That's the complete set of student-facing notification
   actions that exist today. All three change `read_at`. None changes whether a future
   notification gets created.
5. **Delivery channel.** Grepped for any email-sending code (`resend`, `sendgrid`, `nodemailer`,
   `smtp`) and any web-push infrastructure (service worker, `PushManager`, push subscriptions) —
   zero hits either way. Everything today is in-app only; Phase 24's "architecture should support
   future email notifications" hasn't been started. This matters for scope: there is currently
   only one channel to control, not several, which makes the gap simpler to close than it would
   be with email in the mix, not harder.

## What exists that's adjacent, and why it doesn't answer the question

`/notifications` (the full page, not the bell popover) has category filter chips
(`features/notifications/categories.ts`'s `FILTERABLE_CATEGORIES`, rendered in `page.tsx`) — real,
and worth being precise about rather than either missing it or conflating it with a preference.
It's a **view filter**: a `?category=` URL param that changes which already-created rows the
current page request shows. It isn't persisted (no cookie, no DB write, no localStorage), resets
every visit, and has zero effect on whether a `weekly_plan` or `new_opportunity` notification
gets created for that student tomorrow. "I can filter what I see right now" and "I can stop this
from reaching me at all" are different features; only the first exists.

## The scale, checked live, read-only (`oryn-qa-scratch`)

```
category          total   unread
weekly_plan         111      106
new_opportunity        6        3
(everything else)      0        0
```

Two things worth naming precisely rather than smoothing over:

- **This is concentrated on one real account, not spread thin.** Broken down by user: one user
  (`ccf2161e-...` — matches this session's own earlier note of the founder's real account and its
  2026-08-30 duplicate-notification incident) holds 100 of the 111 `weekly_plan` rows, all still
  unread, plus 3 `new_opportunity`. That's not a hypothetical edge case — it's the founder's own
  account, right now, with no way to mute a category that's already produced 100 notifications
  they can't stop and can't turn off.
- **Only 2 of the 7 live categories have actually produced a row yet** in this database —
  `deadline`, `profile_update`, `university_data_changed`, `connection`, `message` are all
  write-active in code (real call sites, confirmed above) but have zero rows here. oryn-a7's "all
  five are now live" is accurate as a statement about the code paths existing; it's not yet
  evidence of volume for three of them. Worth knowing the difference before sizing the fix as
  "5 categories' worth of urgency" versus "1 category causing real pain today, 6 that will
  eventually need the same answer."
- **A toggle wouldn't retroactively clear the existing 100.** It stops future rows for a muted
  category; it doesn't touch rows already written. The existing backlog is a separate problem this
  session's earlier read-time grouping work already softens cosmetically (100 rows collapse into
  one grouped card), without reducing the underlying count. Naming this so a toggle isn't expected
  to fix both problems at once.

## The minimum honest version

**Per-category toggles, as flat boolean columns on `profiles`, enforced once at the shared choke
point.**

- **Shape**: one `notify_<category> boolean not null default true` column per live category
  (7 columns — `notify_deadline`, `notify_new_opportunity`, `notify_weekly_plan`,
  `notify_profile_update`, `notify_university_data_changed`, `notify_connection`,
  `notify_message`), not a separate `notification_preferences` table. `profiles` already carries
  exactly this kind of flat per-student setting (`busy_mode`, `is_public`, `weekly_time_budget`) —
  matching that convention is simpler than a join for a fixed, small set of 7 enum values, and this
  codebase's own precedent (checked, not assumed) favors it.
- **`default true` — opt-out, not opt-in.** Every category behaves exactly as it does today for
  every existing account the moment this migration lands; nobody's notifications silently stop.
  Changing the default later needs a real decision, not a migration side-effect.
- **Enforce in one place**: add the lookup inside `createNotification()` itself, not in each of
  the 7 call sites. It's already the single function every category goes through — one gate there
  covers all 7 today and whatever gets added next, the same way migration 0087's dedupe logic and
  the `isUniqueViolation` check already live centrally rather than being repeated per caller. A
  muted category returns `false` from `createNotification()`, the same value it already returns
  for a failed insert — every existing caller already handles that return value (some check it,
  like `deadlines/scan.ts`'s dedupe-log guard; most currently discard it, which stays correct: "no
  notification landed" is the right state whether it's muted or failed).
- **UI**: one new Settings section, 7 labeled switches, in `features/settings/`, matching the
  existing Preferences card's pattern (a titled subsection per setting, a small description line,
  a control) rather than inventing new page chrome. Not built — flagging the shape only, per the
  report-only instruction.
- **Not proposing grouping the 7 into fewer clusters** (e.g. "system updates" vs. "social") even
  though that would read as less cluttered — it invents a taxonomy this doc has no real basis to
  choose, where 7 switches matching the 7 enum values exactly needs no taxonomy at all and is what
  oryn-a7's own framing already proposed. Worth a look if 7 rows feels like too much once it's
  actually on screen, but not a reason to hold the simpler version.

## The minor-safe connection

Phase 12 doesn't name notification controls specifically, but it does require "provide privacy
controls" and frames the whole product around minimizing what's imposed on a student without their
say. Reading student control over what reaches them as within that spirit is my own extension of
the spec's language, not a line it states outright — naming that distinction rather than citing
Phase 12 as if it settles the question on its own.

## What this did not do

No migration file, no UI, no code change of any kind — this is a report, per the explicit
instruction. Didn't pick a default other than `true` (opt-out) without stating why. Didn't design
a grouped/clustered alternative to the 7-toggle shape, named as a possible future look rather than
built. Didn't touch the existing 100-row backlog on the founder's account — a toggle is a
going-forward fix, not a cleanup, and that distinction is stated above rather than implied.
