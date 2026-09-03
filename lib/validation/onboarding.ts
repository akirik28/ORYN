import { z } from "zod";
import type { CurriculumType, TargetGeography } from "@/types/database";
import { LANGUAGE_PROFICIENCY_VALUES } from "@/lib/vocabularies/languages";
// The client-safe constant file, not lib/profile/curriculum-other-text.ts (server-only) --
// live-verified 2026-09-03 that this file is NOT purely server-side despite being
// validation code: features/profile/field-config.ts imports INTEREST_SUGGESTIONS from here,
// and field-config.ts is itself consumed by client components (dynamic-form-fields.tsx,
// the onboarding wizard's import-step.tsx), so a server-only import here broke the client
// bundle build entirely -- caught by the build, not by tsc or lint, neither of which flags
// a "server-only" boundary violation.
import { CURRICULUM_OTHER_TEXT_MAX_LENGTH } from "@/lib/profile/curriculum-other-text-constant";

export const GOAL_OPTIONS = [
  "Competitive universities",
  "Exploring careers",
  "Building my profile",
  "Finding opportunities",
  "Not sure yet",
] as const;

export const CURRICULUM_OPTIONS: { value: CurriculumType; label: string }[] = [
  { value: "ap", label: "AP" },
  { value: "ib", label: "IB" },
  { value: "a_level", label: "A-Level" },
  { value: "turkish_curriculum", label: "Turkish curriculum" },
  { value: "national_curriculum", label: "National curriculum" },
  { value: "other", label: "Other" },
];

export const GEOGRAPHY_OPTIONS: { value: TargetGeography; label: string }[] = [
  { value: "usa", label: "USA" },
  { value: "uk", label: "UK" },
  { value: "europe", label: "Europe" },
  { value: "canada", label: "Canada" },
  { value: "turkey", label: "Turkey" },
  { value: "not_sure", label: "Not sure" },
];

export const INTEREST_SUGGESTIONS = [
  "Economics",
  "Business",
  "Computer Science",
  "Engineering",
  "Medicine",
  "Law",
  "Psychology",
  "Politics",
  "Mathematics",
  "Physics",
  "Design",
  "Entrepreneurship",
  "Biology",
  "Environmental Science",
  "History",
  "Literature",
];

const currentYear = new Date().getFullYear();

export const CompleteOnboardingSchema = z.object({
  goals: z.array(z.string()).max(10),
  country: z.string().min(1, { error: "Select a country." }),
  schoolName: z.string().min(1, { error: "Enter your school." }),
  /** Canonical Entity Autocomplete System — set when the student picked a real
   * registry entry rather than typing free text. Re-verified server-side against
   * canonical_entities (entity_type='school') before it's ever persisted; null is the
   * legacy free-text path, which stays fully supported. */
  schoolId: z.string().nullable().optional(),
  graduationYear: z.coerce
    .number()
    .int()
    .min(currentYear, { error: "Pick a graduation year in the future." })
    .max(currentYear + 8),
  /**
   * Asked here, and required, because it is the one input Oryn cannot work around. 139 of
   * the active opportunities carry an age limit, and `lib/counselor/eligibility.ts` refuses
   * to guess: with no birth year on file every one of them degrades to "this has an age
   * requirement Oryn can't check", on the Counselor page and on every opportunity card. It
   * was previously collected nowhere in the product — not onboarding, not the profile, not
   * settings — only read, so 6 of 11 accounts had it null and 5 of those had completed
   * onboarding (measured 2026-08-31). An optional field here would reproduce exactly that.
   *
   * Year only, never a full date: `lib/social/age.ts` documents that year-precision is
   * enough for every decision this product makes, and the spec asks for the minimum that
   * works. The bounds are deliberately wide — they reject typos and impossible values, not
   * unusual students.
   */
  birthYear: z.coerce
    .number()
    .int()
    .min(currentYear - 100, { error: "Enter the year you were born." })
    .max(currentYear - 10, { error: "Enter the year you were born." }),
  curriculum: z.enum(["ap", "ib", "a_level", "turkish_curriculum", "national_curriculum", "other"]),
  /** Migration 0109, proposed and not yet applied. Optional in every real sense — nullable,
   *  never required even when curriculum is "other" — see that migration's own header for
   *  why this stays a narrow "which qualification" field, not general notes. Trimmed and
   *  capped so accidental whitespace-only input reads as empty rather than "filled". */
  curriculumOtherText: z
    .string()
    .trim()
    .max(CURRICULUM_OTHER_TEXT_MAX_LENGTH, { error: `Keep this to ${CURRICULUM_OTHER_TEXT_MAX_LENGTH} characters or fewer.` })
    .nullable()
    .optional(),
  interests: z.array(z.string().min(1)).max(20),
  targetGeographies: z.array(z.enum(["usa", "uk", "europe", "canada", "turkey", "not_sure"])).max(6),
  extractedItems: z
    .array(
      z.object({
        category: z.enum(["education", "activities", "awards", "projects", "research", "workExperience"]),
        title: z.string().min(1),
        organization: z.string().nullable(),
        organizationEntityId: z.string().nullable(),
        description: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
      })
    )
    .max(60)
    .optional(),
  extractedSkills: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.enum(["technical", "creative", "analytical", "communication", "leadership", "other"]),
        proficiency: z.string().nullable(),
      })
    )
    .max(30)
    .optional(),
  extractedLanguages: z
    .array(
      z.object({
        name: z.string().min(1),
        proficiency: z.enum(LANGUAGE_PROFICIENCY_VALUES).nullable(),
      })
    )
    .max(10)
    .optional(),
});

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
