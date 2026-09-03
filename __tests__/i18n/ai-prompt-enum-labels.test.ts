import { describe, expect, test } from "vitest";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

/**
 * A value typed as one of PROXOLA's closed DB enums must never reach an AI prompt template
 * literal without going through its label accessor first — the same class
 * `docs/i18n-coverage.md`'s "six confirmed instances, 2026-09-02" section fixed by hand,
 * now checked by a machine instead of the next person's memory.
 *
 * **Why this needs a real type-checker, not the syntax-only scope stack
 * `translation-keys.test.ts`/`server-component-prop-boundary.test.ts` use.** Those tools
 * answer "which declaration does this name refer to" — pure scope resolution, decidable from
 * syntax alone. This question is different: "what is this arbitrary expression's static
 * type" — decidable only with real type information. `docs/i18n-coverage.md` already drew
 * this exact line today, for the adjacent problem of a dynamic translation key
 * (`t(someVar)`): *"Properly automating it needs type-aware resolution... a different kind
 * of tool than a source-text regex."* That is this file — `ts.createProgram` +
 * `TypeChecker.getTypeAtLocation`, not `ts.createSourceFile` alone.
 *
 * **The mechanism, once real types are available, turns out simpler than the syntax-only
 * checks, not more complex.** Ask the checker for the type of the exact expression sitting
 * in the `${...}` slot. If a label accessor already ran
 * (`` `${recommendationClassLabel(rec.recommendationClass, locale)}` ``), the slot's type is
 * the accessor's own return type — `string` — because `getTypeAtLocation` on a call
 * expression returns its result type, not its argument's. No `.bind()`-style call-shape
 * detection, no accessor-name allowlist to keep in sync: a value that has genuinely been
 * converted away from the tracked type is, at the type level, no longer the tracked type.
 * Confirmed empirically before trusting it, the same discipline as this session's other two
 * TS-API rewrites: probed all of `lib/ai/student-context.ts`, `counselor-explain.ts`, and
 * `weekly-plan.ts` and printed every template-slot expression's resolved type by hand.
 *
 * **That probe is also what proved name-based matching is necessary, not merely tidy.**
 * `CounselorRecommendation.confidence`/`.impact`/`.effort`/`.urgency` are all typed
 * `BoundedLevel` (`"low" | "medium" | "high"`) — structurally identical to `DataConfidence`
 * (`"high" | "medium" | "low"`, same three literals) but a genuinely different declared
 * alias, not tracked here. A check that compared the *set of literal values* instead of the
 * alias's own name would have wrongly flagged `counselor-explain.ts:89`'s
 * `` `confidence: ${rec.confidence}` `` — real code, correctly unlabeled, because
 * `BoundedLevel` was never one of the eight enums this file exists to police. Matching on
 * `type.aliasSymbol?.getName()` avoids that false positive by construction.
 *
 * WHAT THIS DOES AND DOES NOT COVER:
 *
 * - **Scope**: every `.ts` file directly under `lib/ai/` and `lib/counselor/` (flat, no
 *   subdirectories in either today — confirmed, not assumed) — the two directories
 *   `docs/i18n-coverage.md` names as "the AI-prompt surface" for this exact bug class.
 * - **Flags**: a template-literal substitution expression whose resolved type carries an
 *   `aliasSymbol` matching one of the eight tracked names, unless explicitly exempted below.
 * - **Never flags a value already passed through a label accessor**, by construction (see
 *   above) — no maintained allowlist of accessor names to fall out of sync with reality.
 * - **`EXEMPT` is a small, explicit, reviewed allowlist** (mirroring
 *   `label-accessors.test.ts`'s `MAPS_WITH_ACCESSORS` pairing, not a magic-comment
 *   convention this scanner would have to parse out of prose) for values whose *own*
 *   literals already read as ordinary words — the same standard
 *   `formatContextForPrompt`'s own comment states for `TargetStatus`. Two entries: the
 *   named, already-reasoned `status` exemption, and `DataConfidence` at
 *   `student-context.ts:519` (`` confidence: ${d.confidence} ``) — found live by this
 *   file's own first real run, reasoned the same way, previously undocumented. Both now
 *   carry a matching source comment *and* this list — a decision recorded in only one place
 *   is a decision that can drift; see `feedback_documentation_is_not_propagation`.
 * - **Cannot see through a union that only partly matches a tracked alias** — a ternary
 *   returning either a tracked-type value or an extra ad-hoc string literal
 *   (`cond ? a.status : "fallback"`) generally loses `aliasSymbol` on the merged union type,
 *   so it would not be flagged. Not observed in the current scan; named because a check that
 *   silently sees less than its own description is the exact failure this file polices in
 *   everything it inherited from tonight's other two rewrites.
 * - **Cost, measured**: building the `ts.Program` (41 root files, ~1200 in the resolved
 *   transitive closure — the whole app graph, not a small slice) takes roughly 2.5–3s, one
 *   time, at module load — far more than the ~200ms syntax-only scans, because this is the
 *   first check tonight that genuinely needs the type checker rather than the parser alone.
 *   Paid once per test run, shared by every case in this file (one `ts.Program`, built with
 *   the real project roots plus every control-case snippet below as additional virtual
 *   roots on the same host), not once per case.
 */

const ROOT = process.cwd();

const TRACKED_TYPES: Record<string, string> = {
  RecommendationClass: "recommendationClassLabel (lib/counselor/copy.ts)",
  TimeBudget: "timeBudgetLabel (lib/ai/student-context.ts)",
  ReflectionOutcome: "reflectionOutcomeLabel (lib/ai/student-context.ts)",
  EvidenceState: "evidenceStateLabel (lib/scoring/signal.ts)",
  CurriculumType: "curriculumLabel (lib/requirements/copy.ts)",
  TargetStatus: "no accessor — EXEMPT, see below",
  DataConfidence: "no accessor — EXEMPT, see below",
  ActionStatus: "no accessor yet — zero live template-literal occurrences today (only ever compared with ===, never interpolated); add one the day that changes",
  // 2026-09-03, the six-category advisor-context build: courses.level and
  // work_experiences.employment_type are the first two enums this build adds to lib/ai/'s
  // prompt surface -- tracked from the day they arrive rather than waiting for a live incident
  // to find them the way DataConfidence was found, per this file's own stated growth model.
  CourseLevel: "courseLevelLabel (lib/ai/student-context.ts)",
  EmploymentType: "employmentTypeLabel (lib/ai/student-context.ts)",
};

const EXEMPT: { file: string; property: string; type: string; reason: string }[] = [
  {
    file: "lib/ai/student-context.ts",
    property: "status",
    type: "TargetStatus",
    reason: 'values are ordinary words a student would recognise ("applying", "accepted", "waitlisted") — formatContextForPrompt\'s own comment states this standard first',
  },
  {
    file: "lib/ai/student-context.ts",
    property: "confidence",
    type: "DataConfidence",
    reason: 'values are "high"/"medium"/"low" — the same ordinary-words standard as TargetStatus above, applied to the second field it was never checked against until this file existed',
  },
];

function isExempt(relPath: string, propertyName: string | null, typeName: string): boolean {
  return EXEMPT.some((e) => e.file === relPath && e.type === typeName && e.property === propertyName);
}

function tsFilesIn(dir: string): string[] {
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(ROOT, dir, f));
}

interface Offender {
  file: string;
  line: number;
  expression: string;
  type: string;
}

/** The one real implementation, shared by the real-file scan and every control case below —
 * exactly the shared-core discipline `server-component-prop-boundary.test.ts` established
 * for the same reason: two copies of "what counts as an offender" could quietly disagree. */
function findOffenders(sourceFile: ts.SourceFile, checker: ts.TypeChecker, relPath: string): Offender[] {
  const offenders: Offender[] = [];

  function propertyNameOf(expr: ts.Expression): string | null {
    return ts.isPropertyAccessExpression(expr) ? expr.name.text : null;
  }

  function visit(node: ts.Node) {
    if (ts.isTemplateExpression(node)) {
      for (const span of node.templateSpans) {
        const expr = span.expression;
        const type = checker.getTypeAtLocation(expr);
        const aliasName = type.aliasSymbol?.getName();
        if (aliasName && aliasName in TRACKED_TYPES && !isExempt(relPath, propertyNameOf(expr), aliasName)) {
          const line = sourceFile.getLineAndCharacterOfPosition(expr.getStart(sourceFile)).line + 1;
          offenders.push({ file: relPath, line, expression: expr.getText(sourceFile), type: aliasName });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return offenders;
}

// ---------------------------------------------------------------------------------------
// One shared ts.Program for the whole file: the real scan roots plus every control-case
// snippet below, all as roots on one host, so the ~2.5-3s transitive-resolution cost (see
// this file's own top comment) is paid once, not once per test.
// ---------------------------------------------------------------------------------------

const REAL_FILES = [...tsFilesIn("lib/ai"), ...tsFilesIn("lib/counselor")];

const SNIPPETS = {
  rawRecommendationClass: {
    path: join(ROOT, "__tests__/i18n/__snippet__/raw-recommendation-class.ts"),
    source: `
      import type { RecommendationClass } from "@/types/database";
      declare const value: RecommendationClass;
      export const s = \`Recommendation: \${value}\`;
    `,
  },
  labeledRecommendationClass: {
    path: join(ROOT, "__tests__/i18n/__snippet__/labeled-recommendation-class.ts"),
    source: `
      import type { RecommendationClass } from "@/types/database";
      import { recommendationClassLabel } from "@/lib/counselor/copy";
      declare const value: RecommendationClass;
      export const s = \`Recommendation: \${recommendationClassLabel(value, "en")}\`;
    `,
  },
  intermediateVariable: {
    path: join(ROOT, "__tests__/i18n/__snippet__/intermediate-variable.ts"),
    source: `
      import type { RecommendationClass } from "@/types/database";
      import { recommendationClassLabel } from "@/lib/counselor/copy";
      declare const value: RecommendationClass;
      const label = recommendationClassLabel(value, "en");
      export const s = \`Recommendation: \${label}\`;
    `,
  },
  boundedLevelNotTracked: {
    path: join(ROOT, "__tests__/i18n/__snippet__/bounded-level-not-tracked.ts"),
    source: `
      type BoundedLevel = "low" | "medium" | "high";
      declare const confidence: BoundedLevel;
      export const s = \`confidence: \${confidence}\`;
    `,
  },
} as const;

const compilerOptions: ts.CompilerOptions = (() => {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json")!;
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  return { ...parsed.options, incremental: false };
})();

const virtualFiles = new Map(Object.values(SNIPPETS).map((s) => [s.path, s.source]));

const host = ts.createCompilerHost(compilerOptions);
const realGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  const virtualSource = virtualFiles.get(fileName);
  if (virtualSource !== undefined) return ts.createSourceFile(fileName, virtualSource, languageVersion, true, ts.ScriptKind.TS);
  return realGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};
const realFileExists = host.fileExists.bind(host);
host.fileExists = (fileName) => virtualFiles.has(fileName) || realFileExists(fileName);
const realReadFile = host.readFile.bind(host);
host.readFile = (fileName) => virtualFiles.get(fileName) ?? realReadFile(fileName);

const rootNames = [...REAL_FILES, join(ROOT, "next-env.d.ts"), ...virtualFiles.keys()];
const program = ts.createProgram(rootNames, compilerOptions, host);
const checker = program.getTypeChecker();

function scanReal(filePath: string): Offender[] {
  const relPath = relative(ROOT, filePath);
  const sourceFile = program.getSourceFile(filePath)!;
  return findOffenders(sourceFile, checker, relPath);
}

function scanSnippet(snippet: { path: string; source: string }): Offender[] {
  const sourceFile = program.getSourceFile(snippet.path)!;
  return findOffenders(sourceFile, checker, relative(ROOT, snippet.path));
}

describe("a DB enum reaches an AI prompt template literal only through its label accessor", () => {
  test("finds files to check (guards against the scan silently matching nothing)", () => {
    expect(REAL_FILES.length).toBeGreaterThan(30);
  });

  test("the shared Program actually resolved every root file (guards against a silent resolution failure making every case below vacuously pass)", () => {
    for (const f of [...REAL_FILES, ...virtualFiles.keys()]) {
      expect(program.getSourceFile(f), `expected ${relative(ROOT, f)} to resolve`).toBeDefined();
    }
  });

  // Control cases. Each proves one real behavior of the mechanism against a snippet that
  // genuinely imports the real project types — not an approximation of them — the same bar
  // `server-component-prop-boundary.test.ts` held itself to for its own control cases.

  test("flags a raw tracked-enum value interpolated directly", () => {
    const offenders = scanSnippet(SNIPPETS.rawRecommendationClass);
    expect(offenders).toHaveLength(1);
    expect(offenders[0].type).toBe("RecommendationClass");
  });

  test("does not flag a value already passed through its real label accessor", () => {
    expect(scanSnippet(SNIPPETS.labeledRecommendationClass)).toHaveLength(0);
  });

  test("does not flag a label already resolved into an intermediate variable before interpolation — the real shape formatContextForPrompt uses for dimension labels", () => {
    expect(scanSnippet(SNIPPETS.intermediateVariable)).toHaveLength(0);
  });

  test("does not flag a different alias with the same literal values as a tracked type — BoundedLevel vs DataConfidence, the real near-miss this file's own probe found at counselor-explain.ts:89", () => {
    expect(scanSnippet(SNIPPETS.boundedLevelNotTracked)).toHaveLength(0);
  });

  // isExempt is tested directly rather than through a synthetic Program scan — it's a pure,
  // three-argument predicate, and a full compile buys no more confidence than calling it.
  // What matters is proving it *discriminates* on all three fields, not merely that it can
  // return true — a version that accidentally matched on file alone (exempting every tracked
  // type in student-context.ts, not just the two real ones) would pass a same-file-only
  // check and silently stop this file from doing its job on its own most-populated file.
  test("EXEMPT matches only the exact (file, property, type) triple — proves discrimination, not just that a match is possible", () => {
    expect(isExempt("lib/ai/student-context.ts", "status", "TargetStatus")).toBe(true);
    expect(isExempt("lib/ai/student-context.ts", "confidence", "DataConfidence")).toBe(true);
    expect(isExempt("lib/ai/student-context.ts", "status", "DataConfidence")).toBe(false);
    expect(isExempt("lib/ai/other-file.ts", "status", "TargetStatus")).toBe(false);
    expect(isExempt("lib/ai/student-context.ts", "outlook", "TargetStatus")).toBe(false);
  });

  test.each(REAL_FILES)("%s", (file) => {
    expect(scanReal(file)).toEqual([]);
  });
});
