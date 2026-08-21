/**
 * Matches live YOK Atlas placement records (api/tercih-kilavuz/search) to existing
 * university_programs rows, for insertion into university_program_placement_cycles.
 *
 * Deliberately conservative: a name match is a lead, not evidence (see
 * docs/handoffs/yok-atlas-placement-schema-decision.md and this project's own
 * feedback_verify_identity_not_pattern_match precedent). Anything that can't be resolved to
 * exactly one program_id is reported as unmatched/ambiguous, never guessed.
 */

export interface YokPlacementRecord {
  birimAdi: string;
  kilavuzKodu: number;
  fymkId: number;
  fymkAdi: string;
  puanTuru: string;
  bursOraniAdi?: string | null;
  kontenjan: number;
  minPuan?: number | null;
  basariSirasi?: number | null;
  birimTuruAdi: string;
  universiteId: number;
}

export interface ExistingProgramRow {
  id: string;
  university_id: string;
  name: string;
  faculty_or_school: string | null;
}

export interface PlacementInsertRow {
  program_id: string;
  cycle_year: number;
  cycle_label: string;
  kilavuz_kodu: string;
  fymk_id: string;
  fymk_adi: string;
  puan_turu: string;
  burs_orani_adi: string | null;
  kontenjan: number;
  placement_status: "filled" | "unfilled";
  basari_sirasi: number | null;
  min_puan: number | null;
  source_url: string;
  data_confidence: "high";
  retrieved_at: string;
}

export interface AmbiguousGroup {
  universityId: string;
  name: string;
  apiCount: number;
  dbCount: number;
  reason: string;
}

export interface UnmatchedApiRecord {
  record: YokPlacementRecord;
  universityId: string;
  reason: string;
}

export interface MatchResult {
  matched: PlacementInsertRow[];
  unmatchedApi: UnmatchedApiRecord[];
  ambiguous: AmbiguousGroup[];
}

function normalizeFaculty(s: string): string {
  return s.trim().toLocaleUpperCase("tr-TR");
}

function buildInsertRow(
  api: YokPlacementRecord,
  programId: string,
  cycleYear: number,
  cycleLabel: string,
  sourceUrl: string,
  retrievedAt: string
): PlacementInsertRow {
  const filled = api.minPuan != null && api.basariSirasi != null;
  return {
    program_id: programId,
    cycle_year: cycleYear,
    cycle_label: cycleLabel,
    kilavuz_kodu: String(api.kilavuzKodu),
    fymk_id: String(api.fymkId),
    fymk_adi: api.fymkAdi,
    puan_turu: api.puanTuru,
    burs_orani_adi: api.bursOraniAdi ?? null,
    kontenjan: api.kontenjan,
    placement_status: filled ? "filled" : "unfilled",
    basari_sirasi: filled ? (api.basariSirasi as number) : null,
    min_puan: filled ? (api.minPuan as number) : null,
    source_url: sourceUrl,
    data_confidence: "high",
    retrieved_at: retrievedAt,
  };
}

/**
 * @param universityIdByYokId maps the source's own `universiteId` to this project's
 *   `universities.id` for the universities being processed.
 * @param kilavuzBridge maps a live YOK Atlas `kilavuzKodu` to this project's
 *   `university_programs.id`, sourced from a university's own bilingual pages -- never from
 *   translating the English name (see lib/programs/tr-bilingual-name-bridge.ts and
 *   docs/handoffs/tr-bilingual-programme-names.md). An exact identifier match is checked
 *   before name-based matching and is the *only* path that can ever resolve a university whose
 *   `university_programs.name` and YOK's `birimAdi` are recorded in different languages --
 *   name-equality can never match those. Defaults to empty, which reproduces this function's
 *   prior behaviour exactly.
 */
export function matchYokPlacements(
  apiRecords: YokPlacementRecord[],
  dbPrograms: ExistingProgramRow[],
  universityIdByYokId: Map<number, string>,
  cycleYear: number,
  cycleLabel: string,
  sourceUrl: string,
  retrievedAt: string,
  kilavuzBridge: Map<number, string> = new Map()
): MatchResult {
  // LISANS only: this project's Turkish programme population is Bachelor's-level, and mixing
  // in ÖNLISANS/associate-level source records risks exactly the same-name, different-level
  // collision the Ankara Üniversitesi pass caught ("Bitki Koruma" -- a Lisans/Ziraat Fakültesi
  // programme and an unrelated Önlisans/Kalecik MYO programme sharing one display name).
  const lisansRecords = apiRecords.filter((r) => r.birimTuruAdi === "LISANS");

  const matched: PlacementInsertRow[] = [];
  const unmatchedApi: UnmatchedApiRecord[] = [];
  const ambiguous: AmbiguousGroup[] = [];
  const dbById = new Map(dbPrograms.map((p) => [p.id, p]));

  const apiByUniAndName = new Map<string, YokPlacementRecord[]>();
  const skippedUniversityIds = new Set<number>();
  for (const r of lisansRecords) {
    const universityId = universityIdByYokId.get(r.universiteId);
    if (!universityId) {
      skippedUniversityIds.add(r.universiteId);
      continue;
    }

    // Resolved by the sourced bilingual-name bridge -- an exact identifier, checked before any
    // name-based heuristic. Still defended against a bad bridge entry: the program must exist
    // in dbPrograms and belong to this same university, or it's reported unmatched rather than
    // trusted blindly.
    const bridgedProgramId = kilavuzBridge.get(r.kilavuzKodu);
    if (bridgedProgramId) {
      const bridgedProgram = dbById.get(bridgedProgramId);
      if (!bridgedProgram) {
        unmatchedApi.push({
          record: r,
          universityId,
          reason: `bilingual-name bridge points to program_id ${bridgedProgramId}, which is not in the provided dbPrograms`,
        });
      } else if (bridgedProgram.university_id !== universityId) {
        unmatchedApi.push({
          record: r,
          universityId,
          reason: `bilingual-name bridge program_id ${bridgedProgramId} belongs to a different university than this record's universiteId`,
        });
      } else {
        matched.push(buildInsertRow(r, bridgedProgramId, cycleYear, cycleLabel, sourceUrl, retrievedAt));
      }
      continue;
    }

    const key = `${universityId}::${r.birimAdi}`;
    apiByUniAndName.set(key, [...(apiByUniAndName.get(key) ?? []), r]);
  }

  const dbByUniAndName = new Map<string, ExistingProgramRow[]>();
  for (const p of dbPrograms) {
    const key = `${p.university_id}::${p.name}`;
    dbByUniAndName.set(key, [...(dbByUniAndName.get(key) ?? []), p]);
  }

  for (const [key, apiGroup] of apiByUniAndName) {
    const sepIdx = key.indexOf("::");
    const universityId = key.slice(0, sepIdx);
    const name = key.slice(sepIdx + 2);
    const dbGroup = dbByUniAndName.get(key) ?? [];

    if (dbGroup.length === 0) {
      for (const r of apiGroup) {
        unmatchedApi.push({ record: r, universityId, reason: "no existing university_programs row with this name at this university" });
      }
      continue;
    }

    if (dbGroup.length === 1 && apiGroup.length === 1) {
      matched.push(buildInsertRow(apiGroup[0], dbGroup[0].id, cycleYear, cycleLabel, sourceUrl, retrievedAt));
      continue;
    }

    // More than one record shares this (university, name) on one or both sides -- try to
    // disambiguate by faculty before giving up. Only accept a clean 1:1 pairing; anything left
    // over after pairing is ambiguous, not guessed.
    if (dbGroup.length === apiGroup.length) {
      const usedDb = new Set<number>();
      const pairs: { api: YokPlacementRecord; dbIdx: number }[] = [];
      let allPaired = true;
      for (const api of apiGroup) {
        const dbIdx = dbGroup.findIndex(
          (p, i) => !usedDb.has(i) && p.faculty_or_school != null && normalizeFaculty(p.faculty_or_school) === normalizeFaculty(api.fymkAdi)
        );
        if (dbIdx === -1) {
          allPaired = false;
          break;
        }
        usedDb.add(dbIdx);
        pairs.push({ api, dbIdx });
      }
      if (allPaired) {
        for (const { api, dbIdx } of pairs) {
          matched.push(buildInsertRow(api, dbGroup[dbIdx].id, cycleYear, cycleLabel, sourceUrl, retrievedAt));
        }
        continue;
      }
    }

    ambiguous.push({
      universityId,
      name,
      apiCount: apiGroup.length,
      dbCount: dbGroup.length,
      reason: "same name shared by multiple records on one or both sides; faculty disambiguation did not resolve 1:1",
    });
  }

  if (skippedUniversityIds.size > 0) {
    throw new Error(
      `matchYokPlacements received API records for universiteId(s) not in universityIdByYokId: ${[...skippedUniversityIds].join(", ")}. Caller must pre-filter to known universities.`
    );
  }

  return { matched, unmatchedApi, ambiguous };
}
