import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserList, isUltraGiftColumnLive } from "@/lib/admin/queries";
import { PlanTierControl } from "@/features/admin/plan-tier-control";
import { UltraGiftControl } from "@/features/admin/ultra-gift-control";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export async function UserListSection() {
  // Found bare (no locale) during 2026-09-03's Turkish pass — oryn-a7 live-walked /kumanda
  // and caught this rendering "10 days ago" while the Activity section, a few clicks away,
  // correctly showed "yaklaşık 12 saat önce". Same local-ternary idiom as the other admin
  // sections already doing this correctly (reports-section.tsx etc.), for consistency with
  // the majority of this file's siblings rather than lib/i18n/date.ts's helpers.
  const [t, locale] = await Promise.all([getTranslations("admin.users"), resolveLocale()]);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
  const admin = createAdminClient();
  const [users, giftColumnLive] = await Promise.all([getAdminUserList(admin), isUltraGiftColumnLive(admin)]);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      {!giftColumnLive ? <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("giftNotSetUp")}</p> : null}
      <ul className="divide-y rounded-lg border">
        {users.map((user) => (
          <li key={user.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="font-medium">{user.displayName ?? t("unnamed")}</span>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{t("tier")}: {t(user.tier === "ultra" ? "tierUltra" : "tierStandard")}</span>
              <span>{t("signedUp")}: {formatDistanceToNow(new Date(user.signedUpAt), { addSuffix: true, ...dateFnsLocale })}</span>
              <span>{t("lastSeen")}: {user.lastSeenAt ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true, ...dateFnsLocale }) : t("never")}</span>
              <span className="font-medium text-foreground">{t("lifetimeSpend")}: {money(user.lifetimeSpendUsd)}</span>
              <PlanTierControl userId={user.userId} displayName={user.displayName ?? t("unnamed")} tier={user.tier} />
              <UltraGiftControl
                userId={user.userId}
                displayName={user.displayName ?? t("unnamed")}
                expiresAt={user.ultraGiftExpiresAt}
                active={user.ultraGiftActive}
                live={giftColumnLive}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
