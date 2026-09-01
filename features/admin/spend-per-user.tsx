import { getTranslations } from "next-intl/server";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { PER_STUDENT_MONTHLY_TARGET_USD, PER_STUDENT_MONTHLY_CEILING_USD, type UserSpend } from "./spend-data";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** This is the screen version of the query that found a real student at $3.04 in one week
 *  against a $1.00/month ceiling — sorted highest-first so an overage is the first thing seen,
 *  not something found by scrolling. */
export async function SpendPerUserCard({ users }: { users: UserSpend[] }) {
  const t = await getTranslations("admin.perUser");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="text-xs text-muted-foreground">{t("subtitle", { target: money(PER_STUDENT_MONTHLY_TARGET_USD), ceiling: money(PER_STUDENT_MONTHLY_CEILING_USD) })}</span>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((user) => (
            <li key={user.userId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium">{user.displayName ?? t("unnamed")}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="text-xs">{t("last30d")}: {money(user.last30dUsd)}</span>
                <span className="text-xs">{t("lifetime")}: {money(user.lifetimeUsd)}</span>
                <span className="text-xs">{t("calls", { count: formatNumber(user.callCount) })}</span>
                {user.overCeiling ? (
                  <Badge variant="outline" className="border-red-500/30 text-red-700 dark:text-red-400">
                    {t("overCeiling")}
                  </Badge>
                ) : user.overWarningThreshold ? (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
                    {t("nearCeiling")}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
