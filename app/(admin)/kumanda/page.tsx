import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReports, summarizeReportsBacklog, getContaminationCleanupPreview, getDescriptionQualityLiveSignal, getDegradeStanding, getSpendSummary, getAdminUserList, getFinanceSettings, getPageViewStats } from "@/lib/admin/queries";
import { resolveLocale } from "@/lib/i18n/locale";

/**
 * Overview. Deliberately the shortest screen in the control centre (see the placeholder
 * this replaces for the founder's own "her şeyi üst üste yığma" complaint this whole
 * restructure answers). Two things only: what genuinely needs a decision right now, and one
 * card per other Daily-group screen so nothing requires a click to get a first read.
 *
 * All three attention items and all four cards are read-only reuses of existing
 * lib/admin/queries.ts functions -- no new cross-cutting logic, nothing that duplicates a
 * number another screen already owns computing.
 */
function AttentionRow({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm transition-colors hover:opacity-90"
      style={{ background: "var(--admin-bg-elevated-2)" }}
    >
      <span style={{ color: "var(--admin-ink-1)" }}>{label}</span>
      <span className="shrink-0 font-medium" style={{ color: "var(--admin-accent)" }}>
        {detail}
      </span>
    </Link>
  );
}

function SummaryCard({ href, label, value, hint }: { href: string; label: string; value: string; hint: string }) {
  return (
    <Link href={href} className="admin-panel block rounded-xl p-5 transition-opacity hover:opacity-90">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
        {hint}
      </p>
    </Link>
  );
}

export default async function ControlOverviewPage() {
  const [t, locale] = await Promise.all([getTranslations("admin.control"), resolveLocale()]);
  const admin = createAdminClient();

  const [reports, cleanupPreview, degradeStanding, spend, users, financeSettings, pageViews] = await Promise.all([
    getReports(admin, locale),
    getContaminationCleanupPreview(admin),
    getDegradeStanding(admin),
    getSpendSummary(admin),
    getAdminUserList(admin),
    getFinanceSettings(admin),
    getPageViewStats(admin),
  ]);
  // Depends on cleanupPreview's own result (reuses its guard computation, see that function's
  // comment) -- can't join the Promise.all above, one extra light round trip after it resolves.
  const qualitySignal = await getDescriptionQualityLiveSignal(admin, cleanupPreview);

  const backlog = summarizeReportsBacklog(reports);
  const rate = financeSettings.usdTryRate?.rateTryPerUsd ?? null;

  const attentionItems: { href: string; label: string; detail: string }[] = [];
  if (backlog.openCount > 0) {
    attentionItems.push({ href: "/kumanda/moderasyon", label: t("attention.openReports"), detail: t("attention.count", { count: backlog.openCount }) });
  }
  if (qualitySignal.status === "ok") {
    if (qualitySignal.totalDefectiveActive > 0) {
      attentionItems.push({
        href: "/kumanda/katalog",
        label: t("attention.descriptionQuality"),
        detail: t("attention.descriptionQualityCount", { ready: qualitySignal.readyToFixActive, pending: qualitySignal.noFixYetActive }),
      });
    }
  } else {
    // Degrade honestly: a failed live check is not the same as "zero found", and omitting the
    // row entirely would read the same as "nothing to worry about" -- the exact silent-failure
    // shape this fleet has already found and fixed in several other places today.
    attentionItems.push({ href: "/kumanda/katalog", label: t("attention.descriptionQuality"), detail: t("attention.descriptionQualityUnknown") });
  }
  if (degradeStanding.studentsEverDegraded > 0) {
    attentionItems.push({
      href: "/kumanda/harcama",
      label: t("attention.degradedStudents"),
      detail: t("attention.countOfTotal", { count: degradeStanding.studentsEverDegraded, total: degradeStanding.totalStudentsWithUsage }),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("overviewTitle")} description={t("overviewDescription")} />

      <div className="admin-panel rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          {t("attention.sectionTitle")}
        </h2>
        {attentionItems.length > 0 ? (
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <AttentionRow key={item.href} {...item} />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--admin-ink-3)" }}>
            {t("attention.nothingPending")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          href="/kumanda/kar-zarar"
          label={t("item.profitLoss")}
          value={rate !== null ? `${financeSettings.ultraPriceTry.toFixed(2)} ₺` : "—"}
          hint={rate !== null ? t("cards.priceHint") : t("cards.rateNotConfigured")}
        />
        <SummaryCard
          href="/kumanda/trafik"
          label={t("item.traffic")}
          value={pageViews ? String(pageViews.pageViewsLast30d) : "—"}
          hint={pageViews ? t("cards.pageViewsLast30d") : t("cards.noPageviewTracking")}
        />
        <SummaryCard href="/kumanda/ogrenciler" label={t("item.students")} value={String(users.length)} hint={t("cards.registeredStudents")} />
        <SummaryCard href="/kumanda/harcama" label={t("item.spend")} value={`$${spend.last30dUsd.toFixed(2)}`} hint={t("cards.spendLast30d")} />
      </div>
    </div>
  );
}
