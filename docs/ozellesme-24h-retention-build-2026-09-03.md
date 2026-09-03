# The 24-hour retention rule: built, tested, and deliberately not armed

**Date:** 2026-09-03. **Author lane:** this session. Dispatch: build özelleşme piece 3
(docs/ozellesme-spec-2026-09-03.md §3) the way the re-verification job was built — off by
default, dry-run first, reporting what it would delete before it ever deletes — and name the
legal gates rather than work around them.

## What this is

A conversation with no activity for 24 hours (clocked on `advisor_conversations.updated_at`,
never on any individual message's age — see the spec's own reasoning: a student who writes
Saturday and returns Sunday evening must not find their own thread's beginning missing) gets
an AI-generated summary written, then its raw `advisor_messages` rows deleted. The summary
persists; the raw text does not. Ultra is exempt — no deletion, ever, for that tier.

## What was built

- **Migration `0110_advisor_conversation_retention.sql`** (renumbered from an initial 0109 —
  the lane building piece 1, instructions/talimat, claimed 0109 first for
  `profiles.advisor_instructions`; confirmed directly with them before finalizing, not
  assumed, and they confirmed they never touch `advisor_conversations`). Purely additive:
  `summary`/`summarized_at` on `advisor_conversations`, plus a new append-only
  `advisor_conversation_retention_runs` audit table (one row per real action — never message
  content — mirroring `opportunity_verification_runs`'s own audit-trail shape). No backfill,
  no default beyond null.
- **`lib/advisor/retention.ts`** — the job logic. `runRetentionPass({dryRun, maxRows,
  candidateIds})`, matching `run-job.ts`'s own contract: on a dry run, real reads and a real,
  budgeted AI summarization call happen (needed for a real report, not a simulated one), but
  every write is suppressed.
- **`app/api/jobs/advisor-conversation-retention/route.ts`** — matches the established
  `verifyCronRequest` → `isJobDisabled` → dry-run bypass or `runWithTracking` shape exactly.
  **Not added to `vercel.json` or `lib/jobs/schedule.ts`** — see "Why this stays off," below.
- **`lib/ai/limits/job-budget.ts`** — new `advisor_conversation_retention` feature,
  `claude-haiku-4-5` used deliberately (the spec's own ask: "if summarising should be cheaper
  than the advisor itself, pick accordingly and say so"). $3/month default, derived from a
  real per-call estimate (~$0.0023/call — under a sixth of a single opportunity_reverification
  adjudication) against real, measured (not projected) current volume: **5 total
  `advisor_conversations` rows, 3 distinct students, queried live 2026-09-03** — too small to
  extrapolate an honest monthly rate from, stated as such rather than invented.
- **`__tests__/advisor/retention.test.ts`** — 11 tests, entirely synthetic fixture data (no
  real conversation content anywhere in this suite). Covers: the dry-run write-suppression
  guarantee (mirroring `run-job-dry-run.test.ts`'s own flagship test, plus proof the identical
  mocked pipeline DOES write when `dryRun: false`); the two independent gates
  (`dryRun`/`ADVISOR_RETENTION_ALLOW_DELETE`) tested separately, proving a summary can be
  written for real while deletion stays closed; Ultra exemption, including an unreadable
  profile failing toward Ultra (exempt) rather than Standard (would delete); an
  already-summarized conversation skipping a second AI call; and — the spec's one
  non-negotiable — a dedicated test proving the due-set query filters on `updated_at`, not
  message age, using a conversation with day-old messages but a fresh `updated_at` to prove
  it is correctly NOT due.

## Why this stays off — three independent layers, not one

1. **`dryRun` defaults to `true`** inside `runRetentionPass` itself — a caller must opt in
   explicitly to write anything.
2. **`ADVISOR_RETENTION_ALLOW_DELETE` is unset by default** — even a real, non-dry-run
   invocation writes a summary but does not delete a single message unless this is explicitly
   set, independent of `dryRun`. This split is deliberate: summarizing and deleting are
   different-risk actions, and a future decision to validate summary quality without yet
   committing to irreversible deletion is expressible without a second migration.
3. **The route is not on any schedule** — no cron entry, no `vercel.json` line, no
   `lib/jobs/schedule.ts` registration. It can only run if someone with the `CRON_SECRET`
   triggers it by hand.

## The two legal gates, named as blocking preconditions — not worked around

**Gate 1 — the privacy notice.** The spec is explicit: *"uygulanmadan önce gizlilik metnine
yazılmalı"* — this cannot be implemented before the privacy text says so.
`LEGAL_REVIEW.md` §3 item 5 lists retention as an open policy question with **no answer
today**: *"What period should apply per data category, and to abandoned accounts? Today: no
automated retention limit."* This feature is a candidate answer to that question, not a
pre-approved one — and per the integrator's own relay, the founder's father has counsel
engaged on exactly this today. Nothing in this build updates `lib/legal/content.ts` or any
user-facing privacy text; that is a founder/counsel decision this build does not make for
itself.

**Gate 2 — data export.** The spec names this explicitly: after deletion, an export contains
the summary, not the raw chat — *"Bu, kullanıcıya söylenmeden yapılamaz"* (this cannot be
done without telling the user). `app/api/export-data/route.ts` was **not touched** by this
build. Today it exports whatever is in `advisor_messages`/`advisor_conversations` as-is; once
this feature is ever armed, an export for a summarized conversation will silently contain
less than it used to unless that route (and whatever explains the change to the student) is
updated first. Confirmed by reading the route, not assumed.

Both gates block **arming**, not building — the code existing, typed, and covered by tests
that never touch real data is what "off by default, dry-run first" asked for. Whether to
clear either gate is not a decision this build makes.

## What was deliberately not done in this pass

**This job was never invoked against the real database, not even in dry-run mode.**
Every other background job built or dry-run this session (opportunity re-verification,
university requirements) touches public catalogue metadata or public web pages. This one
would read **real private conversation content from real students, most of whom are
minors**, and send it to a real AI call — true even under `dryRun: true`, which suppresses
writes but not the read or the AI call itself (deliberately, matching `run-job.ts`'s own
"needs real numbers, not simulated ones" contract). That is a categorically more sensitive
action than anything else built tonight, and treating "the code is ready and tested" as
sufficient authorization to point it at real students' real conversations — even
read-only, even just 3 people's worth — is not a call this pass makes for itself. Validated
instead with 11 tests against entirely synthetic fixtures. A first real invocation, dry-run
or otherwise, should be its own explicit decision, separate from "is the code correct."

## Gates

`npm run typecheck` / `npm run lint` — both green. Full suite: 370 files / 5,708 tests / 2
expected-fail (pre-existing, unrelated). No writes to the live database anywhere in this
pass — the migration is written, not applied, matching this project's own standing
discipline for every schema change tonight.
