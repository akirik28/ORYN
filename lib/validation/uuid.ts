const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Gate for any caller-supplied id (route param, Server Action argument) before it reaches
 * a query — e.g. `app/(app)/u/[id]/page.tsx`, `lib/social/connections.ts`'s
 * `getConnectionWith`. Framework-agnostic on purpose (no `server-only`, no Supabase import)
 * so it stays unit-testable without pulling in anything that needs a request context. */
export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value);
}
