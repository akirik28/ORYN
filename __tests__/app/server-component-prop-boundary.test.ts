import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import * as ts from "typescript";

/**
 * A Server Component may not pass a plain function to a Client Component prop.
 *
 * React rejects it at render — "Event handlers cannot be passed to Client Component props" —
 * and the whole route falls to its error boundary. **No gate in this project catches it:**
 * `tsc` is happy (the prop's type is satisfied), ESLint has no rule for it (confirmed again in
 * this rewrite: this project's `eslint-config-next` is already fully enabled and did not catch
 * the original incident), `next build` compiles it, and no test rendered the page. It only
 * fails when a person opens the URL.
 *
 * This is not hypothetical. 2026-09-02: `app/(app)/applications/[id]/page.tsx` shipped
 *
 *     onSave={(notes) => updateApplicationNotes(application.id, notes)}
 *
 * from a Server Component into `NotesField` ("use client"). All four gates passed. The
 * founder found it by opening the page — the same applications page they had asked to have
 * fixed the day before, which had by then been reported to them as working.
 *
 * The fix is `.bind`, not a closure: a bound Server Action stays serializable across the
 * boundary. `onSave={updateApplicationNotes.bind(null, application.id)}`.
 *
 * **Rewritten 2026-09-02, same day, after the original version's own stated limits turned out
 * not to be edge cases.** The first version scanned `app/` only and matched `onSomething={(` —
 * the inline-arrow shape — with a line-by-line regex, and said plainly what it couldn't see:
 * `features/`, and a named local closure (`onSave={handleSave}`). Checked both, with evidence,
 * before deciding what to build:
 *
 * - **`features/` is not a rare exception.** 22 files there are `export async function`
 *   components with no `"use client"` directive — an `async` component can only be a Server
 *   Component; React Client Components cannot be declared `async`. That is not "overwhelmingly
 *   app/, but not always" — it is a substantial, confirmed second population, including
 *   `features/applications/applications-view.tsx`, in the same feature area as the incident
 *   itself. `components/` has the same shape (17 candidates) and is now scanned too, for the
 *   same reason. Neither had a live offender at the time of this rewrite — the gap was real
 *   exposure, not (yet) a second live bug.
 * - **A named local closure is exactly as unserializable as an inline one**, and a
 *   line-by-line regex has no way to know that `handleSave` on one line is the same function
 *   defined three lines above — that requires knowing which declaration a name actually
 *   resolves to, which is scope resolution, not string matching. Rather than approximate it
 *   with a second regex, this reuses the exact fix `__tests__/i18n/translation-keys.test.ts`
 *   already validated for the identical shape of problem (a regex standing in for real lexical
 *   scope, found to miss and to over-skip in ways only a real parse fixes): `ts.createSourceFile`
 *   (syntax only, no type-checking — this needs scope, not types) plus a single top-down
 *   traversal carrying an explicit scope stack, resolving each identifier against its nearest
 *   enclosing declaration the way the language itself does.
 *
 * WHAT THIS DOES AND DOES NOT COVER, stated plainly because a check that quietly looks at less
 * than you think is the exact failure this file exists to prevent:
 *
 * - **Flags**: an inline arrow/function expression in an `onXxx={...}` prop (unconditional — a
 *   function literal can never cross the boundary regardless of what it captures), and a bare
 *   identifier whose *nearest same-file declaration* has a function-shaped initializer (a local
 *   closure, named instead of inline — the class this rewrite adds).
 * - **Never flags**: `x.bind(...)` — the one form this codebase's own fix actually uses, kept
 *   as a control case so a mechanism change can never silently start flagging the fix itself —
 *   and a same-file function carrying its own `'use server'` directive (a Server Action, not a
 *   closure). **The second exemption is not theoretical: the named-closure detection this
 *   rewrite adds caught `onDelete={noopDelete}` in
 *   `app/(dev-preview)/design-preview/journey/page.tsx` on the first run** — a bare identifier
 *   the old inline-arrow-only regex could never have matched, sitting in `app/`, in scope for
 *   both versions of this test. It briefly looked like the second live instance this rewrite
 *   was written to find. Reading the file showed `noopDelete` declared with `'use server'` in
 *   its own body; `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
 *   confirms "passing actions as props" to a Client Component is the documented pattern, not a
 *   variant of the bug. Correct behavior either way, so kept as a permanent control case below
 *   rather than a one-line note: proof the detector can tell a real closure from a same-shaped
 *   safe reference, not just proof it can pattern-match an identifier.
 * - **Does not, and cannot from inside one file, resolve a bare identifier that turns out to be
 *   an import.** An imported name could be a genuine Server Action (fine) or an ordinary
 *   function reference from another module (would crash exactly the same way) — telling those
 *   apart means checking whether the *importing module* carries `"use server"`, real
 *   cross-module resolution, a different kind of tool than this one, the same limit
 *   `translation-keys.test.ts` states for its own `: Translator`-typed parameters. Recorded as
 *   `skipped`, not silently assumed safe.
 * - Skips comment lines (they never reach the parser as attributes at all) and non-`.tsx`
 *   files; a file is a Client Component only if its directive is in the first 40 characters,
 *   where the convention puts it — both unchanged from the original version, neither was ever
 *   the problem.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "features", "components"];
const HANDLER_ATTR = /^on[A-Z]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function isClientComponent(source: string): boolean {
  const head = source.slice(0, 40);
  return head.includes('"use client"') || head.includes("'use client'");
}

function isBindCall(node: ts.Expression): boolean {
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "bind";
}

/** A `'use server'` directive as the first statement of a function body makes it a Server
 * Function (Next.js's own term) — compiled to a serializable reference, not a plain
 * closure, specifically so it CAN cross the Server→Client boundary. Confirmed against
 * `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, which
 * documents passing one to a Client Component as a prop
 * (`<ClientComponent updateItemAction={updateItem} />`) as the intended pattern — not a
 * variant of the bug this file exists to catch. Only a `Block` body can carry a directive
 * prologue, so a concise-body arrow (`() => expr`) can never qualify — correctly, since
 * that shape can't be an inline Server Action in the first place. */
function hasUseServerDirective(body: ts.ConciseBody | ts.Block | undefined): boolean {
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server";
}

function classifyFunctionLike(fn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction): "function" | "server-action" {
  return hasUseServerDirective(fn.body) ? "server-action" : "function";
}

interface Offender {
  file: string;
  line: number;
  prop: string;
  detail: string;
}

interface SkippedProp {
  file: string;
  line: number;
  prop: string;
}

/** The one real implementation, shared by the disk-reading sweep and the in-memory control
 * cases below (`scanFile` and `scanSource` are both thin wrappers around this) — exactly
 * the drift risk this file's own rewrite is about, applied to itself: two copies of the
 * same scope-resolution logic could disagree about what a "local closure" is.
 *
 * A local binding is `"function"` (a same-file closure — the risk this check exists to
 * catch), `"server-action"` (a same-file function carrying its own `'use server'` —
 * exempt for the same reason `.bind()` is, found live rather than anticipated: see the
 * `classifyFunctionLike`/`hasUseServerDirective` pair below), or `"other"` (any other
 * local value, never flagged even if passed to a handler-shaped prop name, since it isn't
 * a function at all). Imports are never entered into the scope stack at all, so a
 * reference to one simply resolves to `undefined` — "not found locally" — and is recorded
 * as skipped, not guessed at either way.
 */
function scanSourceFile(sourceFile: ts.SourceFile, relPath: string): { offenders: Offender[]; skipped: SkippedProp[] } {
  const offenders: Offender[] = [];
  const skipped: SkippedProp[] = [];

  const stack: Map<string, "function" | "server-action" | "other">[] = [new Map()];
  const declareHere = (name: string, kind: "function" | "server-action" | "other") => stack[stack.length - 1].set(name, kind);
  const lookupLocal = (name: string): "function" | "server-action" | "other" | undefined => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].has(name)) return stack[i].get(name);
    }
    return undefined;
  };

  function isFunctionLike(node: ts.Node): node is ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration {
    return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
  }

  function bindParams(node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration) {
    for (const param of node.parameters) {
      if (ts.isIdentifier(param.name)) {
        declareHere(param.name.text, "other");
      } else if (ts.isObjectBindingPattern(param.name)) {
        for (const element of param.name.elements) {
          if (ts.isIdentifier(element.name)) declareHere(element.name.text, "other");
        }
      }
    }
  }

  function visit(node: ts.Node) {
    // A named function declaration binds its own name in the *enclosing* scope (visible to
    // sibling code, including JSX below it), separately from the new scope its own
    // params/body get.
    if (ts.isFunctionDeclaration(node) && node.name) {
      declareHere(node.name.text, classifyFunctionLike(node));
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const init = node.initializer;
      const isFunctionShaped = !!init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
      declareHere(node.name.text, isFunctionShaped ? classifyFunctionLike(init as ts.ArrowFunction | ts.FunctionExpression) : "other");
    }

    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      HANDLER_ATTR.test(node.name.text) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      const value = node.initializer.expression;
      const prop = node.name.text;
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        offenders.push({ file: relPath, line, prop, detail: "inline function" });
      } else if (isBindCall(value)) {
        // Safe by construction — the established fix shape. No-op, deliberately.
      } else if (ts.isIdentifier(value)) {
        const name = value.text;
        const local = lookupLocal(name);
        if (local === "function") {
          offenders.push({ file: relPath, line, prop, detail: `local closure "${name}"` });
        } else if (local === undefined) {
          // Either an import, or a global this file doesn't declare — genuinely
          // undecidable from here either way. See this file's own top comment.
          skipped.push({ file: relPath, line, prop });
        }
        // local === "other": a non-function local value passed to a handler-shaped prop
        // name — not this bug. local === "server-action": a same-file 'use server'
        // function — the officially documented "passing actions as props" pattern.
        // Neither is flagged, and neither is even recorded as skipped: both are
        // affirmatively safe, not merely unanalyzed.
      } else {
        // A call that isn't `.bind`, a member expression, a conditional, etc. — not
        // confidently classifiable without deeper analysis than this file does.
        skipped.push({ file: relPath, line, prop });
      }
    }

    if (isFunctionLike(node)) {
      stack.push(new Map());
      bindParams(node);
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

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return { offenders, skipped };
}

function scanFile(filePath: string): { offenders: Offender[]; skipped: SkippedProp[] } {
  const relPath = relative(ROOT, filePath);
  const source = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  return scanSourceFile(sourceFile, relPath);
}

/** Same parse call as scanFile, parameterized on an in-memory string for the control cases
 * below — never a second implementation of the scan itself, only of how the source text
 * arrives. */
function scanSource(src: string, label: string): { offenders: Offender[]; skipped: SkippedProp[] } {
  const sourceFile = ts.createSourceFile(label, src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  return scanSourceFile(sourceFile, label);
}

describe("Server Components never pass a function to a Client Component prop", () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  test("finds .tsx files to check (guards against the scan silently matching nothing)", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  test("finds at least one Server and one Client component (guards against the client filter eating everything)", () => {
    const sources = files.map((f) => readFileSync(f, "utf8"));
    expect(sources.some((s) => isClientComponent(s))).toBe(true);
    expect(sources.some((s) => !isClientComponent(s))).toBe(true);
  });

  test("features/ and components/ are not empty of Server Components — the scope gap the original version named was real, not a caveat nobody would hit", () => {
    const appPrefix = `${join(ROOT, "app")}${sep}`;
    const serverFilesOutsideApp = files.filter((f) => !f.startsWith(appPrefix) && !isClientComponent(readFileSync(f, "utf8")));
    expect(serverFilesOutsideApp.length).toBeGreaterThan(10);
  });

  // Control cases. If any of these five stop asserting what they say, the mechanism has
  // drifted and every green result below is meaningless — the same "check reports clean
  // because it stopped looking" failure this file exists to prevent. Each exercises
  // scanSource() against a real, parseable component body (not a bare JSX fragment), so the
  // scope-resolution path is actually exercised, not bypassed.
  test("detects the real 2026-09-02 regression shape (inline arrow) when it is present", () => {
    const src = `
      export function Broken({ application }: { application: { id: string } }) {
        return <NotesField onSave={(notes) => updateApplicationNotes(application.id, notes)} />;
      }
    `;
    const { offenders } = scanSource(src, "control-inline.tsx");
    expect(offenders).toHaveLength(1);
    expect(offenders[0].detail).toBe("inline function");
  });

  test("detects the named-local-closure shape (this rewrite's own addition) when it is present", () => {
    const src = `
      export function Broken({ application }: { application: { id: string } }) {
        function handleSave(notes: string) {
          return updateApplicationNotes(application.id, notes);
        }
        return <NotesField onSave={handleSave} />;
      }
    `;
    const { offenders } = scanSource(src, "control-named.tsx");
    expect(offenders).toHaveLength(1);
    expect(offenders[0].detail).toContain("handleSave");
  });

  test("does not flag an inline Server Action ('use server' in the function body) passed as a prop — the officially documented pattern this rewrite found live in app/(dev-preview)/design-preview/journey/page.tsx (onDelete={noopDelete}), initially misclassified as a local-closure offender until checked against node_modules/next/dist/docs", () => {
    const src = `
      export function Fine() {
        async function noopDelete(id: string) {
          "use server";
          return { error: undefined };
        }
        return <AchievementSection onDelete={noopDelete} />;
      }
    `;
    expect(scanSource(src, "control-server-action.tsx").offenders).toHaveLength(0);
  });

  test("does not flag the correct .bind form", () => {
    const src = `
      export function Fixed({ application }: { application: { id: string } }) {
        return <NotesField onSave={updateApplicationNotes.bind(null, application.id)} />;
      }
    `;
    expect(scanSource(src, "control-bind.tsx").offenders).toHaveLength(0);
  });

  test("does not flag a safe-looking imported reference — records it as skipped, not silently safe", () => {
    const src = `
      import { updateApplicationNotes } from "@/app/(app)/applications/actions";
      export function Fine() {
        return <NotesField onSave={updateApplicationNotes} />;
      }
    `;
    const { offenders, skipped } = scanSource(src, "control-import.tsx");
    expect(offenders).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  test("does not flag a non-function local value passed to a handler-shaped prop name", () => {
    const src = `
      export function Fine() {
        const onColorValue = "blue";
        return <ColorSwatch onColor={onColorValue} />;
      }
    `;
    const { offenders, skipped } = scanSource(src, "control-nonfunction.tsx");
    expect(offenders).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  test.each(files)("%s", (file) => {
    const source = readFileSync(file, "utf8");
    if (isClientComponent(source)) return;
    expect(scanFile(file).offenders).toEqual([]);
  });
});
