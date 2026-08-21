/**
 * Builds a YOK Atlas `kilavuzKodu` -> `university_programs.id` bridge from the sourced
 * English<->Turkish programme-name research in
 * data/research/university-programs/tr_bilingual_names_*.jsonl (see
 * docs/handoffs/tr-bilingual-programme-names.md).
 *
 * This exists because six universities' `university_programs.name` values are recorded
 * entirely in English while YOK Atlas's own `birimAdi` is Turkish-only, so
 * matchYokPlacements' name-equality matching can never resolve them (see
 * docs/handoffs/yok-atlas-placements-scale-12-universities.md Finding 1). kilavuzKodu is YOK's
 * own stable per-programme identifier -- an exact identifier is evidence, not a lead, once the
 * Turkish-name pairing it was captured against has actually been verified.
 *
 * Only "high" confidence entries are wired into the bridge. The fee tier (Burslu/%50
 * İndirimli/Ücretli) rides inside the very kilavuzKodu record a medium/low confidence name
 * pairing produced, so a wrong pairing there is a real money error, not just a labeling
 * mistake -- see Özyeğin's "Computer Science" case (medium confidence, real kilavuz codes,
 * held back deliberately because the university's own site is internally inconsistent about
 * whether that department's English name is "Computer Science" or "Computer Engineering").
 */

export interface BilingualNameKilavuzCode {
  kilavuz_kodu: string;
  tier_label?: string | null;
  yok_birim_adi?: string | null;
}

export interface BilingualNameEntry {
  university: string;
  program_id: string;
  turkish_name: string | null;
  confidence: "high" | "medium" | "low";
  pairing_method?: string;
  kilavuz_codes?: BilingualNameKilavuzCode[] | null;
}

export interface HeldBackEntry {
  university: string;
  program_id: string;
  reason: string;
}

export interface BilingualBridgeResult {
  bridge: Map<number, string>;
  heldBack: HeldBackEntry[];
}

/**
 * Pure function: takes the already-parsed JSONL rows (from all
 * tr_bilingual_names_*.jsonl files combined) and returns a kilavuzKodu -> program_id map
 * plus every entry that was deliberately excluded, with the reason. Never silently drops an
 * entry -- everything not wired into the bridge is accounted for in `heldBack`.
 */
export function buildKilavuzBridge(entries: BilingualNameEntry[]): BilingualBridgeResult {
  const bridge = new Map<number, string>();
  const heldBack: HeldBackEntry[] = [];

  for (const e of entries) {
    if (!e.turkish_name || e.pairing_method === "unpaired") {
      heldBack.push({
        university: e.university,
        program_id: e.program_id,
        reason: "unpaired -- no sourced Turkish name from the university's own pages",
      });
      continue;
    }

    if (!e.kilavuz_codes || e.kilavuz_codes.length === 0) {
      heldBack.push({
        university: e.university,
        program_id: e.program_id,
        reason: "no kilavuzKodu captured for this programme (e.g. talent-exam admission, or no active bachelor's row this cycle)",
      });
      continue;
    }

    if (e.confidence !== "high") {
      heldBack.push({
        university: e.university,
        program_id: e.program_id,
        reason: `confidence is "${e.confidence}", not "high" -- held back from automatic matching; the fee tier rides inside this kilavuzKodu record, so an uncertain name pairing is a money-error risk, not just a labeling one`,
      });
      continue;
    }

    for (const kc of e.kilavuz_codes) {
      const kilavuzKodu = Number(kc.kilavuz_kodu);
      if (!Number.isFinite(kilavuzKodu)) {
        heldBack.push({
          university: e.university,
          program_id: e.program_id,
          reason: `kilavuz_kodu "${kc.kilavuz_kodu}" is not a valid number`,
        });
        continue;
      }

      const existing = bridge.get(kilavuzKodu);
      if (existing && existing !== e.program_id) {
        // Two different sourced programmes claiming the same YOK identifier is a real conflict
        // -- never silently pick one.
        heldBack.push({
          university: e.university,
          program_id: e.program_id,
          reason: `kilavuzKodu ${kilavuzKodu} is already bridged to a different program_id (${existing}) -- conflict, not wired`,
        });
        continue;
      }

      bridge.set(kilavuzKodu, e.program_id);
    }
  }

  return { bridge, heldBack };
}
