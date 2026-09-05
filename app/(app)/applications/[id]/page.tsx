import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { computeReadiness } from "@/lib/applications/readiness";
import { refreshRequirementEvaluations } from "@/lib/requirements/persist";
import { NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES } from "@/lib/requirements/ingest";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { RequirementChecklist } from "@/features/applications/requirement-checklist";
import { RequirementGroup } from "@/features/universities/requirement-group";
import { ApplicationStatusControl } from "@/features/applications/status-control";
import { NotesField } from "@/features/applications/notes-field";
import { updateApplicationNotes } from "@/app/(app)/applications/actions";
import { PageHeader } from "@/components/proxola/page-header";
import { SectionHeader } from "@/components/proxola/section-header";
import { Progress } from "@/components/ui/progress";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import type { RequirementEvaluationStatus } from "@/types/database";

/** Same TS2589 ("type instantiation excessively deep") workaround as
 * universities/[id]/page.tsx's own Translator — RequirementGroup's `t` prop needs this
 * narrower shape, not the full generic next-intl translator type. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

// Every application detail page shared the layout's generic default title before this —
// no way to tell one open tab/history entry from another. Entirely owner-scoped data
// (application row is fetched .eq("user_id", session.userId!) both here and on the page
// itself), so no privacy gating to replicate, unlike the public profile page.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();
  const t = await getTranslations("applications");
  const { data: application } = await supabase
    .from("applications")
    .select("target_university_id")
    .eq("id", id)
    .eq("user_id", session.userId!)
    .single();
  if (!application) return {};
  const { data: target } = await supabase
    .from("target_universities")
    .select("university_id")
    .eq("id", application.target_university_id)
    .single();
  if (!target) return { title: t("singularLabel") };
  const supersessionMap = await loadSupersessionMap(supabase);
  const { data: university } = await supabase
    .from("universities")
    .select("name")
    .eq("id", canonicalUniversityId(supersessionMap, target.university_id))
    .single();
  return { title: university?.name ?? t("singularLabel") };
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const supabase = await createClient();
  const locale = await resolveLocale();
  const t = await getTranslations("applications");
  // Requirement check reuses universities/[id]'s own section — same catalog namespace, not
  // a second copy of "Optional" / "Source" / the section heading that could drift from it.
  const tUni = (await getTranslations("universities.detail")) as Translator;

  const { data: application } = await supabase.from("applications").select("*").eq("id", id).eq("user_id", session.userId!).single();
  if (!application) notFound();

  const [targetRes, requirementsRes] = await Promise.all([
    supabase.from("target_universities").select("university_id, program_id").eq("id", application.target_university_id).single(),
    supabase.from("application_requirements").select("*").eq("application_id", id).order("requirement_type"),
  ]);

  const supersessionMap = await loadSupersessionMap(supabase);
  const universityId = targetRes.data ? canonicalUniversityId(supersessionMap, targetRes.data.university_id) : null;
  const programId = targetRes.data?.program_id ?? null;

  const [{ data: university }, universityRequirementsRes, programRes] = await Promise.all([
    universityId ? supabase.from("universities").select("name").eq("id", universityId).single() : Promise.resolve({ data: null }),
    universityId ? supabase.from("university_requirements").select("*").eq("university_id", universityId) : Promise.resolve({ data: null }),
    programId ? supabase.from("university_programs").select("name").eq("id", programId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // Same non-actionable filter as universities/[id] — a row a research pass has since
  // confirmed closed or unresolved is real, correctly-sourced data, never worth evaluating
  // a student against as though it still applies.
  const universityRequirements = (universityRequirementsRes.data ?? []).filter((r) => !NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has(r.verification_state));
  const universityWideRequirements = universityRequirements.filter((r) => r.program_id === null);
  // Scoped to the ONE program this application actually targets — unlike universities/[id],
  // which shows every program since a student browsing that page hasn't committed to one
  // yet. An application already has, so every other program's requirements would just be
  // noise here.
  const thisProgramRequirements = programId ? universityRequirements.filter((r) => r.program_id === programId) : [];

  if (universityId && universityRequirements.length > 0) {
    await refreshRequirementEvaluations(universityId, session.userId!, programId, locale);
  }
  const relevantRequirementIds = [...universityWideRequirements, ...thisProgramRequirements].map((r) => r.id);
  const { data: evaluations } = relevantRequirementIds.length > 0
    ? await supabase
        .from("student_requirement_evaluations")
        .select("requirement_id, status, reasoning")
        .eq("user_id", session.userId!)
        .in("requirement_id", relevantRequirementIds)
    : { data: [] as { requirement_id: string; status: RequirementEvaluationStatus; reasoning: string }[] };
  const evaluationByRequirement = new Map((evaluations ?? []).map((e) => [e.requirement_id, e]));

  const requirements = requirementsRes.data ?? [];
  const readiness = computeReadiness(application.status, requirements);
  const universityName = university?.name ?? t("singularLabel");
  const applicationTypeLabel = t(`newDialog.typeOptions.${application.application_type}`);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={universityName}
        description={
          // FIXED 2026-09-05 (docs/past-deadline-honesty-measurement-2026-09-05.md): the
          // plain string this used to be rendered application.deadline verbatim with no
          // indication a past date had already passed, indistinguishable from one still
          // ahead. DeadlineBadge is the same shared component the applications LIST view
          // already uses correctly for this exact field a few lines away in this feature.
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {applicationTypeLabel}
            {application.deadline ? (
              <>
                {" · "}
                {t("due")} <DeadlineBadge date={application.deadline} locale={locale} />
              </>
            ) : null}
          </span>
        }
      />

      <ApplicationStatusControl applicationId={application.id} initialStatus={application.status} universityName={universityName} />

      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("notes.label")}</span>
        <NotesField
          initialValue={application.notes}
          placeholder={t("notes.placeholder")}
          saveLabel={t("notesField.save")}
          savedLabel={t("notesField.saved")}
          errorFallback={t("notesField.error")}
          // `.bind`, not an arrow closure. This page is a Server Component and NotesField is
          // "use client", so an inline `(notes) => updateApplicationNotes(id, notes)` is a plain
          // function crossing the boundary — React rejects it at render with "Event handlers
          // cannot be passed to Client Component props" and the whole route falls to its error
          // boundary. A bound Server Action stays serializable, so it crosses fine.
          //
          // The identical-looking `onSave={(notes) => …}` in requirement-checklist.tsx is
          // correct and must stay: that file is itself "use client", so its closure never
          // crosses a boundary. The two sites look the same and are not the same.
          onSave={updateApplicationNotes.bind(null, application.id)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t("readiness.label")}</span>
          {readiness.kind === "measured" ? <span className="text-muted-foreground">{readiness.percent}%</span> : null}
        </div>
        {readiness.kind === "measured" ? (
          <>
            <Progress value={readiness.percent} />
            <p className="text-xs text-muted-foreground">{t("readiness.description")}</p>
          </>
        ) : readiness.kind === "not_tracked" ? (
          <p className="text-xs text-muted-foreground">{t("readiness.notTracked")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("readiness.unmeasured")}</p>
        )}
      </div>

      <RequirementChecklist requirements={requirements} />

      {/* Was gated behind `universityWideRequirements.length > 0 || thisProgramRequirements.length
          > 0 ? <section>...</section> : null` — same silent-omission shape found and fixed on
          app/(app)/universities/[id]/page.tsx (2026-09-03), a distinct gate expression in a
          separate file even though both call the same RequirementGroup component, so it needed
          its own fix rather than following from the other page's automatically. */}
      <section className="space-y-4">
        <SectionHeader title={tUni("requirementCheckTitle")} description={tUni("requirementCheckDescription")} />
        {universityWideRequirements.length > 0 || thisProgramRequirements.length > 0 ? (
          <>
            {thisProgramRequirements.length > 0 ? (
              <RequirementGroup
                title={programRes.data?.name ?? tUni("programFallback")}
                items={thisProgramRequirements}
                evaluationByRequirement={evaluationByRequirement}
                locale={locale}
                t={tUni}
              />
            ) : null}
            {universityWideRequirements.length > 0 ? (
              <RequirementGroup
                title={locale === "tr" ? "Program kaydedilmemiş" : "Program not recorded"}
                description={
                  locale === "tr"
                    ? "Üniversitenin kendi sayfalarından alındı — Proxola bunların her birinin hangi programa ait olduğunu kaydetmedi."
                    : "Sourced from the university's own pages — Proxola hasn't recorded which specific program each of these belongs to."
                }
                items={universityWideRequirements}
                evaluationByRequirement={evaluationByRequirement}
                locale={locale}
                t={tUni}
              />
            ) : null}
          </>
        ) : (
          <p lang={locale} className="max-w-3xl text-sm text-muted-foreground">
            {tUni("requirementCheckEmptyMessage")}
          </p>
        )}
      </section>
    </div>
  );
}
