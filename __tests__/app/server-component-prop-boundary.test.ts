import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A Server Component may not pass a plain function to a Client Component prop.
 *
 * React rejects it at render — "Event handlers cannot be passed to Client Component props" —
 * and the whole route falls to its error boundary. **No gate in this project catches it:**
 * `tsc` is happy (the prop's type is satisfied), ESLint has no rule for it, `next build`
 * compiles it, and no test rendered the page. It only fails when a person opens the URL.
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
 * WHAT THIS DOES AND DOES NOT COVER, stated plainly because a check that quietly looks at
 * less than you think is the exact failure this file exists to prevent:
 *
 * - It scans `app/` only. A closure passed from a Server Component that lives in `features/`
 *   would be missed. Server Components overwhelmingly live under `app/` here, but "overwhelmingly"
 *   is not "always" — widen this the day that changes.
 * - It matches `onSomething={(` — the arrow/function-expression shape. A named local function
 *   passed as `onSave={handleSave}` is equally broken and equally invisible to this check.
 * - It skips comment lines, so prose *describing* the bug does not trip it.
 * - A file is treated as a Client Component only if its directive is in the first 40 characters,
 *   which is where the convention puts it.
 */

const APP_DIR = "app";
const HANDLER_PROP = /\bon[A-Z]\w*=\{\s*(?:async\s*)?\(/;

function tsxFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsxFilesUnder(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function isClientComponent(source: string): boolean {
  const head = source.slice(0, 40);
  return head.includes('"use client"') || head.includes("'use client'");
}

function offendingLines(source: string): string[] {
  return source
    .split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return false;
      return HANDLER_PROP.test(line);
    })
    .map(({ line, n }) => `line ${n}: ${line.trim()}`);
}

describe("Server Components never pass a function to a Client Component prop", () => {
  const files = tsxFilesUnder(APP_DIR);

  it("finds .tsx files to check (guards against the scan silently matching nothing)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("finds at least one Server and one Client component (guards against the client filter eating everything)", () => {
    const sources = files.map((f) => readFileSync(f, "utf8"));
    expect(sources.some((s) => isClientComponent(s))).toBe(true);
    expect(sources.some((s) => !isClientComponent(s))).toBe(true);
  });

  it("detects the real 2026-09-02 regression shape when it is present", () => {
    // The control case. If this stops failing, the matcher has drifted and every green
    // result below is meaningless — the same "check reports clean because it stopped
    // looking" failure this file was written about.
    const regression = `        <NotesField\n          onSave={(notes) => updateApplicationNotes(application.id, notes)}\n        />`;
    expect(offendingLines(regression)).toHaveLength(1);
  });

  it("does not flag the correct .bind form", () => {
    const fixed = `          onSave={updateApplicationNotes.bind(null, application.id)}`;
    expect(offendingLines(fixed)).toHaveLength(0);
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(file, "utf8");
    if (isClientComponent(source)) return;
    expect(offendingLines(source)).toEqual([]);
  });
});
