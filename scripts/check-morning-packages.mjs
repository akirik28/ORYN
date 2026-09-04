#!/usr/bin/env node
// Verifies every staged migration appears VERBATIM in exactly one founder-facing
// package under data/morning/. Written 2026-09-04 after two packages went stale
// the same night: one missed a migration staged after it was assembled, the other
// carried a pre-fix version of a guard. Both were caught, one by accident.
//
// A keyword check is not enough — it passes on a package holding an OLD version of
// the same migration, which is exactly the failure this exists to catch. Body match
// or nothing.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = "supabase/migrations";
const MORNING = "data/morning";
// Everything from here on is unapplied; earlier migrations are live already.
const FIRST_UNAPPLIED = 115;

const packages = readdirSync(MORNING)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ name: f, text: readFileSync(join(MORNING, f), "utf8") }));

const staged = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql") && Number(f.slice(0, 4)) >= FIRST_UNAPPLIED)
  .sort();

let bad = 0;
for (const file of staged) {
  const body = readFileSync(join(MIGRATIONS, file), "utf8").trim();
  const carriers = packages.filter((p) => p.text.includes(body)).map((p) => p.name);
  if (carriers.length === 1) {
    console.log(`  ok        ${file} -> ${carriers[0]}`);
  } else if (carriers.length === 0) {
    console.error(`  MISSING   ${file} is in no package, or a package holds a STALE copy`);
    bad++;
  } else {
    console.error(`  DUPLICATE ${file} appears in ${carriers.length}: ${carriers.join(", ")}`);
    bad++;
  }
}
if (bad > 0) {
  console.error(`\n${bad} problem(s). Regenerate the affected package from the current tree.`);
  process.exit(1);
}
console.log(`\n${staged.length} staged migration(s), each carried verbatim by exactly one package.`);
