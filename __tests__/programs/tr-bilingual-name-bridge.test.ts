import { describe, expect, test } from "vitest";
import { buildKilavuzBridge, type BilingualNameEntry } from "@/lib/programs/tr-bilingual-name-bridge";

// Real record from data/research/university-programs/tr_bilingual_names_bilkent_2026-08-22.jsonl
// -- Bilkent's Information Systems and Technologies (CTIS), sourced from ctis.bilkent.edu.tr's
// own EN/TR toggle and Bilkent's official bilingual campus directory.
const BILKENT_CTIS: BilingualNameEntry = {
  university: "Bilkent University",
  program_id: "f51a746f-9920-4d23-b2de-914d20731c11",
  turkish_name: "Bilişim Sistemleri ve Teknolojileri",
  confidence: "high",
  pairing_method: "language_toggle",
  kilavuz_codes: [
    { kilavuz_kodu: "202190193", tier_label: "Burslu" },
    { kilavuz_kodu: "202190194", tier_label: "%50 İndirimli" },
    { kilavuz_kodu: "202190192", tier_label: "Ücretli" },
  ],
};

// Real record from tr_bilingual_names_ozyegin_2026-08-22.jsonl -- medium confidence because
// Özyeğin's own site is internally inconsistent about whether this department's English name
// is "Computer Science" or "Computer Engineering", despite having real kilavuz codes.
const OZYEGIN_CS_MEDIUM_CONFIDENCE: BilingualNameEntry = {
  university: "Özyeğin University",
  program_id: "44909cf2-9b45-4c6b-95ec-f165a3c2f310",
  turkish_name: "Bilgisayar Mühendisliği",
  confidence: "medium",
  pairing_method: "language_toggle",
  kilavuz_codes: [
    { kilavuz_kodu: "204810176", tier_label: "Burslu", yok_birim_adi: "Bilgisayar Mühendisliği (İngilizce) (Burslu)" },
    { kilavuz_kodu: "204810185", tier_label: "%50 İndirimli", yok_birim_adi: "Bilgisayar Mühendisliği (İngilizce) (%50 İndirimli)" },
    { kilavuz_kodu: "204890048", tier_label: "Ücretli", yok_birim_adi: "Bilgisayar Mühendisliği (İngilizce) (Ücretli)" },
  ],
};

// Real record from tr_bilingual_names_bogazici_2026-08-22.jsonl -- the department-vs-programme
// case (Mathematics and Science Education coordinates 5 separately-admitted programmes),
// deliberately left unpaired.
const BOGAZICI_UNPAIRED: BilingualNameEntry = {
  university: "Boğaziçi University",
  program_id: "d15fa653-b6f9-4254-a1f3-890209bc34a6",
  turkish_name: null,
  confidence: "low",
  pairing_method: "unpaired",
  kilavuz_codes: [],
};

// Real record from tr_bilingual_names_ozyegin_2026-08-22.jsonl -- Entrepreneurship, high
// confidence name pairing but genuinely absent from YÖK's 2026 placement data (no admission
// track this cycle), so no kilavuzKodu exists to bridge.
const OZYEGIN_ENTREPRENEURSHIP_NO_KILAVUZ: BilingualNameEntry = {
  university: "Özyeğin University",
  program_id: "2f93e010-9ea4-4596-9c6d-c41968f909d6",
  turkish_name: "Girişimcilik",
  confidence: "medium",
  pairing_method: "language_toggle",
  kilavuz_codes: [],
};

describe("buildKilavuzBridge", () => {
  test("a high-confidence entry with kilavuz codes wires every tier's kilavuzKodu to the same program_id", () => {
    const { bridge, heldBack } = buildKilavuzBridge([BILKENT_CTIS]);
    expect(bridge.get(202190193)).toBe("f51a746f-9920-4d23-b2de-914d20731c11");
    expect(bridge.get(202190194)).toBe("f51a746f-9920-4d23-b2de-914d20731c11");
    expect(bridge.get(202190192)).toBe("f51a746f-9920-4d23-b2de-914d20731c11");
    expect(bridge.size).toBe(3);
    expect(heldBack).toHaveLength(0);
  });

  test("medium confidence is held back even with real kilavuz codes present -- the Özyeğin Computer Science/Engineering case", () => {
    const { bridge, heldBack } = buildKilavuzBridge([OZYEGIN_CS_MEDIUM_CONFIDENCE]);
    expect(bridge.size).toBe(0);
    expect(heldBack).toHaveLength(1);
    expect(heldBack[0]).toMatchObject({
      program_id: "44909cf2-9b45-4c6b-95ec-f165a3c2f310",
      reason: expect.stringContaining('confidence is "medium"'),
    });
  });

  test("an unpaired entry (no sourced Turkish name) is held back, not silently skipped", () => {
    const { bridge, heldBack } = buildKilavuzBridge([BOGAZICI_UNPAIRED]);
    expect(bridge.size).toBe(0);
    expect(heldBack).toHaveLength(1);
    expect(heldBack[0].reason).toMatch(/unpaired/);
  });

  test("a paired entry with no kilavuz codes is held back with a specific reason, not silently dropped", () => {
    const { bridge, heldBack } = buildKilavuzBridge([OZYEGIN_ENTREPRENEURSHIP_NO_KILAVUZ]);
    expect(bridge.size).toBe(0);
    expect(heldBack).toHaveLength(1);
    expect(heldBack[0].reason).toMatch(/no kilavuzKodu captured/);
  });

  test("two different programmes claiming the same kilavuzKodu is a conflict, never silently overwritten", () => {
    const conflicting: BilingualNameEntry = {
      ...BILKENT_CTIS,
      program_id: "some-other-program-id",
    };
    const { bridge, heldBack } = buildKilavuzBridge([BILKENT_CTIS, conflicting]);
    // First entry wins the bridge slot; the second is flagged, not silently overwritten.
    expect(bridge.get(202190193)).toBe("f51a746f-9920-4d23-b2de-914d20731c11");
    const conflictEntries = heldBack.filter((h) => h.program_id === "some-other-program-id");
    expect(conflictEntries).toHaveLength(3); // one per tier's kilavuzKodu
    expect(conflictEntries[0].reason).toMatch(/already bridged to a different program_id/);
  });

  test("a mixed batch produces the correct combined bridge and held-back set", () => {
    const { bridge, heldBack } = buildKilavuzBridge([
      BILKENT_CTIS,
      OZYEGIN_CS_MEDIUM_CONFIDENCE,
      BOGAZICI_UNPAIRED,
      OZYEGIN_ENTREPRENEURSHIP_NO_KILAVUZ,
    ]);
    expect(bridge.size).toBe(3);
    expect(heldBack).toHaveLength(3);
  });
});
