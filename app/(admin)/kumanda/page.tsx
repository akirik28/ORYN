import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";

/**
 * Overview. Deliberately the shortest screen in the control centre.
 *
 * The founder's complaint about the previous admin design was that fourteen sections were
 * stacked on one page: "her şeyi üst üste yığma." The answer is not a smaller pile — it is
 * that this screen answers one question ("what needs me right now?") and every other screen
 * is reachable from the rail. Anything added here has to earn its place against that.
 *
 * The attention rows and summary cards are the next commit; this establishes the shell,
 * the light ground, and the rail so they can be verified on their own before content lands
 * on top of them.
 */
export default async function ControlOverviewPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("overviewTitle")} description={t("overviewDescription")} />
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: "var(--admin-border)", background: "var(--admin-bg-elevated)", color: "var(--admin-ink-2)" }}
      >
        {t("overviewPlaceholder")}
      </div>
    </div>
  );
}
