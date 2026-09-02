import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductActivity } from "@/lib/admin/queries";

/**
 * All ten known product_events names (AGENTS.md Phase 52) plus the two below-minimum-age
 * names, which also appear in this section's general counts -- listed here, not hidden here;
 * age-gate-flags-section.tsx is where they get a dedicated, prominent surface. Hand-rolled
 * per-locale maps rather than a next-intl namespace, mirroring status-badge.tsx's own
 * statusLabel: next-intl needs a statically-known key, not a name read back from a database
 * row, and a plain Record with a raw-string fallback handles an unrecognized future event
 * name gracefully instead of throwing.
 */
const EVENT_LABELS: Record<string, string> = {
  onboarding_completed: "Onboarding completed",
  profile_item_added: "Profile item added",
  cv_imported: "CV imported",
  target_university_added: "Target university added",
  opportunity_saved: "Opportunity saved",
  opportunity_applied: "Opportunity applied",
  advisor_message_sent: "Advisor message sent",
  weekly_action_completed: "Weekly action completed",
  research_project_started: "Research project started",
  application_updated: "Application updated",
  birth_year_backfill_below_minimum_age: "Below-minimum-age signup (confirmed)",
  birth_year_settings_update_below_minimum_age: "Below-minimum-age signup (settings)",
};
const EVENT_LABELS_TR: Record<string, string> = {
  onboarding_completed: "Katılım tamamlandı",
  profile_item_added: "Profil öğesi eklendi",
  cv_imported: "Özgeçmiş içe aktarıldı",
  target_university_added: "Hedef üniversite eklendi",
  opportunity_saved: "Fırsat kaydedildi",
  opportunity_applied: "Fırsata başvuruldu",
  advisor_message_sent: "Danışmana mesaj gönderildi",
  weekly_action_completed: "Haftalık eylem tamamlandı",
  research_project_started: "Araştırma projesi başlatıldı",
  application_updated: "Başvuru güncellendi",
  birth_year_backfill_below_minimum_age: "Asgari yaşın altında kayıt (onay)",
  birth_year_settings_update_below_minimum_age: "Asgari yaşın altında kayıt (ayarlar)",
};

function eventLabel(eventName: string, locale: Locale): string {
  const map = locale === "tr" ? EVENT_LABELS_TR : EVENT_LABELS;
  return map[eventName] ?? eventName;
}

/**
 * product_events had no reader anywhere in the app before this section (see
 * getProductActivity's own doc comment, lib/admin/queries.ts) -- this is that reader. Two
 * views, not a funnel: a raw per-event-name count (Phase 19's minimum-cohort discipline
 * applies to product analytics too -- today's real n is small enough that a derived
 * percentage would be noise, so none is shown) and a recent-activity feed.
 */
export async function ActivitySection() {
  const [t, locale] = await Promise.all([getTranslations("admin.activity"), resolveLocale()]);
  const admin = createAdminClient();
  const activity = await getProductActivity(admin);
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
  const total = activity.eventCounts.reduce((sum, e) => sum + e.count, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <span className="text-xs text-muted-foreground">{t("totalCount", { count: total })}</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">{t("eventCountsTitle")}</h3>
            <ul className="divide-y rounded-lg border">
              {activity.eventCounts.map((e) => (
                <li key={e.eventName} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span>{eventLabel(e.eventName, locale)}</span>
                  <span className="tabular-nums text-muted-foreground">{e.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">{t("recentTitle")}</h3>
            <ul className="divide-y rounded-lg border">
              {activity.recentEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span>
                    <span className="font-medium">{event.displayName ?? t("unnamed")}</span> · {eventLabel(event.eventName, locale)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, ...dateFnsLocale })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
