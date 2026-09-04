import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Does this university currently have an undergraduate admission pathway a first-time
 * international applicant (Proxola's stated 14-18 audience — see AGENTS.md §0) can actually
 * enter, straight from secondary school?
 *
 * `docs/d7-no-pathway-universities-findings-2026-09-04.md`, confirmed independently against
 * official sources for each entry below (not relayed or assumed): a small, real, recurring
 * set of universities where an international freshman applicant either has no English-taught
 * route at all (Copenhagen, UNAM, TU Dresden — bachelor's is conducted in the local language,
 * full stop) or where the one route that used to exist has closed (Tokyo — PEAK's final
 * intake was Fall 2026, its one other English-taught program is transfer-only). None of these
 * are "harder to get into" — the entry point Proxola would otherwise imply exists (add as a
 * target, see an outlook) is not there for this specific applicant shape.
 *
 * A corpus-wide measurement (same doc, addendum) found this pattern is real and recurs at
 * roughly a third to half of a spot sample, not a fluke limited to these four — but only
 * these four are actually confirmed one way or the other. Two more spot-checked cases (KTH,
 * King Saud University) turned up genuinely unclear, not confirmed negative, and are
 * deliberately NOT listed here: treating "unclear" as "no pathway" would be the same false
 * certainty this module exists to remove, just pointed the other direction. Every other
 * university in the catalog is simply unresearched on this question, which is `"unknown"`
 * below — never treated as either confirmed state.
 *
 * Deliberately keyed by `university_id`, not (country, field) the way `field-availability.ts`
 * is: every entry below currently has zero `university_programs` rows to key a per-program
 * check against (the D7 doc measured this directly), and the fact itself is
 * university-level — Tokyo's problem is not "Economics isn't offered in English," it's "there
 * is no English-taught freshman admission at all right now." A future entry with real
 * per-program pathway data can still be added program-scoped later; nothing here forecloses
 * that.
 */

export type UndergraduatePathwayAvailability =
  /** Confirmed: no undergraduate admission pathway this applicant can use exists right now. */
  | "not_available_for_applicant"
  /** Not established — no researched claim either way. Never treated as a confirmed negative. */
  | "unknown";

export interface PathwayAvailabilityResult {
  availability: UndergraduatePathwayAvailability;
  /** Student-facing explanation of the actual situation. Null unless
   * `not_available_for_applicant` — there is nothing to explain for `"unknown"`, and inventing
   * reassuring copy for it would be the false-confidence problem this module exists to avoid. */
  explanation: string | null;
  /** A named, sourced exception this entry does not cover, when one exists — e.g. a real but
   * different route (Tokyo's Japanese-medium track, or transfer admission). Present so the
   * product never states a categorical negative that the research itself qualifies. */
  caveat: string | null;
  sources: string[];
}

interface PathwayEntry {
  universityId: string;
  universityName: string;
  explanation: string;
  explanationTr: string;
  caveat: string;
  caveatTr: string;
  sources: string[];
}

const D7_DOC = "docs/d7-no-pathway-universities-findings-2026-09-04.md";

const NO_PATHWAY_FOR_APPLICANT: PathwayEntry[] = [
  {
    universityId: "2c25084f-260f-4b34-9499-5b2d1fb9a873",
    universityName: "The University of Tokyo",
    explanation:
      "The University of Tokyo currently has no English-taught undergraduate admission route for a first-time applicant straight from secondary school. PEAK, its English-taught freshman program, had its final intake for Fall 2026 and is no longer accepting applications.",
    explanationTr:
      "Tokyo Üniversitesi'nde şu anda liseden doğrudan başvuran bir öğrenci için İngilizce-öğretim lisans kabul yolu yok. Üniversitenin İngilizce-öğretim lisans programı PEAK, son alımını 2026 Sonbahar döneminde yaptı ve artık başvuru kabul etmiyor.",
    caveat:
      "Two real alternatives exist, neither of which is what 'add as a target, see an outlook' currently implies: the Japanese-medium general track (requires Japanese proficiency), and GSC, an English-taught program that only admits transfer students who have already completed at least two years of university study outside Japan.",
    caveatTr:
      "İki gerçek alternatif var, ama ikisi de 'hedef olarak ekle, görünümü gör' ifadesinin şu an çağrıştırdığı şey değil: Japonca dil yeterliliği gerektiren genel Japonca-öğretim yolu, ve yalnızca Japonya dışında en az iki yıl üniversite eğitimi tamamlamış öğrencileri kabul eden İngilizce-öğretim transfer programı GSC.",
    sources: [D7_DOC, "https://peak.c.u-tokyo.ac.jp/", "https://www.u-tokyo.ac.jp/en/prospective-students/undergraduate_english.html"],
  },
  {
    universityId: "9b743584-6f43-4fdd-8f53-fbf2e60a1bd8",
    universityName: "University of Copenhagen",
    explanation:
      "The University of Copenhagen only offers bachelor's programmes taught in Danish. There is no English-taught undergraduate degree at this university at all — every applicant, regardless of nationality, must meet a Danish-language qualification requirement.",
    explanationTr:
      "Kopenhag Üniversitesi yalnızca Danca öğretim yapan lisans programları sunuyor. Bu üniversitede hiç İngilizce-öğretim lisans programı yok — uyruğu ne olursa olsun her başvuru sahibinin bir Danca dil yeterliliği şartını karşılaması gerekiyor.",
    caveat: "English-taught programmes do exist at Copenhagen at the master's level — this only concerns undergraduate (bachelor's) admission.",
    caveatTr: "Kopenhag'da yüksek lisans düzeyinde İngilizce-öğretim programlar mevcut — bu yalnızca lisans (bachelor's) düzeyi kabulüyle ilgilidir.",
    sources: [D7_DOC, "https://www.ku.dk/studies/bachelor/admission-requirements"],
  },
  {
    universityId: "bd8f606a-3bc2-4075-bb21-26869b494733",
    universityName: "Universidad Nacional Autónoma de México (UNAM)",
    explanation:
      "UNAM's international-student undergraduate offering is semester exchange/mobility programmes taken alongside Spanish-medium Mexican degree programmes, not a standalone English-taught degree track a first-time applicant can enrol in directly.",
    explanationTr:
      "UNAM'ın uluslararası öğrencilere lisans düzeyinde sunduğu şey, İspanyolca-öğretim Meksika derece programlarının yanında alınan dönemlik değişim/hareketlilik (mobility) programları — liseden doğrudan kaydolunabilecek, bağımsız bir İngilizce-öğretim derece yolu değil.",
    caveat: "A student with strong Spanish, or pursuing an exchange/mobility term rather than a full degree, has a real route here that this entry does not describe.",
    caveatTr: "Güçlü İspanyolca bilen, ya da tam bir derece yerine değişim/hareketlilik dönemi arayan bir öğrenci için burada bu kaydın anlatmadığı gerçek bir yol var.",
    sources: [D7_DOC, "https://www.unaminternacional.unam.mx/en/movilidad/entrante"],
  },
  {
    universityId: "9b957f10-d9d0-4a64-b28e-601bd6cc8a61",
    universityName: "Technische Universität Dresden",
    explanation:
      "TU Dresden's bachelor's programmes are primarily German-taught. English-taught programmes exist mainly at the master's level, not as a general undergraduate admission route.",
    explanationTr:
      "TU Dresden'in lisans programları büyük ölçüde Almanca öğretim yapıyor. İngilizce-öğretim programlar esas olarak yüksek lisans düzeyinde bulunuyor, genel bir lisans kabul yolu olarak değil.",
    caveat: "A small number of interdisciplinary bachelor's offerings include English coursework — this entry describes the general case, not every individual programme.",
    caveatTr: "Az sayıda disiplinlerarası lisans programı İngilizce ders içeriyor — bu kayıt genel durumu anlatır, her bir programı tek tek değil.",
    sources: [D7_DOC],
  },
];

const UNKNOWN: PathwayAvailabilityResult = { availability: "unknown", explanation: null, caveat: null, sources: [] };

export interface PathwayAvailabilityQuery {
  universityId: string | null;
}

/**
 * `locale` defaults to English; see lib/counselor/evidence.ts's buildRecommendation for the
 * reasoning shared across this codebase's i18n work.
 */
export function checkUndergraduatePathwayAvailability(query: PathwayAvailabilityQuery, locale: Locale = DEFAULT_LOCALE): PathwayAvailabilityResult {
  if (!query.universityId) return UNKNOWN;

  const entry = NO_PATHWAY_FOR_APPLICANT.find((e) => e.universityId === query.universityId);
  if (!entry) return UNKNOWN;

  return {
    availability: "not_available_for_applicant",
    explanation: locale === "tr" ? entry.explanationTr : entry.explanation,
    caveat: locale === "tr" ? entry.caveatTr : entry.caveat,
    sources: entry.sources,
  };
}
