"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { logEvent } from "@/lib/analytics/log";
import { canonicalUniversityId, loadSupersessionMap, getSupersededUniversityIds } from "@/lib/universities/canonical";
import { getAllCostOfAttendance, getAllQsListPositions } from "@/lib/universities/queries";
import { categorizeAndDedupeResearchTopics } from "@/lib/universities/research-taxonomy";
import {
  loadUniversityBrowsePage,
  getUniversityCardMeta,
  UNIVERSITY_PAGE_SIZE,
  type UniversityBrowseParams,
  type UniversityCardMeta,
} from "@/lib/universities/browse-page";
import type { University } from "@/types/database";
import type { TargetStatus } from "@/types/database";

/** Ownership-scoped lookup for an existing target, correctly handling the "no specific
 * program" case — `.eq("program_id", null)` never matches in Postgres (NULL isn't equal
 * to NULL), so a plain `.eq()` would always come back empty for that case. */
async function findExistingTarget(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, universityId: string, programId: string | null) {
  let query = supabase.from("target_universities").select("id").eq("user_id", userId).eq("university_id", universityId);
  query = programId ? query.eq("program_id", programId) : query.is("program_id", null);
  const { data } = await query.maybeSingle();
  return data;
}

export async function addTargetUniversity(rawUniversityId: string, programId: string | null = null): Promise<{ error?: string; targetId?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  // The one place a university selection actually becomes permanent — every browse/search
  // surface upstream should already exclude known-duplicate rows, but this is the backstop:
  // whatever id reaches here (an old bookmark, a program search result, a future caller that
  // isn't filtered) gets resolved to its canonical winner before it's ever written, so a loser
  // id can never be permanently saved to a student's profile. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  const universityId = canonicalUniversityId(supersessionMap, rawUniversityId);

  // Deliberately not `.upsert(..., { onConflict: "user_id,university_id,program_id" })`:
  // program_id is nullable, and Postgres never treats NULL as conflicting with NULL for
  // uniqueness purposes, so the ON CONFLICT clause silently never fired for the common
  // "target a university without picking a program" case — every repeat call (double
  // click, revisit, a second tab) inserted a brand new duplicate row instead of returning
  // the existing one. Explicit check-then-insert instead; a unique index still exists as
  // a last-line-of-defense against a true concurrent-request race (see migration
  // 0020), so a 23505 on insert here means someone else's concurrent request won it —
  // treat that the same as finding it up front rather than surfacing an error.
  const existing = await findExistingTarget(supabase, userId, universityId, programId);
  if (existing) return { targetId: existing.id };

  const { data, error } = await supabase
    .from("target_universities")
    .insert({ user_id: userId, university_id: universityId, program_id: programId, status: "exploring", notes: null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const wonByConcurrentRequest = await findExistingTarget(supabase, userId, universityId, programId);
      if (wonByConcurrentRequest) return { targetId: wonByConcurrentRequest.id };
    }
    return { error: "Couldn't add this university. Please try again." };
  }
  if (!data) return { error: "Couldn't add this university. Please try again." };

  await refreshAdmissionOutlook(data.id, userId);
  await logEvent(userId, "target_university_added", { universityId });
  revalidatePath("/universities");
  revalidatePath("/dashboard");
  return { targetId: data.id };
}

export async function updateTargetUniversityStatus(targetId: string, status: TargetStatus): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("target_universities")
    .update({ status })
    .eq("id", targetId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't update status." };
  revalidatePath("/universities");
  revalidatePath("/dashboard");
  return {};
}

export async function removeTargetUniversity(targetId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("target_universities").delete().eq("id", targetId).eq("user_id", session.userId!);
  if (error) return { error: "Couldn't remove this university." };

  revalidatePath("/universities");
  revalidatePath("/dashboard");
  return {};
}

/**
 * One more page of browse results, for the infinite-scroll grid
 * (features/universities/university-browse-grid.tsx).
 *
 * Resolves through the same `loadUniversityBrowsePage` the page itself uses, so a
 * scrolled-in page is assembled by identical rules — superseded-row exclusion, the
 * unranked-university tail, and the `.in()` size limit all included. A second query
 * implementation here would be free to drift, and the drift would look to a student like
 * results changing while they scroll.
 *
 * `costMap`/`qsRankMap` are re-derived per call rather than passed from the client: they
 * are large, and a client-supplied ranking map would let the caller reorder or hide
 * results.
 */
export async function loadMoreUniversities(
  params: Omit<UniversityBrowseParams, "page">,
  page: number
): Promise<{ universities: University[]; meta: Record<string, UniversityCardMeta>; savedIds: string[]; hasMore: boolean; error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  try {
    const supersessionMap = await loadSupersessionMap(supabase);
    const supersededIds = getSupersededUniversityIds(supersessionMap);
    const needsQsRankMap = !params.q && (params.sort === "ranking" || params.rank !== null);
    const [costMap, qsRankMap] = await Promise.all([
      params.cost.length > 0 ? getAllCostOfAttendance(supabase) : Promise.resolve(null),
      needsQsRankMap ? getAllQsListPositions(supabase) : Promise.resolve(null),
    ]);

    const result = await loadUniversityBrowsePage(
      supabase,
      { ...params, page },
      supersededIds,
      { costMap: costMap ?? undefined, qsRankMap: qsRankMap ?? undefined }
    );

    const [meta, targetsRes] = await Promise.all([
      getUniversityCardMeta(supabase, result.universities, categorizeAndDedupeResearchTopics),
      supabase.from("target_universities").select("university_id").eq("user_id", session.userId!),
    ]);

    return {
      universities: result.universities,
      meta,
      savedIds: (targetsRes.data ?? []).map((t) => t.university_id),
      hasMore: page * UNIVERSITY_PAGE_SIZE < result.total,
    };
  } catch {
    // Keep whatever is already on screen and offer a retry — a failed page must never blank
    // out results the student is reading.
    return { universities: [], meta: {}, savedIds: [], hasMore: true, error: "Couldn't load more universities." };
  }
}
