import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOpportunityList } from "@/lib/admin/queries";
import { OpportunityModerationList } from "@/features/admin/opportunity-moderation-list";

export async function OpportunitiesSection() {
  const t = await getTranslations("admin.opportunities");
  const admin = createAdminClient();
  const rows = await getAdminOpportunityList(admin);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{t("sectionTitle")}</h2>
      <OpportunityModerationList initialRows={rows} />
    </section>
  );
}
