import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoopClosingStats } from "@/lib/admin/queries";

/**
 * The single number oryn-a7 called "the most important anyone has produced tonight" —
 * rendered as a raw fraction, deliberately never a percentage. At this sample size a
 * percent sign claims precision the count doesn't support, and it invites "why is
 * completion so low" when the honest question is "is there enough history to have an
 * opinion yet." See getLoopClosingStats's own doc comment.
 */
export async function GrowthLoopClosingSection() {
  const t = await getTranslations("admin.growth.loopClosing");
  const admin = createAdminClient();
  const stats = await getLoopClosingStats(admin);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <div className="space-y-2 rounded-lg border px-4 py-3">
        <p className="text-lg font-semibold tabular-nums">{t("fraction", { completed: stats.byStatus.completed, total: stats.totalActions })}</p>
        <p className="text-xs text-muted-foreground">{t("planCount", { count: stats.totalPlans, formatted: formatNumber(stats.totalPlans) })}</p>
        <p className="border-t pt-2 text-xs text-muted-foreground">{t("notEnoughData")}</p>
      </div>
    </section>
  );
}
