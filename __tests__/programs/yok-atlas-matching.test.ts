import { describe, expect, test } from "vitest";
import { matchYokPlacements, type ExistingProgramRow, type YokPlacementRecord } from "@/lib/programs/yok-atlas-matching";

const ANKARA = "uni-ankara";
const ISTANBUL = "uni-istanbul";
const YOK_ID_BY_UNI = new Map<number, string>([
  [102738, ANKARA],
  [115373, ISTANBUL],
]);

function apiRecord(overrides: Partial<YokPlacementRecord> = {}): YokPlacementRecord {
  return {
    birimAdi: "Tıp",
    kilavuzKodu: 101110775,
    fymkId: 102739,
    fymkAdi: "TIP FAKÜLTESİ",
    puanTuru: "SAY",
    bursOraniAdi: null,
    kontenjan: 335,
    minPuan: 531.79539,
    basariSirasi: 2982,
    birimTuruAdi: "LISANS",
    universiteId: 102738,
    ...overrides,
  };
}

function dbRow(overrides: Partial<ExistingProgramRow> = {}): ExistingProgramRow {
  return {
    id: "program-tip",
    university_id: ANKARA,
    name: "Tıp",
    faculty_or_school: "TIP FAKÜLTESİ",
    ...overrides,
  };
}

const CYCLE_YEAR = 2026;
const CYCLE_LABEL = "2026-YKS";
const SOURCE_URL = "https://yokatlas.yok.gov.tr/";
const RETRIEVED_AT = "2026-08-21T18:00:00.000Z";

function run(api: YokPlacementRecord[], db: ExistingProgramRow[]) {
  return matchYokPlacements(api, db, YOK_ID_BY_UNI, CYCLE_YEAR, CYCLE_LABEL, SOURCE_URL, RETRIEVED_AT);
}

describe("matchYokPlacements", () => {
  test("clean 1:1 match produces a filled insert row", () => {
    const result = run([apiRecord()], [dbRow()]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      program_id: "program-tip",
      placement_status: "filled",
      basari_sirasi: 2982,
      min_puan: 531.79539,
      kilavuz_kodu: "101110775",
      fymk_id: "102739",
    });
    expect(result.unmatchedApi).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
  });

  test("missing minPuan/basariSirasi is reported as unfilled, not dropped", () => {
    const result = run([apiRecord({ minPuan: undefined, basariSirasi: undefined })], [dbRow()]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].placement_status).toBe("unfilled");
    expect(result.matched[0].basari_sirasi).toBeNull();
    expect(result.matched[0].min_puan).toBeNull();
  });

  test("ÖNLISANS records are excluded even when the name matches a LISANS db row", () => {
    // Real shape: Ankara Üniversitesi's "Bitki Koruma" exists as both a Lisans/Ziraat Fakültesi
    // programme and an unrelated Önlisans/Kalecik MYO programme sharing the same display name.
    const lisans = apiRecord({ birimAdi: "Bitki Koruma", fymkAdi: "ZİRAAT FAKÜLTESİ" });
    const onlisans = apiRecord({
      birimAdi: "Bitki Koruma",
      birimTuruAdi: "ÖNLISANS",
      fymkAdi: "KALECİK MESLEK YÜKSEKOKULU",
      puanTuru: "TYT",
      kilavuzKodu: 101190423,
      fymkId: 103291,
    });
    const db = [dbRow({ id: "program-bitki-koruma", name: "Bitki Koruma", faculty_or_school: "ZİRAAT FAKÜLTESİ" })];
    const result = run([lisans, onlisans], db);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].program_id).toBe("program-bitki-koruma");
    expect(result.matched[0].fymk_adi).toBe("ZİRAAT FAKÜLTESİ");
    // The Önlisans record is filtered out before matching entirely -- never counted as
    // unmatched/ambiguous, since it was never a candidate for this Lisans-only db population.
    expect(result.unmatchedApi).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
  });

  test("no db counterpart is reported as unmatched, not silently dropped", () => {
    const result = run([apiRecord({ birimAdi: "Aktüerya Bilimleri" })], []);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedApi).toHaveLength(1);
    expect(result.unmatchedApi[0].reason).toMatch(/no existing university_programs row/);
  });

  test("two db rows sharing a name resolve 1:1 via faculty when two api records also share it", () => {
    // Real shape: Istanbul University's two "İşletme" rows, distinguished only by faculty.
    const apiIktisat = apiRecord({
      birimAdi: "İşletme",
      fymkAdi: "İKTİSAT FAKÜLTESİ",
      universiteId: 115373,
      kilavuzKodu: 105610555,
    });
    const apiSiyasal = apiRecord({
      birimAdi: "İşletme",
      fymkAdi: "SİYASAL BİLGİLER FAKÜLTESİ",
      universiteId: 115373,
      kilavuzKodu: 105690907,
    });
    const dbIktisat = dbRow({ id: "program-isletme-iktisat", university_id: ISTANBUL, name: "İşletme", faculty_or_school: "İKTİSAT FAKÜLTESİ" });
    const dbSiyasal = dbRow({ id: "program-isletme-siyasal", university_id: ISTANBUL, name: "İşletme", faculty_or_school: "SİYASAL BİLGİLER FAKÜLTESİ" });

    const result = run([apiIktisat, apiSiyasal], [dbIktisat, dbSiyasal]);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.matched).toHaveLength(2);
    const byFaculty = Object.fromEntries(result.matched.map((m) => [m.fymk_adi, m.program_id]));
    expect(byFaculty["İKTİSAT FAKÜLTESİ"]).toBe("program-isletme-iktisat");
    expect(byFaculty["SİYASAL BİLGİLER FAKÜLTESİ"]).toBe("program-isletme-siyasal");
  });

  test("two db rows sharing a name are left ambiguous, not guessed, when faculty can't disambiguate", () => {
    const api = apiRecord({ birimAdi: "İşletme", fymkAdi: "İKTİSAT FAKÜLTESİ", universiteId: 115373 });
    const dbA = dbRow({ id: "program-a", university_id: ISTANBUL, name: "İşletme", faculty_or_school: null });
    const dbB = dbRow({ id: "program-b", university_id: ISTANBUL, name: "İşletme", faculty_or_school: null });

    const result = run([api], [dbA, dbB]);
    expect(result.matched).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(1);
    expect(result.ambiguous[0]).toMatchObject({ name: "İşletme", universityId: ISTANBUL, apiCount: 1, dbCount: 2 });
  });

  test("burs_orani_adi passes through null and populated values correctly", () => {
    const noTier = apiRecord({ bursOraniAdi: null });
    const withTier = apiRecord({ birimAdi: "Tıp (İngilizce)", kilavuzKodu: 101190208, bursOraniAdi: "Ücretli" });
    const db = [dbRow(), dbRow({ id: "program-tip-en", name: "Tıp (İngilizce)" })];
    const result = run([noTier, withTier], db);
    expect(result.matched).toHaveLength(2);
    const byName = Object.fromEntries(result.matched.map((m) => [m.kilavuz_kodu, m.burs_orani_adi]));
    expect(byName["101110775"]).toBeNull();
    expect(byName["101190208"]).toBe("Ücretli");
  });

  test("throws if given a record for a universiteId not in the lookup map (caller must pre-filter)", () => {
    const result = () => run([apiRecord({ universiteId: 999999 })], []);
    expect(result).toThrow(/999999/);
  });
});

describe("matchYokPlacements with the sourced bilingual-name bridge", () => {
  // Real shape from data/research/university-programs/tr_bilingual_names_bilkent_2026-08-22.jsonl:
  // Bilkent's "Information Systems and Technologies" (english_name, our DB's actual value) has
  // no name-equality match against YOK's Turkish birimAdi "Bilişim Sistemleri ve Teknolojileri
  // (İngilizce) (Burslu)" -- this is exactly the gap the bridge exists to close.
  const BILKENT = "uni-bilkent";
  const CTIS_PROGRAM_ID = "f51a746f-9920-4d23-b2de-914d20731c11";
  const YOK_ID_BY_UNI_WITH_BILKENT = new Map<number, string>([
    [102738, ANKARA],
    [115373, ISTANBUL],
    [105118, BILKENT], // Bilkent's real YOK Atlas universiteId
  ]);

  function ctisApiRecord(overrides: Partial<YokPlacementRecord> = {}): YokPlacementRecord {
    return apiRecord({
      birimAdi: "Bilişim Sistemleri ve Teknolojileri (İngilizce) (Burslu)",
      kilavuzKodu: 202190193,
      fymkId: 116700,
      fymkAdi: "UYGULAMALI BİLİMLER FAKÜLTESİ",
      bursOraniAdi: "Burslu",
      universiteId: 105118,
      ...overrides,
    });
  }

  function ctisDbRow(overrides: Partial<ExistingProgramRow> = {}): ExistingProgramRow {
    return dbRow({
      id: CTIS_PROGRAM_ID,
      university_id: BILKENT,
      name: "Information Systems and Technologies",
      faculty_or_school: "Faculty of Applied Sciences",
      ...overrides,
    });
  }

  test("resolves via kilavuzKodu when the Turkish birimAdi has no name-equality match against the English DB name", () => {
    const bridge = new Map<number, string>([[202190193, CTIS_PROGRAM_ID]]);
    const result = matchYokPlacements(
      [ctisApiRecord()],
      [ctisDbRow()],
      YOK_ID_BY_UNI_WITH_BILKENT,
      CYCLE_YEAR,
      CYCLE_LABEL,
      SOURCE_URL,
      RETRIEVED_AT,
      bridge
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      program_id: CTIS_PROGRAM_ID,
      kilavuz_kodu: "202190193",
      burs_orani_adi: "Burslu",
      fymk_adi: "UYGULAMALI BİLİMLER FAKÜLTESİ",
    });
    expect(result.unmatchedApi).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
  });

  test("without the bridge, the same record is unmatched (English DB name vs Turkish birimAdi never collide)", () => {
    const result = matchYokPlacements(
      [ctisApiRecord()],
      [ctisDbRow()],
      YOK_ID_BY_UNI_WITH_BILKENT,
      CYCLE_YEAR,
      CYCLE_LABEL,
      SOURCE_URL,
      RETRIEVED_AT
      // no bridge passed -- defaults to empty
    );
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedApi).toHaveLength(1);
  });

  test("a bridge entry pointing to a program_id outside dbPrograms is reported unmatched, never trusted blindly", () => {
    const bridge = new Map<number, string>([[202190193, "program-id-not-in-db"]]);
    const result = matchYokPlacements(
      [ctisApiRecord()],
      [ctisDbRow()],
      YOK_ID_BY_UNI_WITH_BILKENT,
      CYCLE_YEAR,
      CYCLE_LABEL,
      SOURCE_URL,
      RETRIEVED_AT,
      bridge
    );
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedApi).toHaveLength(1);
    expect(result.unmatchedApi[0].reason).toMatch(/not in the provided dbPrograms/);
  });

  test("a bridge entry pointing to a program at the wrong university is reported unmatched, never trusted blindly", () => {
    const bridge = new Map<number, string>([[202190193, "program-tip"]]); // program-tip belongs to ANKARA in dbRow()'s default
    const result = matchYokPlacements(
      [ctisApiRecord()],
      [ctisDbRow(), dbRow()], // dbRow() default is program-tip @ ANKARA
      YOK_ID_BY_UNI_WITH_BILKENT,
      CYCLE_YEAR,
      CYCLE_LABEL,
      SOURCE_URL,
      RETRIEVED_AT,
      bridge
    );
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedApi).toHaveLength(1);
    expect(result.unmatchedApi[0].reason).toMatch(/belongs to a different university/);
  });

  test("bridge resolution does not disturb existing name-based matches for other universities in the same run", () => {
    const bridge = new Map<number, string>([[202190193, CTIS_PROGRAM_ID]]);
    const result = matchYokPlacements(
      [ctisApiRecord(), apiRecord()], // apiRecord() default is Ankara's "Tıp", name-matched as before
      [ctisDbRow(), dbRow()],
      YOK_ID_BY_UNI_WITH_BILKENT,
      CYCLE_YEAR,
      CYCLE_LABEL,
      SOURCE_URL,
      RETRIEVED_AT,
      bridge
    );
    expect(result.matched).toHaveLength(2);
    const byProgramId = Object.fromEntries(result.matched.map((m) => [m.program_id, m.kilavuz_kodu]));
    expect(byProgramId[CTIS_PROGRAM_ID]).toBe("202190193");
    expect(byProgramId["program-tip"]).toBe("101110775");
  });
});
