import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { EVIDENCE_LINKABLE_TABLES, EVIDENCE_LINKABLE_LABELS, type EvidenceLinkableTable } from "@/lib/validation/evidence";

export interface LinkableItem {
  table: EvidenceLinkableTable;
  id: string;
  label: string;
}

const TITLE_COLUMN: Record<EvidenceLinkableTable, string> = {
  activities: "title",
  awards: "title",
  certifications: "title",
  projects: "title",
  research_experiences: "title",
  volunteering_experiences: "title",
  work_experiences: "title",
  education_records: "school_name",
  test_scores: "test_name",
};

/** Every achievement a student could attach evidence to, across all 9 achievement
 * tables — used to populate the "which item is this evidence for?" picker on Documents. */
export async function listLinkableItems(supabase: SupabaseClient<Database>, userId: string): Promise<LinkableItem[]> {
  const results = await Promise.all(
    EVIDENCE_LINKABLE_TABLES.map(async (table) => {
      const titleColumn = TITLE_COLUMN[table];
      const { data } = await supabase.from(table).select(`id, ${titleColumn}`).eq("user_id", userId);
      return (data ?? []).map((row) => {
        const record = row as unknown as Record<string, string>;
        return { table, id: record.id, label: `${record[titleColumn]} (${EVIDENCE_LINKABLE_LABELS[table]})` };
      });
    })
  );
  return results.flat();
}
