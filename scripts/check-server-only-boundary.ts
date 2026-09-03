#!/usr/bin/env tsx
/**
 * Checks whether any "use client" file transitively imports a "server-only" module through
 * a real value import — the exact bug class three separate lanes hit on 2026-09-03, caught
 * only by `next dev`/`next build`, never by tsc or eslint. Lanes don't run `next build`
 * (a worktree's own `npm ci` can empty the shared node_modules tree), so this exists as the
 * cheap substitute: a plain import-graph walk over the project's own source, no build, no
 * npm ci, nothing near the shared tree. ~90ms on the full project as of the pass that
 * produced this file (measured with `time`, not estimated).
 *
 * KNOWN LIMITATIONS — read before trusting a "clean" result, and before dismissing a flagged
 * one as a false positive:
 *
 * 1. No per-export tree-shaking awareness. "File A imports { X } from B" is treated as
 *    "A depends on everything B imports," not just X's own dependency chain. This is
 *    deliberately conservative (more likely to over-flag than to miss a real violation),
 *    but it means a barrel file that mixes safe and unsafe exports could someday produce a
 *    false positive for a caller that only ever touches the safe export. If that happens,
 *    the fix is narrowing the barrel file, not the checker.
 *
 * 2. Only understands the file-level "use client"/"use server" directive form (the
 *    directive as the file's own first statement) — not the inline per-function
 *    "use server" variant sometimes used inside an otherwise-plain module. Not observed
 *    anywhere in this codebase as of 2026-09-03; if that pattern appears later, this
 *    checker needs updating to recognize it, or a "use server" function's transitive
 *    imports could be wrongly treated as reaching the client bundle.
 *
 * 3. Only follows `@/*` and relative (`./`, `../`) specifiers — the only alias this
 *    project's tsconfig defines. A bare/node_modules import is always a leaf; a NEW path
 *    alias added later would need a matching change here.
 *
 * 4. Scans `.ts`/`.tsx` only, under app/features/lib/components/types. This project has no
 *    `.js`/`.jsx` source in those directories as of 2026-09-03 (checked); if that changes,
 *    extend SCAN_EXTS.
 *
 * Validated against __tests__/scripts/server-only-boundary-fixtures/ (5 synthetic files
 * with known-correct answers: a direct violation, a transitive violation through a plain
 * non-boundary file — the exact shape of the real bug this exists to catch — a mixed
 * inline `{ type X, Y }` import, a pure type-only import, and a client file reaching a
 * server-only module only through a "use server" boundary) before this was trusted enough
 * to commit. See __tests__/scripts/check-server-only-boundary.test.ts.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";

export interface GraphResult {
  files: string[];
  isServerOnly: Map<string, boolean>;
  isUseClient: Map<string, boolean>;
  isUseServer: Map<string, boolean>;
  importsOf: Map<string, Set<string>>;
}

export interface Violation {
  client: string;
  path: string[];
}

const SCAN_EXTS = [".ts", ".tsx"];

export function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTS.includes(extname(entry.name)) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
}

// String/template literals are preserved verbatim (so a "//" inside a URL string is never
// mistaken for a comment); // and /* */ comments are replaced with a single space. Found
// necessary live, not hypothetically: a real file's own multi-line comment discussing
// "import type" and "from" in prose corrupted the statement regex below before this existed
// — see this file's own header, limitation notes, and the fixture that regression-tests it.
const STRING_OR_COMMENT_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

export function stripComments(source: string): string {
  return source.replace(STRING_OR_COMMENT_RE, (match) => (match.startsWith("//") || match.startsWith("/*") ? " " : match));
}

const STATEMENT_RE = /\b(import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/g;
const DYNAMIC_RE = /\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g;

function isTypeOnlyStatement(stmt: string): boolean {
  if (/^(import|export)\s+type\b/.test(stmt)) return true;
  const braced = stmt.match(/\{([^}]*)\}/);
  if (!braced) return false; // `import Foo from "spec"` / `import * as Foo from "spec"` / side-effect-only -- value
  const members = braced[1]
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (members.length === 0) return false;
  return members.every((m) => /^type\s+/.test(m));
}

export function extractValueSpecifiers(source: string): string[] {
  const values: string[] = [];
  let m: RegExpExecArray | null;
  STATEMENT_RE.lastIndex = 0;
  while ((m = STATEMENT_RE.exec(source))) {
    const [stmt, , spec] = m;
    if (!isTypeOnlyStatement(stmt)) values.push(spec);
  }
  DYNAMIC_RE.lastIndex = 0;
  while ((m = DYNAMIC_RE.exec(source))) values.push(m[1]); // dynamic import()/require() are always runtime value loads
  return values;
}

function resolveToFile(base: string): string | null {
  if (SCAN_EXTS.includes(extname(base)) && existsSync(base)) return base;
  for (const ext of SCAN_EXTS) if (existsSync(base + ext)) return base + ext;
  for (const ext of SCAN_EXTS) {
    const idx = join(base, "index" + ext);
    if (existsSync(idx)) return idx;
  }
  return null;
}

export function resolveSpecifier(root: string, fromFile: string, spec: string): string | null {
  if (spec.startsWith("@/")) return resolveToFile(join(root, spec.slice(2)));
  if (spec.startsWith(".")) return resolveToFile(resolve(dirname(fromFile), spec));
  return null; // bare/node_modules specifier -- not part of this project's own graph
}

export function buildGraph(root: string, scanDirs: string[]): GraphResult {
  const files: string[] = [];
  for (const d of scanDirs) {
    const full = join(root, d);
    if (existsSync(full)) walk(full, files);
  }
  const fileSet = new Set(files);

  const isServerOnly = new Map<string, boolean>();
  const isUseClient = new Map<string, boolean>();
  const isUseServer = new Map<string, boolean>();
  const importsOf = new Map<string, Set<string>>();

  for (const f of files) {
    const src = stripComments(readFileSync(f, "utf8"));
    isServerOnly.set(f, /^\s*import\s+["']server-only["']\s*;?\s*$/m.test(src));
    isUseClient.set(f, /^["']use client["']/.test(src.trimStart()));
    isUseServer.set(f, /^["']use server["']/.test(src.trimStart()));

    const resolved = new Set<string>();
    for (const spec of extractValueSpecifiers(src)) {
      const target = resolveSpecifier(root, f, spec);
      if (target && fileSet.has(target)) resolved.add(target);
    }
    importsOf.set(f, resolved);
  }

  return { files, isServerOnly, isUseClient, isUseServer, importsOf };
}

/**
 * BFS from `start`; never expands a "use server" file's own imports (that boundary compiles
 * to a client-safe RPC stub, so what it imports never reaches the bundle through it) — but
 * a "use server" file itself, if somehow also tagged "server-only", would still be reported
 * on the first hop, since only ITS OWN further imports are skipped, not the check on it.
 */
export function findViolation(graph: GraphResult, start: string): string[] | null {
  const visited = new Set([start]);
  const queue: string[][] = [[start]];
  while (queue.length) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    if (node !== start && graph.isServerOnly.get(node)) return path;
    if (node !== start && graph.isUseServer.get(node)) continue;
    for (const next of graph.importsOf.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

export function findAllViolations(graph: GraphResult): Violation[] {
  const violations: Violation[] = [];
  for (const f of graph.files) {
    if (!graph.isUseClient.get(f)) continue;
    const path = findViolation(graph, f);
    if (path) violations.push({ client: f, path });
  }
  return violations;
}

function main() {
  const root = process.cwd();
  const graph = buildGraph(root, ["app", "features", "lib", "components", "types"]);
  const clientCount = graph.files.filter((f) => graph.isUseClient.get(f)).length;
  const serverOnlyCount = graph.files.filter((f) => graph.isServerOnly.get(f)).length;
  const violations = findAllViolations(graph);

  const rel = (f: string) => f.replace(root + "/", "");
  console.log(`Scanned ${graph.files.length} files — ${serverOnlyCount} server-only, ${clientCount} "use client".`);

  if (violations.length === 0) {
    console.log('✓ No "use client" file transitively imports a server-only module by value.');
    process.exit(0);
  }

  console.log(`\n✗ ${violations.length} "use client" file(s) transitively import a server-only module:\n`);
  for (const v of violations) {
    console.log(`  ${rel(v.client)}`);
    console.log(`    -> ${v.path.slice(1).map(rel).join("\n    -> ")}`);
  }
  console.log(`\nThis will fail the production build (next build) even though tsc/eslint don't catch it.`);
  console.log(`Fix: move the client-needed value out of the server-only file, or the import out of the client-reachable one.`);
  process.exit(1);
}

// Only run when executed directly (tsx scripts/check-server-only-boundary.ts), not when
// imported by the test suite for its exported functions.
if (process.argv[1] && process.argv[1].endsWith("check-server-only-boundary.ts")) {
  main();
}
