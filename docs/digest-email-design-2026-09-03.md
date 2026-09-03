# Periodic email digest — design decisions, built, deliberately not armed

**Founder's own instruction, verbatim, 2026-09-03:** *"dönemden döneme kullanıcılara mail
gitmeli, standard alanlara ve ultra alanlara aynı da farklı da olur, bunlara karar ver uygula"*
— periodic email to students; whether Standard and Ultra get the same or different content is
mine to decide; decide and implement. CEO's own scoping on top: **build the digest, don't wire
the sending** — same posture as `lib/advisor/retention.ts` (migration 0112) and
`canAutoApplyPromotion()`. This document records the three decisions CEO asked to see stated
plainly, then points at the code.

## 1. Classification — the decision everything else depends on

**Is a digest saying "your deadline is in 6 days and two new opportunities match your profile"
transactional or commercial under İYS (Law 6563)?**

**This document's own reading, not a legal conclusion: transactional/informational, provided —
and only provided — the content stays what's described below.** Reasoning:

- 6563's own stated scope (confirmed directly,
  `docs/hukuki-ek-2-ticari-ileti-onayi-2026-09-03.md`) is promotional, discount, gift, campaign,
  or advertising content. A digest listing the student's **own already-saved deadlines** and
  **opportunities matched from the student's own stated profile** contains none of that — it's
  informational content about the student's own data, delivered through a different channel
  than the in-app notification center that already carries the identical two categories today
  (`lib/notifications/create.ts`'s `deadline` and `new_opportunity`).
- Opportunity matches specifically were the harder case to reason through, not the easy one:
  Oryn isn't selling anything in this content, and isn't promoting its own paid tier — it's
  surfacing third-party opportunities (competitions, programmes) the student would separately
  and independently decide whether to pursue. That's this product's stated core value
  delivered by email, not a pitch for something new.
- **CEO's own framing, agreed with directly: the line runs through the content, not the
  schedule.** A weekly cadence doesn't make something commercial; promotional language would,
  regardless of how often it's sent. This is why the digest, as designed, carries **zero
  mention of Ultra, upgrading, or anything Oryn itself sells** — that's not a stylistic choice,
  it's the specific thing keeping this reading defensible. The moment any future version adds
  "here's what Ultra would give you," this classification stops applying and İYS's registered-
  consent requirement is squarely in play, the same conclusion
  `docs/hukuki-ek-2-ticari-ileti-onayi-2026-09-03.md` already reached for the waitlist case.

**Not settled by this document, deliberately:** whether counsel agrees. Lower stakes to build
under this reading now than the waitlist question was, precisely because nothing sends —
if counsel reads it differently once real delivery is considered, nothing has gone out under
the wrong basis in the meantime.

## 2. Content per tier — same digest, per CEO's own default, agreed with

**Same digest shape and content logic for both Standard and Ultra.** Not built as two pipelines.
An Ultra student's own deadlines and matches are naturally different data from a Standard
student's — that's the product working correctly, not a designed difference in the digest
itself. No case made for Ultra-exclusive digest content, for the same reason the classification
above holds: anything genuinely Ultra-specific to say ("longer replies," "Thorough mode") is
either a restatement of what `/settings/plan` already shows, or would require exactly the kind
of promotional framing this design deliberately excludes to stay transactional. Agreeing with
CEO's default rather than arguing a counter-case.

## 3. Frequency — weekly

**"Dönemden döneme" (periodically) → weekly.** Matches the weekly-plan generator's own
established rhythm (`lib/plan/`), a cadence this product already runs on and a student would
already recognize. Daily would be wrong for this content specifically — saved deadlines and
new matches don't meaningfully change day to day, and the in-app notification system already
handles same-day, urgency-driven alerts (`lib/deadlines/scan.ts`'s threshold buckets) — a
weekly digest is a periodic summary, not a duplicate alert channel. Not encoded as a hard
constant anywhere in the code below; the actual cadence is a scheduling decision
(`lib/jobs/schedule.ts`) that doesn't exist yet, same as the retention job's own unscheduled
state — this is the reasoning for when that decision gets made, not a value baked in early.

## What's built

- `profiles.digest_email_enabled` / `profiles.last_digest_sent_at` (migration 0113) — the
  opt-out preference and the "since when" marker, both real, both inert until armed.
- `lib/digest/build.ts` — `buildDigestContent(userId)`: assembles upcoming deadlines
  (reusing `getUpcomingDeadlines`, the same source the dashboard and advisor context already
  use) and opportunity matches newer than `last_digest_sent_at` into a structured,
  locale-aware content object. Returns `null` when there's nothing worth sending — an empty
  digest is worse than no digest.
- `lib/digest/run.ts` — `runDigestPass(options)`: batches across opted-in students with real
  content, `dryRun` default `true` (same contract as `run-job.ts` and `retention.ts` — real
  reads, zero persistence, unless explicitly overridden). **Contains no email-sending call of
  any kind, dry run or not** — there is nothing to wire, since no email-sending infrastructure
  exists anywhere in this codebase (confirmed,
  `docs/email-audit-transactional-vs-commercial-2026-09-03.md`). A non-dry run only updates
  `last_digest_sent_at` and returns a composed-content report; it does not, and structurally
  cannot yet, deliver anything to a student.
- No cron/schedule entry. `lib/jobs/schedule.ts` is untouched by this work, matching the
  retention job's own precedent exactly — arming the schedule is a founder decision gated on
  (1) counsel confirming the classification above, and (2) an actual email-sending provider
  being chosen and integrated (see `docs/ultra-sales-readiness-scope-2026-09-03.md`'s own
  finding that this product currently has zero outbound-email infrastructure to build on).

## What isn't built, and why that's the right line

An actual email template/HTML rendering layer, an unsubscribe *link* (as opposed to the
preference field itself, which exists), and any real delivery mechanism. All three are
downstream of choosing an email provider — a decision this document doesn't make, the same way
`docs/ultra-sales-readiness-scope-2026-09-03.md` didn't choose a payment provider. Building a
template for a channel that doesn't exist yet would be speculative work against an
unconfirmed shape.
