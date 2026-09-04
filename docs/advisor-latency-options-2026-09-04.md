# The advisor is slow — what are the real options

**Founder's own question:** *"bir de ai çok yavaş ne yapıcaz"* — the AI is very slow, what are
we going to do about it. This is a direct follow-up to
[docs/advisor-latency-vs-function-limits-2026-09-03.md](./advisor-latency-vs-function-limits-2026-09-03.md),
which measured the raw numbers (worst of 20 real calls: 55.4s) but only asked whether that fit
inside Vercel's function-duration ceiling. It does, comfortably. That was never the question
the founder is actually asking — a student staring at a blank screen for 55 seconds is a bad
experience regardless of what the server-side ceiling is.

**Bottom line up front:** nothing in this codebase streams. Every advisor reply is generated in
full, server-side, before the student sees a single word. That is the largest lever here, and
it's a genuine engineering project, not a flag to flip — real cost and real risk, both stated
below with numbers, not adjectives. Everything else investigated (retries, prompt size, tier
ceilings) either doesn't apply to advisor chat specifically, or has already been tried and
rejected once for a real reason. Those are reported too, because ruling something out with
evidence is worth as much as finding something that works.

**Both constraints from the brief hold everywhere below:** nothing here trades answer quality
for speed, and nothing here required a live-database write — every number is either from the
2026-09-03 measurement (20 real Anthropic calls, real database) or from a fresh, read-only
measurement against the same real test profile, run today.

---

## What was checked before proposing anything

**1. Does the reply stream?** No — checked directly, not assumed.

- `lib/ai/provider.ts`'s `AIProvider` interface declares exactly two methods, both returning a
  single resolved `Promise`: `generateText(): Promise<AITextResult>` and
  `generateStructured<T>(): Promise<AIStructuredResult<T>>`. No streaming method exists on the
  interface at all.
- `lib/ai/anthropic-provider.ts` calls `client.messages.create({...})` — the Anthropic SDK's
  plain, full-response method. Not `client.messages.stream()`.
- `app/(app)/advisor/actions.ts`'s `sendAdvisorMessage` is a single Server Action that
  `await`s `generateAdvisorReply(...)` to completion, writes the reply to the database, and
  returns the complete text in one response. The entire round trip — network + context
  assembly + the model call + the DB write — is one request/response pair.
- The client already documents this, in its own words. `features/advisor/advisor-chat.tsx`,
  on the `isStreaming` field it passes to the upgrade-prompt logic: *"this component has no
  token-by-token streaming (the 'thinking' placeholder is a spinner until the full reply
  arrives in one Server Action response)... [the field is] kept as an explicit field... so a
  future streaming implementation has an obvious place to wire a real value in, rather than
  needing to rediscover the requirement."* Someone already anticipated this and left a seam.

**2. Does a Zod-validation retry inflate any of the measured numbers?** No, for advisor chat
specifically. `generateAdvisorReply` calls `provider.generateText`, not `generateStructured` —
the retry-on-validation-failure path (`lib/ai/anthropic-provider.ts`) only exists on the
`generateStructured` code path. Advisor chat has no such path to silently double a call's
duration. (This *would* apply to `weekly_plan`, which does use `generateStructured` — the
2026-09-03 measurement's own note that none of its 5 weekly-plan reads showed retry-related
output stands, but it's a real mechanism worth remembering if a future weekly-plan latency
question comes up.)

**3. Does the ceiling explain the tier gap?** Only partly, and not the way it first looks.
Ultra's `maxTokens` (8192) is double Standard's (4096) — but the 2026-09-03 measurement already
showed `advisor_chat / ultra / balanced` (36.1s mean) landing almost exactly on
`advisor_chat / standard / balanced` (35.1s mean), despite the doubled ceiling. The code's own
comment on this exact number explains why: *"Lowering this does NOT make thinking shorter: the
model reasons however much the task needs regardless of the ceiling... this budget covers the
model's thinking *and* the reply."* `maxTokens` is a truncation safety floor, not a speed
throttle — the model doesn't spend more time just because more room exists.

The real tier-linked gap is `advisor_chat / ultra / thorough` (47.2s mean, 55.4s worst) — and
that's not the ceiling either. It's `THOROUGH_INSTRUCTION`, a text instruction appended to the
system prompt only when a student is on Ultra *and* has response mode set to "thorough,"
explicitly asking the model for more supporting detail and reasoning. It's slower because it's
designed to be slower — Ultra is sold on depth, and thorough mode is the feature doing exactly
what it says. This is not a bug to fix; see the "ruled out" section below for why it shouldn't
be trimmed.

**4. How big is the prompt, actually?** Measured fresh today, against the same real,
deliberately-richest test profile (Daniel Okafor) the 2026-09-03 measurement used — not
guessed:

| Component | Characters | ≈ Tokens |
|---|---|---|
| `ADVISOR_SYSTEM_PROMPT` (fixed instructions, same for every call, every student) | 8,812 | ~2,203 |
| Student context (`formatContextForPrompt`, this specific rich profile) | 4,377 | ~1,094 |
| **Full system prompt** (instructions + context, before history/new message) | **13,216** | **~3,304** |

(Token counts are `chars / 4` estimates, not a real tokenizer — stated as approximate
throughout; the character counts are exact.)

Two things this rules out and one thing it points at:

- **The prompt has not silently ballooned.** ~3,300 input tokens is modest for a 200k-token
  context window, and input processing at that scale is a small fraction of a 25-55 second
  call — it does not explain the observed latency.
- **The fixed instructions are the single largest piece — bigger than even the richest
  student's own profile**, 2,203 tokens vs. 1,094. Every one of these tokens is paid on *every*
  advisor call, for *every* student, regardless of how rich or thin their own profile is.
- **This has already been tried once, and reverted.** `lib/ai/advisor-chat.ts`'s own comment
  on the maxTokens history: a prompt-brevity change shipped 2026-09-02 was reverted the same
  day "after the one live eval comparison scored worse, not better." Trimming the fixed
  instructions is not a fresh idea — it's a specific, real experiment this codebase already
  ran and rejected for a quality reason, not a speed one. Any future attempt at this needs a
  real eval showing the shorter version doesn't cost quality, which the 2026-09-02 attempt
  didn't clear.

---

## Options, with real costs and real numbers

### Option 1 — Stream the reply (recommended focus)

**What it is:** send the model's output to the browser as it's generated, instead of holding
the entire reply server-side until it's complete. The student sees the first words appear
within roughly 1-2 seconds instead of watching a static spinner for up to 55.

**What it saves:** zero seconds of actual generation time. This does not make the model
faster — it changes what "waiting 40 seconds" feels like. This is the standard industry
mitigation for exactly this problem (every major AI chat product streams for this reason), and
it is the only option here that meaningfully changes the *experience* of the current numbers
rather than trying to shrink the numbers themselves.

**What it costs to build — real, not small:**

- No streaming infrastructure exists in this codebase today. `package.json` has
  `@anthropic-ai/sdk` only — no Vercel AI SDK (`ai` / `@ai-sdk/anthropic`), which is the
  standard, well-trodden way to stream an LLM reply into a Next.js App Router page. Adding it
  is straightforward; wiring it into *this specific* Server Action is not.
- `sendAdvisorMessage` is not a thin wrapper — it's ~140 lines of hardened, incident-driven
  logic sitting between the student's click and the model call: burst rate-limiting, monthly
  quota check, the one-conversation-per-Standard-student wall (with its own documented history
  of a real bypass bug found and fixed), a generation lock (one concurrent reply per student,
  both tiers), conversation lookup/creation, history assembly, the user-message insert, and —
  after generation — the assistant-message insert with its own multi-step degrade-column
  fallback, plus a full P0-documented failure path that persists a retryable failed row on any
  error. All of that currently runs *before* generation starts and *after* it fully completes.
  Streaming means the generation itself needs to move to a different transport (a Route
  Handler returning a `ReadableStream`, the standard Next.js pattern) while everything else —
  every check above — still has to run in the right order and still has to persist the final
  text to `advisor_messages` once streaming finishes, without losing the failure-handling this
  file has clearly been hardened through real production incidents to get right.
- Client side: `features/advisor/advisor-chat.tsx`'s message-rendering and the
  `isStreaming`-aware upgrade-prompt logic already has the intended seam, but the actual
  incremental-render logic (updating one message's content as chunks arrive, instead of
  swapping a "thinking" placeholder for a finished string) is new work.
- Realistic sizing: this is a multi-day feature, not a config change — the model call itself is
  the easy part; correctly preserving every guard listed above across a transport change is
  the real work. No credible smaller estimate given how much production-hardened logic sits in
  the current synchronous path.

**Risk:** real, concentrated in migration correctness, not in the model or the answer. Every
one of the guards above has a specific, documented reason it exists (several reference a real
incident); the risk is dropping or reordering one of them while restructuring the call path,
not a risk to what the student sees or the quality of the answer. Zero quality risk — same
model, same tokens, same final text, delivered incrementally instead of all at once.

### Option 2 — A real interim status, short of full streaming

**What it is:** replace the current flat "thinking" spinner with a short, honest sequence of
status text tied to what's actually happening — e.g. "Reading your profile" while context
assembles, "Thinking it through" once the model call starts. Not fake progress, not a fake
percentage — just naming the real phase, the same discipline this product's own build spec
already applies elsewhere ("Do not show fake percentage loaders unless progress is real").

**What it saves:** nothing measurable in wall-clock time, and a smaller perceived-wait
improvement than real streaming — a named wait still feels like a wait, just a slightly less
opaque one. This is a consolation option, not a replacement for Option 1.

**What it costs:** small and client-only. No new dependency, no transport change, no touching
`sendAdvisorMessage`'s hardened logic at all — this is a client-side change to
`advisor-chat.tsx`'s existing "thinking" placeholder state, timed against rough phase
durations (context assembly is fast; the model call is the long part). Could ship in isolation,
this week, independent of whether Option 1 is ever built.

**Risk:** near zero. Worst case, the status text is slightly out of sync with the real phase
timing (e.g., still says "Reading your profile" a few seconds into the model call) — cosmetic,
not functional, and easy to tune after real usage.

### Ruled out, with evidence — not silently skipped

**Lowering Ultra's `maxTokens` ceiling.** Already benchmarked to its measured floor, twice, in
the code's own history: 4096 truncates a real rich profile mid-answer (confirmed live,
`stop_reason: "max_tokens"`); 8192 was raised specifically because 4096 failed the same way on
a demanding real request. Going back down reintroduces a documented truncation failure, not a
speed win — this is a quality regression by the exact definition the brief ruled out.

**Trimming or removing the "thorough" response mode.** It's the slowest condition because it's
supposed to be — it explicitly asks for more, and that's what Ultra is sold on. Removing or
shortening it isn't a latency fix, it's canceling the feature.

**Capping the model's "thinking" budget directly.** Anthropic's API supports an explicit
thinking-budget parameter; this codebase doesn't set one, letting Claude Sonnet 5 decide its
own reasoning depth per request. Explicitly capping it *would* be a real lever — and exactly
the kind of thing the brief's constraint rules out: it trades reasoning depth for speed on
whichever calls actually need the reasoning, with no way to tell in advance which those are.

**Shrinking `ADVISOR_SYSTEM_PROMPT` (the 2,203-token fixed instructions).** Real fixed cost,
paid on every call — but already tried. A 2026-09-02 prompt-brevity change was reverted the
same day after a live eval scored the shorter version worse. Worth revisiting only with a new
eval that clears quality first; not proposed here as a latency fix on its own.

**A Zod-validation retry silently doubling advisor-chat latency.** Checked and doesn't apply —
`generateAdvisorReply` uses `generateText`, which has no retry path. (Real for `weekly_plan`,
irrelevant here.)

---

## What to tell the founder

The honest shape of the answer: the model itself is not unreasonably slow for what it's being
asked to do (55.4s worst case, for a "look at my whole profile and tell me everything"
question, in thorough mode, is not a broken number — it's a real cost of real reasoning over a
real profile). What's actually broken is that the student watches a static spinner for the
entire time. Streaming doesn't make the answer arrive faster; it makes the wait honest and
visible, which is most of what "feels slow" usually means. That's a real build, not a flag —
the estimate above is a multi-day project, not an afternoon, because of how much
production-hardened logic already sits in the synchronous path it would need to move around.
The cheap, fast, no-risk piece (Option 2) can ship independently and immediately if a visible
improvement is wanted before the larger project is scoped and started.
