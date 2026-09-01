#!/usr/bin/env node
/**
 * Reports how far Oryn is from being fully bilingual. Run with: npm run check:i18n
 *
 * Written because the first version of this measurement was an ad-hoc grep pasted into a
 * doc, which went stale the moment anyone translated a file — and a coverage number nobody
 * can re-run is a number nobody can trust. See docs/i18n-coverage.md.
 *
 * Three separate things get reported, because they fail in different ways:
 *
 * 1. **Catalog parity.** A key present in en.json and missing from tr.json renders English
 *    text inside a Turkish UI, silently. Reported here for visibility; the actual gate is
 *    __tests__/i18n/catalog-parity.test.ts, which fails `npm test` on the same drift — this
 *    script no longer exits non-zero on its own, so the two don't both claim the same
 *    enforcement.
 * 2. **Locale-aware file count.** Rough, and gets less meaningful as the catalog grows:
 *    once most copy is in messages/*.json, "does this file branch on locale" stops being
 *    the interesting question.
 * 3. **Untranslated user-facing strings.** A FLOOR, never a total — see the comment on
 *    USER_FACING below for exactly what it misses.
 *
 * Plain Node/tsx: no `server-only` imports, no Next bundler, so it runs anywhere.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "features"];

/** notFound()-gated design previews and the staff-only admin area are not student surfaces. */
const NOT_STUDENT_FACING = [/\(dev-preview\)/, /\/admin\//];

/**
 * A file counts as locale-aware if it reads the catalog or branches on the locale itself.
 * `locale === "tr"` is the older inline pattern; next-intl's hooks are the one to use for
 * new static copy (see docs/i18n-coverage.md).
 */
const LOCALE_AWARE = /useTranslations|getTranslations|locale === "tr"|getLegalCopy/;

/**
 * JSX text of two or more words, plus the props that carry visible or announced text.
 *
 * Deliberately conservative, so the number is a floor rather than a guess: it misses
 * single-word labels ("Save", "Details"), template literals, strings held in arrays and
 * const maps, and every toast message. Widening it would trade a defensible undercount for
 * an indefensible estimate, and the decision this informs — how big is the remaining job —
 * is already answered by the order of magnitude.
 */
const USER_FACING = /(>\s*[A-Z][a-z]+ [a-z]+)|((?:placeholder|title|aria-label|label)="[A-Z][^"]{4,}")/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function flatten(obj: Record<string, unknown>, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") for (const [k, v] of flatten(value as Record<string, unknown>, path)) out.set(k, v);
    else out.set(path, String(value));
  }
  return out;
}

const en = flatten(JSON.parse(readFileSync(join(ROOT, "messages/en.json"), "utf8")));
const tr = flatten(JSON.parse(readFileSync(join(ROOT, "messages/tr.json"), "utf8")));
const missingInTr = [...en.keys()].filter((k) => !tr.has(k));
const extraInTr = [...tr.keys()].filter((k) => !en.has(k));
const identical = [...en.keys()].filter((k) => tr.get(k) === en.get(k));

console.log("Catalogs");
console.log(`  en.json ${en.size} keys · tr.json ${tr.size} keys`);
if (missingInTr.length) console.log(`  MISSING IN tr.json (${missingInTr.length}): ${missingInTr.join(", ")}`);
if (extraInTr.length) console.log(`  ONLY IN tr.json (${extraInTr.length}): ${extraInTr.join(", ")}`);
if (!missingInTr.length && !extraInTr.length) console.log("  in sync — no key missing on either side");
// Identical values are not automatically wrong: some words really are the same in both
// languages ("Plan"). Listed rather than counted as a defect so a human can judge.
if (identical.length) console.log(`  identical in both locales (${identical.length}): ${identical.join(", ")}`);

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
let aware = 0;
const untranslated: Array<{ file: string; count: number }> = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (LOCALE_AWARE.test(source)) {
    aware += 1;
    continue;
  }
  const rel = relative(ROOT, file);
  if (NOT_STUDENT_FACING.some((re) => re.test(`/${rel}`))) continue;
  const count = source.match(USER_FACING)?.length ?? 0;
  if (count > 0) untranslated.push({ file: rel, count });
}

untranslated.sort((a, b) => b.count - a.count);
const strings = untranslated.reduce((sum, f) => sum + f.count, 0);

console.log("\nComponents");
console.log(`  ${aware} of ${files.length} .tsx files under ${SCAN_DIRS.join("/ and ")}/ are locale-aware`);
console.log(`  ${untranslated.length} student-facing files carry >= ${strings} untranslated user-facing strings (floor, see header)`);
console.log("\n  Largest blocks:");
for (const { file, count } of untranslated.slice(0, 10)) console.log(`    ${String(count).padStart(3)}  ${file}`);

// Grouped by area, because that is the unit a translation package is actually scoped in --
// "features/profile" is a thing someone can take; a list of 86 files is not.
const byArea = new Map<string, { files: number; strings: number }>();
for (const { file, count } of untranslated) {
  const area = file.match(/^(app\/\([a-z-]+\)\/[a-z-]+|features\/[a-z-]+)/)?.[1] ?? file;
  const entry = byArea.get(area) ?? { files: 0, strings: 0 };
  byArea.set(area, { files: entry.files + 1, strings: entry.strings + count });
}
console.log("\n  By area:");
for (const [area, { files: n, strings: s }] of [...byArea].sort((a, b) => b[1].strings - a[1].strings).slice(0, 12)) {
  console.log(`    ${String(s).padStart(3)} strings  ${String(n).padStart(2)} files  ${area}`);
}

if (missingInTr.length || extraInTr.length) {
  // Reported, not asserted: __tests__/i18n/catalog-parity.test.ts fails `npm test` on
  // exactly this drift, so this script no longer needs its own exit code to say the same
  // thing twice — see that file's own doc comment.
  console.error("\nThe catalogs have drifted — see MISSING/ONLY IN tr.json above.");
}
