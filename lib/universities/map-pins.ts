import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** One university plotted on the explorer map. */
export interface UniversityMapPin {
  id: string;
  name: string;
  city: string | null;
  /** Real stored coordinates — a pin is never rendered from a guessed or city-derived
   *  position, so a missing coordinate means the university simply isn't on the map. */
  latitude: number;
  longitude: number;
  qsRank: string | null;
  imageUrl: string | null;
}

/**
 * Universities to plot for one country, capped.
 *
 * Only rows that actually carry latitude/longitude are returned: `universities.latitude`
 * and `.longitude` are nullable and unevenly populated, and the alternative — deriving a
 * position from the city name — would put a confident-looking pin on a coordinate no
 * source ever stated. A university without coordinates stays in the list results, just not
 * on the map; that is a coverage gap to fill in the data, not something to paper over in
 * the UI.
 *
 * Ordered by QS rank when known so the cap keeps the universities a student is most likely
 * looking for rather than an arbitrary slice.
 */
export async function getUniversityMapPins(
  supabase: SupabaseClient<Database>,
  country: string,
  supersededIds: readonly string[],
  limit = 60
): Promise<UniversityMapPin[]> {
  const { data: rows } = await supabase
    .from("universities")
    .select("id, name, city, latitude, longitude")
    .eq("country", country)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(limit * 2);

  const superseded = new Set(supersededIds);
  const candidates = (rows ?? []).filter((r) => !superseded.has(r.id));
  if (candidates.length === 0) return [];

  const ids = candidates.map((r) => r.id);
  const [{ data: rankings }, { data: metrics }] = await Promise.all([
    supabase
      .from("university_rankings")
      .select("university_id, rank_display, rank_numeric")
      .eq("ranking_provider", "QS")
      .in("university_id", ids),
    supabase
      .from("university_profile_metrics")
      .select("university_id, value_text")
      .eq("metric_code", "primary_image_url")
      .in("university_id", ids),
  ]);

  const rankByUni = new Map((rankings ?? []).map((r) => [r.university_id, r]));
  const imageByUni = new Map((metrics ?? []).map((m) => [m.university_id, m.value_text]));

  return candidates
    .map((r) => {
      const rank = rankByUni.get(r.id);
      return {
        id: r.id,
        name: r.name,
        city: r.city,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        qsRank: rank?.rank_display ?? null,
        imageUrl: imageByUni.get(r.id) ?? null,
        // Sort key only — never rendered. Unranked sorts last rather than first, which a
        // plain nullish-to-0 would have done.
        _rankValue: rank?.rank_numeric ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a._rankValue - b._rankValue)
    .slice(0, limit)
    .map((row): UniversityMapPin => ({
      id: row.id,
      name: row.name,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      qsRank: row.qsRank,
      imageUrl: row.imageUrl,
    }));
}
