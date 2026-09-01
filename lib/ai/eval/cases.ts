import { FIXTURES } from "./fixtures";
import type { EvalCase, EvalTarget } from "./types";

const TARGETS: readonly EvalTarget[] = ["advisor_chat", "weekly_plan", "counselor_explain"];
const LOCALES: readonly ("en" | "tr")[] = ["en", "tr"];

/** The full cross-product: both fixtures, all three targets, both locales — 12 cases.
 * "Both languages from the start" was explicit in the assignment, not a follow-up. */
export const ALL_CASES: readonly EvalCase[] = FIXTURES.flatMap((fixture) => TARGETS.flatMap((target) => LOCALES.map((locale): EvalCase => ({ fixture, target, locale }))));
