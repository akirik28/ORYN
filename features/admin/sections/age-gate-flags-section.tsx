import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductActivity } from "@/lib/admin/queries";

/**
 * The one product_events category that exists specifically for a human to see: when a saved
 * birth year reveals a signup below the minimum age, app/(confirm-age)/confirm-age/actions.ts
 * and app/(app)/settings/actions.ts both save it unconditionally rather than blocking it
 * (docs/age-gate-design-2026-09-02.md), on the premise that a human follow-up satisfies the
 * "reasonable efforts to verify" duty a hard block would otherwise need to carry alone.
 * Before this section, nothing read this table, so that premise wasn't actually true yet.
 *
 * A dedicated, always-visible section -- not a filter inside ActivitySection's general feed
 * -- so these can't end up buried among routine events; styled like budget-warnings-section.tsx
 * (the closest existing precedent for "a flagged subset of rows that needs its own quiet-when-
 * empty section", same red-bordered-row treatment). Read-only, same as the rest of this
 * feature: it surfaces the log, it doesn't add a review workflow on top of it.
 */
export async function AgeGateFlagsSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.ageGateFlags"), resolveLocale()]);
  const admin = createAdminClient();
  const activity = await getProductActivity(admin);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      {activity.belowMinimumAgeEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {activity.belowMinimumAgeEvents.map((event) => {
            const birthYear = typeof event.metadata.birthYear === "number" ? event.metadata.birthYear : "?";
            // belowMinimumAgeEvents is already filtered to exactly BELOW_MINIMUM_AGE_EVENT_NAMES's
            // two entries (lib/admin/queries.ts), so the settings-update name is the only other
            // possibility here -- no third variant to account for.
            const messageKey = event.eventName === "birth_year_settings_update_below_minimum_age" ? "inSettings" : "atSignup";
            return (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm">
                <span className="text-red-700 dark:text-red-400">
                  {t(messageKey, { name: event.displayName ?? t("unnamedStudent"), birthYear })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, ...dateFnsLocale })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
