"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/oryn/error-state";

// Route-level error boundary for everything under app/(app)/** — Advisor, Applications,
// Connections, Dashboard, Documents, Opportunities, Plan, Profile, Universities, and every
// other page in this segment. Per Next's error.js convention this wraps page.tsx and any
// nested layouts in a React error boundary, but NOT app/(app)/layout.tsx itself — the
// sidebar/nav shell stays mounted and interactive, so a crash on one page never strands the
// student without navigation. Before this file existed, any uncaught render error here (a
// failed Supabase query, a bad AI/provider response, etc.) fell through to Next's bare
// built-in error page — unstyled, no way back into the app. AGENTS.md PHASE 45: errors must
// be human-readable, never a raw error code; PHASE 8: an external/internal failure must not
// crash the application. Reuses the existing ErrorState primitive (components/oryn/error-
// state.tsx) rather than inventing a second one — no new hardcoded final copy, just the
// generic "something went wrong, try again" case every route needs.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errors.appError");

  useEffect(() => {
    // Server Component errors arrive with a generic message + digest in production (Next
    // strips the real message/stack to avoid leaking server details to the client) — this
    // is deliberately the only place that error surfaces, matched against server logs by
    // digest, never shown to the student verbatim.
    console.error("[app] unhandled route error", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <ErrorState
          description={t("description")}
          retry={
            <div className="flex gap-2">
              <Button size="sm" onClick={retry}>
                {t("tryAgain")}
              </Button>
              <Button size="sm" variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
                {t("backToDashboard")}
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
