import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminActivityTimeline } from "@/lib/admin/queries";

/**
 * CEO's ruling, 2026-09-02: two audit tables (admin_actions, admin_action_log — different
 * schemas for genuinely different stakes, see either table's own migration comment) stay two
 * tables, but read as one honest chronological list here. The split is real underneath; a
 * founder scanning "what happened recently" never has to know it exists. `source` is still
 * threaded through getAdminActivityTimeline's own return type for whoever needs the real row
 * later — just not surfaced as a visible distinction in this list.
 *
 * Not called "audit log" in the UI on purpose — "Recent activity" reads as what it is to a
 * founder; "audit log" is the implementation's own name for itself, not this list's job to
 * teach.
 */
export async function AdminActivitySection() {
  const t = await getTranslations("admin.activityLog");
  const locale = await resolveLocale();
  const admin = createAdminClient();
  const entries = await getAdminActivityTimeline(admin);

  if (entries.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <ul className="divide-y rounded-lg border">
        {entries.map((entry) => (
          <li key={`${entry.source}-${entry.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{entry.adminLabel}</span>
              <span className="text-muted-foreground"> · {entry.action}</span>
              {entry.targetLabel ? <span className="ml-1 truncate text-xs text-muted-foreground">→ {entry.targetLabel}</span> : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: locale === "tr" ? trLocale : undefined })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
