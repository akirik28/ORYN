/**
 * Provider-agnostic error-reporting contract (spec Phase 33/76: observability that does
 * not couple the app to one vendor, mirroring the `AIProvider` / `UniversityDataProvider`
 * abstractions). Sentry is the shipped implementation; GlitchTip and any other
 * Sentry-envelope-compatible backend work through the same DSN without a code change.
 *
 * Deliberately not `server-only` so the pure pieces stay unit-testable.
 */

/** Sentry's severity vocabulary — kept verbatim so no translation layer is needed. */
export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

/** Where an error surfaced. Becomes searchable Sentry tags, so values stay low-cardinality. */
export interface ErrorContext {
  /** Subsystem that caught the error, e.g. "instrumentation" or "cron". */
  readonly source?: string;
  /** Route file path (`/app/api/jobs/[name]/route`), never a URL with query params. */
  readonly route?: string;
  /** HTTP method, when the error happened while serving a request. */
  readonly method?: string;
  /** Extra low-cardinality labels. Values are stringified and truncated by the redactor. */
  readonly tags?: Readonly<Record<string, string | undefined>>;
  /**
   * Structured detail for debugging. Runs through the redactor before it leaves the
   * process — never put student document content or credentials here regardless.
   */
  readonly extra?: Readonly<Record<string, unknown>>;
}

export interface ErrorReporter {
  /** True when a real backend is configured; false means every call is a no-op. */
  isConfigured(): boolean;
  /**
   * Reports an error. MUST NOT throw and MUST NOT reject — a failing reporter can never
   * be allowed to take down the request that was already failing.
   */
  captureError(error: unknown, context?: ErrorContext, severity?: ErrorSeverity): Promise<void>;
}
