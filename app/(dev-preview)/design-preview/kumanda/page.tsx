import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ControlRail } from "@/features/admin/control-rail";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { SpendSummarySection } from "@/features/admin/sections/spend-summary-section";
import { ProviderHealthSection } from "@/features/admin/sections/provider-health-section";
import { UserListSection } from "@/features/admin/sections/user-list-section";
import { PreviewToolbar } from "../preview-toolbar";

/**
 * The control centre's shell, rendered without requireAdmin() so it can actually be looked at.
 *
 * Why this exists: /kumanda 404s for everyone without is_admin, and no account has it. The
 * founder has never seen it; oryn-60 migrated fourteen sections into it able to verify the
 * light tone only at the CSS level; I built the rail and could confirm nothing beyond the
 * route registering in a build log. A surface nobody can look at is exactly where the two
 * visual defects found tonight lived -- both passed typecheck, lint, 5000+ tests and the
 * build, and both failed the moment someone rendered them.
 *
 * This mounts the REAL ControlRail and REAL sections against real data, in the real
 * app/(admin)/layout.tsx tone pair (data-surface + data-admin-tone), so what shows up here
 * is what an admin gets -- not a mock of it. The rail's links point at the gated routes and
 * will 404 from here; that is expected, this is for looking, not clicking.
 *
 * Three sections, not fourteen: enough to judge type, spacing, contrast and how a panel sits
 * on the light ground. The per-route composition is oryn-60's migration and is checked by
 * next build, not by eye.
 */
export default async function ControlCentrePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div data-surface="admin" data-admin-tone="light" className="flex min-h-svh flex-col lg:flex-row"
         style={{ background: "var(--admin-bg)", color: "var(--admin-ink-1)" }}>
      <ControlRail />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <p className="rounded-lg border px-4 py-2 text-xs"
             style={{ borderColor: "var(--admin-border-strong)", color: "var(--admin-ink-2)" }}>
            Design preview (dev only, no requireAdmin() gate) — the real rail and real sections
            against live data. Rail links point at the gated routes and will 404 from here.
          </p>
          <Suspense fallback={<SectionSkeleton rows={4} />}><SpendSummarySection /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><ProviderHealthSection /></Suspense>
          <Suspense fallback={<SectionSkeleton />}><UserListSection /></Suspense>
        </div>
      </main>
      <PreviewToolbar />
    </div>
  );
}
