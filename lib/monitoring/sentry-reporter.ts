/**
 * Sentry-compatible `ErrorReporter` over plain fetch.
 *
 * Deliberately does NOT go through `lib/providers/fetch-json.ts`, even though that is the
 * house HTTP wrapper: it records provider_health into Supabase on every call, and an
 * error reporter that writes to the database on failure can feed itself — a DB outage
 * raises an error, reporting it writes to the DB, that write fails, and so on. The
 * reporter has to be the one component with no dependency on the rest of the system.
 */
import { buildEnvelope, parseDsn, type EnvelopeOptions, type ParsedDsn } from "./sentry-envelope";
import type { ErrorContext, ErrorReporter, ErrorSeverity } from "./types";

/** Short by design: a failing request must not hold a serverless invocation open. */
const SEND_TIMEOUT_MS = 4_000;

export class SentryErrorReporter implements ErrorReporter {
  private readonly dsn: ParsedDsn | null;
  private readonly options: EnvelopeOptions;

  constructor(dsn: string | undefined, options: EnvelopeOptions) {
    this.dsn = parseDsn(dsn);
    this.options = options;
  }

  isConfigured(): boolean {
    return this.dsn !== null;
  }

  async captureError(error: unknown, context?: ErrorContext, severity: ErrorSeverity = "error"): Promise<void> {
    if (!this.dsn) return;

    // The whole method is wrapped: every failure mode below (serialization, DNS, TLS,
    // timeout, non-2xx) must end as a console line, never a thrown value, because the
    // caller is usually already handling a different error.
    try {
      const body = buildEnvelope(this.dsn, error, context, severity, this.options);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      try {
        const response = await fetch(this.dsn.envelopeUrl, {
          method: "POST",
          headers: { "content-type": "application/x-sentry-envelope" },
          body,
          signal: controller.signal,
          // Never let a reporting POST be served from or written to any cache.
          cache: "no-store",
        });
        if (!response.ok) {
          console.error(`[monitoring] Sentry rejected the event (HTTP ${response.status}).`);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (reportingError) {
      // Log the reporting failure itself, not the original error — the original is the
      // caller's to handle, and re-logging it here would double every stack trace.
      console.error("[monitoring] failed to deliver error report:", reportingError instanceof Error ? reportingError.message : reportingError);
    }
  }
}

/**
 * Used whenever SENTRY_DSN is absent — local development and any deployment that hasn't
 * configured monitoring yet. Logs to stderr so errors are still visible in platform logs
 * rather than vanishing (spec Phase 72: an unconfigured integration must be visibly
 * unconfigured, not silently pretend to work).
 */
export class ConsoleErrorReporter implements ErrorReporter {
  isConfigured(): boolean {
    return false;
  }

  async captureError(error: unknown, context?: ErrorContext, severity: ErrorSeverity = "error"): Promise<void> {
    const where = [context?.source, context?.method, context?.route].filter(Boolean).join(" ");
    console.error(`[monitoring:${severity}]${where ? ` ${where}` : ""}`, error);
  }
}
