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
 * 3. **Untranslated user-facing strings**, counted in EVERY file — including locale-aware
 *    ones. The first version skipped a file entirely once it contained a single
 *    `useTranslations` call, so a half-translated file dropped out of the count and read as
 *    finished (found by the lane doing the translating, 2026-09-01). That is the same
 *    confident-output-from-absent-input shape this measurement exists to expose, so it was
 *    worth fixing in the ruler rather than working around. Partly-done files are now listed
 *    separately, because they are the ones a coverage number most easily hides.
 *
 *    Their counts are deliberately NOT added to the totals, and that is the second half of
 *    the same lesson. In a file mixing the inline `locale === "tr" ? … : …` pattern with the
 *    catalog, the regex flags the English branch of an already-bilingual conditional as
 *    untranslated — it does not parse conditionals, it matches capitalised JSX text. So on
 *    those files the number overstates the work as badly as it previously understated it
 *    (reported by the same lane, 2026-09-01, after hand-checking a file where all 12 hits
 *    were already-translated branches). Teaching this to parse JSX is a different tool. What
 *    it can honestly say is *which files need a human to look*, so that is what it says, and
 *    the counts it does publish come only from files it can actually measure.
 *
 *    Still a FLOOR, never a total — see the comment on USER_FACING below.
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

/**
 * Page titles are a surface no string count sees, because they are not in the component.
 * `export const metadata = { title: "Applications" }` is resolved at build time, so a
 * Turkish page renders under an English browser tab, bookmark and share preview — the
 * founder's "tamamı türkçe olmalı" includes the tab.
 *
 * The legal pages already solved this and carry the reasoning: `generateMetadata` resolving
 * the same request-time locale the body does, rather than a build-time English default. What
 * this counts is the pages that still use the static form, plus any `generateMetadata` that
 * never reads a locale — the second kind looks fixed and is not.
 */
function scanMetadata(): { staticTitles: string[]; localeBlindGenerators: string[] } {
  const staticTitles: string[] = [];
  const localeBlindGenerators: string[] = [];
  for (const file of walk(join(ROOT, "app"))) {
    const source = readFileSync(file, "utf8");
    const rel = relative(ROOT, file);
    if (NOT_STUDENT_FACING.some((re) => re.test(`/${rel}`))) continue;
    if (/export const metadata\b/.test(source) && /title:\s*"/.test(source)) staticTitles.push(rel);
    else if (/generateMetadata/.test(source) && !/getTranslations|resolveLocale|getLocale/.test(source)) {
      localeBlindGenerators.push(rel);
    }
  }
  return { staticTitles, localeBlindGenerators };
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
let aware = 0;
const untranslated: Array<{ file: string; count: number }> = [];

const partlyDone: Array<{ file: string; count: number }> = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const isAware = LOCALE_AWARE.test(source);
  if (isAware) aware += 1;

  const rel = relative(ROOT, file);
  if (NOT_STUDENT_FACING.some((re) => re.test(`/${rel}`))) continue;

  const count = source.match(USER_FACING)?.length ?? 0;
  if (count === 0) continue;
  // A locale-aware file with leftover raw JSX text is a partial translation, not an
  // untouched one. Both are unfinished; only the second is obvious.
  (isAware ? partlyDone : untranslated).push({ file: rel, count });
}

untranslated.sort((a, b) => b.count - a.count);
partlyDone.sort((a, b) => b.count - a.count);
const strings = untranslated.reduce((sum, f) => sum + f.count, 0);

console.log("\nComponents");
console.log(`  ${aware} of ${files.length} .tsx files under ${SCAN_DIRS.join("/ and ")}/ are locale-aware`);
console.log(`  ${untranslated.length} untouched student-facing files carry >= ${strings} untranslated user-facing strings (floor, see header)`);
console.log(`  ${partlyDone.length} locale-aware files still contain raw JSX text — need a human to look; not counted above (see header)`);
console.log("\n  Largest untouched blocks:");
for (const { file, count } of untranslated.slice(0, 10)) console.log(`    ${String(count).padStart(3)}  ${file}`);
if (partlyDone.length > 0) {
  console.log("\n  Partly translated — open these; the count is a ceiling, not a measure:");
  console.log("  (raw JSX text in a locale-aware file. Some will be real gaps; some will be the");
  console.log("   English branch of a `locale === \"tr\" ? … : …` this script cannot parse.)");
  for (const { file, count } of partlyDone.slice(0, 10)) console.log(`    <=${String(count).padStart(3)}  ${file}`);
}

// Grouped by area, because that is the unit a translation package is actually scoped in --
// "features/profile" is a thing someone can take; a list of 86 files is not. Only measurable
// files contribute: a partly-done file's count mixes real gaps with the English branches of
// conditionals that are already bilingual, so folding it in here would put a number nobody
// can act on into a table meant for scoping work.
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

const meta = scanMetadata();
console.log("\nPage titles");
console.log(`  ${meta.staticTitles.length} student-facing pages set a build-time English title — the browser tab stays English in Turkish`);
if (meta.localeBlindGenerators.length > 0) {
  console.log(`  ${meta.localeBlindGenerators.length} use generateMetadata but never read a locale (looks fixed, is not): ${meta.localeBlindGenerators.join(", ")}`);
}
console.log("  Pattern to copy: app/(legal)/privacy/page.tsx's generateMetadata, which resolves the request-time locale.");

if (missingInTr.length || extraInTr.length) {
  // Reported, not asserted: __tests__/i18n/catalog-parity.test.ts fails `npm test` on
  // exactly this drift, so this script no longer needs its own exit code to say the same
  // thing twice — see that file's own doc comment.
  console.error("\nThe catalogs have drifted — see MISSING/ONLY IN tr.json above.");
}
