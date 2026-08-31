/**
 * Scrubbing applied to every payload before it leaves the process for a third party.
 *
 * This matters more here than in a typical app: Oryn's users are largely minors (spec
 * §12), and an error report is the one payload that ships raw runtime state to an
 * external vendor. Spec Phase 76 is explicit — never log API keys, avoid logging student
 * document content. So this module is an *allow*-list wherever a denylist would silently
 * miss a new field.
 *
 * Pure functions, no I/O, no `server-only` — so the guarantees below are unit-testable.
 */

/**
 * Request headers that may be forwarded. Everything else is dropped, so a newly
 * introduced auth/session header can never leak by default. `cookie`, `authorization`
 * and `x-vercel-*` identity headers are absent on purpose.
 */
const HEADER_ALLOWLIST = new Set(["user-agent", "referer", "content-type", "accept-language", "x-vercel-cron-schedule", "x-vercel-id"]);

/** Substring markers for keys whose *values* must never be transmitted. */
const SECRET_KEY_MARKERS = ["secret", "token", "password", "passwd", "apikey", "api_key", "authorization", "auth", "cookie", "session", "credential", "dsn", "signature", "private"];

/** Hard ceilings: a runaway string must not turn one error into a megabyte upload. */
export const MAX_STRING_LENGTH = 1_000;
/** Sentry drops tag values over 200 chars server-side; truncate before sending. */
export const MAX_TAG_LENGTH = 200;
const MAX_EXTRA_KEYS = 30;

function isSecretKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return SECRET_KEY_MARKERS.some((marker) => lowered.includes(marker));
}

export function truncate(value: string, max: number = MAX_STRING_LENGTH): string {
  return value.length <= max ? value : `${value.slice(0, max)}…[truncated ${value.length - max}]`;
}

/**
 * Strips the query string and fragment from a path. Query params are where ids, emails
 * and one-time tokens end up, and the global rule is that sensitive data never belongs in
 * a URL — so the path is reported without them rather than trusting each call site.
 */
export function redactPath(path: string): string {
  const cut = path.search(/[?#]/);
  return truncate(cut === -1 ? path : path.slice(0, cut), MAX_TAG_LENGTH);
}

/**
 * The value type includes `undefined` because Next's `onRequestError` hands over a
 * `Dict<string | string[]>`, whose index signature is optional — a header key can be
 * present with no value.
 */
export function redactHeaders(headers: Record<string, string | string[] | undefined> | undefined): Record<string, string> {
  if (!headers) return {};
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const lowered = key.toLowerCase();
    if (!HEADER_ALLOWLIST.has(lowered)) continue;
    safe[lowered] = truncate(Array.isArray(value) ? value.join(", ") : value, MAX_TAG_LENGTH);
  }
  return safe;
}

/**
 * Recursively redacts an arbitrary structure: secret-looking keys become "[redacted]",
 * long strings are truncated, and depth/breadth are bounded so a cyclic or enormous
 * object can't be serialized into an unbounded payload.
 */
export function redactValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: truncate(value.message) };
  if (depth >= 3) return "[depth limit]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, MAX_EXTRA_KEYS)) {
      out[key] = isSecretKey(key) ? "[redacted]" : redactValue(nested, depth + 1);
    }
    return out;
  }
  // Functions, symbols and anything else exotic: report the type, never the value.
  return `[${typeof value}]`;
}

export function redactTags(tags: Record<string, string | undefined> | undefined): Record<string, string> {
  if (!tags) return {};
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (value === undefined) continue;
    safe[key] = isSecretKey(key) ? "[redacted]" : truncate(value, MAX_TAG_LENGTH);
  }
  return safe;
}
