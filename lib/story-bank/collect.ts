import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StoryBankExperience } from "@/lib/ai/essay-outlines";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

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

/**
 * Locale (2026-09-01) — `category` reaches a student two ways: directly, as the "· Activity"
 * text under each item in features/profile/story-bank.tsx's picker list, and indirectly, as
 * one bracketed word per line in the essay-outline prompt (lib/ai/essay-outlines.ts:78, `-
 * [${e.category}] ${e.title}...`) — the model then writes that word back into the outline it
 * returns, same "the AI prompt is a student-facing surface" reasoning this session's other
 * i18n passes have applied. `table` is already this array's stable identifier (a real DB
 * table name), so it doubles as the translation key with no new field needed.
 */
const SOURCE_LABEL_TR: Record<(typeof SOURCES)[number]["table"], string> = {
  activities: "Faaliyet",
  projects: "Proje",
  awards: "Ödül",
  research_experiences: "Araştırma",
  volunteering_experiences: "Gönüllülük",
  work_experiences: "İş",
  sports_experiences: "Spor",
};

function sourceLabel(table: (typeof SOURCES)[number]["table"], englishLabel: string, locale: Locale): string {
  return locale === "tr" ? SOURCE_LABEL_TR[table] : englishLabel;
}

const UNTITLED_TR = "Başlıksız";

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

/** `locale` is additive (defaults to English, same pattern as every other lib/-side
 *  reasoning/collection function this session's i18n passes have threaded a locale
 *  through) — both callers (the story-bank page and generateStoryOutlines' server action)
 *  already resolve their own locale for other reasons, so this is a one-line change at
 *  each call site. */
export async function collectStoryBankExperiences(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<StoryBankItem[]> {
  const results = await Promise.all(
    SOURCES.map(async ({ table, label }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per source; each row is narrowed to RawRow below.
      const { data } = await (supabase.from(table as any) as any).select("*").eq("user_id", userId);
      return ((data ?? []) as RawRow[]).map((row) => ({
        id: row.id,
        category: sourceLabel(table, label, locale),
        // sports_experiences names its title column `sport`; awards have `award_date` rather than a range.
        title: row.title ?? row.sport ?? (locale === "tr" ? UNTITLED_TR : "Untitled"),
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
