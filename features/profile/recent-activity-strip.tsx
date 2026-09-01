import { getTranslations, getLocale } from "next-intl/server";
import { formatRelativeTime } from "@/lib/i18n/date";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioItem } from "@/lib/portfolio/types";

/** A visitor's reason to check back on someone else's profile later ("I wonder what Murat
 * has done recently") — deliberately just a compact, factual list, not a feed: no
 * comments/likes/reactions, nothing to interact with here. Renders nothing when there's
 * been no recent activity rather than an empty-state message — this is a bonus signal on
 * an already-complete profile page, not a section that needs its own "nothing here yet." */
export async function RecentActivityStrip({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("profile.recentActivity");
  const locale = await getLocale();

  return (
    <div className="space-y-2">
      <h2 className="font-semibold">{t("heading")}</h2>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={`${item.category}-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {/* PORTFOLIO_CATEGORY_LABELS deliberately untranslated — see
                    cv-builder.tsx's own comment on why it's shared and left alone. */}
                {PORTFOLIO_CATEGORY_LABELS[item.category]}
                {item.organization ? ` · ${item.organization}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(item.createdAt, locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
