import { requirementCategoryLabel } from "@/lib/counselor/copy";
import { RequirementEvaluationBadge } from "@/features/universities/requirement-evaluation-badge";
import { SourceBadge } from "@/components/proxola/source-badge";
import type { Locale } from "@/lib/i18n/config";
import type { RequirementEvaluationStatus, UniversityRequirement } from "@/types/database";

/** Same shape as app/(app)/universities/[id]/page.tsx's own page-local Translator — not
 * imported from there since that one is tied to a wider set of page-local helpers; this is
 * the minimal signature RequirementGroup itself actually calls. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * 2026-09-05 — the value fed to SourceBadge's `checkedAt`. `last_checked_at` (a genuine
 * re-verification pass) wins when it exists; `retrieved_at` (the original research date,
 * always set — see every D1-style ingestion doc's own SQL) is the floor every row actually
 * has. Extracted as its own pure function so this precedence is unit-testable directly,
 * without going through SourceBadge's own formatRelativeTime formatting — asserting on a
 * rendered relative-time string ("3 weeks ago") would be non-deterministic against a fixed
 * test date and wouldn't actually prove which raw field won.
 *
 * No `asOf` equivalent exists here (unlike university_profile_metrics' stats_as_of):
 * university_requirements has no structured "which application cycle this covers" field —
 * measured 2026-09-05, only ~13% of rows even mention a year in free text — so adding one
 * unused now would be exactly the "schema exists, nobody fills it" trap this same pass found
 * university_requirements.data_status already sitting in.
 */
export function resolveRequirementCheckedAt(req: Pick<UniversityRequirement, "last_checked_at" | "retrieved_at">): string | null {
  return req.last_checked_at ?? req.retrieved_at;
}

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
  tSourceBadge,
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
  /** 2026-09-05 — the same `sourceBadge` catalog namespace app/(app)/universities/[id]/page.tsx's
   * own OTHER SourceBadge calls already use (tuition, admission-system research), threaded in
   * here rather than reusing `t` (bound to `universities.detail`, a different namespace with no
   * `source`/`checked`/`viewSource` keys of its own) so this doesn't fork a second copy of that
   * chrome text. Replaces the bare, dateless "Source" link every requirement rendered before —
   * CEO's own framing: a student picks courses off a requirement, not a tuition figure; the
   * exact freshness signal the tuition side already had was never wired here at all. */
  tSourceBadge: Translator;
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
                <SourceBadge
                  sourceName={categoryLabel}
                  checkedAt={resolveRequirementCheckedAt(req)}
                  url={req.source_url}
                  locale={locale}
                  sourceLabel={tSourceBadge("source")}
                  checkedLabel={(time) => tSourceBadge("checked", { time })}
                  viewSourceLabel={tSourceBadge("viewSource")}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
