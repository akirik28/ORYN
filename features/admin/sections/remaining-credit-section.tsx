import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRemainingCredit } from "@/lib/admin/queries";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * Anthropic's account balance is not exposed by any API — there is nothing to query, so this
 * is deliberately a derived estimate (a manually-entered starting figure minus measured spend
 * since), never presented as a live balance (D4). A missing starting figure renders as "not
 * set up," never as $0 remaining — an unconfigured figure and a verified-zero one are
 * different claims and must not look the same.
 */
export async function RemainingCreditSection() {
  // Found bare (no locale) during 2026-09-03's Turkish pass, alongside the same bug in
  // user-list-section.tsx (oryn-a7's live /kumanda walkthrough) — same local-ternary idiom
  // as this file's already-correct siblings (reports-section.tsx etc.).
  const [t, locale] = await Promise.all([getTranslations("admin.credit"), resolveLocale()]);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
  const admin = createAdminClient();
  const credit = await getRemainingCredit(admin);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      {credit === null ? (
        <p className="text-sm text-muted-foreground">{t("notConfigured")}</p>
      ) : (
        <div className="space-y-2 rounded-lg border px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{t("remaining")}</span>
            <span className="text-lg font-semibold">{money(credit.remainingUsd)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{t("spentSinceEntry")}</span>
            <span className="text-sm">{money(credit.totalSpendUsd)}</span>
          </div>
          <p className="border-t pt-2 text-xs text-muted-foreground">
            {t("estimateNotice", { startingAmount: money(credit.startingCreditUsd), enteredDate: formatDistanceToNow(new Date(credit.startingCreditEnteredAt), { addSuffix: true, ...dateFnsLocale }) })}
          </p>
        </div>
      )}
    </section>
  );
}
