import { describe, expect, it } from "vitest";
import { buildEnvelope, newEventId, parseDsn } from "@/lib/monitoring/sentry-envelope";

const DSN = "https://abc123@o1.ingest.sentry.io/456";
const OPTIONS = { environment: "production", release: "deadbeef", serverName: "iad1", runtime: "nodejs" };

describe("parseDsn", () => {
  it("derives the envelope endpoint from a valid DSN", () => {
    expect(parseDsn(DSN)?.envelopeUrl).toBe("https://o1.ingest.sentry.io/api/456/envelope/");
  });

  it("supports a self-hosted host and port (GlitchTip et al)", () => {
    expect(parseDsn("http://key@localhost:8000/2")?.envelopeUrl).toBe("http://localhost:8000/api/2/envelope/");
  });

  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["not a url", "nonsense"],
    ["missing public key", "https://o1.ingest.sentry.io/456"],
    ["missing project id", "https://abc123@o1.ingest.sentry.io/"],
    ["non-numeric project id", "https://abc123@o1.ingest.sentry.io/not-a-number"],
    ["unsupported scheme", "ftp://abc123@host/1"],
  ])("returns null for a %s DSN instead of throwing", (_label, value) => {
    expect(parseDsn(value)).toBeNull();
  });
});

describe("newEventId", () => {
  it("is 32 lowercase hex chars with no dashes, as Sentry requires", () => {
    expect(newEventId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not collide across calls", () => {
    expect(new Set(Array.from({ length: 50 }, newEventId)).size).toBe(50);
  });
});

describe("buildEnvelope", () => {
  const dsn = parseDsn(DSN)!;

  function parse(body: string) {
    const [header, itemHeader, payload] = body.split("\n");
    return { header: JSON.parse(header), itemHeader: JSON.parse(itemHeader), event: JSON.parse(payload) };
  }

  it("emits the three-line envelope structure with a matching event_id", () => {
    const { header, itemHeader, event } = parse(buildEnvelope(dsn, new Error("boom"), undefined, "error", OPTIONS));
    expect(header.dsn).toBe(DSN);
    expect(header.event_id).toBe(event.event_id);
    expect(itemHeader.type).toBe("event");
    expect(itemHeader.content_type).toBe("application/json");
  });

  it("declares item length in bytes, not characters", () => {
    const body = buildEnvelope(dsn, new Error("ünïcödé — ağırlıklı"), undefined, "error", OPTIONS);
    const [, itemHeader, payload] = body.split("\n");
    expect(JSON.parse(itemHeader).length).toBe(new TextEncoder().encode(payload).length);
    expect(JSON.parse(itemHeader).length).toBeGreaterThan(payload.length);
  });

  it("carries the exception type, message and environment", () => {
    const { event } = parse(buildEnvelope(dsn, new TypeError("bad input"), undefined, "error", OPTIONS));
    expect(event.exception.values[0].type).toBe("TypeError");
    expect(event.exception.values[0].value).toBe("bad input");
    expect(event.environment).toBe("production");
    expect(event.release).toBe("deadbeef");
    expect(event.level).toBe("error");
  });

  it("surfaces a Next.js error digest as a searchable tag", () => {
    const error = Object.assign(new Error("server component failed"), { digest: "1234567890" });
    const { event } = parse(buildEnvelope(dsn, error, undefined, "error", OPTIONS));
    expect(event.tags.digest).toBe("1234567890");
  });

  it("strips the query string from a route tag", () => {
    const { event } = parse(buildEnvelope(dsn, new Error("x"), { route: "/app/x?token=secret" }, "error", OPTIONS));
    expect(event.tags.route).toBe("/app/x");
  });

  it("redacts secrets passed through extra", () => {
    const body = buildEnvelope(dsn, new Error("x"), { extra: { apiKey: "sk-live-abc" } }, "error", OPTIONS);
    expect(body).not.toContain("sk-live-abc");
    expect(parse(body).event.extra.apiKey).toBe("[redacted]");
  });

  it("handles a thrown non-Error value", () => {
    const { event } = parse(buildEnvelope(dsn, "just a string", undefined, "error", OPTIONS));
    expect(event.exception.values[0].value).toBe("just a string");
  });

  it("handles a thrown null without throwing", () => {
    expect(() => buildEnvelope(dsn, null, undefined, "error", OPTIONS)).not.toThrow();
  });

  it("parses a stack into frames, innermost last", () => {
    const error = new Error("with stack");
    error.stack = "Error: with stack\n    at inner (/app/a.ts:1:2)\n    at outer (/app/b.ts:3:4)";
    const { event } = parse(buildEnvelope(dsn, error, undefined, "error", OPTIONS));
    expect(event.exception.values[0].stacktrace.frames.map((f: { function: string }) => f.function)).toEqual(["outer", "inner"]);
    expect(event.exception.values[0].stacktrace.frames[1]).toMatchObject({ filename: "/app/a.ts", lineno: 1, colno: 2 });
  });

  it("omits release and server_name when they are unknown", () => {
    const { event } = parse(buildEnvelope(dsn, new Error("x"), undefined, "error", { environment: "development", runtime: "nodejs" }));
    expect(event.release).toBeUndefined();
    expect(event.server_name).toBeUndefined();
  });
});
