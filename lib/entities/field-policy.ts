/**
 * Which canonical entity types each linkable profile field accepts.
 *
 * This is the TypeScript mirror of two things the database already enforces: the
 * `enforce_canonical_entity_type` triggers (migration 0038), and the
 * `canonical_field_policies` catalogue that documents them. The database is the real
 * gate -- a wrong type raises there regardless of what the app does -- but the app needs
 * the same lists to scope a search, so a student searching "employer" is never offered a
 * `city` entity it would then be refused for choosing.
 *
 * Keep this file, the triggers, and the catalogue in sync. If they ever disagree, the
 * trigger wins and the symptom is a save that fails with "Canonical entity X has type Y".
 *
 * No `server-only`: Client Components import `EntityScope` for the combobox prop.
 */

export const CANONICAL_ENTITY_TYPES = [
  "school",
  "university",
  "employer",
  "organization",
  "research_institution",
  "lab",
  "ngo",
  "club",
  "opportunity_provider",
  "program",
  "competition",
  "scholarship",
  "sports_team",
  "country",
  "city",
] as const;

export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

/**
 * A scope is "the set of entity types this particular field accepts", named after the
 * field rather than after an entity type -- because most organization-ish fields accept
 * an overlapping but *different* set (research accepts `lab`, certifications don't;
 * volunteering accepts `ngo` first, work accepts `employer` first). One shared
 * "organization" scope would either be too narrow to find real matches or too wide and
 * get rejected by the trigger on save.
 */
export type EntityScope =
  | "school"
  | "activity_organization"
  | "work_organization"
  | "volunteering_organization"
  | "research_organization"
  | "project_organization"
  | "award_organization"
  | "certification_organization"
  | "sports_team"
  | "university"
  | "opportunity";

export interface ScopeDefinition {
  /**
   * Which table holds the id this scope resolves to. `universities` and `opportunities`
   * are domain tables with their own primary keys that other tables already reference
   * (target_universities.university_id, activities.opportunity_id); they each *also*
   * carry a canonical_entity_id for identity. Searching them still goes through the
   * canonical registry where one exists -- see lib/entities/search.ts.
   */
  registry: "canonical_entities" | "universities" | "opportunities";
  allowedTypes: readonly CanonicalEntityType[];
  /**
   * The entity type a student-created custom entity is filed under, or null when the
   * field does not allow a custom fallback (`canonical_required` in the catalogue).
   * Always one concrete type: a new entity has to be filed as something, and the student
   * is not asked to classify it.
   */
  customFallbackType: CanonicalEntityType | null;
  /** Noun used in the "Add ..." affordance when nothing matches. */
  customLabel: string;
}

export const ENTITY_SCOPES: Record<EntityScope, ScopeDefinition> = {
  school: {
    registry: "canonical_entities",
    allowedTypes: ["school"],
    customFallbackType: "school",
    customLabel: "school",
  },
  activity_organization: {
    registry: "canonical_entities",
    allowedTypes: ["school", "university", "employer", "organization", "research_institution", "lab", "ngo", "club", "opportunity_provider"],
    customFallbackType: "organization",
    customLabel: "organization",
  },
  work_organization: {
    registry: "canonical_entities",
    allowedTypes: ["employer", "organization", "research_institution", "lab", "ngo", "school", "university", "opportunity_provider"],
    customFallbackType: "employer",
    customLabel: "employer",
  },
  volunteering_organization: {
    registry: "canonical_entities",
    allowedTypes: ["organization", "ngo", "school", "university", "club", "research_institution", "opportunity_provider"],
    customFallbackType: "ngo",
    customLabel: "organization",
  },
  research_organization: {
    registry: "canonical_entities",
    allowedTypes: ["research_institution", "lab", "university", "school", "organization", "employer"],
    customFallbackType: "research_institution",
    customLabel: "institution or lab",
  },
  project_organization: {
    registry: "canonical_entities",
    allowedTypes: ["organization", "school", "university", "employer", "research_institution", "lab", "ngo", "club", "opportunity_provider"],
    customFallbackType: "organization",
    customLabel: "organization",
  },
  award_organization: {
    registry: "canonical_entities",
    allowedTypes: ["organization", "school", "university", "employer", "research_institution", "ngo", "club", "opportunity_provider"],
    customFallbackType: "organization",
    customLabel: "organization",
  },
  certification_organization: {
    registry: "canonical_entities",
    allowedTypes: ["organization", "school", "university", "employer", "research_institution", "ngo", "opportunity_provider"],
    customFallbackType: "organization",
    customLabel: "issuer",
  },
  sports_team: {
    registry: "canonical_entities",
    allowedTypes: ["sports_team", "club", "school", "university"],
    customFallbackType: "sports_team",
    customLabel: "team or club",
  },
  // Universities are curated global reference data with sourced statistics attached. A
  // student inventing one would create a row the University Explorer then has to show
  // with no admissions data behind it, so there is no custom fallback here.
  university: {
    registry: "universities",
    allowedTypes: ["university"],
    customFallbackType: null,
    customLabel: "university",
  },
  // Same reasoning: an opportunity carries a deadline, eligibility and a source URL.
  // Those come from the discovery pipeline, never from a typed name.
  opportunity: {
    registry: "opportunities",
    allowedTypes: [],
    customFallbackType: null,
    customLabel: "opportunity",
  },
};

export const ENTITY_SCOPE_NAMES = Object.keys(ENTITY_SCOPES) as EntityScope[];

export function isEntityScope(value: unknown): value is EntityScope {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_SCOPES, value);
}
