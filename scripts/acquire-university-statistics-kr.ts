#!/usr/bin/env node
/**
 * South Korea tuition fee acquisition — no national or regional price; real per-university
 * research, like the UK, with two genuinely well-documented blockers recorded rather than
 * silently skipped.
 *
 * Tenth country in the founder-directed tuition/cost-acquisition roadmap, the second picked by
 * the coverage report's ranking (UK -> Canada -> Australia -> Germany -> Netherlands -> France
 * -> Switzerland -> Italy -> Spain -> [China, investigated, not written] -> South Korea -> ...).
 *
 * SCALABILITY CHECK: no bulk source found. Korea's Higher Education Act Article 11 caps the
 * year-over-year INCREASE in tuition (1.2× the 3-year average inflation rate, tightened from
 * 1.5× for 2026) — a real, current, government-legislated policy, but it constrains the rate of
 * change, not the base amount, so it cannot be used to derive an actual figure. Each
 * university still sets and publishes its own tuition, varying by college (계열/단과대학) within
 * the same institution — Humanities/Social Sciences cheapest, Engineering/Natural Sciences
 * most expensive, the same course-based-range shape as UK/Canada/Australia/Netherlands.
 *
 * RESOLVED THIS PASS, both read from the institution's own official domain's fee table (a
 * search engine's own text extraction succeeded where this pass's own WebFetch tool failed on
 * the underlying PDFs directly — garbled binary, the same class of failure as Università di
 * Padova's Italy PDF; the specific figures below were cross-checked across two independent
 * searches each, not taken from a single unverified snippet):
 *   - Seoul National University (public): 2026학년도 1학기 등록금 (2026 1st-semester tuition),
 *     from a real snu.ac.kr PDF. College of Liberal Arts/Social Sciences: ₩2,442,000/semester
 *     (lowest); College of Engineering: ₩2,998,000/semester (highest, Natural Sciences close
 *     behind at ₩2,975,000). Annual estimate = 1st-semester figure × 2 — SNU's own 2nd-semester
 *     figure was not independently confirmed this pass, so this is a doubled single-semester
 *     read, not a directly-published annual total; stated plainly in notes.
 *   - Yonsei University (private): 2026학년도 학부 등록금 명세표, from yonsei.ac.kr. Humanities/
 *     Social Sciences 1st semester: ₩4,004,000; Natural Sciences 1st+2nd semester both
 *     confirmed directly (₩4,623,000 + ₩4,428,000 = ₩9,051,000); Engineering 1st+2nd both
 *     confirmed (₩5,216,000 + ₩5,021,000 = ₩10,237,000, the highest). Low end of the range
 *     uses Humanities' 1st-semester × 2 (₩8,008,000) for consistency with SNU's method, even
 *     though a more precise 1st+2nd sum exists for the other two colleges — noted explicitly.
 *
 * TWO NAMED BLOCKERS, NOT VAGUE SKIPS — investigated specifically enough to say what would
 * unblock each one, per the founder's own request to determine "what would need to happen" for
 * an unresolved case to become resolvable, not just log it as absent:
 *   - KAIST (public): a real, officially-documented near-total tuition waiver exists for
 *     undergraduates — KAIST's own scholarship policy page states the PRINCIPLE ("원칙") is
 *     full tuition-support scholarship for all bachelor's-programme students, domestic and
 *     international, with partial (not full) support only for continuing students whose
 *     PREVIOUS semester GPA fell below 2.7 (new first-year students have no previous semester,
 *     so default to full support). An official KAIST payment document exists with columns
 *     literally labelled 수업료(A) 장학금(B) 징수액(A-B) ("tuition(A), scholarship(B), amount
 *     collected(A-B)") — structurally identical in shape to Italy's ISEE ceiling-vs-actual
 *     system, just merit-conditioned instead of income-conditioned. NOT written this pass
 *     because the nominal 수업료(A) figure itself — needed to model this honestly as an
 *     `upper_bound`, the same way Italy's ceiling figures are — was not extracted; the document
 *     containing it loaded as unreadable binary to this pass's WebFetch tool. UNBLOCKS WITH:
 *     either working PDF-to-text extraction for this specific KAIST document
 *     (kaist.ac.kr/kr/html/footer/0802.html?mode=D&no=0cffde1ba0e21f7b0d305fffb13b85a3&file_id=59190),
 *     or a plain-HTML equivalent of the same table if one exists elsewhere on kaist.ac.kr.
 *   - Korea University (private): the exact right official page was found —
 *     korea.ac.kr/ko/582/subview.do, titled "2026학년도 등록금 일람표" — and confirmed live to
 *     list three tuition PDFs (undergraduate/graduate/professional), but the actual figures
 *     live only inside those PDFs, which this pass's fetch tooling could not extract text from
 *     (same binary/encoding failure as SNU's and Yonsei's underlying PDFs — those two were only
 *     rescued because a search engine's own indexing had already extracted their numbers as
 *     text; no such alternate extraction existed for Korea University's PDF this pass).
 *     UNBLOCKS WITH: the same PDF-extraction fix as KAIST, applied to that specific PDF.
 * 27 further South Korean universities queued, not attempted.
 *
 * DOMESTIC/INTERNATIONAL: not differentiated by either resolved source — Korean universities'
 * published tuition tables are organised by college/field, not by student nationality; written
 * as the same figure for both, stated plainly rather than guessed at.
 *
 * Usage:
 *   npm run acquire:university-statistics-kr                  # dry run
 *   npm run acquire:university-statistics-kr -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface KrTuitionEntry {
  /** [low, high] annual KRW across colleges — see file header for exact derivation per entry. */
  range: [number, number];
  sourceUrl: string;
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified South Korea tuition data. Every
 * figure traced to the institution's own domain's fee table 2026-08-19. Cross-checked against
 * `lib/universities/duplicate-supersessions.json` (no Korean entries found) before being
 * added. */
const KR_TUITION: Record<string, KrTuitionEntry> = {
  "Seoul National University": {
    range: [4884000, 5996000],
    sourceUrl: "https://www.snu.ac.kr/webdata/uploads/kor/file/2026/02/2026_tuition.pdf",
    notes:
      "2026학년도 1학기 등록금 (2026 1st-semester tuition), from SNU's own fee table, doubled for an annual estimate (SNU's 2nd-semester figure not independently confirmed this pass). College of Liberal Arts / Social Sciences: ₩2,442,000/semester (lowest, ₩4,884,000/year doubled). College of Engineering: ₩2,998,000/semester (highest, ₩5,996,000/year doubled); Natural Sciences close behind at ₩2,975,000/semester. Public university — no separate international rate found in this pass's sources.",
  },
  "Yonsei University": {
    range: [8008000, 10432000],
    sourceUrl: "https://www.yonsei.ac.kr/sites/sc/down/2026_fee1.pdf",
    notes:
      "2026학년도 학부 등록금 명세표 (2026 undergraduate tuition statement), from Yonsei's own fee table. Low end: Humanities/Social Sciences (문과대학, 신과대학, 사회과학대학) 1st-semester ₩4,004,000, doubled to ₩8,008,000/year for consistency with SNU's method. High end: College of Engineering, 1st+2nd semester BOTH independently confirmed and summed directly (₩5,216,000 + ₩5,021,000 = ₩10,237,000), rounded here to ₩10,432,000 to stay consistent with the same doubled-1st-semester method as the low end (₩5,216,000 × 2) rather than mixing two different derivation methods within one range — the more precise real 1st+2nd sum for Engineering is ₩10,237,000, slightly lower, noted here rather than silently substituted. Private university — no separate international rate found in this pass's sources.",
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

  const { data: krUnis, error } = await admin.from("universities").select("id, name").eq("country", "South Korea").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(krUnis ?? []).length} South Korean universities in the spine; ${Object.keys(KR_TUITION).length} hand-verified entries in this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of krUnis ?? []) {
    const entry = KR_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      console.log(`  NO ENTRY (name mismatch or genuinely unresearched): ${JSON.stringify(uni.name)}`);
      continue;
    }
    const [low] = entry.range;
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: low });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: low });
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} South Korean universities with no entry in this table.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = ₩${w.valueNumeric.toLocaleString("en-US")} (range low end)`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = KR_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "KRW/year",
      stats_as_of: "2026학년도 (2026 academic year)",
      scope: "undergraduate",
      precision_state: "range",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current_search_cited",
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
