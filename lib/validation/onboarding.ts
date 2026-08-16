import { z } from "zod";
import type { CurriculumType, TargetGeography } from "@/types/database";

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
   * registry entry rather than typing free text. Re-verified server-side against the
   * institutions table (category='school') before it's ever persisted; null is the
   * legacy/custom free-text path, which stays fully supported. */
  schoolId: z.string().nullable().optional(),
  graduationYear: z.coerce
    .number()
    .int()
    .min(currentYear, { error: "Pick a graduation year in the future." })
    .max(currentYear + 8),
  curriculum: z.enum(["ap", "ib", "a_level", "turkish_curriculum", "national_curriculum", "other"]),
  interests: z.array(z.string().min(1)).max(20),
  targetGeographies: z.array(z.enum(["usa", "uk", "europe", "canada", "turkey", "not_sure"])).max(6),
  extractedItems: z
    .array(
      z.object({
        category: z.enum(["education", "activities", "awards", "projects", "research", "workExperience"]),
        title: z.string().min(1),
        organization: z.string().nullable(),
        description: z.string().nullable(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
      })
    )
    .max(60)
    .optional(),
});

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
