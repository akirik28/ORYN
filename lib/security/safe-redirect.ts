/**
 * Same-origin relative path check for post-auth redirect targets that come from a URL
 * query param (app/auth/confirm/route.ts's `next`) — an unvalidated value there is a
 * classic open-redirect: a link that reads as this app's own trusted domain in preview
 * text, bouncing to an attacker-controlled site once a real token confirms.
 *
 * A leading "/" but not "//" is the standard check — "//evil.com" is a protocol-relative
 * URL (still resolves to an external host in a browser), not a same-origin path.
 */
export function isSafeRedirectTarget(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
