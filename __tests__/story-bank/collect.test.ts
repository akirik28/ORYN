import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { collectStoryBankExperiences } from "@/lib/story-bank/collect";

// 2026-09-01 — category ("Activity", "Project", ...) reaches a student two ways: directly
// in features/profile/story-bank.tsx's picker list, and indirectly through the essay-outline
// AI prompt (lib/ai/essay-outlines.ts), which writes it back into the outline the model
// returns. Coverage here is about the locale behavior specifically, not full field-mapping
// coverage of every one of the 7 source tables (untested before this pass either).

const USER_ID = "student-1";

type Row = Record<string, unknown>;

function makeQueryBuilder(rows: Row[]) {
  const builder = {
    select: () => builder,
    eq: () => Promise.resolve({ data: rows, error: null }),
  };
  return builder;
}

/** Only the tables a given test actually populates return rows; every other one of the 7
 *  sources resolves to an empty array, same as a real student with nothing recorded there. */
function makeSupabase(rowsByTable: Record<string, Row[]>) {
  return {
    from: (table: string) => makeQueryBuilder(rowsByTable[table] ?? []),
  } as unknown as SupabaseClient<Database>;
}

describe("collectStoryBankExperiences — locale", () => {
  test("English is the default when locale is omitted", async () => {
    const supabase = makeSupabase({ activities: [{ id: "a1", title: "Robotics Club", user_id: USER_ID }] });
    const result = await collectStoryBankExperiences(supabase, USER_ID);
    expect(result[0].category).toBe("Activity");
  });

  test("every source table's category translates under Turkish", async () => {
    const supabase = makeSupabase({
      activities: [{ id: "a1", title: "T", user_id: USER_ID }],
      projects: [{ id: "p1", title: "T", user_id: USER_ID }],
      awards: [{ id: "aw1", title: "T", user_id: USER_ID }],
      research_experiences: [{ id: "r1", title: "T", user_id: USER_ID }],
      volunteering_experiences: [{ id: "v1", title: "T", user_id: USER_ID }],
      work_experiences: [{ id: "w1", title: "T", user_id: USER_ID }],
      sports_experiences: [{ id: "s1", sport: "Swimming", user_id: USER_ID }],
    });
    const result = await collectStoryBankExperiences(supabase, USER_ID, "tr");
    const byId = Object.fromEntries(result.map((r) => [r.id, r.category]));
    expect(byId.a1).toBe("Faaliyet");
    expect(byId.p1).toBe("Proje");
    expect(byId.aw1).toBe("Ödül");
    expect(byId.r1).toBe("Araştırma");
    expect(byId.v1).toBe("Gönüllülük");
    expect(byId.w1).toBe("İş");
    expect(byId.s1).toBe("Spor");
  });

  // sports_experiences names its title column `sport`, not `title` — real data always has
  // one or the other, but a row missing both (data-integrity edge case, not expected in
  // practice) still needs a defined fallback rather than `undefined` reaching the AI prompt.
  test("the 'Untitled' fallback translates too, for a row missing both title and sport", async () => {
    const supabase = makeSupabase({ activities: [{ id: "a1", user_id: USER_ID }] });
    expect((await collectStoryBankExperiences(supabase, USER_ID, "en"))[0].title).toBe("Untitled");
    expect((await collectStoryBankExperiences(supabase, USER_ID, "tr"))[0].title).toBe("Başlıksız");
  });
});
