# Streaming the advisor reply — what it would actually take

Companion to [docs/advisor-latency-options-2026-09-04.md](./advisor-latency-options-2026-09-04.md),
which identified streaming as the real lever and estimated it at multi-day, not a flag flip.
This is that estimate made concrete — not built now (payment lands today, and this touches the
same synchronous path three other lanes are working near), but scoped so it's ready to pick up
as the next substantial piece rather than starting cold.

**The head start that already exists:** `features/advisor/advisor-chat.tsx` hardcodes
`isStreaming: false` when calling `shouldShowUpgradePrompt`, with a comment left specifically
for this — *"kept as an explicit field... so a future streaming implementation has an obvious
place to wire a real value in, rather than needing to rediscover the requirement."*
`lib/advisor/upgrade-prompt.ts`'s own gate (`if (context.isStreaming) return false; // never
mid-task`) is already correct for the streaming case and needs no change — it's designed to
suppress the prompt while a reply is still arriving and only allow it once the *complete* text
has landed, which is exactly how a streaming consumer should call it regardless. One real piece
of the target architecture is already built and correct.

## What has to move, and why it's the real cost

`sendAdvisorMessage` (`app/(app)/advisor/actions.ts`) is not a thin wrapper around the model
call — it's the model call sitting in the middle of ~140 lines of guards, each with a
documented, incident-driven reason to exist:

1. Message validation (length, empty)
2. Burst rate limit (`assertWithinAIRateLimit`)
3. Tier/quota resolution and the monthly-allowance check
4. Conversation ownership re-verification (or lazy creation, gated by the Standard
   one-conversation wall — the exact bypass a real bug once got past)
5. History fetch, bounded to `MAX_HISTORY_TURNS`
6. The user's message insert
7. The generation lock (`acquireAdvisorGenerationLock`) — one concurrent reply per student
8. **The model call** — currently the one `await` in the middle
9. The assistant-message insert, with its own multi-step degrade-column fallback
   (migration 0088 unapplied-safe path)
10. On any failure anywhere after step 6: a P0-documented failed-row write, so a reload shows
    a retryable bubble instead of a silent gap
11. The lock release, in a `finally`, regardless of which path above returned

A Server Action is one request/response pair — everything above runs, then one value comes
back. Streaming means step 8 stops being a single `await` and starts being a live connection
the client reads incrementally, which means *something* has to sit between steps 7 and 9 for
the whole duration of generation, not resolve immediately. That's the actual work: not calling
the model differently, but restructuring the one function everything above already depends on
without breaking any of the eleven things it currently gets right.

## Architecture

**Route Handler, not a streamed Server Action.** Next.js Server Actions resolve once; a
Route Handler (`app/api/advisor/chat/route.ts`) can return a `Response` backed by a
`ReadableStream`, which is the standard, well-documented way to stream in the App Router.
Same-origin, no CORS concern, and every server-only helper this app already uses
(`requireUser`, `getCurrentProfile`, the Supabase server client, `cookies()`) works identically
inside a Route Handler — moving there is relocation, not a capability loss.

**Hand-rolled over the Vercel AI SDK, given what's already built.** This project has zero AI
SDK dependency today (only `@anthropic-ai/sdk`). The SDK's higher-level primitives
(`streamText`, `useChat`) are built around a generic chat loop and would fight, not help, with
how much bespoke gating already wraps this specific call — tier-based model selection, the
thorough-instruction branch, spend-based degrade, the exact multi-step DB write sequence above.
Anthropic's own SDK exposes `client.messages.stream()` directly; piping its text-delta events
into a hand-built `ReadableStream` keeps every existing decision (which model, which
`maxTokens`, whether to append `THOROUGH_INSTRUCTION`) exactly where it already lives in
`lib/ai/advisor-chat.ts`, changed only at the one line that currently calls `generateText`.

## Concrete shape

1. **Steps 1–7 above move into the Route Handler unchanged** — same checks, same order, same
   error shapes. This is the least risky part: none of it touches the model.
2. **A new `generateAdvisorReplyStream`** in `lib/ai/advisor-chat.ts`, sibling to
   `generateAdvisorReply` — identical context assembly, identical model/token/thorough
   resolution, but calls `client.messages.stream({...})` and yields text deltas instead of
   awaiting one `Message`. `generateAdvisorReply` itself can stay, used wherever a full string
   is still wanted (there may be none once this ships, but nothing forces the removal in the
   same change).
3. **The Route Handler pipes deltas into a `ReadableStream` response** while accumulating the
   full text server-side in the same request — needed for step 9 below, and the reason this
   doesn't need a second round-trip to know what was said.
4. **On stream completion (server-side, inside the same handler):** run steps 9–11 from the
   list above — the assistant-message insert (with its degrade-column fallback), the lock
   release — using the accumulated full text, exactly as `sendAdvisorMessage` does today after
   its own `await`.
5. **On a stream-level error** (the model call fails mid-generation, not just before it
   starts): the same P0 failed-row write, from inside the handler's catch, so a reload still
   shows a retryable bubble — this is the one behavior that's easiest to lose by accident,
   since "stream broke halfway" doesn't look like the clean try/catch this logic was written
   against.
6. **Client side** (`advisor-chat.tsx`'s `submit()`): replace the `await sendAdvisorMessage(...)`
   call with a `fetch()` to the route, read `response.body.getReader()`, and append each
   decoded chunk to the pending message's `content` in state as it arrives — the "thinking"
   placeholder becomes a live-growing bubble instead of a static one swapped once at the end.
   `maybeShowUpgradePrompt` still runs exactly where it runs today: after the read loop
   reports done, with `isStreaming: false` — no change needed to that call or to
   `shouldShowUpgradePrompt` itself, per the head-start note above.
7. **`retryAdvisorMessage` needs the identical treatment** — either a second route or the same
   one parameterized by "new message" vs. "retry" — since it shares `generateAdvisorReply`
   today and would share the streaming variant tomorrow.
8. **This interim-status work (built today, this branch) doesn't need to be thrown away.**
   `AdvisorMessageThinking`'s `statusLabel` still has a real job even once real content starts
   streaming in: the moment between "request sent" and "first token received" is not zero, and
   an honest label covers exactly that gap, then the growing text takes over. Nothing here was
   built as a placeholder for streaming to delete.

## What this doesn't change

No model, no prompt, no token budget, no quality behavior — same output, same
`THOROUGH_INSTRUCTION` gate, same tier-based `maxTokens`, same degrade logic. The measured
latency numbers in the 2026-09-03 doc don't move; what moves is when the student starts seeing
something. This is purely a transport and UI change, which is why it was ruled *in* against the
"never trade quality for speed" constraint in the first place.

## Why this waits

Three lanes are mid-build adjacent to this exact surface right now — a checkout seam, a
full-screen upgrade modal, and 44's session-list work in `advisor-workspace.tsx` (which this
plan's Route Handler wouldn't touch, but `advisor-chat.tsx`'s `submit()` — which it would — is
one file away). Restructuring the eleven-item guard list above against files that are actively
moving, on the day payment ships, is exactly the condition under which one of those guards
quietly stops working and nobody notices until a student hits it. Once things settle, this doc
is the starting point, not a fresh scoping pass.
