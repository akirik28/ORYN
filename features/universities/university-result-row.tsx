import Link from "next/link";
import { MapPin, Trophy } from "lucide-react";
import { MediaImage } from "@/components/oryn/media-image";
import { formatNumber } from "@/lib/i18n/format";
import type { University } from "@/types/database";

/**
 * The compact university row used beside the map (UI-V3 § 22/25).
 *
 * `UniversityCard` is the right shape for a browsing grid and the wrong one for a results
 * column: at ~42% of the viewport its 128px image band and three metadata rows mean four
 * results fill the panel, which defeats the point of putting a list next to a map. This
 * keeps identity, place and one comparable figure, and drops everything else to the
 * detail page.
 *
 * The country is a link back into the map's own `?country=` selection, so the two panels
 * stay synchronised through the URL in both directions — clicking a country on the map
 * filters this list, and clicking a country here re-centres the map on it.
 */
export function UniversityResultRow({
  university,
  qsRank,
  imageUrl,
  countryHref,
}: {
  university: University;
  /** `rank_display` — a display string (e.g. "12", "=15"), not a number. */
  qsRank?: string;
  imageUrl?: string | null;
  /** Selects this row's country on the map. Omitted when it's already the active filter. */
  countryHref?: string | null;
}) {
  return (
    <li className="border-b border-border/60 last:border-0">
      <div className="flex items-start gap-3.5 py-3.5">
        <MediaImage
          className="size-12 shrink-0 rounded-lg"
          src={imageUrl}
          fallbackSrc={university.logo_url}
          alt=""
          monogram={university.name}
          sizes="48px"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/universities/${university.id}`}
            className="text-sm leading-snug font-medium text-balance hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {university.name}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            {university.city || university.country ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {university.city ? `${university.city}, ` : ""}
                {countryHref && university.country ? (
                  <Link
                    href={countryHref}
                    className="underline-offset-2 hover:text-brand-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {university.country}
                  </Link>
                ) : (
                  university.country
                )}
              </span>
            ) : null}
            {qsRank ? (
              <span className="flex items-center gap-1 tabular-nums">
                <Trophy className="size-3 shrink-0" aria-hidden="true" />
                QS #{qsRank}
              </span>
            ) : null}
            {university.student_size ? (
              <span className="tabular-nums">{formatNumber(university.student_size)} students</span>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}
