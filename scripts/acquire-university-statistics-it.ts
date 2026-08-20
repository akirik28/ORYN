#!/usr/bin/env node
/**
 * Italy tuition fee acquisition — a real national ISEE-income-based framework, but the one
 * number every university actually publishes is a CEILING, not a typical price.
 *
 * Eighth country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> Italy -> ...).
 *
 * SOURCE CHECK: dati-ustat.mur.gov.it (the obvious MUR/USTAT official dataset, flagged in an
 * earlier pass) is unreachable at network level — not re-attempted here, per the founder's own
 * "don't keep hitting a dead endpoint" instruction. Universitaly (the official application
 * portal) does not publish a bulk tuition dataset either. So this pass went straight to
 * individual university pages, same as the UK.
 *
 * THE DATA-MODEL FINDING, worth stating plainly before anything else: Italian PUBLIC
 * university tuition is not one number, or even a course-based range — it is INCOME-BASED
 * (ISEE, "Indicatore della Situazione Economica Equivalente"), the same concept for domestic
 * AND international students (non-EU students use an equivalent calculation, "ISEE
 * Parificato," built from foreign income/asset documentation). A national ministerial floor
 * sets a minimum "no tax area" ISEE threshold below which tuition is €0 (recent reporting
 * shows this floor itself has been moving — some sources cite €22,000, others €27,000-30,000;
 * genuinely inconsistent across sources checked this pass, not resolved to one figure here),
 * but each university sets its own bands and its own MAXIMUM contribution above that floor —
 * there is no single national ceiling either. What every university researched this pass DOES
 * publish clearly is that maximum: the amount charged to a student who either has a high ISEE
 * or does not submit ISEE/ISEE Parificato documentation at all. That is the one truthful,
 * stable, citable number here — written as `precision_state: "upper_bound"` (an existing,
 * already-allowed value in this table's check constraint — no migration needed, confirmed by
 * reading the constraint in supabase/migrations/0038_canonical_entity_registry.sql before
 * writing any code), NOT "exact" (would falsely imply everyone pays this) and NOT "range"
 * (would falsely imply the low end is course-driven the way UK/Canada/Australia bands are,
 * when it is actually income-driven and can reach €0). The detail page's tuition StatCard
 * needed a small, genuinely new copy branch for this shape ("Up to €X/yr — income-based (ISEE),
 * most students pay less") rather than reusing the existing "range" wording, which would have
 * made a false claim about why the number varies — see app/(app)/universities/[id]/page.tsx's
 * `tuitionQualifier()`.
 *
 * PUBLIC VS PRIVATE, kept strictly separate: 4 of this spine's 38 Italian universities are
 * genuinely private and NOT subject to the public ISEE-band regulations at all — Bocconi
 * University, LUISS Guido Carli, Università Cattolica del Sacro Cuore, Università Vita-Salute
 * San Raffaele (the first two are labelled distinctly in `universities.institution_type` or by
 * well-established fact; the latter two are NOT reliably flagged in that column for this spine
 * and were identified from outside knowledge, not assumed public just because the column says
 * "university"). Only Bocconi is written this pass, and even Bocconi turns out to run its own
 * *separate* income-based system (Bocconi4Access, €0 to its own ~€17,000 ceiling) — a private
 * university choosing an ISEE-like model is a real fact, not this script defaulting private
 * institutions into the public framework. LUISS, Cattolica, and San Raffaele were not resolved
 * this pass — LUISS specifically because every source found was a third-party aggregator, never
 * luiss.it itself; not trusted per this project's established discipline on aggregator sources.
 *
 * RESOLVED THIS PASS, 4 of the founder's named priority universities, each read from its own
 * official page or regulation document: Politecnico di Milano, University of Milan (Statale),
 * University of Pisa, Bocconi University (private). NOT resolved despite being named
 * priorities — genuinely investigated, not skipped: University of Naples Federico II (a real
 * near-miss, worth recording: an initial pass had a €2,384 figure and a regional-tax
 * breakdown that looked clean, but no unina.it page was ever actually found stating it — every
 * source was third-party. A follow-up site-restricted search of unina.it itself surfaced a
 * DIFFERENT regional-tax figure (€130/151/173 vs the earlier €125.50/146.50/167.50) and
 * revealed fees are ultimately resolved through a fee calculator tool
 * (calcolatrice.unina.it), the same "no single static figure" shape as several Australian
 * universities' course-fee tools — dropped from this batch rather than kept on a source that
 * turned out to be aggregator-only and possibly stale, the same discipline LUISS was held to);
 * Università di Bologna (mechanism confirmed — a per-course maximum exists — but no single
 * euro figure surfaced this pass); Sapienza (component figures found but not one
 * clearly-labelled "maximum" figure — the pieces don't add up to a confidently citable total);
 * Università di Padova (the official 2026-27 "Bando Contribuzione ed Esoneri" PDF was located
 * but returned as unparseable binary to this pass's fetch tooling, not a missing-data
 * problem); Politecnico di Torino, University of Turin, University of Trento, University of
 * Pavia, University of Florence (no figure surfaced this pass); LUISS (no official-domain
 * source found, see above). 33 further Italian universities queued, not attempted — reason
 * code `income_based` / `no_general_rate` applies broadly here, not `pdf_only` or
 * `source_unreachable` specifically, though both of those also came up for individual
 * institutions above (Padova, unina.it's calculator-gated case respectively).
 *
 * Usage:
 *   npm run acquire:university-statistics-it                  # dry run
 *   npm run acquire:university-statistics-it -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface ItTuitionEntry {
  /** The maximum/ceiling annual figure — see file header for why this, not a "typical" price. */
  maxAnnual: number;
  statsAsOf: string;
  sourceUrl: string;
  dataQualityFlag: "current" | "current_search_cited";
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified Italy tuition data. Every entry's
 * maximum figure traced to the institution's own domain or an official regulation document
 * 2026-08-18. Cross-checked against `lib/universities/duplicate-supersessions.json` (no
 * Italian entries found) before being added. */
const IT_TUITION: Record<string, ItTuitionEntry> = {
  "Politecnico di Milano": {
    maxAnnual: 3898,
    statsAsOf: "2026/27",
    sourceUrl: "https://www.polimi.it/en/students/tuition-fees-scholarships-and-financial-aid/tuition-fees/isee-equivalent-economic-situation-indicator",
    dataQualityFlag: "current_search_cited",
    notes:
      "Maximum bracket, €3,898/year total — students who miss the ISEE/ISEE Parificato submission deadline are permanently locked into this bracket for the year, per Politecnico's own page. Students who do submit ISEE pay a genuinely income-scaled amount that can be far lower (the page's own regional-tax-only bands start at €130/year for the lowest ISEE tier). Same maximum applies to domestic and non-EU international students who go through ISEE/ISEE Parificato — a separate, uncommon, non-ISEE track exists for some non-EU students admitted without a first-level qualification, not modelled here.",
  },
  "University of Milan": {
    maxAnnual: 5207,
    statsAsOf: "2026/27",
    sourceUrl: "https://www.unimi.it/sites/default/files/regolamenti/Regolamento%20tasse%20e%20contributi%202026_2027_signed.pdf",
    dataQualityFlag: "current_search_cited",
    notes:
      "Maximum total, €5,207/year (€646 fixed first instalment + up to €4,561.12 second instalment), per the university's own signed 2026/2027 fee regulation. The second instalment scales down with ISEE, reaching €0 for the lowest-income bracket per the university's own reporting on ISEE-based exemptions.",
  },
  "University of Pisa": {
    maxAnnual: 2900,
    statsAsOf: "2026/27",
    sourceUrl: "https://www.unipi.it/didattica/iscrizioni/tasse/tasse-per-i-corsi-di-laurea/",
    dataQualityFlag: "current_search_cited",
    notes:
      "Maximum comprehensive fee ('contributo onnicomprensivo'), €2,900/year — the university's own page states the fee 'varies between €0 and €2,900 based on your ISEE.' No-tax area at or below €26,000 ISEE (only regional tax + stamp duty due below that line).",
  },
  "Bocconi University": {
    maxAnnual: 17000,
    statsAsOf: "2026/27",
    sourceUrl: "https://bit.unibocconi.it/hc/en-us/articles/17777210729362-Academic-tuition-and-fees-a-y-2026-27-Amounts-and-installments",
    dataQualityFlag: "current",
    notes:
      "Private university — the public ISEE-band framework above does not apply; Bocconi runs its own separate income-based system instead (Bocconi4Access to Education). Ordinary/ceiling tuition for a first-year Bachelor of Science or Law student: €17,000/year, per Bocconi's own official student-help-centre article. Actual amount for most enrolled students is materially lower — Bocconi's own aid programme grants 20-100% reductions based on family ISEE/ISEEU, with a commonly cited effective average around €5,000-7,000/year, not written here as a precise figure since it's a secondary characterisation, not an official published number.",
  },
};

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: itUnis, error } = await admin.from("universities").select("id, name").eq("country", "Italy").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(itUnis ?? []).length} Italian universities in the spine; ${Object.keys(IT_TUITION).length} hand-verified entries in this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of itUnis ?? []) {
    const entry = IT_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      console.log(`  NO ENTRY (name mismatch or genuinely unresearched): ${JSON.stringify(uni.name)}`);
      continue;
    }
    // Same maximum applies to both codes — see file header on why domestic/international
    // aren't a meaningful split under the ISEE system the way they are elsewhere.
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual" });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual" });
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Italian universities with no entry in this table.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) {
      const entry = IT_TUITION[w.universityName];
      console.log(`  would write ${w.universityName} / ${w.metricCode} = up to €${entry.maxAnnual} (upper_bound)`);
    }
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = IT_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: entry.maxAnnual,
      unit: "EUR/year",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "upper_bound",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: entry.dataQualityFlag,
      notes: entry.notes,
    };
    const existingRow = await admin
      .from("university_profile_metrics")
      .select("id")
      .eq("university_id", w.universityId)
      .eq("metric_code", w.metricCode)
      .eq("scope", "undergraduate")
      .maybeSingle();
    const { error: writeError } = existingRow.data
      ? await admin.from("university_profile_metrics").update(payload).eq("id", existingRow.data.id)
      : await admin.from("university_profile_metrics").insert(payload);
    if (writeError) {
      console.error(`  FAILED ${w.universityName} / ${w.metricCode}: ${writeError.message}`);
      continue;
    }
    written++;
  }
  console.log(`\nWrote ${written}/${toWrite.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
