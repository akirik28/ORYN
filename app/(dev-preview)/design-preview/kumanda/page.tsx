import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ControlRail } from "@/features/admin/control-rail";
import { PreviewToolbar } from "../preview-toolbar";
import OverviewPage from "../../../(admin)/kumanda/page";
import ProfitLossPage from "../../../(admin)/kumanda/kar-zarar/page";
import TrafficPage from "../../../(admin)/kumanda/trafik/page";
import CommunityPage from "../../../(admin)/kumanda/topluluk/page";
import ResearchQueuePage from "../../../(admin)/kumanda/arastirma/page";
import SettingsPage from "../../../(admin)/kumanda/ayarlar/page";

/**
 * The control centre, visible without an admin account.
 *
 * /kumanda 404s for everyone without is_admin and no account has it, so nobody has ever
 * seen it: not the founder, not the lane that migrated fourteen sections into it, not the
 * lane that built these six screens. That is exactly where tonight's two visual defects
 * lived -- a glyph falling back to viewport height, and three elements stacked on one point
 * -- both of which passed typecheck, lint, 5000+ tests and the build, and both of which
 * failed the moment somebody rendered them.
 *
 * Two sessions independently built this file within an hour of each other and collided on
 * merge, each covering the half they owned: the real ControlRail and shell tone, and the
 * six real page components rendered against live data. Neither half is redundant, so this
 * is both. requireAdmin() lives only in app/(admin)/layout.tsx, never in the page
 * components, which is what lets them render here unauthenticated.
 *
 * Rail links point at the gated routes and will 404 from here -- this is for looking, not
 * clicking. Dev-only; the production guard is below.
 */
function Screen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2
        className="mb-4 border-b pb-2 text-xl font-bold"
        style={{ borderColor: "var(--admin-border)", color: "var(--admin-ink-1)" }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

export default async function KumandaPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div
      data-surface="admin"
      data-admin-tone="light"
      className="flex min-h-svh flex-col lg:flex-row"
      style={{ background: "var(--admin-bg)", color: "var(--admin-ink-1)" }}
    >
      <ControlRail />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16">
          <p
            className="rounded-lg border px-4 py-2 text-xs"
            style={{ borderColor: "var(--admin-border-strong)", color: "var(--admin-ink-2)" }}
          >
            Design preview (dev only, no requireAdmin() gate) — the real rail and the real
            screens against live data. Rail links point at the gated routes and 404 from here.
          </p>
          <Screen label="Overview (/kumanda)"><OverviewPage /></Screen>
          <Screen label="Kâr &amp; Zarar (/kumanda/kar-zarar)"><ProfitLossPage /></Screen>
          <Screen label="Trafik (/kumanda/trafik)"><TrafficPage /></Screen>
          <Screen label="Topluluk (/kumanda/topluluk)"><CommunityPage /></Screen>
          <Screen label="Araştırma (/kumanda/arastirma)"><ResearchQueuePage /></Screen>
          <Screen label="Ayarlar (/kumanda/ayarlar)"><SettingsPage /></Screen>
        </div>
      </main>
      <PreviewToolbar />
    </div>
  );
}
