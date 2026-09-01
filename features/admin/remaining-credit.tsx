import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import type { RemainingCredit } from "./spend-data";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * Anthropic's account balance is not exposed by any API — there is nothing to query, so this
 * is deliberately a derived estimate (a manually-entered starting figure minus measured spend
 * since), never presented as a live balance. `credit === null` means the two required env vars
 * aren't set, which renders as "not set up," not as $0 remaining — an unconfigured figure and a
 * verified-zero one are different claims and must not look the same.
 */
export async function RemainingCreditCard({ credit }: { credit: RemainingCredit | null }) {
  const t = await getTranslations("admin.credit");

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
            {t("estimateNotice", { startingAmount: money(credit.startingCreditUsd), enteredDate: formatDistanceToNow(new Date(credit.startingCreditEnteredAt), { addSuffix: true }) })}
          </p>
        </div>
      )}
    </section>
  );
}
