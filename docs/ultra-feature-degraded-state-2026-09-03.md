# Ultra feature degraded state — what actually happens today, migrations 0110/0111/0112 unapplied

Report only, per instruction — nothing in this pass changes code. All three migrations
confirmed unapplied against the live database (`qtcvcflzxbuagvvwahhu`) at the time of writing,
via `information_schema`, not assumed from the migration files existing:

```
advisor_instructions column on profiles ........ absent
advisor_generation_locks table ................. absent
advisor_conversations.summary column ........... absent
advisor_conversations.summarized_at column ..... absent
```

## Correction to the brief, checked before building the rest of this report

The assignment states each of the three "backs something on the plan page's comparison
table." Read `lib/tier/comparison.ts` directly — `TIER_COMPARISON_ROWS` is a fixed 6-row
array: `aiAllowance`, `replyCeiling`, `replyDepth`, `visualTheme` (differ), `weeklyPlanFocus`,
`researchIdeaFocus` (sameByDesign). **None of the three özelleşme features appear in it.**
The `/settings/plan` comparison table makes zero claims about instructions, session
concurrency, or retention, today.

What's actually true, checked by grepping `messages/en.json`/`messages/tr.json` for every
plausible term (`eşzamanlı`, `aynı anda`, `concurrent`, `özet`, `silinir`, `24 saat`,
`24-hour`) and finding the two real hits:

- **Instructions has its own live claim, on the advisor page, not the plan page**:
  `advisor.instructions.ultraUpsell` — *"Ultra'da en fazla {limit} karakter yazabilirsin"*
  ("On Ultra you can write up to {limit} characters") — rendered by
  `features/advisor/advisor-instructions-field.tsx` for every Standard-tier student, right
  now, unconditionally (`app/(app)/advisor/page.tsx:145` mounts it with no feature flag, no
  tier check gating visibility).
- **Session count has its own live claim, also on the advisor page** —
  `advisor.sessionWall.detail` — traced end to end below, since it's the second real
  promise made to a paying student and deserves the same rigor as instructions, not an
  assumption that it's fine because it predates these three migrations.
- **Zero hits for concurrency-limit or retention copy, anywhere.** Neither is claimed to a
  student in any surface this repo renders.

So the real question per feature isn't uniformly "does the plan page lie" — it's three
different questions, answered separately below.

**A fourth thing worth tracing precisely, since it carries the second live promise
(`advisor.sessionWall.detail`) and a specific worry — "Tekrar dene" (retry) told to a
student when retrying can never help — deserves the same end-to-end check as instructions,
not an assumption:** an Ultra user pressing "Yeni oturum" today calls `createConversation`
(`app/(app)/advisor/actions.ts:425`). For `planTier === "ultra"` specifically, the Standard-
only conversation-count check (`:435-454`) is skipped entirely, and the function goes
straight to `supabase.from("advisor_conversations").insert({ user_id, title })` — naming
only `user_id`/`title`, columns that have existed since migration 0011. Grepped every
`advisor_conversations` read/write in the app (`actions.ts` lines 144, 157, 168, 313, 436,
457, plus `advisor/page.tsx:39`'s wildcard select): **none of them name `summary` or
`summarized_at`.** Those two columns are named in exactly one place in the whole codebase —
`lib/advisor/retention.ts`, the dormant, unscheduled job traced in §3 below, which no
student action reaches. So creating a new session **cannot** hit a missing-column error at
all — it's structurally isolated from all three unapplied migrations, not just currently
lucky. `createFailed`/"Tekrar dene" would only ever fire for a genuine, unrelated transient
error (a real network or RLS failure), where retrying is honestly the right advice — the
file's own comment says as much: *"A count query failing is a real, unexpected error, not
an 'unapplied migration' shape... fails closed here rather than silently letting an
uncounted request through."* Live-verified by reading the exact call graph, not assumed:
**this specific worry doesn't materialize for session creation.** It's the instructions
save specifically where a missing-schema failure and a real failure share one code path —
traced precisely in §2.

---

## 1. Concurrency lock (migration 0110, `advisor_generation_locks`) — fails open, silently

**Not advertised anywhere a student can read.** The spec's own comparison table
(`docs/ozellesme-spec-2026-09-03.md` §"Ne satın alınıyor") lists "Eşzamanlı üretim: 1 / 1
(ikisi de aynı)" — identical across tiers by design, a cost control, not a sold Ultra
benefit. No risk of a customer being told they're paying for something absent, because
nothing public claims it exists.

**The trace** (`lib/advisor/generation-lock.ts`, wired into both call sites in
`app/(app)/advisor/actions.ts:208` and `:364`):

```ts
export async function acquireAdvisorGenerationLock(supabase): Promise<string | null> {
  const { data, error } = await supabase.rpc("acquire_advisor_generation_lock");
  if (error) {
    if (isUndefinedFunctionError(error, "acquire_advisor_generation_lock")
        || isUndefinedTableError(error, "advisor_generation_locks")) {
      return new Date().toISOString(); // 0110 not applied yet — proceed, don't block.
    }
    ...
    return new Date().toISOString(); // any other DB error degrades the same way
  }
  return data; // null means a fresh lock is already held
}
```

The file's own header states the design intent plainly: *"Fails open, not closed... the
same 'unapplied migration must degrade' posture as every other mechanism in this
codebase."* With 0110 absent, the RPC call always errors on the missing function/table,
`acquireAdvisorGenerationLock` always returns a synthetic timestamp, and the caller's
`if (!lockStartedAt)` rejection branch (`actions.ts:209`) never fires. **Two concurrent
generation requests from the same student both run, in full, right now** — not a
theoretical case, the only case, since there is no code path back to a real lock today.

**Answering the actual question**: fail-open. Over-delivers quietly rather than looking
broken — a student who double-clicks "Send" or opens two tabs gets two answers instead of
a rejection, with no error, no visible sign the constraint was supposed to apply. This
degrades toward more generosity, not toward a visible defect, which is the reason it hasn't
been noticed: nothing about it looks wrong from the outside.

---

## 2. Advisor instructions (migration 0111, `profiles.advisor_instructions`)

**This one IS live and advertised**, per the correction above — the field, its
character counter, and the Ultra upsell line all render today, for every student, on the
real advisor page.

**Read side, checked in `lib/tier/advisor-instructions.ts` and where it's called**
(`app/(app)/advisor/page.tsx:145`, `resolveAdvisorInstructions(profile)`): `profile` comes
from a `select("*")`, so a missing column is silently absent from the row rather than an
error — `profile.advisor_instructions` is `undefined`, and `resolveAdvisorInstructions`
degrades that to `null`. The field renders **empty**, honestly — not stale, not wrong, not
erroring. A student who has never touched it sees exactly what they'd expect to see.

**Write side, live-verified against the real database, not just read from code.** Rather
than trust `isUndefinedColumnError`'s logic by inspection alone, sent a real HTTP `PATCH` to
the live Supabase REST endpoint with the service-role key, targeting a UUID that does not
exist (`00000000-0000-0000-0000-000000000000` — chosen specifically so the probe cannot
touch a real row regardless of outcome):

```
PATCH {project}/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000000
body: {"advisor_instructions": "PROBE"}

→ HTTP 400
→ {"code":"PGRST204","details":null,"hint":null,
   "message":"Could not find the 'advisor_instructions' column of 'profiles' in the schema cache"}
```

That is exactly the shape `isUndefinedColumnError(error, "advisor_instructions")` checks
for (`code === "PGRST204"` and the message contains the column name) — confirmed live, not
inferred. Tracing it through `updateAdvisorInstructions`
(`app/(app)/settings/actions.ts:317`): this exact error is caught and returned as
`{ error: "Instructions aren't available on your account yet, so nothing was saved.
Retrying won't change that." }` — a real, honest, specific message. Tracing it through the
UI (`advisor-instructions-field.tsx:85`): `if (result.error) setError(result.error); else {
setError(null); setSaved(true); }` — the error renders, `saved` never becomes `true`, the
button never shows "Saved."

**The exact distinction from tonight's feedback-form fix is present here, checked
specifically, not assumed from the message's tone.** `updateAdvisorInstructions` returns
two different strings depending on cause: the missing-column branch says outright
*"Retrying won't change that"* (a permanent, structural cause — correctly does not invite a
retry loop); the generic `catch`-all branch below it says only *"Couldn't save your
instructions"* (a real, possibly-transient failure — correctly stays silent on whether
retrying helps, rather than promising it will). A student hitting today's actual case (the
missing column) gets the first message, told plainly that trying again is pointless — the
opposite of a retry loop, not a version of one.

**Answering the actual question directly: no false success exists anywhere in this path,
live-confirmed at the network layer, not just by reading the code.** A student who types an
instruction and clicks Save today gets a real, specific, correctly-worded error explaining
it didn't save — never a false confirmation.

**What's still worth naming, though it isn't a false-success bug**: the field is fully
interactive, shows a live character counter, and states a specific number in the Ultra
upsell ("up to 2,000 characters") — a working-feature-with-a-tier-limit presentation — while
100% of save attempts, on *either* tier, currently fail. Nothing lies about the outcome of
clicking Save, but a feature actively inviting input while unable to persist it for anyone
is a distinct, milder version of the same underlying risk: the founder's non-negotiable is
about false confidence, and an honest error after the fact doesn't fully answer whether the
field should be visible at all while inert for every user.

---

## 3. Retention (migration 0112) — never runs, no claim in either direction

**Not a single degrade path to trace — the job has no live entry point at all.** Confirmed
three independent ways nothing calls this today, matching 05's earlier characterization
exactly:

1. `dryRun` defaults to `true` in `RetentionRunOptions` (`lib/advisor/retention.ts:124`) —
   every real write is suppressed unless a caller explicitly overrides it.
2. **Nothing schedules it.** The file's own header states this outright: *"Nothing in this
   file, and nothing calling it, adds a cron entry (lib/jobs/schedule.ts / vercel.json) —
   that is a founder decision gated on the privacy-notice and data-export changes... not a
   scheduling decision this file makes for itself."* Confirmed by absence: no cron config,
   no scheduled invocation anywhere in the codebase calls `runRetentionPass`.
3. `envAllowDelete()` (`ADVISOR_RETENTION_ALLOW_DELETE`, unset by default) additionally gates
   the delete step specifically, independent of `dryRun`.

Even if all three gates were somehow bypassed, the missing `summary`/`summarized_at`
columns would make any real write fail outright — this is genuinely inert on every axis,
not "runs but degrades."

**Student-visible side, checked directly rather than assumed from the mechanism being
off**: grepped every advisor-facing component and template string for `summary`,
`summarized_at`, or any 24-hour-retention-adjacent copy. Zero hits. No chat UI shows "this
conversation was summarized," no settings page mentions history being trimmed, no copy
promises a summary is coming. The complete absence isn't a bug being masked — it's the
honest state, because the feature has never been wired into anything a student would see.

**Answering the actual question**: there's no dishonest degrade to find because there's no
claim to check it against. A Standard student's history isn't being auto-summarized (the
spec's stated behavior for that tier), and an Ultra student's "no deletion" guarantee is
trivially true — not because Ultra is protected, but because nothing deletes anything for
anyone right now. Neither tier is currently receiving the feature described in the spec;
neither tier is being told they are.

---

## Bottom line

Three different shipping states, not one pattern:

| Feature | Runs today? | Fails toward | Visible claim exists? | Claim currently honest? |
|---|---|---|---|---|
| Concurrency lock (0110) | Yes, always fails open | More generous (silently) | No | N/A — nothing claimed |
| Advisor instructions (0111) | Yes, write always fails | Honest error, no false success | Yes — advisor page upsell, live | Technically yes (no lie on save); the live, inviting field with 0% functional saves is the softer concern |
| New session creation (session count, not the concurrency lock) | Yes, works — for Ultra, completely unaffected by 0110/0111/0112 | N/A — real success | Yes — advisor page upgrade-prompt sentence, live | Yes, checked end to end: the insert cannot reach any of the three missing schema elements |
| Retention (0112) | No — never invoked | N/A, dormant | No | N/A — nothing claimed |

The `/settings/plan` comparison table — the surface named in the assignment — currently
asserts nothing about any of the three, independently confirmed against its own four real
rows (quota, reply ceiling, reply depth, theme). **The exposure lives on the advisor page,
not the pricing page** — specifically in two upgrade-prompt sentences shown to a Standard
student in the act of being asked to pay: `sessionWall.detail` (checked end to end, holds —
new-session creation cannot hit any of the three missing schema elements) and
`instructions.ultraUpsell` (checked end to end, also holds on the one axis that matters
most — no false success, and the error message itself correctly distinguishes a permanent,
structural cause from a real one, so a student is never sent into a pointless retry loop).
Both promises are currently true when tested against what a student actually experiences,
not just true in the sense of not technically lying.
