import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/i18n/format";
import type { AdminUserRow } from "./spend-data";

const money = (value: number) => formatCurrency(value, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export async function UserListCard({ users }: { users: AdminUserRow[] }) {
  const t = await getTranslations("admin.users");

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <ul className="divide-y rounded-lg border">
        {users.map((user) => (
          <li key={user.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="font-medium">{user.displayName ?? t("unnamed")}</span>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {/* Tier column stays here, rendering "—", until tiers actually exist — see
                  features/admin/spend-data.ts's AdminUserRow, which never invents one. */}
              <span>{t("tier")}: —</span>
              <span>{t("signedUp")}: {formatDistanceToNow(new Date(user.signedUpAt), { addSuffix: true })}</span>
              <span>{t("lastSeen")}: {user.lastSeenAt ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true }) : t("never")}</span>
              <span className="font-medium text-foreground">{t("lifetimeSpend")}: {money(user.lifetimeSpendUsd)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
