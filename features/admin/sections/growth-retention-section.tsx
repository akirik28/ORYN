import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/i18n/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRetentionBuckets } from "@/lib/admin/queries";

/**
 * Staleness buckets, not a retention curve — see getRetentionBuckets's own doc comment.
 * `auth.users.last_sign_in_at` is a single overwritten timestamp, not a visit log, so
 * "did last week's cohort come back this week" isn't computable from what's recorded
 * today. This shows what is real: when each student was last seen.
 */
export async function GrowthRetentionSection() {
  const t = await getTranslations("admin.growth.retention");
  const admin = createAdminClient();
  const buckets = await getRetentionBuckets(admin);

  const rows: { label: string; value: number }[] = [
    { label: t("activeToday"), value: buckets.activeToday },
    { label: t("activeThisWeek"), value: buckets.activeThisWeek },
    { label: t("stale"), value: buckets.stale },
    { label: t("neverSignedIn"), value: buckets.neverSignedIn },
  ];

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <dl className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatNumber(row.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t("notACohortNotice")}</p>
    </section>
  );
}
