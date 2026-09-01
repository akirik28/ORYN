import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderHealth } from "@/lib/admin/queries";
import { StatusBadge } from "./status-badge";

export async function ProviderHealthSection() {
  const [t, locale] = await Promise.all([getTranslations("admin.providers"), resolveLocale()]);
  const admin = createAdminClient();
  const providers = await getProviderHealth(admin);
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
      {providers.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {providers.map((provider) => (
            <li key={provider.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-medium">{provider.provider}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                {provider.last_error ? <span className="max-w-xs truncate text-xs">{provider.last_error}</span> : null}
                <span className="text-xs">
                  {provider.last_success_at ? t("lastOk", { time: formatDistanceToNow(new Date(provider.last_success_at), { addSuffix: true, ...dateFnsLocale }) }) : t("neverSucceeded")}
                </span>
                {/* last_failure_at was always a real column here — it just wasn't shown. A
                    provider can be `healthy` today while having failed recently (one good
                    call after a run of bad ones resets `status`, not the failure timestamp),
                    so showing only "last OK" hides exactly the recovery-vs-never-had-a-
                    problem distinction someone checking this page wants. */}
                <span className="text-xs">
                  {provider.last_failure_at ? t("lastFailure", { time: formatDistanceToNow(new Date(provider.last_failure_at), { addSuffix: true, ...dateFnsLocale }) }) : t("neverFailed")}
                </span>
                <StatusBadge status={provider.status} locale={locale} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noProviders")}</p>
      )}
    </section>
  );
}
