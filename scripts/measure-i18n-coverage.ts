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
// Says ".tsx" out loud on the line people quote. On 2026-09-01 this section reported zero
// while features/profile/field-config.ts -- a .ts file holding every achievement form's
// labels, placeholders and select options -- was entirely English, because `walk` only ever
// collected .tsx. "Zero" was true of what was scanned and false of the product; a headline
// that cannot be quoted without its scope is a headline that will be.
console.log(`  scope: .tsx only — see "Data modules" below for the .ts files this cannot see`);
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

/**
 * The blind spot that made the section above read "0" on 2026-09-01.
 *
 * Copy does not only live in JSX. `features/profile/field-config.ts` defines every
 * achievement form -- field labels, placeholders, help text, select options -- as plain
 * object literals in a .ts file, and `lib/scoring/completeness.ts` defines the profile
 * checklist whose labels become the dashboard's top three actions for a new student. Neither
 * is a .tsx file, so `walk` never opened them and the component scan called the product
 * finished while the first form a Turkish student fills in was entirely English.
 *
 * Reported as its own class, never folded into the count above, because this pattern cannot
 * be measured the same way: a .ts file's `message:` may be a toast a student reads or a log
 * line nobody sees, and only reading the consumer settles it. So this is a candidate list for
 * a human, and the honest verb is "look at these", not "translate these" -- lib/providers,
 * lib/jobs and lib/acquisition legitimately hold English operator strings that must stay.
 *
 * Ranked by count, which is a proxy for how much a file would cost to fix, not for whether
 * it should be. Files already carrying a locale branch are excluded: tuition-format.ts holds
 * five English `note:`s beside their five Turkish counterparts and is finished.
 */
const DATA_MODULE_DIRS = ["app", "features", "lib"];
const DATA_MODULE_STRING = /(?:label|placeholder|hint|help|title|description|heading|summary|note|cta):\s*"[A-Z][^"]{3,}"/g;

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkTs(full, out);
    else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts") && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

const dataModules: Array<{ file: string; count: number }> = [];
for (const file of DATA_MODULE_DIRS.flatMap((d) => walkTs(join(ROOT, d)))) {
  const rel = relative(ROOT, file);
  if (NOT_STUDENT_FACING.some((re) => re.test(`/${rel}`))) continue;
  // Fixture data is not product copy. `lib/dev/` was excluded from the start; `/fixtures.ts`
  // anywhere generalises it after lib/ai/eval/fixtures.ts arrived and landed at the top of
  // this list with 19 "strings" that are two invented student profiles. Matching on the
  // filename rather than on a path prefix keeps the rule one line and keeps it true for the
  // next fixture file, wherever it lands. Deliberately narrow: it excludes files *named*
  // fixtures, not files that merely contain test-shaped data, so a real copy file can never
  // disappear from this list by being adjacent to one.
  if (rel.includes("__tests__") || rel.startsWith("lib/dev/") || rel.endsWith("/fixtures.ts")) continue;
  const source = readFileSync(file, "utf8");
  if (LOCALE_AWARE.test(source)) continue;
  const count = source.match(DATA_MODULE_STRING)?.length ?? 0;
  if (count > 0) dataModules.push({ file: rel, count });
}
dataModules.sort((a, b) => b.count - a.count);

console.log("\nData modules (.ts, not scanned above)");
if (dataModules.length === 0) {
  console.log("  none — no locale-blind .ts file carries user-facing-shaped literals");
} else {
  console.log(`  ${dataModules.length} locale-blind .ts files carry user-facing-shaped literals — candidates, not a count`);
  console.log("  (a `message:` here may be a student's toast or an operator's log line; read the");
  console.log("   consumer before treating one as a gap. Confirmed live: field-config.ts feeds every");
  console.log("   achievement form; completeness.ts feeds the dashboard's top three actions.)");
  // Every entry below was traced to its consumer on 2026-09-01 and none is a gap. Printed so
  // the list doesn't read as six outstanding items forever, and so the next person doesn't
  // re-walk work already done -- but printed rather than filtered out, because "checked and
  // cleared" is a claim with a date on it: a new consumer can make any of these
  // student-facing tomorrow, and a hidden file cannot be re-examined.
  console.log("");
  console.log("  Traced to their consumers 2026-09-01, none student-facing — re-check only if a");
  console.log("  new caller appears:");
  console.log("    lib/validation/onboarding.ts   dead to the UI; onboarding-wizard.tsx:89 defines its own");
  console.log("    lib/moderation/report-status.ts  /admin only, operator-facing");
  console.log("    lib/jobs/schedule.ts, lib/acquisition/verification.ts  operator/log strings");
  console.log("    lib/deadlines/ingest.ts        ingestion notes and rejection reasons");
  console.log("    lib/requirements/evaluate.ts   \"TOEFL\" / \"TR-YÖS\" — proper nouns, same in both");
  for (const { file, count } of dataModules.slice(0, 12)) console.log(`    ${String(count).padStart(3)}  ${file}`);
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
