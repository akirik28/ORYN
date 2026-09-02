# Advisor conversation audit — 2026-09-02

A product read of the advisor as a thing a student uses *over time*, not a single-turn eval
score. Live data first (5 `advisor_conversations` rows, 26 `advisor_messages`, across 3
accounts — all pre-launch internal/QA accounts, per [[project_oryn_has_never_been_deployed]];
there are no real students yet), then the code that produced it.

**Bottom line: the conversation holds up.** History and context both genuinely work and are
verified against real multi-turn exchanges, not just read from source. Failure handling is
built correctly and a real retry mechanism exists. One real, live bug found and fixed — a dead
`updated_at` column that would silently strand a student's active conversation the next time
this exact codebase's history spread across more than one row. One structural fact reported,
not built: the product shows exactly one conversation, ever, with no list or switcher.

## What the live data actually shows

```
conversation                          user        messages  span       failed
ee065b81  "What should I focus..."    026e9295    2         14s        1
146c1a3a  "What should I focus..."    026e9295    2         15s        1
d3758e95  "What should I focus..."    026e9295    4         1 day+     1
b788f5be  "targeting Turkey's..."     46dd6f7e    10        19h        0
f5bc7909  "economics and CS..."       e9eba798    8         8h         0
```

The first three belong to one account, all with the identical opening question, created 83
and 16 seconds apart on 2026-08-23 — a developer or QA session hitting a failure, reloading,
and re-asking rather than retrying in place (the last message in the third conversation is
literally *"Post-merge smoke test: in one sentence, what's my single biggest gap right
now?"*). Read as a real incident, not organic student behavior, but the underlying mechanics
it exercises are exactly what this audit needs to check.

## Does history work?

**Yes, via two separate mechanisms, both verified against real conversation content, not just
read from source:**

- **Within a conversation**: [`sendAdvisorMessage`](../app/(app)/advisor/actions.ts) loads up
  to `MAX_HISTORY_TURNS = 40` prior turns (`status = 'complete'` only — a failed turn never
  pollutes the model's own context) and passes them to the model on every call. Confirmed live
  in `b788f5be`: turn 5 references "leadership currently sitting unconfirmed on your profile"
  and the MUN-verification plan from turn 2, three turns earlier — the model is actually using
  the history, not just receiving it.
- **The student's live profile**: [`buildStudentAdvisorContext`](../lib/ai/student-context.ts)
  is rebuilt from the database fresh on *every single message* (keyed on `userId`, called
  unconditionally at the top of `generateAdvisorReply`, no caching). This is the correct
  design — a stale per-conversation snapshot would go wrong the moment a student edits their
  profile mid-conversation — and it's confirmed live: turn 2 of `b788f5be` states the exact
  current dimension scores ("every dimension is 0 except career exploration (9/100)") and
  turn 4 correctly reports no SAT score on file, both pulled fresh from the same tables the
  rest of the product reads.

One AGENTS.md Phase 8.1 field, `advisorHistorySummary`, has no literal implementation —
that's the spec's own illustrative example JSON, not a required field list (same category as
Phase 7's dashboard mockup text), and what exists instead — full raw history within the one
conversation a student has, per the finding below — covers the same need without a lossy
AI-generated summary layer. Not flagging it as a gap.

## What happens when a turn fails?

**Better than "does it happen" — it already happened for real, and the mechanism built for it
(migration 0046) worked exactly as designed.** All three `ee065b81`/`146c1a3a`/`d3758e95`
first-attempts failed with `status: 'failed'`, `error_message: "Something went wrong. Please
try again."`, `content: null`. In every case, **the student's own question was preserved** —
migration 0046's whole point, and confirmed live, not just in the migration's own comment.

**A real, in-place retry exists today**: [`retryAdvisorMessage`](../app/(app)/advisor/actions.ts)
updates the same failed row (same id, same position) rather than creating a new one, rebuilds
history up to (not including) the failed turn, and re-attempts. `classifyAdvisorFailure`
(`lib/ai/advisor-failure.ts`) gives a genuinely specific message for the "ran out of room
before finishing" case in particular ("Try again, or ask a more focused question") rather than
a generic error — this is already built well; there was nothing unambiguous to improve here.

**The one real defect class visible in this data was already found and fixed, same day, by a
previous session — confirmed by timestamp, not assumed.** Two `f5bc7909` replies (10:52, 12:03
UTC) are stored `status: 'complete'` but cut off mid-sentence ("...It requires a",
"...no submitted output,") — a genuinely different, more dangerous failure mode than the three
above: the model's `max_tokens` budget ran out *while writing the visible answer*, so
`anthropic-provider.ts`'s `generateText` found a real (if truncated) text block and returned
it as an ordinary success, no error, no `failed` status, nothing to retry. Checked
`git log` on `lib/ai/advisor-chat.ts`: commit `08016743` at `2026-08-23T19:34:47+03:00`
("give the reply room to think, and stop losing failed-turn spend") raised the advisor's
`maxTokens` from a value that produced exactly this failure to `4096` — a since-refined,
benchmark-verified floor (see that file's own dated comment; a later pass tried `8192`,
reverted the same day for unrelated reasons, landed back on `4096` "not a new guess"). **Every
one of the 13 real assistant messages in this database splits cleanly on that commit
timestamp**: both truncated messages and all three hard failures happened before it (10:52,
12:03, 15:53-15:55 UTC on 2026-08-23), and all 8 messages since (18:45 UTC that day through
the smoke test the next) are clean. Reporting this as **resolved, confirmed by the full
dataset**, not as a live bug — the standing risk worth naming without touching: `generateText`'s
success path still never checks `message.stop_reason`, so a text block cut off by
`max_tokens` and a text block that finished cleanly are indistinguishable to the code today —
only the currently-correct constant `4096` stands between this and recurring silently if a
future model or a richer profile ever needs more thinking room than this one 2026-08-23
benchmark measured. `AIResponseIncompleteError` and its message classification are already
built and already handle this well for the "no text at all" case; extending the same check to
"text present but stop_reason indicates truncation" would be small — but I can't verify it live
in this environment (no approved eval spend this task, and `generateText` is shared with the
eval harness), so flagging it precisely rather than changing shared provider code I can't test.

## Bug found and fixed: `advisor_conversations.updated_at` never moves

[`app/(app)/advisor/page.tsx`](../app/(app)/advisor/page.tsx) loads "the" conversation to show
with `.order("updated_at", { ascending: false }).limit(1)` — this product surfaces exactly one
conversation, by design (see below). Checked the live data: **every one of the 5 real rows has
`created_at === updated_at`, to the microsecond**, including `b788f5be`, which has 10 messages
spanning 19 hours. Grepped the whole repo: no code path ever calls `.update()` on
`advisor_conversations` after its initial insert — the `set_updated_at` trigger
(migration 0011) is real and already proven to work end-to-end in this exact database (273 of
421 `opportunities` rows show genuine drift between the two timestamps, same trigger function),
it's just never invoked for this table. Today this is invisible: a session's `convId` state is
correctly retained client-side after a failure (verified in `advisor-chat.tsx`), so a normal
session always reuses the same conversation and "most recently created" and "most recently
active" always coincide by construction. But the live incident above proves the invariant can
break — three rows, one account, in under two minutes — and when it does, this ordering would
silently show whichever conversation was *created* last, not whichever the student was
actually last talking in, with no list UI (below) to recover the other one. Fixed: both
`sendAdvisorMessage` (when reusing an existing conversation) and `retryAdvisorMessage` now
bump `updated_at` via the existing trigger. Confirmed the trigger mechanism live against a
table that already exercises it, rather than trusting the migration file alone.

## Reported, not built: one conversation, ever

There is no conversation list or switcher anywhere in the product. `AdvisorPage` always loads
the single most-recent conversation; `AdvisorChat` has no "new conversation" affordance, and
`convId` state, once set, is never reset to null by any code path this session found. In
ordinary use this means a student has exactly one, ever-growing thread with Oryn — which reads
as a deliberate, on-brand simplicity (a singular *advisor*, not a multi-thread chatbot with
saved sessions to manage) rather than an oversight, and it's what makes the history mechanism
above so effective: there's never an ambiguity about *which* conversation carries the
context. Naming it explicitly because oryn-a7's question was direct ("multiple conversations,
or one long one?") and the honest answer is "structurally, one — by an absence of a feature,
which today reads as the right call, not a gap." Whether a student should ever be able to
start over deliberately (a fresh thread when the old one feels stale) is a real product
question, not a bug — flagging for founder/CEO judgment, not deciding it here.

## The degrade disclosure, read in context rather than isolation

None of the 5 real conversations contain a `degraded` reply — the flag is session-only by
design (not persisted to `advisor_messages`, a deliberate scope line from the original spec,
not an oversight), so it can't be read back from history. Read the actual copy instead, for
the specific worry raised — does it compound into a repeated apology across several degraded
turns in one sitting: *"Lighter model — This reply used a lighter model — this month's advisor
budget is in use."* There is no apology in it to begin with (no "sorry", no hedging) — it's a
flat, one-sentence status label, closer to a system disclosure than a pitch, matching the
original design spec's own instruction that this be state, not sentiment. Repeating an honest,
neutral fact on every turn it's true doesn't compound into anything uncomfortable the way
repeating an apology would — if anything, going silent after the first occurrence would be the
worse choice, since a student mid-conversation has no other way to tell which specific replies
were degraded. Judgment call, not a defect: holds up.

## Does it sound like that mentor over several turns? (spec §8.2)

Read both non-degenerate real conversations in full, not excerpted. Both hold the voice
consistently across 4-5 turns each, not just in a single well-posed question:

- **Refuses fabrication under direct pressure, not just when it's convenient.** `b788f5be`
  turn 4, asked point-blank for a Yale admission percentage: *"a percentage would just be a
  guess wearing a lab coat."* `f5bc7909` turn 4, asked for MIT's specific requirements: "I
  don't have verified data on MIT's specific requirements... I won't guess at those." Same
  refusal, two unrelated conversations, two different students.
- **Uses its own recommendation history rather than treating each turn as isolated** (Phase
  63). `f5bc7909` turn 1, unprompted: *"Starting a new extracurricular was already flagged as
  something to avoid for now. I don't know what changed since then... worth naming that
  explicitly rather than ignoring it."*
- **Reasons from the student's actual stated constraints, with real arithmetic**, not generic
  advice. `f5bc7909` turn 3: *"You have 5-10h/week total. You're already Economics Club
  President... eats 2-4h/week. That leaves roughly 3-6h/week... doesn't fit without your
  research project or club leadership degrading."*
- **States what it's deliberately not recommending, and why** (Phase 39). `b788f5be` turn 2:
  *"What I'm deliberately not recommending: a new research project or another club... starting
  one now... is how a student ends up with three unfinished things instead of one strong
  one."*
- **Re-derives from the student's own saved data when pushed back on, instead of re-listing
  everything.** `b788f5be` turn 3 (student declines the math-competition suggestion): *"the
  only other verified item on your list tagged for academics is..."* — reasoning from the
  actual profile record, not freelancing a new idea.

This is the one question the eval rubric structurally cannot answer (every case is one isolated
turn against a fixture) — two independent real conversations, four to five turns each, both
converge on the same answer: yes.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3411/3411, 241 files) all pass.
