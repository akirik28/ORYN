import { describe, expect, test } from "vitest";
import { StructuredRuleSchema } from "@/lib/validation/requirements";

/**
 * Every structured_rule value in docs/structured-rules-batch1-2026-09-05.sql, re-parsed
 * against the real Zod schema before that SQL is packaged — JSON-valid is not the same
 * as schema-valid (wrong field name, wrong kind literal, a percentile mixed with a score),
 * and this batch is meant to be applied as-is, not re-reviewed field by field by hand.
 */
const BATCH_1_RULES = [
  { kind: "language_proficiency", testName: "IELTS Academic", minScore: 6.0 },
  { kind: "language_proficiency", testName: "IELTS Academic", minScore: 7.0 },
  { kind: "language_proficiency", testName: "IELTS Academic", minScore: 6.5 },
  { kind: "language_proficiency", testName: "TOEFL", minScore: 90 },
  { kind: "language_proficiency", testName: "TOEFL", minScore: 80 },
  { kind: "language_proficiency", testName: "TOEFL", minScore: 90 },
  { kind: "language_proficiency", testName: "TOEFL", minScore: 94 },
  { kind: "coursework", subject: "Mathematics", minLevel: "a_level" },
  { kind: "language_proficiency", testName: "TOEFL", minScore: 88 },
  { kind: "language_proficiency", testName: "Duolingo English Test", minScore: 110 },
  { kind: "test_score", testName: "Bocconi Online Test", minScore: 17 },
  { kind: "language_proficiency", testName: "Cambridge English Assessment", minScore: 191 },
  { kind: "language_proficiency", testName: "Duolingo English Test", minScore: 135 },
  { kind: "language_proficiency", testName: "IELTS", minScore: 7.5 },
];

describe("batch 1 structured_rule values all parse against the real StructuredRuleSchema", () => {
  test(`all ${BATCH_1_RULES.length} rules are schema-valid`, () => {
    for (const rule of BATCH_1_RULES) {
      const result = StructuredRuleSchema.safeParse(rule);
      expect(result.success, `${JSON.stringify(rule)}: ${!result.success ? JSON.stringify(result.error.issues) : ""}`).toBe(true);
    }
  });
});
