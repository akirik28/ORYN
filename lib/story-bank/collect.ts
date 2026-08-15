import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StoryBankExperience } from "@/lib/ai/essay-outlines";

/**
 * Every achievement type that carries `story_notes` (migration 0029), in one shape.
 * Deliberately separate from lib/portfolio/build.ts: that one feeds a CV/portfolio view and
 * is tuned for presentation (it drops story notes entirely, on purpose — they're private
 * reflections, not CV content). This one is the opposite: story notes are the point.
 */
const SOURCES = [
  { table: "activities", label: "Activity" },
  { table: "projects", label: "Project" },
  { table: "awards", label: "Award" },
  { table: "research_experiences", label: "Research" },
  { table: "volunteering_experiences", label: "Volunteering" },
  { table: "work_experiences", label: "Work" },
  { table: "sports_experiences", label: "Sports" },
] as const;

interface RawRow {
  id: string;
  title?: string;
  sport?: string;
  organization?: string | null;
  team_name?: string | null;
  description: string | null;
  story_notes: string | null;
  start_date: string | null;
  end_date: string | null;
  award_date?: string | null;
  ongoing?: boolean;
}

export interface StoryBankItem extends StoryBankExperience {
  id: string;
}

export async function collectStoryBankExperiences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<StoryBankItem[]> {
  const results = await Promise.all(
    SOURCES.map(async ({ table, label }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per source; each row is narrowed to RawRow below.
      const { data } = await (supabase.from(table as any) as any).select("*").eq("user_id", userId);
      return ((data ?? []) as RawRow[]).map((row) => ({
        id: row.id,
        category: label,
        // sports_experiences names its title column `sport`; awards have `award_date` rather than a range.
        title: row.title ?? row.sport ?? "Untitled",
        organization: row.organization ?? row.team_name ?? null,
        description: row.description,
        storyNotes: row.story_notes,
        startDate: row.start_date ?? row.award_date ?? null,
        endDate: row.end_date ?? row.award_date ?? null,
        ongoing: row.ongoing ?? false,
      }));
    })
  );

  return results
    .flat()
    .sort((a, b) => (b.startDate ?? "0").localeCompare(a.startDate ?? "0"));
}
