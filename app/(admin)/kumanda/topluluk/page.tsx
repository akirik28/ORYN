import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommunityStats } from "@/lib/admin/queries";

/**
 * Community. The build plan (docs/kumanda-merkezi-yapi-plani-2026-09-03.md) called this
 * screen "new, empty -- fills in once the feature ships." That was written before messages
 * and connections landed a few hours ago -- CEO's own correction mid-build. Checked live,
 * not assumed: `connections`/`messages` are real, applied tables; `posts`/`post_likes`
 * (migration 0058) are written but not applied on oryn-qa-scratch as of this build.
 * getCommunityStats returns `null` for a stat whose table isn't live -- rendered here as an
 * em-dash with a reason, never as `String(null)` and never as 0 (hard rule #1: absence is
 * not a known value, applied to a table this time rather than a data row).
 *
 * Still genuinely early even where numbers exist: small counts on a product with no real
 * traffic yet, and the screen says so rather than dressing four stat cards up as a growth
 * dashboard.
 */
function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="admin-panel rounded-xl p-5">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default async function CommunityPage() {
  const t = await getTranslations("admin.control.community");
  const admin = createAdminClient();
  const stats = await getCommunityStats(admin);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("posts")}
          value={stats.postCount !== null ? String(stats.postCount) : "—"}
          hint={stats.postCount !== null && stats.postAuthorCount !== null ? t("postAuthors", { count: stats.postAuthorCount }) : t("notSetUp")}
        />
        <StatCard label={t("messages")} value={stats.messageCount !== null ? String(stats.messageCount) : "—"} hint={stats.messageCount === null ? t("notSetUp") : undefined} />
        <StatCard
          label={t("connections")}
          value={stats.acceptedConnectionCount !== null ? String(stats.acceptedConnectionCount) : "—"}
          hint={stats.acceptedConnectionCount === null ? t("notSetUp") : undefined}
        />
        <StatCard label={t("likes")} value={stats.likeCount !== null ? String(stats.likeCount) : "—"} hint={stats.likeCount === null ? t("notSetUp") : undefined} />
      </div>

      <div className="admin-panel rounded-xl p-6 text-sm" style={{ color: "var(--admin-ink-2)" }}>
        {t("earlyNote")}
      </div>
    </div>
  );
}
