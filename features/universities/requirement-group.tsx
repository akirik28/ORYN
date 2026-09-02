import { requirementCategoryLabel } from "@/lib/counselor/copy";
import { RequirementEvaluationBadge } from "@/features/universities/requirement-evaluation-badge";
import type { Locale } from "@/lib/i18n/config";
import type { RequirementEvaluationStatus, UniversityRequirement } from "@/types/database";

/** Same shape as app/(app)/universities/[id]/page.tsx's own page-local Translator — not
 * imported from there since that one is tied to a wider set of page-local helpers; this is
 * the minimal signature RequirementGroup itself actually calls. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Extracted from app/(app)/universities/[id]/page.tsx unchanged (2026-09-02) so
 * app/(app)/applications/[id]/page.tsx can render the same Phase 69 requirement check
 * against the university a specific application targets, without a second component that
 * could drift from this one's rendering rules — CEO's explicit instruction: reuse this
 * surface's components rather than build a second vocabulary. Both callers pass
 * `evaluationByRequirement` built from a fresh `refreshRequirementEvaluations` call plus a
 * `student_requirement_evaluations` read, so "no entry for this requirement" only happens
 * in the same admin-client-not-configured degrade both call sites already accept — never
 * silently rendered as met or not_met (see RequirementEvaluationBadge's own comment for why
 * `unknown` is a real, distinct status rather than an absence).
 */
export function RequirementGroup({
  title,
  description,
  items,
  evaluationByRequirement,
  locale,
  t,
}: {
  title: string;
  /** Optional sub-heading text — used only by the unlinked ("program not recorded") group,
   * to say why these items aren't grouped under a specific program rather than implying
   * they apply to every program. Genuinely program-linked groups pass no description and
   * render exactly as before this prop existed. */
  description?: string;
  items: UniversityRequirement[];
  evaluationByRequirement: Map<string, { status: RequirementEvaluationStatus; reasoning: string }>;
  locale: Locale;
  t: Translator;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <ul className="divide-y rounded-lg border">
        {items.map((req) => {
          const evaluation = evaluationByRequirement.get(req.id);
          const isInformational = req.requirement_type === "application_deadline";
          const categoryLabel = requirementCategoryLabel(req.requirement_type, locale);
          return (
            <li key={req.id} className="space-y-1 px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{req.title ?? categoryLabel}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {categoryLabel}
                    {!req.is_required ? ` · ${t("optional")}` : ""}
                  </span>
                </div>
                {evaluation && !isInformational ? <RequirementEvaluationBadge status={evaluation.status} locale={locale} /> : null}
              </div>
              {req.requirement_detail ? <p className="text-muted-foreground">{req.requirement_detail}</p> : null}
              {evaluation?.reasoning && !isInformational ? <p className="text-xs text-muted-foreground">{evaluation.reasoning}</p> : null}
              {req.source_url ? (
                <a href={req.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary hover:underline">
                  {t("sourceLink")}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
