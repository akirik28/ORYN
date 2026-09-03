import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/proxola/page-header";
import { CONTROL_DESTINATIONS } from "@/features/admin/control-rail";

/**
 * Catch-all for control-centre routes the rail offers but nobody has built yet.
 *
 * Next matches a specific route before this one, so every screen that exists wins and this
 * file never runs for it -- which means it needs no maintenance as screens land. It exists
 * because of a specific confusion this shell would otherwise create: requireAdmin() 404s
 * rather than redirecting (deliberately -- it must not reveal that a panel exists), so an
 * unbuilt screen and a permission failure were byte-identical. The founder, who has never
 * had is_admin, would have clicked five rail entries on his first visit and had no way to
 * tell "not written yet" from "you can't see this."
 *
 * A path the rail does not offer is still a 404: this softens an honest gap, it does not
 * turn every typo into a feature announcement.
 */
export default async function PendingControlScreen({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (!CONTROL_DESTINATIONS.includes(`/kumanda/${slug.join("/")}`)) notFound();

  const t = await getTranslations("admin.control");
  return (
    <div className="space-y-6">
      <PageHeader title={t("pendingTitle")} description={t("pendingDescription")} />
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-2)" }}
      >
        {t("pendingBody")}
      </div>
    </div>
  );
}
