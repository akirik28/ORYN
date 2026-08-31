/**
 * The app's error-reporting entry point (spec Phase 33/45/76). Import `reportError` from
 * here; never construct a reporter directly.
 *
 * Configuration is read from `process.env` here rather than from `lib/env.ts`. Two
 * reasons: this module is loaded from the root `instrumentation.ts` during server
 * bootstrap and from both the Node and Edge runtimes, so it must not pull in a module
 * graph that assumes either; and monitoring must keep working even if env plumbing
 * elsewhere is misconfigured — it is the thing that reports such misconfiguration.
 * Folding SENTRY_* into lib/env.ts later is a safe, mechanical follow-up.
 */
import "server-only";

import { ConsoleErrorReporter, SentryErrorReporter } from "./sentry-reporter";
import type { ErrorContext, ErrorReporter, ErrorSeverity } from "./types";

export type { ErrorContext, ErrorReporter, ErrorSeverity } from "./types";

function currentRuntime(): string {
  return process.env.NEXT_RUNTIME ?? "nodejs";
}

/**
 * Vercel sets VERCEL_ENV (production | preview | development) and
 * VERCEL_GIT_COMMIT_SHA automatically, so a correct environment/release tag needs no
 * manual configuration there; both are overridable for other hosts.
 */
function resolveEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

function resolveRelease(): string | undefined {
  const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA;
  return release && release.length > 0 ? release : undefined;
}

let cached: ErrorReporter | null = null;

/** Lazily built and memoized — reading env on every error would be wasted work. */
export function getErrorReporter(): ErrorReporter {
  if (cached) return cached;
  const dsn = process.env.SENTRY_DSN;
  const reporter = new SentryErrorReporter(dsn, {
    environment: resolveEnvironment(),
    release: resolveRelease(),
    serverName: process.env.VERCEL_REGION,
    runtime: currentRuntime(),
  });
  cached = reporter.isConfigured() ? reporter : new ConsoleErrorReporter();
  return cached;
}

/** Test-only: clears the memoized reporter so env changes take effect. */
export function resetErrorReporterForTests(): void {
  cached = null;
}

/** True when a real backend is configured — surfaced by the integrations health check. */
export function isMonitoringConfigured(): boolean {
  return getErrorReporter().isConfigured();
}

/**
 * Reports an error. Safe to call from anywhere on the server, including inside a `catch`
 * that is about to rethrow: it never throws and never rejects.
 */
export async function reportError(error: unknown, context?: ErrorContext, severity: ErrorSeverity = "error"): Promise<void> {
  await getErrorReporter().captureError(error, context, severity);
}
