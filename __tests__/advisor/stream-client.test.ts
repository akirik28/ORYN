import { afterEach, describe, expect, test, vi } from "vitest";
import { streamAdvisorChat } from "@/lib/advisor/stream-client";

/**
 * The one piece of this file most likely to have a subtle bug is frame boundary handling --
 * a network chunk can split a "data: {...}\n\n" frame anywhere, including mid-JSON. Every
 * test below that builds its own ReadableStream deliberately controls how bytes are chunked
 * to exercise that, rather than handing over one pre-joined string a real network stream
 * would never actually deliver as a single chunk.
 */

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
}

function mockOkStream(chunks: string[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, body: sseStream(chunks) }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamAdvisorChat — the happy path, one frame per chunk", () => {
  test("forwards each delta in order, then resolves with the done event's fields", async () => {
    mockOkStream([
      'data: {"type":"delta","text":"Research "}\n\n',
      'data: {"type":"delta","text":"is the gap."}\n\n',
      'data: {"type":"done","conversationId":"conv-1","conversationTitle":"Research gap","assistantMessageId":"msg-1","degraded":false}\n\n',
    ]);
    const deltas: string[] = [];

    const result = await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "What next?" }, (d) => deltas.push(d));

    expect(deltas).toEqual(["Research ", "is the gap."]);
    expect(result).toEqual({ conversationId: "conv-1", conversationTitle: "Research gap", assistantMessageId: "msg-1", degraded: false });
  });
});

describe("streamAdvisorChat — a frame split across multiple network chunks", () => {
  test("a delta frame's JSON split mid-string still parses correctly, not silently dropped", async () => {
    // The single frame 'data: {"type":"delta","text":"Research is the gap."}\n\n' arrives in
    // three separate chunks, splitting the JSON body itself, not just the frame boundary.
    mockOkStream([
      'data: {"type":"delta","tex',
      't":"Research is the gap."}',
      '\n\ndata: {"type":"done","assistantMessageId":"msg-1","degraded":false}\n\n',
    ]);
    const deltas: string[] = [];

    const result = await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "What next?" }, (d) => deltas.push(d));

    expect(deltas).toEqual(["Research is the gap."]);
    expect(result.assistantMessageId).toBe("msg-1");
  });

  test("two full frames arrive glued together in one chunk, still split into two events", async () => {
    mockOkStream([
      'data: {"type":"delta","text":"A"}\n\ndata: {"type":"delta","text":"B"}\n\ndata: {"type":"done","assistantMessageId":"msg-1"}\n\n',
    ]);
    const deltas: string[] = [];

    await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "x" }, (d) => deltas.push(d));

    expect(deltas).toEqual(["A", "B"]);
  });
});

describe("streamAdvisorChat — the error event", () => {
  test("an error event mid-generation resolves with its message, not a delta", async () => {
    mockOkStream([
      'data: {"type":"delta","text":"partial"}\n\n',
      'data: {"type":"error","message":"Proxola couldn\'t complete this response.","assistantMessageId":"msg-failed"}\n\n',
    ]);
    const deltas: string[] = [];

    const result = await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "x" }, (d) => deltas.push(d));

    expect(deltas).toEqual(["partial"]);
    expect(result).toEqual({ error: "Proxola couldn't complete this response.", assistantMessageId: "msg-failed" });
  });
});

describe("streamAdvisorChat — a non-ok response never opens as a stream", () => {
  test("a 429/403/404/409 guard failure is read as plain JSON, not parsed as SSE frames", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, body: null, json: async () => ({ error: "Too many requests." }) }));

    const result = await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "x" }, () => {});

    expect(result).toEqual({ error: "Too many requests.", conversationId: undefined, conversationTitle: undefined, assistantMessageId: undefined });
  });
});

describe("streamAdvisorChat — the connection drops before any final event", () => {
  test("a stream that closes with no done/error event still resolves with a real error, not hangs or silently succeeds", async () => {
    mockOkStream(['data: {"type":"delta","text":"partial"}\n\n']); // closes here, no done/error

    const result = await streamAdvisorChat("/api/advisor/chat", { conversationId: null, content: "x" }, () => {});

    expect(result.error).toBeTruthy();
    expect(result.conversationId).toBeUndefined();
  });
});
