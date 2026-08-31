/**
 * Pure construction of a Sentry "envelope" — DSN parsing and payload assembly with no
 * network I/O, so both are directly unit-testable.
 *
 * We speak Sentry's ingest protocol over plain `fetch` instead of depending on
 * `@sentry/nextjs`. Same reasoning the Tavily provider gives for skipping its SDK: the
 * wire format is small and stable, and a typed wrapper beats a dependency. It also keeps
 * `next.config.ts` untouched (the official SDK requires wrapping it) and works unchanged
 * against any envelope-compatible backend, e.g. self-hosted Sentry or GlitchTip.
 *
 * Protocol reference: https://develop.sentry.dev/sdk/data-model/envelopes/
 * Event fields:      https://develop.sentry.dev/sdk/data-model/event-payloads/
 */
import { redactHeaders, redactPath, redactTags, redactValue, truncate } from "./redact";
import type { ErrorContext, ErrorSeverity } from "./types";

export interface ParsedDsn {
  /** Full URL to POST envelopes to. */
  readonly envelopeUrl: string;
  /** The DSN echoed back inside the envelope header, which is how we authenticate. */
  readonly dsn: string;
}

/**
 * Parses `https://<publicKey>@<host>/<projectId>` into an ingest endpoint.
 * Returns null for anything malformed — a bad DSN must disable reporting quietly, never
 * throw at import time and take the server down with it.
 */
export function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.username) return null;
    const projectId = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!projectId || !/^\d+$/.test(projectId)) return null;
    return { envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`, dsn };
  } catch {
    return null;
  }
}

/** 32 lowercase hex chars, no dashes — Sentry rejects anything else. */
export function newEventId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 32; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

/** Splits an Error's `stack` into Sentry's frame shape, innermost-last as the API expects. */
function toStacktrace(stack: string | undefined): { frames: { filename: string; function: string; lineno?: number; colno?: number }[] } | undefined {
  if (!stack) return undefined;
  const frames = stack
    .split("\n")
    .slice(1)
    .map((line) => /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ function: match[1] ?? "<anonymous>", filename: truncate(match[2], 300), lineno: Number(match[3]), colno: Number(match[4]) }))
    .reverse();
  return frames.length > 0 ? { frames } : undefined;
}

export interface EnvelopeOptions {
  readonly environment: string;
  readonly release?: string;
  readonly serverName?: string;
  readonly runtime: string;
}

/**
 * Builds the newline-delimited envelope body. `error` is `unknown` because
 * `onRequestError` and `catch` blocks both hand over untyped values.
 */
export function buildEnvelope(dsn: ParsedDsn, error: unknown, context: ErrorContext | undefined, severity: ErrorSeverity, options: EnvelopeOptions): string {
  const eventId = newEventId();
  const sentAt = new Date().toISOString();

  const asError = error instanceof Error ? error : null;
  const type = asError?.name ?? (typeof error === "object" && error !== null ? "UnknownError" : typeof error);
  const value = asError?.message ?? (typeof error === "string" ? error : safeStringify(error));

  // `digest` is how Next.js correlates a client-visible error id with the server error
  // (see instrumentation.js docs) — the single most useful field for triage, so surface
  // it as a tag rather than burying it in `extra`.
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : undefined;

  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "node",
    level: severity,
    logger: context?.source ?? "oryn",
    environment: options.environment,
    ...(options.release ? { release: options.release } : {}),
    ...(options.serverName ? { server_name: options.serverName } : {}),
    exception: { values: [{ type: truncate(String(type), 200), value: truncate(String(value)), ...(toStacktrace(asError?.stack) ? { stacktrace: toStacktrace(asError?.stack) } : {}) }] },
    tags: redactTags({
      runtime: options.runtime,
      ...(context?.source ? { source: context.source } : {}),
      ...(context?.route ? { route: redactPath(context.route) } : {}),
      ...(context?.method ? { method: context.method } : {}),
      ...(digest ? { digest } : {}),
      ...context?.tags,
    }),
    ...(context?.extra ? { extra: redactValue(context.extra) as Record<string, unknown> } : {}),
  };

  const header = JSON.stringify({ event_id: eventId, dsn: dsn.dsn, sent_at: sentAt });
  const payload = JSON.stringify(event);
  // `length` is in BYTES, not characters — a stack trace with non-ASCII path segments
  // would otherwise declare a short length and get the item truncated by Relay.
  const itemHeader = JSON.stringify({ type: "event", length: new TextEncoder().encode(payload).length, content_type: "application/json" });
  return `${header}\n${itemHeader}\n${payload}\n`;
}

/** Last-resort stringify: an unserializable (e.g. cyclic) value must not throw here. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export { redactHeaders };
