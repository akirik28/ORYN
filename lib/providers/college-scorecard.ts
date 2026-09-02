import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";
import { fetchProviderJson } from "./fetch-json";
import type { ProviderResult } from "./types";

const PROVIDER_NAME = "college_scorecard";
const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

// The College Scorecard API is unusual in that it returns a flat object whose keys are
// literally the dotted field names you requested (e.g. {"school.name": "..."}), not a
// nested object — hence the bracket-string schema keys below.
const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.ownership",
  "school.school_url",
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.cost.attendance.academic_year",
  "latest.completion.completion_rate_4yr_150nt",
].join(",");

const SchoolResultSchema = z
  .object({
    id: z.number(),
    "school.name": z.string(),
    "school.city": z.string().nullable().optional(),
    "school.state": z.string().nullable().optional(),
    "school.ownership": z.number().nullable().optional(),
    "school.school_url": z.string().nullable().optional(),
    "latest.student.size": z.number().nullable().optional(),
    "latest.admissions.admission_rate.overall": z.number().nullable().optional(),
    "latest.admissions.sat_scores.25th_percentile.critical_reading": z.number().nullable().optional(),
    "latest.admissions.sat_scores.75th_percentile.critical_reading": z.number().nullable().optional(),
    "latest.admissions.sat_scores.25th_percentile.math": z.number().nullable().optional(),
    "latest.admissions.sat_scores.75th_percentile.math": z.number().nullable().optional(),
    "latest.admissions.act_scores.25th_percentile.cumulative": z.number().nullable().optional(),
    "latest.admissions.act_scores.75th_percentile.cumulative": z.number().nullable().optional(),
    "latest.cost.attendance.academic_year": z.number().nullable().optional(),
    "latest.completion.completion_rate_4yr_150nt": z.number().nullable().optional(),
  })
  .catchall(z.unknown());

const ScorecardResponseSchema = z.object({
  metadata: z.object({ total: z.number(), page: z.number(), per_page: z.number() }),
  results: z.array(SchoolResultSchema),
});

const OWNERSHIP_LABELS: Record<number, string> = {
  1: "Public",
  2: "Private nonprofit",
  3: "Private for-profit",
};

export interface NormalizedSchool {
  collegeScorecardId: number;
  name: string;
  city: string | null;
  state: string | null;
  institutionType: string | null;
  websiteUrl: string | null;
  studentSize: number | null;
  admissionRate: number | null;
  satMathRange: [number, number] | null;
  satReadingRange: [number, number] | null;
  actRange: [number, number] | null;
  costOfAttendance: number | null;
  graduationRate: number | null;
}

function normalize(raw: z.infer<typeof SchoolResultSchema>): NormalizedSchool {
  const satMathLow = raw["latest.admissions.sat_scores.25th_percentile.math"] ?? null;
  const satMathHigh = raw["latest.admissions.sat_scores.75th_percentile.math"] ?? null;
  const satReadLow = raw["latest.admissions.sat_scores.25th_percentile.critical_reading"] ?? null;
  const satReadHigh = raw["latest.admissions.sat_scores.75th_percentile.critical_reading"] ?? null;
  const actLow = raw["latest.admissions.act_scores.25th_percentile.cumulative"] ?? null;
  const actHigh = raw["latest.admissions.act_scores.75th_percentile.cumulative"] ?? null;

  return {
    collegeScorecardId: raw.id,
    name: raw["school.name"],
    city: raw["school.city"] ?? null,
    state: raw["school.state"] ?? null,
    institutionType: raw["school.ownership"] != null ? (OWNERSHIP_LABELS[raw["school.ownership"]] ?? null) : null,
    websiteUrl: raw["school.school_url"] ?? null,
    studentSize: raw["latest.student.size"] ?? null,
    admissionRate: raw["latest.admissions.admission_rate.overall"] ?? null,
    satMathRange: satMathLow != null && satMathHigh != null ? [satMathLow, satMathHigh] : null,
    satReadingRange: satReadLow != null && satReadHigh != null ? [satReadLow, satReadHigh] : null,
    actRange: actLow != null && actHigh != null ? [actLow, actHigh] : null,
    costOfAttendance: raw["latest.cost.attendance.academic_year"] ?? null,
    graduationRate: raw["latest.completion.completion_rate_4yr_150nt"] ?? null,
  };
}

/**
 * U.S. Department of Education College Scorecard — the primary structured source for
 * U.S. institution data (AGENTS.md section 7). A general institutional admission rate is never the
 * same as an individual student's probability of admission; callers must not conflate
 * the two (see lib/admissions for how outlook is actually computed).
 */
export class CollegeScorecardProvider {
  private get apiKey(): string | null {
    return env.collegeScorecard.apiKey ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async searchByName(name: string, perPage = 10): Promise<ProviderResult<NormalizedSchool[]>> {
    if (!this.apiKey) {
      return { success: false, error: { type: "not_configured", message: "COLLEGE_SCORECARD_API_KEY is not set." } };
    }

    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("school.name", name);
    url.searchParams.set("fields", FIELDS);
    url.searchParams.set("per_page", String(perPage));

    const result = await fetchProviderJson(url.toString(), { method: "GET" }, { provider: PROVIDER_NAME });
    if (!result.success) return result;

    const parsed = ScorecardResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return { success: false, error: { type: "malformed_response", message: "College Scorecard response didn't match the expected shape." } };
    }

    return { success: true, data: parsed.data.results.map(normalize) };
  }

  async getById(collegeScorecardId: number): Promise<ProviderResult<NormalizedSchool | null>> {
    if (!this.apiKey) {
      return { success: false, error: { type: "not_configured", message: "COLLEGE_SCORECARD_API_KEY is not set." } };
    }

    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("id", String(collegeScorecardId));
    url.searchParams.set("fields", FIELDS);

    const result = await fetchProviderJson(url.toString(), { method: "GET" }, { provider: PROVIDER_NAME });
    if (!result.success) return result;

    const parsed = ScorecardResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return { success: false, error: { type: "malformed_response", message: "College Scorecard response didn't match the expected shape." } };
    }

    return { success: true, data: parsed.data.results[0] ? normalize(parsed.data.results[0]) : null };
  }
}

export const collegeScorecardProvider = new CollegeScorecardProvider();
