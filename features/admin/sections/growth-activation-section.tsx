import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOnboardingFunnel } from "@/lib/admin/queries";

/**
 * The honest 2-stage (+1 sub-signal) funnel — see getOnboardingFunnel's own doc comment.
 * Deliberately not a 5-bar chart implying per-screen data the product doesn't record yet.
 */
export async function GrowthActivationSection() {
  const t = await getTranslations("admin.growth.activation");
  const admin = createAdminClient();
  const funnel = await getOnboardingFunnel(admin);

  const rows: { label: string; value: number }[] = [
    { label: t("signedUp"), value: funnel.signedUp },
    { label: t("completedOnboarding"), value: funnel.completedOnboarding },
    { label: t("reachedCvExtraction"), value: funnel.reachedCvExtraction },
  ];

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <dl className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatNumber(row.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t("twoStageNotice")}</p>
      <p className="text-xs text-muted-foreground">{t("cvCaveat")}</p>
    </section>
  );
}
