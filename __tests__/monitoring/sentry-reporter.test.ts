import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleErrorReporter, SentryErrorReporter } from "@/lib/monitoring/sentry-reporter";

const DSN = "https://abc123@o1.ingest.sentry.io/456";
const OPTIONS = { environment: "production", runtime: "nodejs" };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SentryErrorReporter", () => {
  it("is not configured without a DSN, and sends nothing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const reporter = new SentryErrorReporter(undefined, OPTIONS);
    expect(reporter.isConfigured()).toBe(false);
    await reporter.captureError(new Error("boom"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats a malformed DSN as unconfigured rather than throwing", () => {
    expect(new SentryErrorReporter("not-a-dsn", OPTIONS).isConfigured()).toBe(false);
  });

  it("POSTs an envelope to the derived endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await new SentryErrorReporter(DSN, OPTIONS).captureError(new Error("boom"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://o1.ingest.sentry.io/api/456/envelope/");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/x-sentry-envelope");
    expect(init.cache).toBe("no-store");
    expect(String(init.body)).toContain("boom");
  });

  it("never rejects when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(new SentryErrorReporter(DSN, OPTIONS).captureError(new Error("boom"))).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("never rejects when Sentry returns a non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 429 })));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(new SentryErrorReporter(DSN, OPTIONS).captureError(new Error("boom"))).resolves.toBeUndefined();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("429");
  });

  it("aborts rather than hanging forever", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))))
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    const pending = new SentryErrorReporter(DSN, OPTIONS).captureError(new Error("boom"));
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("does not leak an authorization header into the request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await new SentryErrorReporter(DSN, OPTIONS).captureError(new Error("boom"), { extra: { headers: { authorization: "Bearer leak-me" } } });
    expect(String(fetchSpy.mock.calls[0][1].body)).not.toContain("leak-me");
  });
});

describe("ConsoleErrorReporter", () => {
  it("reports as unconfigured but still writes to stderr", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reporter = new ConsoleErrorReporter();
    expect(reporter.isConfigured()).toBe(false);
    await reporter.captureError(new Error("boom"), { source: "cron", route: "/api/jobs/x" });
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain("cron");
  });
});
