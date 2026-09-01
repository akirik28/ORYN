# Notification categories audit — 4 with no writer, one built this pass

**Status:** audit + one shipped fix. `new_opportunity` is real, tested code (gates green).
Nothing else applied — `system`'s removal is proposed, not migrated; `profile_update` and
`university_data_changed` are findings, not built. **Author lane:** oryn-60, at oryn-a7's
request. **Base:** local `main`.

---

## 0. The measurement

`NotificationCategory` (`types/database.ts`) declares 8 values. Grepped every
`createNotification(` call site (5 total, excluding the function's own definition) and cross-
referenced against the type:

| Category | Has a writer today | Spec status |
|---|---|---|
| `weekly_plan` | Yes — `lib/plan/persist.ts` | Phase 24 |
| `deadline` | Yes — `lib/deadlines/scan.ts` | Phase 24 |
| `connection` | Yes — `app/(app)/connections/actions.ts` (×2) | not in Phase 24's original list |
| `message` | Yes — `app/(app)/messages/actions.ts` | not in Phase 24's original list |
| `new_opportunity` | **No — built this pass** | Phase 24 |
| `profile_update` | No | Phase 24 |
| `university_data_changed` | No | Phase 24 |
| `system` | No | **not in Phase 24's list at all** |

Phase 24's own spec text names exactly five categories: *deadline, new opportunity, weekly
plan, profile update, university data changed*. `connection` and `message` are legitimate
later additions (migration `0023_social_v1.sql`, Phase 54-era social features) with real
writers — not audited further here, they're clearly wanted and working. `system` is the one
value that is neither in the original spec **nor** has ever had a writer — added in the same
migration that created the table (`0012_notifications.sql`) with no comment explaining intent,
and zero references anywhere in application code, confirmed by grep.

## 1. `system` — recommend removal

**Vestigial.** Not named in Phase 24. No migration comment. No call site, ever. The most
likely explanation is a defensive "might need a catch-all someday" addition that nothing ever
claimed. A type member that has never been reachable is a small, standing lie about what the
product does — matching the honesty standard this project has applied to schema elsewhere
tonight (Gate F's placement-cycle table, the fee-tier finding).

**Not removed this pass.** Dropping an enum value requires recreating the Postgres type (no
direct `DROP VALUE`) — real DDL against a populated table, the same authorization class as
every other schema change flagged tonight (items 26/40 in `founder-blocked-backlog.md`). Zero
rows reference it, so the migration itself would be low-risk whenever authorized, but writing
it wasn't asked for here and isn't done. **Recommending deletion, not proposing a migration
file** — say so if a migration should be drafted next.

## 2. `profile_update` — genuinely wanted, buildable now, not built this pass

Unlike the other two, **a real "did this change meaningfully" detector already exists** and
just needs a notification wired to it: `lib/scoring/persist.ts:109` —

```ts
const changedMeaningfully = previousScore === null || Math.abs(previousScore - careerProfile.overallScore) >= 1;
```

— already gates whether a `profile_score_snapshots` row gets written. `userId` is already in
scope at that exact line. Wiring `createNotification({userId, category: "profile_update", ...})`
there would need one real judgment call this audit doesn't make: `previousScore === null` (the
student's very first score calculation ever) should almost certainly be excluded — a
brand-new profile has nothing to compare against, and notifying "your profile updated" on
account creation is noise, not signal. The `>= 1` threshold already in place is the same
`changedMeaningfully` gate real deltas use, so no new dedup logic would be needed beyond that
existing condition.

**Not built this pass** — the brief named `new_opportunity` specifically as the one to build.
Flagging this as the lowest-effort of the two remaining categories, ready to pick up directly.

## 3. `university_data_changed` — genuinely wanted, blocked on missing infrastructure

**This one is not buildable today**, and the evidence is this project's own work from earlier
tonight: `docs/handoffs/tr-university-depth-gate-f-2026-09-01.md` established that no
re-verification or freshness-detection pipeline exists for university data at all — Phase 30's
Job E (stale data detection) is unbuilt, and `docs/opportunity-reverification-job-design-2026-08-23.md`
designs the closest thing that exists, scoped to opportunities, not universities. There is
currently no code path anywhere that detects "university X's stored facts changed since a
student last looked" — university data changes today only through net-new research passes
adding facts, never through a diffing mechanism that could notice a delta on an existing row.

**Distinct conclusion from `system`:** this is not vestigial — it's a real, spec-named need
with no supporting infrastructure yet, the same shape as Job E's own gap. Building it would
mean building Job E (or an equivalent per-university diffing mechanism) first, which is real,
separate, larger scope — not something to bolt onto a notification writer.

## 4. `new_opportunity` — built, tested, gates green

**The mechanism named in the brief already existed**: `refreshOpportunityMatches`
(`lib/opportunities/persist-matches.ts`) recomputes every active opportunity's eligibility on
every dashboard/opportunities-page render, and `filterActionableOpportunities` (from
`lifecycle.ts`) already excludes closed-cycle/expired opportunities before a match is ever
computed — so anything reaching the new notification logic is already both eligible and
actionable.

**The real risk, exactly as flagged**: this function runs on *every render*, so notifying on
"still eligible" rather than "newly eligible" would reproduce the 100-duplicate `weekly_plan`
notification storm at a larger scale. Fixed with a diff, not a dedup check alone:

- **Read `opportunity_matches` before this render's own upsert overwrites it** — added to the
  existing `Promise.all`, RLS-scoped like every other read in this function (migration 0065
  explicitly grants `select own opportunity_matches`; `lib/opportunities/browse.ts` already
  reads this table the same way — confirmed live before writing the new read, not assumed).
- **"Newly eligible" = eligible now AND not eligible (or entirely absent) in that prior read.**
  A student's very first-ever match computation has no baseline to diff against — treated as
  "skip notifying," not "everything is new," so a new account doesn't get a burst of
  notifications the moment matches are first computed.
- **Capped at 3 per refresh**, highest `match_score` first — the same "don't overwhelm" ceiling
  AGENTS.md Phase 7 already applies to the dashboard's "3 highest-impact actions," reused here
  so a profile edit that newly qualifies a dozen opportunities at once can't fire a dozen
  notifications in one render.
- **A DB dedup check** (`.limit(1).maybeSingle()`, matching every dedup check added tonight for
  the same multi-row-race reason) as the final backstop — a (user, opportunity) pair notifies
  at most once, ever, unlike deadline reminders which intentionally re-fire per threshold.
- **Translated at write time from `preferred_language`**, already available in this function's
  existing `profileRes` read — no new query needed, unlike `plan/persist.ts` and
  `deadlines/scan.ts`, which each needed a dedicated lookup. Same reasoning as both of those:
  no request context guaranteed at read-back time, so the stored preference is the only correct
  source.

**Also fixed, found while adding the new read**: `__tests__/security/computed-writes-use-admin-client.test.ts`
banned *any* mention of `supabase.from("opportunity_matches")`, not specifically a write —
correct at the time it was written (no legitimate read existed there yet), stale now that one
does. Corrected to check specifically for a write method (`.upsert(`/`.insert(`/`.update(`/
`.delete(`) rather than the table name at all, verified against the RLS policy and
`browse.ts`'s existing precedent before touching a security test.

Tests: `__tests__/opportunities/notify-newly-eligible-matches.test.ts`, pinning the shared
`notifyNewlyEligibleMatches` function directly (exported for exactly this reason, same shape
as `lib/deadlines/scan.ts`'s `notifyIfThresholdCrossed`) rather than mocking
`refreshOpportunityMatches`'s full seven-table read and real matching engine.

## What this does NOT do

- No migration removing `system` from the enum.
- No `profile_update` notification wired up — named as ready, not built.
- No Job E / university-data freshness-detection work — `university_data_changed` stays
  unbuildable until that exists.
- No live writes beyond what the test suite exercises against mocks — `new_opportunity` is
  real code, gate-passed, but no production notification has been sent by running it manually
  against the live database.
