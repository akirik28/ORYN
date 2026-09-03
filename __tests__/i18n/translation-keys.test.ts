import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";
import en from "@/messages/en.json";

/**
 * next-intl renders the literal key path as visible text when `t()` is called with a key its
 * namespace does not have. It does not throw, and nothing catches it:
 *
 * - **Typecheck cannot.** The `Translator` type alias used across this codebase to dodge
 *   TS2589 ("type instantiation is excessively deep") also erases next-intl's compile-time
 *   key checking. That is a deliberate trade, and this is the cost of it.
 * - **Tests did not.** A component test renders whatever the catalog gives it; a wrong key
 *   renders as a string either way.
 *
 * So it took a live check to find one: the opportunities detail page called an
 * `eligibilityUnknown` badge against `opportunities.detailPage` when the key lives in
 * `opportunities.card`, and the page showed the student `opportunities.detailPage.eligibilityUnknown`
 * (i18n lane, 2026-09-01, found by reading rendered text). They then cross-checked seven
 * files by hand. This does that for every file, every time.
 *
 * **Rewritten 2026-09-01 to use the TypeScript compiler API for real lexical scope
 * resolution, replacing an earlier regex-based version.** The regex approach's own
 * `namespaceBindings` treated any name bound to 2+ namespaces *anywhere in a file*, or ever
 * used as a `: Translator`-typed parameter *anywhere in a file*, as ambiguous for every one
 * of its occurrences in that entire file — including calls in a completely different,
 * unambiguous function that never saw the conflicting binding at all. Two bugs came from
 * that, found auditing the guard itself the same day: (1) a parenthesized-cast pattern —
 * `const t = (await getTranslations("x")) as Translator`, needed because `await x as Y`
 * doesn't parse the way the cast intends — didn't match the binding regex at all, so a file
 * using it contributed to neither `checked` nor `skipped`; it was simply invisible, with no
 * signal anywhere that it hadn't been looked at. That included
 * `app/(app)/opportunities/[id]/page.tsx` — the exact file whose exact bug this guard exists
 * to catch. (2) Even after that regex was patched, whole-file shadowing still discarded
 * real, resolvable calls (`app/(auth)/actions.ts`'s three sibling functions each bind `t` to
 * a different `auth.*` namespace; every one of their ~14 calls was being thrown out because
 * the *name* "t" meant more than one thing *somewhere* in the file, even though each call
 * site was individually unambiguous).
 *
 * A real AST fixes both, correctly, because it tracks actual lexical scope rather than
 * approximating it: `ts.createSourceFile` parses each file (no type-checking, no
 * `tsconfig`/`Program` needed — this only needs syntax, not types, so it stays fast: ~200ms
 * to parse everything `SCAN_DIRS` covers), and a single top-down traversal carries an
 * explicit scope stack — push a new binding scope on every function and block, pop on exit,
 * resolve each `name(...)` call against the *nearest* enclosing declaration of `name`, exactly
 * the way the language itself resolves it. A `const t = useTranslations(...)` binds `t` to a
 * namespace in its own scope; a `t: Translator` function parameter also binds `t`, to no
 * known namespace, in its own (necessarily more nested) scope — nesting is what makes "nearest
 * wins" correct without needing to reason about namespaces vs. parameters as separate cases.
 * `checked` moved 1055 → 1160 in the rewrite (the regex-only parens fix alone had already
 * taken it to 1068); zero new offenders among the newly-checked calls, so this closes real
 * coverage gaps without also surfacing a live bug hiding behind them. `skipped` moved from
 * counting *(file, name) pairs treated as ambiguous* to counting *individual call sites*
 * whose nearest binding is a parameter — a different, more precise unit, and a smaller
 * number of the thing that actually matters (unverifiable calls) even though the file-level
 * predecessor's number was smaller in its own units.
 *
 * Deliberately still narrow in the one way narrowing is actually unavoidable: a
 * `: Translator`-typed parameter's *own* namespace is genuinely undecidable from inside the
 * function that declares it — it depends on what the caller passes, which is real
 * cross-function data-flow analysis, not scope resolution, and a different kind of tool than
 * this file. `t(\`x.${y}\`)` (template-literal keys) and `t(someVar)` (non-literal keys) stay
 * unresolvable for the same reason string literals exist as a concept: there's no value to
 * resolve without either running the program or reasoning about every value `y`/`someVar`
 * could hold. Both are still real, both are documented, and both were re-confirmed rather
 * than silently inherited: this session's own manual audit already checked all 12 live
 * dynamic-key call sites against their real TypeScript/Zod types and found them clean — a
 * one-time sweep, not something this guard can do standing.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "features", "components", "lib"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function hasKey(path: string): boolean {
  return path.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, en) !== undefined;
}

/** Strips `await`, wrapping parens, and `as`/`satisfies` casts down to the real expression —
 * `(await getTranslations("x")) as Translator` needs all three peeled off to find the call. */
function unwrapExpression(expr: ts.Expression): ts.Expression {
  for (;;) {
    if (ts.isParenthesizedExpression(expr)) { expr = expr.expression; continue; }
    if (ts.isAwaitExpression(expr)) { expr = expr.expression; continue; }
    if (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) { expr = expr.expression; continue; }
    return expr;
  }
}

function isFunctionLike(node: ts.Node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
}

interface Offender {
  file: string;
  line: number;
  call: string;
  resolved: string;
}

interface SkippedCall {
  file: string;
  line: number;
  call: string;
}

/** One file's worth of `name("literal")` calls, resolved against real lexical scope. A
 * binding is either a known namespace (from `useTranslations`/`getTranslations`) or `null`
 * (a `Translator`-typed parameter — real, but not resolvable from inside this file). */
function scanFile(filePath: string): { offenders: Offender[]; skipped: SkippedCall[]; checked: number } {
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const offenders: Offender[] = [];
  const skipped: SkippedCall[] = [];
  let checked = 0;

  const stack: Map<string, string | null>[] = [new Map()];
  const declareHere = (name: string, namespace: string | null) => stack[stack.length - 1].set(name, namespace);
  const lookup = (name: string): string | null | undefined => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].has(name)) return stack[i].get(name);
    }
    return undefined;
  };

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = unwrapExpression(node.initializer);
      if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
        const fnName = init.expression.text;
        if ((fnName === "useTranslations" || fnName === "getTranslations") && init.arguments.length >= 1 && ts.isStringLiteral(init.arguments[0])) {
          declareHere(node.name.text, (init.arguments[0] as ts.StringLiteral).text);
        }
      }
    }

    if (isFunctionLike(node)) {
      stack.push(new Map());
      for (const param of node.parameters) {
        if (ts.isIdentifier(param.name)) {
          declareHere(param.name.text, null);
        } else if (ts.isObjectBindingPattern(param.name)) {
          for (const element of param.name.elements) {
            if (ts.isIdentifier(element.name)) declareHere(element.name.text, null);
          }
        }
      }
      ts.forEachChild(node, visit);
      stack.pop();
      return;
    }

    if (ts.isBlock(node)) {
      stack.push(new Map());
      ts.forEachChild(node, visit);
      stack.pop();
      return;
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments.length >= 1 && ts.isStringLiteral(node.arguments[0])) {
      const name = node.expression.text;
      const key = (node.arguments[0] as ts.StringLiteral).text;
      const namespace = lookup(name);
      if (namespace !== undefined) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const call = `${name}("${key}")`;
        if (namespace === null) {
          skipped.push({ file: relative(ROOT, filePath), line, call });
        } else {
          checked += 1;
          const resolved = `${namespace}.${key}`;
          if (!hasKey(resolved)) offenders.push({ file: relative(ROOT, filePath), line, call, resolved });
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return { offenders, skipped, checked };
}

function scan(): { offenders: Offender[]; skipped: SkippedCall[]; checked: number } {
  const offenders: Offender[] = [];
  const skipped: SkippedCall[] = [];
  let checked = 0;
  for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
    const result = scanFile(file);
    offenders.push(...result.offenders);
    skipped.push(...result.skipped);
    checked += result.checked;
  }
  return { offenders, skipped, checked };
}

describe("every statically-resolvable t() key exists in the catalog", () => {
  const { offenders, skipped, checked } = scan();

  test("the scan actually found calls to check — a broken parse must fail loudly", () => {
    // Without this, a parse that silently stops matching (a TS API change, a scan-dir typo)
    // turns the assertion below into a no-op that reports success forever — the exact failure
    // mode this file exists to prevent, now one level up from the string check it verifies.
    expect(checked).toBeGreaterThan(1000);
  });

  test("the skipped set stays small — a `Translator`-typed parameter's own namespace is real, undecidable work, not a growing pile of files nobody looked at", () => {
    // Each entry here is a genuinely unresolvable call (nearest binding is a function
    // parameter, not a namespace) — real, not a scanner limitation to widen away. A modest,
    // stable count is expected; a fast-growing one would mean either a lot of new
    // cross-function translator-passing (worth knowing) or a real regression in scope
    // resolution (worth fixing).
    // 2026-09-03: bumped 40 → 41. design-preview/university-detail/page.tsx's own
    // formatRecurringDate(month, day, locale, t) now takes the same t: Translator parameter
    // app/(app)/universities/[id]/page.tsx:787's real formatRecurringDate already did (this
    // preview used to hardcode its own English lookup table instead of the real catalog —
    // see that file's own header comment) — one more instance of an already-accepted
    // pattern, not a new one, per this test's own stated reasoning above.
    // 2026-09-03: bumped 41 → 42. features/opportunities/opportunity-strip-card.tsx's own
    // `t: Translator` parameter (the home page rotating strip's compact card) — same
    // dashboard-view.tsx/opportunity-card.tsx TS-generic workaround already accepted twice
    // over in this project, threaded through one more file for the identical reason.
    const report = skipped.map((s) => `${s.file}:${s.line} ${s.call}`).join("\n");
    expect(skipped.length, `unresolvable calls (nearest binding is a parameter):\n${report}`).toBeLessThan(42);
  });

  test("no call resolves to a key en.json does not have", () => {
    const report = offenders.map((o) => `${o.file}:${o.line}: ${o.call} → ${o.resolved}`).join("\n");
    expect(offenders, `next-intl renders these as visible key paths:\n${report}`).toEqual([]);
  });
});
