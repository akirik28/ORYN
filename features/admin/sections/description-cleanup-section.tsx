import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContaminationCleanupPreview, isAdminActionsTableLive } from "@/lib/admin/queries";
import { DescriptionCleanupControl } from "@/features/admin/description-cleanup-control";

/**
 * The first real use of the catalog tab's write-capable actions (2026-09-02 course
 * correction) — CEO's own words: "once the UI exists I'll run the 35-row cleanup through it
 * myself." Self-fetches the read-only preview (D1); the interactive apply flow lives in
 * DescriptionCleanupControl, a client component, since the preview-then-apply state machine
 * needs to survive across a user action this server component itself can't hold.
 *
 * Also checks isAdminActionsTableLive upfront — migration 0098 is written, not applied, as of
 * this pass (confirmed directly against live). The apply action fails closed without it, which
 * would otherwise read as "0 of 35 worked" the first time anyone tries this, for a reason
 * that has nothing to do with the 35 rows themselves. Saying so plainly here is cheaper than
 * a founder discovering it that way.
 */
export async function DescriptionCleanupSection() {
  const t = await getTranslations("admin.cleanup");
  const admin = createAdminClient();
  const [preview, tableLive] = await Promise.all([getContaminationCleanupPreview(admin), isAdminActionsTableLive(admin)]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("sectionDescription")}</p>
      </div>
      {!tableLive ? <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{t("notSetUp")}</p> : null}
      <DescriptionCleanupControl preview={preview} auditTableLive={tableLive} />
    </section>
  );
}
