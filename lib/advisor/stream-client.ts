/**
 * Client-side consumer for app/api/advisor/chat/route.ts's (and .../retry/route.ts's) SSE-
 * style event stream — deliberately its own file, not inlined in advisor-chat.tsx, so the
 * frame-parsing logic (the part most likely to have an off-by-one on the `\n\n` boundary or
 * silently drop a trailing partial frame) is unit-testable without a full component render.
 *
 * No `server-only` here on purpose — this runs in the browser.
 */

export interface StreamAdvisorChatResult {
  conversationId?: string;
  conversationTitle?: string;
  assistantMessageId?: string;
  degraded?: boolean;
  error?: string;
}

/**
 * POSTs to a streaming advisor endpoint, forwarding each `delta` event's text to `onDelta`
 * as it arrives, and resolving once the stream's own `done`/`error` event (or a plain, non-
 * streamed JSON error response for a guard that failed before generation started — rate
 * limit, quota, ownership, the session wall) has been read. The two response shapes
 * (streamed vs. plain JSON) are exactly what app/api/advisor/chat/route.ts's own header
 * documents: every pre-generation guard returns Response.json with a real HTTP status,
 * never a stream a caller would have to open just to learn nothing is coming.
 */
export async function streamAdvisorChat(endpoint: string, body: Record<string, unknown>, onDelta: (text: string) => void): Promise<StreamAdvisorChatResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    // A guard blocked before any generation started -- the route's own plain JSON error
    // shape, same fields sendAdvisorMessage's Server Action already returned for the
    // identical cases, so no new error-handling branch is needed on top of this.
    const data = (await response.json().catch(() => ({}))) as StreamAdvisorChatResult;
    return { error: data.error ?? "Something went wrong.", conversationId: data.conversationId, conversationTitle: data.conversationTitle, assistantMessageId: data.assistantMessageId };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEvent: Record<string, unknown> | null = null;

  for (;;) {
    let done: boolean;
    let value: Uint8Array | undefined;
    try {
      ({ done, value } = await reader.read());
    } catch {
      // A genuine network-level drop mid-read (WiFi lost, tab suspended, the server process
      // killed) -- distinct from the clean-close-with-no-final-event case below, but
      // informationally identical to a caller: there is no way to tell "the server never
      // finished" apart from "it finished and saved, but the confirmation never arrived."
      // Breaking here with finalEvent still null reuses the exact same, already-handled
      // path immediately below rather than a second, parallel error branch -- and, just as
      // importantly, turns what used to be an unhandled rejection (neither submit() nor
      // retry() in features/advisor/advisor-chat.tsx wraps this call in try/catch) into the
      // same ordinary { error } result they already both know how to render.
      break;
    }
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    // Frames are complete only once a full "\n\n" has arrived -- a chunk boundary from the
    // network can land mid-frame, so buffering until the delimiter shows up (rather than
    // splitting on every decoded chunk) is what keeps a JSON.parse from ever seeing a
    // truncated frame.
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (!frame.startsWith("data: ")) continue;
      const event = JSON.parse(frame.slice(6)) as Record<string, unknown>;
      if (event.type === "delta") {
        onDelta(event.text as string);
      } else {
        // "done" or "error" -- the route emits exactly one of these, always last.
        finalEvent = event;
      }
    }
  }

  if (!finalEvent) {
    // The connection closed (network drop, server crash mid-stream) without ever emitting
    // its own done/error event -- distinct from a clean "error" event, which always carries
    // a real, translated message from the server. This one has no such message to relay.
    return { error: "Connection lost before the reply finished." };
  }
  if (finalEvent.type === "error") {
    return { error: finalEvent.message as string, assistantMessageId: finalEvent.assistantMessageId as string | undefined };
  }
  return {
    conversationId: finalEvent.conversationId as string | undefined,
    conversationTitle: finalEvent.conversationTitle as string | undefined,
    assistantMessageId: finalEvent.assistantMessageId as string | undefined,
    degraded: finalEvent.degraded as boolean | undefined,
  };
}
