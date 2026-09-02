import { z } from "zod";
import type { CurriculumType, TargetGeography } from "@/types/database";
import { LANGUAGE_PROFICIENCY_VALUES } from "@/lib/vocabularies/languages";

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
