import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
 * Deliberately narrow, and the narrowness is the point. It resolves only what a regex can
 * actually decide: a namespace given as a string literal, a key given as a string literal,
 * and a binding name that means one thing in its file. Everything else is skipped rather than
 * guessed at.
 *
 * That last exclusion came from this guard being wrong on its first run. It flagged eleven
 * calls in opportunity-card.tsx, all correct: that file binds `t` twice in different scopes
 * (`opportunities.reasons` in a helper, `opportunities.card` in the component) and passes a
 * third `t` as a function parameter. A flat name→namespace map attributed every call to
 * whichever binding it saw last. A guard that reports confident findings from input it cannot
 * read is the exact thing this codebase keeps removing, so it now skips shadowed names and
 * says how many it skipped.
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

/**
 * `const t = useTranslations("a.b")` → { t: "a.b" }, but only for names that mean one thing
 * in this file. A name bound twice (two scopes, two namespaces) or taken as a parameter is
 * ambiguous to a regex, so it is dropped rather than resolved to the last one seen.
 */
function namespaceBindings(source: string): { bindings: Map<string, string>; ambiguous: string[] } {
  const seen = new Map<string, Set<string>>();
  const re = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g;
  for (const match of source.matchAll(re)) {
    if (!seen.has(match[1])) seen.set(match[1], new Set());
    seen.get(match[1])!.add(match[2]);
  }

  const bindings = new Map<string, string>();
  const ambiguous: string[] = [];
  for (const [name, namespaces] of seen) {
    // Rebound in another scope, or shadowed by a parameter of the same name.
    const shadowed = namespaces.size > 1 || new RegExp(`\\(\\s*[^)]*\\b${name}\\s*:\\s*Translator`).test(source);
    if (shadowed) ambiguous.push(name);
    else bindings.set(name, [...namespaces][0]);
  }
  return { bindings, ambiguous };
}

interface Offender {
  file: string;
  call: string;
  resolved: string;
}

function scan(): { offenders: Offender[]; checked: number; skipped: number } {
  const offenders: Offender[] = [];
  let checked = 0;
  let skipped = 0;

  for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
    const source = readFileSync(file, "utf8");
    const { bindings, ambiguous } = namespaceBindings(source);
    skipped += ambiguous.length;
    if (bindings.size === 0) continue;

    for (const [binding, namespace] of bindings) {
      // Only string-literal keys. `t(`x.${y}`)` and `t(someVar)` cannot be resolved here.
      const callRe = new RegExp(`\\b${binding}\\(\\s*"([^"]+)"`, "g");
      for (const match of source.matchAll(callRe)) {
        checked += 1;
        const resolved = `${namespace}.${match[1]}`;
        if (!hasKey(resolved)) {
          offenders.push({ file: relative(ROOT, file), call: `${binding}("${match[1]}")`, resolved });
        }
      }
    }
  }
  return { offenders, checked, skipped };
}

describe("every statically-resolvable t() key exists in the catalog", () => {
  const { offenders, checked, skipped } = scan();

  test("the scan actually found calls to check — a broken regex must fail loudly", () => {
    // Without this, a regex that stops matching turns the assertion below into a no-op that
    // reports success forever, which is the failure mode this file exists to prevent.
    expect(checked).toBeGreaterThan(100);
  });

  test("the skipped set stays small — if most bindings become ambiguous this guard stops meaning much", () => {
    // Shadowed names are unresolvable here, not exempt. A handful is the cost of the regex
    // approach; a lot would mean the guard covers little and someone should be told.
    expect(skipped).toBeLessThan(8);
  });

  test("no call resolves to a key en.json does not have", () => {
    const report = offenders.map((o) => `${o.file}: ${o.call} → ${o.resolved}`).join("\n");
    expect(offenders, `next-intl renders these as visible key paths:\n${report}`).toEqual([]);
  });
});
