import { notFound } from "next/navigation";

// Unauthenticated verification route, same purpose as design-preview/admin: requireAdmin()
// lives only in app/(admin)/layout.tsx, never in these page components themselves, so
// rendering the six new screens directly here (same light-green wrapper the real layout
// applies, no ControlRail -- that component isn't mine to touch) exercises the real
// components against real live data without an admin session. Dev-only.
import OverviewPage from "../../../(admin)/kumanda/page";
import ProfitLossPage from "../../../(admin)/kumanda/kar-zarar/page";
import TrafficPage from "../../../(admin)/kumanda/trafik/page";
import CommunityPage from "../../../(admin)/kumanda/topluluk/page";
import ResearchQueuePage from "../../../(admin)/kumanda/arastirma/page";
import SettingsPage from "../../../(admin)/kumanda/ayarlar/page";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b pb-2 text-xl font-bold" style={{ borderColor: "var(--admin-border)", color: "var(--admin-ink-1)" }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

export default async function KumandaPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div data-surface="admin" data-admin-tone="light" style={{ background: "var(--admin-bg)", color: "var(--admin-ink-1)" }}>
      <div className="mx-auto max-w-[1200px] space-y-16 p-8">
        <Section label="Overview (/kumanda)">
          <OverviewPage />
        </Section>
        <Section label="Profit & Loss (/kumanda/kar-zarar)">
          <ProfitLossPage />
        </Section>
        <Section label="Traffic (/kumanda/trafik)">
          <TrafficPage />
        </Section>
        <Section label="Community (/kumanda/topluluk)">
          <CommunityPage />
        </Section>
        <Section label="Research queue (/kumanda/arastirma)">
          <ResearchQueuePage />
        </Section>
        <Section label="Settings (/kumanda/ayarlar)">
          <SettingsPage />
        </Section>
      </div>
    </div>
  );
}
