import { spanLabel, weightFor, type JourneyEntry } from "./journey";
import type {
  Activity,
  Award,
  Certification,
  Course,
  EducationRecord,
  Project,
  ResearchExperience,
  SportsExperience,
  TestScore,
  VolunteeringExperience,
  WorkExperience,
} from "@/types/database";

/**
 * Maps the ten achievement tables onto the single `JourneyEntry` shape.
 *
 * Kept separate from `journey.ts` so the ordering/labelling rules stay testable without
 * constructing eleven database row types. This file is the boring half: field names in,
 * one shape out, no decisions beyond which kind a row is.
 */

interface JourneySources {
  activities: Activity[];
  projects: Project[];
  research: ResearchExperience[];
  work: WorkExperience[];
  volunteering: VolunteeringExperience[];
  sports: SportsExperience[];
  awards: Award[];
  certifications: Certification[];
  courses: Course[];
  testScores: TestScore[];
  education: EducationRecord[];
}

/** Academic years arrive as "2025-2026" or "2025–2026"; take the starting year. */
function academicYearToDate(academicYear: string | null): string | null {
  if (!academicYear) return null;
  const match = academicYear.match(/(\d{4})/);
  return match ? `${match[1]}-09-01` : null;
}

export function buildJourney(sources: JourneySources): JourneyEntry[] {
  const entries: JourneyEntry[] = [];

  const pushSpan = (
    kind: Parameters<typeof weightFor>[0],
    row: {
      id: string;
      title: string;
      organization?: string | null;
      description?: string | null;
      start_date: string | null;
      end_date: string | null;
      ongoing: boolean;
      evidence_status?: JourneyEntry["evidenceStatus"];
    },
  ) => {
    entries.push({
      id: `${kind}:${row.id}`,
      kind,
      weight: weightFor(kind),
      title: row.title,
      organization: row.organization ?? null,
      description: row.description ?? null,
      // Order by when something *started*: a three-year commitment belongs to the year the
      // student took it on, not the year it happened to finish.
      sortDate: row.start_date ?? row.end_date,
      dateLabel: spanLabel({ start: row.start_date, end: row.end_date, ongoing: row.ongoing }),
      ongoing: row.ongoing,
      evidenceStatus: row.evidence_status ?? null,
    });
  };

  for (const a of sources.activities) {
    // The same table produces two weights — see WEIGHT_BY_KIND's note.
    pushSpan(a.is_leadership_role ? "leadership" : "activity", a);
  }
  for (const p of sources.projects) pushSpan("project", p);
  for (const r of sources.research) pushSpan("research", r);
  for (const w of sources.work) pushSpan("work", w);
  for (const v of sources.volunteering) pushSpan("volunteering", v);
  for (const s of sources.sports) {
    // The team goes in the title *or* the organization line, never both — passing
    // `organization: s.team_name` alongside a title that already contains it rendered
    // "Football — Varsity" with "Varsity" repeated directly underneath.
    pushSpan("sport", {
      ...s,
      title: s.team_name ? `${s.sport} — ${s.team_name}` : s.sport,
      organization: s.position ?? s.level ?? null,
    });
  }
  for (const e of sources.education) {
    pushSpan("education", {
      id: e.id,
      title: e.school_name,
      organization: e.country,
      description: e.notes,
      start_date: e.start_date,
      end_date: e.end_date,
      ongoing: e.is_current,
    });
  }

  for (const aw of sources.awards) {
    entries.push({
      id: `award:${aw.id}`,
      kind: "award",
      weight: weightFor("award"),
      title: aw.title,
      organization: aw.organization,
      description: aw.description,
      sortDate: aw.award_date,
      dateLabel: spanLabel({ start: aw.award_date, end: null, ongoing: false }),
      ongoing: false,
      evidenceStatus: aw.evidence_status,
    });
  }

  for (const c of sources.certifications) {
    entries.push({
      id: `certification:${c.id}`,
      kind: "certification",
      weight: weightFor("certification"),
      title: c.title,
      organization: c.organization,
      description: c.description,
      sortDate: c.issue_date,
      dateLabel: spanLabel({ start: c.issue_date, end: null, ongoing: false }),
      ongoing: false,
      evidenceStatus: c.evidence_status,
    });
  }

  for (const c of sources.courses) {
    const grade = c.grade_value ? `${c.grade_value}${c.grade_scale ? ` / ${c.grade_scale}` : ""}` : null;
    entries.push({
      id: `course:${c.id}`,
      kind: "course",
      weight: weightFor("course"),
      title: c.course_name,
      organization: grade,
      description: null,
      sortDate: academicYearToDate(c.academic_year),
      // The student's own academic-year string, not a reformatted date — see spanLabel.
      dateLabel: c.academic_year,
      ongoing: false,
      evidenceStatus: null,
    });
  }

  for (const t of sources.testScores) {
    entries.push({
      id: `test_score:${t.id}`,
      kind: "test_score",
      weight: weightFor("test_score"),
      title: t.test_name,
      organization: t.max_score ? `${t.score} / ${t.max_score}` : t.score,
      description: null,
      sortDate: t.test_date,
      dateLabel: spanLabel({ start: t.test_date, end: null, ongoing: false }),
      ongoing: false,
      evidenceStatus: null,
    });
  }

  return entries;
}
