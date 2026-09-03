import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDegradeStanding } from "@/lib/admin/queries";
import { BarChart } from "@/components/proxola/charts/bar-chart";

const BUCKET_LABELS = ["1–20%", "21–40%", "41–60%", "61–80%", "81–100%"];

/** Which of the five 20-point bands a degraded student's fractionDegraded (0 < f <= 1) falls
 *  into, 0-indexed. Only ever called on rows already filtered to degradedCallsThisMonth > 0
 *  (see below) — a student never degraded doesn't belong in any band, not band 0. */
function bucketIndex(fractionDegraded: number): number {
  return Math.min(4, Math.max(0, Math.ceil(fractionDegraded * 5) - 1));
}

/**
 * "Nobody has ever seen that as a distribution" (oryn-a7, 2026-09-02) — how many students
 * have been degraded this month, and what share of each one's own usage ran on the cheaper
 * model. Also the first real screen reading of the degraded/degrade_reason columns
 * lib/ai/usage.ts fixed writing correctly tonight — see getDegradeStanding's own doc comment
 * for why a page of zeros here isn't necessarily "healthy" rather than "not enough traffic
 * yet," and why the raw totalStudentsWithUsage/studentsEverDegraded counts render plainly
 * instead of a derived percentage: at today's real volume a computed rate would be exactly
 * the small-sample noise this codebase's own peer-benchmarking discipline already refuses to
 * dress up as a statistic elsewhere (lib/admin/queries.ts's getProductActivity).
 */
export async function DegradeStandingSection() {
  const t = await getTranslations("admin.aiBudget.degradeStanding");
  const admin = createAdminClient();
  const standing = await getDegradeStanding(admin);

  const degradedUsers = standing.byUser.filter((u) => u.degradedCallsThisMonth > 0);
  const counts = [0, 0, 0, 0, 0];
  for (const user of degradedUsers) counts[bucketIndex(user.fractionDegraded)]!++;
  const histogram = BUCKET_LABELS.map((label, i) => ({ x: label, y: counts[i]! }));

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <p className="text-sm">
        {t("summary", { degraded: formatNumber(standing.studentsEverDegraded), total: formatNumber(standing.totalStudentsWithUsage) })}
      </p>

      {degradedUsers.length > 0 ? (
        <BarChart series={{ id: "degradeDistribution", label: t("bucketAxisLabel"), data: histogram }} a11y={{ title: t("bucketAxisLabel") }} aspectRatio={480 / 220} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      )}
    </section>
  );
}
