"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Bookmark, BookmarkCheck, Landmark, Users, Trophy, DollarSign, Scale, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTargetUniversity } from "@/app/(app)/universities/actions";
import { useCompare } from "@/features/universities/compare-context";
import { resolveComparisonWidthCeiling } from "@/lib/comparison/limits";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/proxola/media-image";
import type { TuitionContext } from "@/lib/universities/counseling-adapter";
import type { PlanTier, University } from "@/types/database";

// Larger, calmer card (founder direction: "fewer larger cards ... not a dense database
// row") — a visual identity band up top instead of packing every field into a small row.
// The identity band's three tiers — verified campus photo (`imageUrl`, acquired via
// lib/acquisition/wikimedia.ts / opengraph.ts and re-hosted on our own storage, see
// scripts/acquire-university-images.ts), then the real `logo_url`, then a monogram — are
// MediaImage's job now; this card just supplies the sources. Never a fabricated photo when
// none apply (Rule 4 forbids inventing imagery this product has no source for).
export function UniversityCard({
  university,
  isSaved,
  qsRank,
  tuition,
  researchTopics,
  imageUrl,
  hasResearchDepth,
  compact = false,
  countryHref,
  planTier = "ultra",
}: {
  university: University;
  isSaved: boolean;
  /** QS 2027 rank_display for this university, when it has one (e.g. "1", "=2", "601-610"). */
  qsRank?: string | null;
  /**
   * Resolved by `deriveTuitionContext` (lib/universities/counseling-adapter.ts) — US
   * `cost_of_attendance` (an all-in sticker-price estimate) when it exists, else
   * `university_profile_metrics`' international or domestic tuition-only figure, else
   * `kind: "unavailable"`. Labeled plainly by which one it actually is — "cost of
   * attendance" is never used as a stand-in label for a tuition-only figure, since they are
   * different concepts (the founder's own "never collapse different cost concepts" rule).
   *
   * FIXED 2026-09-03 — this used to say "Currently US-only coverage (128/1019) — omitted
   * entirely, not shown as Unavailable, everywhere else." That was accurate when written;
   * it stopped being true the moment 173 non-US universities' tuition rows landed in
   * `university_profile_metrics`, and the comment kept asserting the old premise anyway —
   * the same shape as a stale cycle label. `kind: "unavailable"` still renders nothing on
   * this compact card (a deliberate, narrower call than the detail page's explicit
   * "Unavailable" text, which has room for it) — that omission is the one part of the old
   * behavior this pass keeps, not a leftover of the coverage gap.
   */
  tuition?: TuitionContext;
  /** Up to 3 short research category labels (e.g. "Physics", "Computer Science"), derived
   * from OpenAlex's research_topics_top5 via lib/universities/research-taxonomy.ts and
   * de-duplicated by the caller — a card is not the place for raw, long OpenAlex topic
   * phrases (the detail page's "Research strengths" section keeps those in full). */
  researchTopics?: string[];
  /** `primary_image_url` from university_profile_metrics — a verified campus photo, re-hosted
   * on our own Supabase Storage bucket. Absent for most universities today; falls back to
   * `logo_url` then a plain icon, never to a placeholder pretending to be a real photo. */
  imageUrl?: string | null;
  /** True only for the minority of universities with real program/requirement/source/
   * statistics depth (lib/universities/browse-page.ts's getUniversityCardMeta). Never
   * rendered as an explicit "false" state — the other ~72% of cards simply omit this
   * badge, the same silence-is-default convention every other optional field on this card
   * already uses, so a majority of cards don't carry a visible negative marker. See
   * docs/handoffs/university-data-depth-honesty-2026-09-02.md. */
  hasResearchDepth?: boolean;
  /** Denser variant for the map view's ~42% results panel, where the full card's padding
   *  and 128px image band fit about four results on screen. Same content, tighter frame —
   *  not a different card, so the two views can't drift apart. */
  compact?: boolean;
  /** Selects this card's country on the map. Given only in the map view, and omitted when
   *  the country is already the active filter — this is the results→map half of the
   *  synchronisation, so dropping it would make the pairing one-directional. */
  countryHref?: string | null;
  /** Defaults to "ultra" (today's unchanged behavior) so a caller that hasn't been updated
   *  to thread the student's real tier through yet doesn't regress — see
   *  features/universities/compare-context.tsx's useCompare for the same default and why. */
  planTier?: PlanTier;
}) {
  const t = useTranslations("universities.card");
  const tCommon = useTranslations("common");
  const [saved, setSaved] = useState(isSaved);
  const [isPending, startTransition] = useTransition();
  const compare = useCompare(planTier);
  const isComparing = compare.isSelected(university.id);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <MediaImage
        className={cn("w-full", compact ? "h-24" : "h-32")}
        tintKey={university.id}
        src={imageUrl}
        fallbackSrc={university.logo_url}
        alt={`Campus of ${university.name}`}
        monogram={university.name}
        icon={<Landmark className="size-[clamp(1rem,32cqmin,2rem)] text-brand-primary-strong/55" aria-hidden="true" />}
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
      />

      <div className={cn("flex flex-1 flex-col", compact ? "gap-2 p-4" : "gap-3 p-6")}>
        <div className="space-y-1">
          <Link
            href={`/universities/${university.id}`}
            className={cn("font-medium leading-snug hover:underline", compact ? "text-sm" : "text-lg")}
          >
            {university.name}
          </Link>
          {(university.city || university.country) && (
            <p className={cn("flex items-center gap-1 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              <MapPin className="size-3.5 shrink-0" />
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
            </p>
          )}
        </div>

        {(qsRank || university.student_size || hasResearchDepth) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {qsRank ? (
              <span className="flex items-center gap-1">
                <Trophy className="size-3.5 shrink-0" />
                QS #{qsRank}
              </span>
            ) : null}
            {university.student_size ? (
              <span className="flex items-center gap-1">
                <Users className="size-3.5 shrink-0" />
                {formatNumber(university.student_size)} {t("students")}
              </span>
            ) : null}
            {hasResearchDepth ? (
              <span className="flex items-center gap-1 text-brand-primary">
                <BadgeCheck className="size-3.5 shrink-0" />
                {t("detailedProfile")}
              </span>
            ) : null}
          </div>
        )}

        {university.institution_type ? (
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{university.institution_type}</span>
        ) : null}

        {tuition && tuition.kind !== "unavailable" ? (
          <p className="flex items-center gap-1 text-sm font-medium">
            <DollarSign className="size-3.5 shrink-0 text-muted-foreground" />
            {tuition.displayValue}
            <span className="font-normal text-muted-foreground">
              {tuition.kind === "cost_of_attendance"
                ? t("costOfAttendanceSuffix")
                : tuition.kind === "international"
                  ? t("internationalTuitionSuffix")
                  : t("domesticTuitionSuffix")}
            </span>
          </p>
        ) : null}

        {researchTopics && researchTopics.length > 0 ? (
          // Explicitly labeled: this is OpenAlex research-publication data, not a list of
          // degree programs offered — unlabeled chips here read as majors on a compact
          // card, exactly the confusion the product spec calls out to avoid.
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("researchFocus")}</p>
            <div className="flex flex-wrap gap-1.5">
              {researchTopics.map((topic) => (
                <span key={topic} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" render={<Link href={`/universities/${university.id}`} />} nativeButton={false}>
            {t("details")}
          </Button>
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            disabled={isPending || saved}
            onClick={() =>
              startTransition(async () => {
                const result = await addTargetUniversity(university.id);
                if (result.error) toast.error(result.error);
                else setSaved(true);
              })
            }
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? t("saved") : tCommon("save")}
          </Button>
          <Button
            variant={isComparing ? "secondary" : "outline"}
            size="sm"
            disabled={!isComparing && compare.atLimit}
            onClick={() => compare.toggle({ id: university.id, name: university.name })}
            title={!isComparing && compare.atLimit ? t("compareLimitTooltip", { max: resolveComparisonWidthCeiling(planTier) }) : undefined}
          >
            <Scale className="size-3.5" />
            {isComparing ? t("comparing") : t("compare")}
          </Button>
        </div>
      </div>
    </div>
  );
}
