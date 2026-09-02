import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderHealthSummaries } from "@/lib/admin/queries";
import { ProviderRecheckButton } from "@/features/admin/provider-recheck-button";
import { StatusBadge } from "./status-badge";

export async function ProviderHealthSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.providers"), resolveLocale()]);
  const admin = createAdminClient();
  // The expected-set-driven summary (lib/admin/provider-health.ts), not a raw row select —
  // a provider with zero rows ever (Tavily/College Scorecard today, unconfigured API keys)
  // is a real row here reading `unknown`/never-called, not silently absent from the list.
  const providers = await getProviderHealthSummaries(admin);
  // date-fns's own Turkish locale for "2 saat önce"-style relative times — first use of this
  // in the app. lib/i18n/format.ts's own note is specifically about NUMBER formatting staying
  // English-pinned by a separate, deliberate decision; it says nothing about dates, and this
  // panel's one real user reads Turkish — leaving every timestamp English here would
  // reproduce exactly the half-translated panel this package exists to close.
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
      </div>
      <ul className="divide-y rounded-lg border">
        {providers.map((provider) => (
          <li key={provider.provider} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span className="font-medium">{provider.label}</span>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
              {provider.lastError ? <span className="max-w-xs truncate text-xs">{provider.lastError}</span> : null}
              {/* Recency, kept visually separate from the raw status badge below rather than
                  collapsed into it — a provider can read "healthy" while its last success
                  was days ago (one good call resets `status`, not the timestamp), and this
                  is exactly the ambiguity a single badge can't resolve on its own. */}
              <span className={cn("text-xs", provider.freshness === "stale" && "font-medium text-amber-700 dark:text-amber-400")}>
                {provider.lastSuccessAt
                  ? t("lastOk", { time: formatDistanceToNow(new Date(provider.lastSuccessAt), { addSuffix: true, ...dateFnsLocale }) })
                  : t("neverSucceeded")}
              </span>
              <span className="text-xs">
                {provider.lastFailureAt
                  ? t("lastFailure", { time: formatDistanceToNow(new Date(provider.lastFailureAt), { addSuffix: true, ...dateFnsLocale }) })
                  : t("neverFailed")}
              </span>
              <StatusBadge status={provider.status} locale={locale} />
              <ProviderRecheckButton provider={provider.provider} label={provider.label} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
