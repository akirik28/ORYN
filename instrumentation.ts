/**
 * Next.js instrumentation hook (App Router, Next 16 — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
 *
 * `onRequestError` is the framework's official server-error hook: it fires for uncaught
 * errors in Server Components, Route Handlers, Server Actions and proxy, which is every
 * server surface this app has. Wiring it here is what turns lib/monitoring from an unused
 * module into actual error tracking — without it the app would ship a monitoring
 * abstraction that nothing ever calls.
 *
 * Note the request URL is deliberately NOT forwarded verbatim: `redactPath` drops the
 * query string, and only allow-listed headers travel. See lib/monitoring/redact.ts.
 */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Imported lazily so the Sentry module graph is only loaded when an error actually
  // happens, and so a failure inside monitoring can't break server startup.
  const [{ reportError }, { redactHeaders, redactPath }] = await Promise.all([import("@/lib/monitoring"), import("@/lib/monitoring/redact")]);

  await reportError(
    err,
    {
      source: "instrumentation",
      route: context.routePath,
      method: request.method,
      tags: {
        router: context.routerKind === "App Router" ? "app" : "pages",
        route_type: context.routeType,
        ...(context.renderSource ? { render_source: context.renderSource } : {}),
        ...(context.revalidateReason ? { revalidate_reason: context.revalidateReason } : {}),
      },
      extra: {
        path: redactPath(request.path),
        headers: redactHeaders(request.headers),
      },
    },
    // A failed render/route is a hard failure for the student in front of it, so these
    // are "error", not "warning" — the severity floor for anything reaching this hook.
    "error"
  );
};
