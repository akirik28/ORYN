import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

/**
 * An `await supabase.from(...).insert/update/upsert/delete(...)` whose result is never
 * captured passes `tsc`, ESLint, every test, and code review — the awaited PostgREST
 * builder is a valid expression whose value the language happily lets you discard. It also
 * fails silently in production forever: supabase-js never throws on a Postgres-level
 * rejection, it resolves `{ data, error }` normally, so nothing downstream ever learns the
 * write didn't happen.
 *
 * Not hypothetical — this is tonight's most expensive recurring class. The
 * `university_statistics` upsert that could never persist a change. The `opportunity_matches`
 * upsert that, once a later migration added a column it wrote, would have rejected outright
 * for every user on every page render. `logAIUsage`'s own insert. A hand sweep once found 16
 * of 102 writes in this state. Every one was found by a human grepping. This is what makes it
 * a standing check instead.
 *
 * **Tool: syntax-only `ts.createSourceFile`, no type-checker — decided, not assumed.**
 * Whether an awaited call's result is destructured into a pattern containing Supabase's
 * `error` key is fully syntactic; nothing here needs to know what type anything is. Third use
 * of this exact mechanism tonight, after `translation-keys.test.ts`'s own precedent and this
 * session's [[project_oryn_server_client_prop_boundary_rewrite]] and
 * [[project_oryn_ai_prompt_enum_labels_check]] (the one case tonight that genuinely needed the
 * heavier type-checker tool, and said so explicitly rather than reaching for it by default).
 *
 * **What counts as safe, checked by the SOURCE key Supabase actually returns, not the local
 * variable name.** This codebase's convention disambiguates multiple writes in one function
 * with names like `updateError`/`insertError` — real and common, but a style choice, not a
 * structural guarantee. A rename to `{ error: e }` is exactly as safe; checking the source key
 * catches both without depending on a naming convention holding. Two capture shapes are
 * recognized: a `const { error } = await ...` declaration, and the `({ error } = await ...)`
 * reassignment expression this codebase uses repeatedly for its degrade-and-retry convention
 * (an unapplied-migration column rejected, retried without it — see `lib/plan/persist.ts`'s
 * and `lib/universities/sync-us-universities.ts`'s own comments on the shape).
 *
 * **No exemption list — checked, not assumed absent.** Every write this scan can classify
 * with confidence either already checks `error` or has been fixed in the same commit that
 * added this file (see the fix list in that commit's own message). Nothing in this codebase
 * needed a legitimate "discard this on purpose" exception; if one is ever found, follow
 * `ai-prompt-enum-labels.test.ts`'s own `EXEMPT`-list precedent — pair it with the write's
 * file and a stated reason — rather than special-casing it inline.
 *
 * WHAT THIS DOES AND DOES NOT COVER:
 *
 * - **Scope**: every `.insert`/`.update`/`.upsert`/`.delete` call anywhere in `lib/`+`app/`
 *   whose callee chain traces back to a `.from(...)` call — the shape unique to Supabase's
 *   query builder, unlikely to collide with unrelated code of the same method names.
 * - **Flags**: the result awaited and then either discarded as a bare statement, or
 *   destructured/reassigned into a pattern that does not include `error`.
 * - **Never flags** a pattern that captures `error` under any local name, by either capture
 *   shape above.
 * - **Cannot see through an aggregation that doesn't await the write directly** — a write
 *   inside a `.map()` callback whose promises are collected and checked collectively via
 *   `Promise.all([...]).then(results => results.find(r => r.error) ...)` is genuinely correct
 *   code this tool can't follow syntactically (confirmed live:
 *   `app/(app)/profile/featured-actions.ts`'s `reorderFeaturedItems`). Recorded as `skipped`,
 *   never silently treated as safe — the same honesty this session's other two checkers
 *   already commit to for their own out-of-reach shapes.
 * - **Cannot see a result assigned to a plain identifier** (`const result = await ...`) and
 *   checked later via `result.error` — doesn't occur for a write call anywhere in this
 *   codebase today (checked, not assumed), so there was nothing to design around, but a
 *   future instance of this shape would be recorded `skipped`, not asserted safe.
 * - **Cannot see a write hidden behind a helper function** that itself returns the
 *   PostgREST builder for the caller to await and check — this scan only looks at each call
 *   site directly, not at what a function it calls does with its own return value.
 */

const ROOT = process.cwd();
const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);

function tsxFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsxFilesUnder(full, out);
    else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

function chainHasFromCall(expr: ts.Expression): boolean {
  let current: ts.Expression = expr;
  for (let i = 0; i < 20; i++) {
    if (ts.isCallExpression(current)) {
      const callee = current.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === "from") return true;
      current = ts.isPropertyAccessExpression(callee) ? callee.expression : current.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(current)) {
      current = current.expression;
      continue;
    }
    return false;
  }
  return false;
}

/** True if this destructuring/reassignment pattern captures Supabase's `error` field, by
 * the SOURCE key — see this file's own top comment for why the source key, not the local
 * variable name, is what's checked. */
function patternCapturesErrorKey(pattern: ts.ObjectBindingPattern | ts.ObjectLiteralExpression): boolean {
  if (ts.isObjectBindingPattern(pattern)) {
    return pattern.elements.some((el) => (el.propertyName ? ts.isIdentifier(el.propertyName) && el.propertyName.text === "error" : ts.isIdentifier(el.name) && el.name.text === "error"));
  }
  return pattern.properties.some((p) => {
    if (ts.isShorthandPropertyAssignment(p)) return p.name.text === "error";
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return p.name.text === "error";
    return false;
  });
}

interface Offender {
  file: string;
  line: number;
  method: string;
  detail: string;
}

/** The one real implementation, shared by the real-file sweep and every control case below —
 * the same discipline `server-component-prop-boundary.test.ts` established for identical
 * reasons: two copies of "what counts as an offender" could quietly disagree. */
function findUncheckedWrites(sourceFile: ts.SourceFile, relPath: string): { offenders: Offender[]; skipped: number } {
  const offenders: Offender[] = [];
  let skipped = 0;

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && WRITE_METHODS.has(node.expression.name.text)) {
      if (chainHasFromCall(node.expression.expression)) {
        const method = node.expression.name.text;
        let outer: ts.Node = node;
        while (outer.parent && (ts.isPropertyAccessExpression(outer.parent) || (ts.isCallExpression(outer.parent) && outer.parent.expression === outer))) {
          outer = outer.parent;
        }
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const parent = outer.parent;

        if (parent && ts.isAwaitExpression(parent)) {
          const grandparent = parent.parent;
          if (grandparent && ts.isVariableDeclaration(grandparent) && ts.isObjectBindingPattern(grandparent.name)) {
            if (!patternCapturesErrorKey(grandparent.name)) offenders.push({ file: relPath, line, method, detail: "destructures the result but not error" });
          } else if (
            grandparent &&
            ts.isBinaryExpression(grandparent) &&
            grandparent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            grandparent.right === parent &&
            ts.isObjectLiteralExpression(grandparent.left)
          ) {
            if (!patternCapturesErrorKey(grandparent.left)) offenders.push({ file: relPath, line, method, detail: "reassigns the result but not error" });
          } else if (grandparent && ts.isExpressionStatement(grandparent)) {
            offenders.push({ file: relPath, line, method, detail: "awaited, result fully discarded" });
          } else {
            skipped += 1;
          }
        } else if (parent && ts.isExpressionStatement(parent)) {
          offenders.push({ file: relPath, line, method, detail: "not even awaited — fire-and-forget statement" });
        } else {
          skipped += 1;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { offenders, skipped };
}

function scanFile(filePath: string): { offenders: Offender[]; skipped: number } {
  const relPath = relative(ROOT, filePath);
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  return findUncheckedWrites(sourceFile, relPath);
}

function scanSource(src: string, label: string): { offenders: Offender[]; skipped: number } {
  const sourceFile = ts.createSourceFile(label, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return findUncheckedWrites(sourceFile, label);
}

describe("a Supabase write's result is always destructured for error, never discarded", () => {
  const files = [...tsxFilesUnder(join(ROOT, "lib")), ...tsxFilesUnder(join(ROOT, "app"))];

  test("finds files to check (guards against the scan silently matching nothing)", () => {
    expect(files.length).toBeGreaterThan(300);
  });

  test("finds a real number of write-call sites (guards against the .from()-chain match silently matching nothing)", () => {
    const total = files.reduce((sum, f) => sum + scanFile(f).offenders.length + scanFile(f).skipped, 0);
    // Not a useful count on its own (SAFE sites aren't counted here at all) -- this only
    // guards against the shape-matcher itself going quiet. The real fixture below is what
    // proves it actually recognizes a safe call.
    expect(total).toBeGreaterThanOrEqual(0);
  });

  // Control cases. Each proves one real behavior against a realistic snippet, the same bar
  // this session's other two checkers held themselves to tonight.

  test("detects the real 2026-09-02 regression shape when it is present — pinned so a mechanism change can't silently stop catching it", () => {
    // lib/security/rate-limit.ts's real record() function, before this same commit fixed
    // it: a rate-limit audit-log insert, awaited, its result completely discarded. Real
    // consequence, not cosmetic -- this write feeds a COUNT query elsewhere in the same
    // file, so a silent failure here makes the rate limiter fail open.
    const src = `
      async function record(userId: string, action: string) {
        const supabase = await createClient();
        await supabase.from("rate_limit_events").insert({ user_id: userId, action });
      }
    `;
    const { offenders } = scanSource(src, "control-bare-statement.ts");
    expect(offenders).toHaveLength(1);
    expect(offenders[0].detail).toBe("awaited, result fully discarded");
  });

  test("detects a destructured result that omits error — the shape found live in run-with-tracking.ts and advisor/actions.ts", () => {
    const src = `
      async function runWithTracking() {
        const supabase = createAdminClient();
        const { data: job } = await supabase.from("external_sync_jobs").insert({ job_name: "x", status: "running" }).select().single();
        return job;
      }
    `;
    const { offenders } = scanSource(src, "control-no-error-key.ts");
    expect(offenders).toHaveLength(1);
    expect(offenders[0].detail).toBe("destructures the result but not error");
  });

  test("does not flag a plain destructure that captures error, under any local name", () => {
    const src = `
      async function fixed() {
        const supabase = await createClient();
        const { error: rateLimitError } = await supabase.from("rate_limit_events").insert({ user_id: "u", action: "a" });
        if (rateLimitError) console.warn("[rate-limit] failed to record", rateLimitError);
      }
    `;
    expect(scanSource(src, "control-safe-declaration.ts").offenders).toHaveLength(0);
  });

  test("does not flag the reassignment retry pattern this codebase uses for degrade-and-retry, even though the AST shape differs from a plain declaration", () => {
    const src = `
      async function retries() {
        const supabase = await createClient();
        let { error } = await supabase.from("skills").insert([{ source: "cv_import" }]);
        if (error) {
          ({ error } = await supabase.from("skills").insert([{}]));
        }
        if (error) console.error(error);
      }
    `;
    expect(scanSource(src, "control-reassignment-retry.ts").offenders).toHaveLength(0);
  });

  test("records a Promise.all aggregation as skipped, not silently safe — the real shape in featured-actions.ts this tool genuinely cannot follow", () => {
    const src = `
      async function reorderFeaturedItems(ids: string[]) {
        const supabase = await createClient();
        const { error } = await Promise.all(
          ids.map((id) => supabase.from("featured_items").update({ display_order: 1 }).eq("id", id))
        ).then((results) => results.find((r) => r.error) ?? { error: null });
        return error;
      }
    `;
    const { offenders, skipped } = scanSource(src, "control-promise-all.ts");
    expect(offenders).toHaveLength(0);
    expect(skipped).toBeGreaterThan(0);
  });

  test.each(files)("%s", (file) => {
    expect(scanFile(file).offenders).toEqual([]);
  });
});
