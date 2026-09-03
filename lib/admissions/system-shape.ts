import { isSameCountry } from "@/lib/opportunities/matching";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { ProgramSubjectTaxonomy } from "@/types/database";

/**
 * Gate 1 — "does this target's admissions system review non-academic evidence at all?"
 *
 * Named but explicitly not implemented in
 * `docs/research/counseling-intelligence/18-geography-conditional-scoring-design-spec.md` §7
 * item 1; the missing piece the rules-vs-implementation audit
 * (`docs/research/admissions-systems/implementation-gap/README.md`) found to be the single
 * highest-priority defect in the product: `computeAdmissionOutlook` has shipped a
 * holistic-vs-credential-gate distinction since migration 0049, but **no caller ever
 * populated it**, so every student targeting every university in every country received
 * US-style reach/competitive/likely framing.
 *
 * Three deliberate departures from the design spec's own sketch, each because the audit
 * produced evidence against the sketched shape (Gaps 1-3 in that document):
 *
 * 1. **Not a boolean, and not a two-member enum.** The audit found three real shapes, not
 *    two — see `AdmissionSystemShape`. `outlook.ts`'s original binary
 *    `"holistic" | "credential_gate"` collapses the Netherlands/Italy non-competitive
 *    threshold case into wording built around exam-gating, which is not a mechanism a Dutch
 *    open-programme applicant would recognize.
 * 2. **Keyed by applicant pathway, not by target country alone.** France (Parcoursup vs.
 *    DAP), Ireland (CAO vs. non-EU-direct), Hong Kong (JUPAS vs. non-JUPAS) and Turkey
 *    (domestic YKS vs. foreign-national) each run two parallel architectures inside one
 *    country, and for Ireland/Hong Kong the two land on *opposite* Gate-1 answers
 *    (RULE-ADMISSIONS-013/014/017).
 * 3. **The override key carries an institution dimension, not just (country, field).**
 *    RULE-ADMISSIONS-008/018/019: the University of Toronto's general Arts & Science
 *    admission does not consider extracurriculars while UBC's mandatory Personal Profile
 *    weighs them heavily — same country, same field, institution is the operative variable.
 *
 * **No numbers anywhere in this module, by design.** Gate 1 answers a categorical question
 * about a mechanism. Gate 2 (which of the 9 dimensions matter and how much, spec §7 item 2)
 * is deliberately *not* implemented here: its content would be a set of per-dimension
 * weights, and `AGENTS.md` Phase 6.1 prohibits inventing scoring parameters. Gate 1 is
 * evidence-complete; Gate 2 is not.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * The three admissions-system shapes the country research actually found, plus an honest
 * fourth state for "we have not established this."
 *
 * The split between the two non-holistic shapes is not cosmetic — it changes what a student
 * should be told. `academic_rank_competitive` means "there is a real bar and Oryn cannot see
 * where it sits this cycle"; `academic_threshold` means "there is no bar to clear beyond the
 * published requirements." Telling a Dutch open-programme applicant the first thing, or a
 * YKS candidate the second, are both wrong in opposite directions.
 */
export type AdmissionSystemShape =
  /** Non-academic evidence (essays, references, activity records, interviews) is genuinely
   * read as part of the admission decision. The reach/competitive/likely scale describes
   * this. USA unconditionally; UK, Singapore and several others narrowly. */
  | "holistic_review"
  /** Non-academic evidence has no channel into the decision, AND a genuinely competitive
   * academic ranking/cutoff exists that Oryn cannot observe (it moves every cycle with
   * demand). Turkey/YKS, Ireland/CAO, Spain's nota de admisión, Australia's ATAR,
   * Germany's NC subjects, Italy's numero chiuso. */
  | "academic_rank_competitive"
  /** Non-academic evidence has no channel into the decision, AND there is no ranking to
   * clear once the published qualification/subject threshold is met — eligible functionally
   * equals admitted (RULE-ADMISSIONS-001). Netherlands and Italy non-restricted programmes,
   * Germany's non-NC programmes, Switzerland's general route. */
  | "academic_threshold"
  /** Not established for this target: no researched entry for the country, or a country
   * whose pathways genuinely disagree with each other and Oryn lacks the fact that decides
   * which one applies. Never silently treated as any of the three above. */
  | "unknown";

/** True when the reach/competitive/likely scale describes the mechanism; false when it does
 * not; null when Oryn has not established the mechanism at all. Never collapse null into
 * false — "we don't know whether your activities are read here" and "your activities are
 * definitely not read here" are different statements to a student. */
export function reviewsNonAcademicEvidence(shape: AdmissionSystemShape): boolean | null {
  if (shape === "holistic_review") return true;
  if (shape === "unknown") return null;
  return false;
}

/**
 * Which of a country's parallel admissions architectures this student enters.
 *
 * Derived from `profiles.country`, which `types/database.ts` documents as
 * *residence/school location* — deliberately not `citizenship_countries`. Every pathway
 * split in the researched set turns on residence or schooling location, not nationality:
 * RULE-ADMISSIONS-017 is explicit that Turkey's domestic/foreign-national split follows
 * where secondary school was completed (a Turkish citizen schooled abroad is on the foreign
 * pathway; a foreign national schooled in Türkiye is not), Ireland's CAO eligibility follows
 * fee status (a residence-history test), and France's DAP route is defined over residents of
 * the ~72 Études en France countries. Keying any of these off citizenship would produce the
 * wrong answer for exactly the students ORYN exists to serve.
 */
export type ApplicantPathway = "domestic" | "international" | "unknown";

/** How `pathway` was arrived at, so a caller can weight the result honestly rather than
 * treating a proxy as a confirmed fact. */
export type PathwayBasis =
  /** This country runs one architecture for everyone — pathway did not need resolving. */
  | "not_pathway_split"
  /** Resolved from the student's stated residence/school country. Genuinely the right
   * signal per the rules cited on `ApplicantPathway`, but still a stated field, not a
   * verified fee-status or diploma determination. */
  | "residence"
  /** The country has a split and Oryn has no residence on file. */
  | "undetermined";

/** Which layer of the (country, pathway, institution, field) key produced the shape. */
export type ResolutionBasis =
  | "no_entry"
  | "country"
  | "country_pathway"
  | "country_field"
  | "institution"
  | "institution_field"
  | "pathway_undetermined";

export interface AdmissionSystemResolution {
  shape: AdmissionSystemShape;
  pathway: ApplicantPathway;
  pathwayBasis: PathwayBasis;
  basis: ResolutionBasis;
  /** One or two plain sentences describing how this target actually admits, written to be
   * shown to a 14-18-year-old. Null only when `shape` is "unknown" with no entry at all.
   * Always traceable to `sources` — never a generated characterization. */
  mechanism: string | null;
  /** Repo-relative research documents backing this entry. Never an invented URL. */
  sources: string[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface PathwaySystem {
  shape: AdmissionSystemShape;
  mechanism: string;
  /**
   * Turkish translation of `mechanism`, where one exists. Optional and incomplete by design:
   * these ~30 sentences are highly specific, factually precise descriptions of individual
   * countries' admission mechanisms (named exams, named algorithms, named institutions) —
   * translating all of them with the same care as Turkey's own entry is a distinct, much
   * larger body of work than the rest of this slice, not something to rush through at
   * uniform low attention per sentence. Turkey is translated first because it is this
   * product's own named priority market (AGENTS.md §0) and the sentences a real Turkish
   * user is most likely to actually read and be able to verify.
   *
   * `resolveAdmissionSystem` falls back to the English `mechanism` when this is absent, even
   * under `locale: "tr"` — a correct English sentence is a better outcome than a missing one,
   * and this is the same "say less rather than invent, never say nothing where a real answer
   * exists" standard the rest of this codebase's i18n work holds to.
   */
  mechanismTr?: string;
}

interface FieldOverride {
  field: ProgramSubjectTaxonomy;
  system: PathwaySystem;
}

interface InstitutionOverride {
  /** All name forms Oryn might hold for this institution. Matched on
   * `normalizeEntitySearchText` equality — deliberately exact-after-normalization, not fuzzy:
   * a near-miss here would silently apply one university's admissions mechanism to another. */
  names: string[];
  /** When set, this override applies only to this field at this institution (the
   * RULE-ADMISSIONS-019 "NUS Engineering vs. Architecture" axis). When absent it applies to
   * every field there. */
  field?: ProgramSubjectTaxonomy;
  system: PathwaySystem;
}

interface AdmissionSystemEntry {
  /** Every name form the `universities.country` column is known to carry for this country
   * (live data holds "US" and "United States", "Türkiye" and "Turkey", "Hong Kong" and
   * "Hong Kong SAR"). Listing them as data reuses `isSameCountry`'s single equivalence rule
   * instead of forking a second country normalizer — the audit specifically praised there
   * being only one. */
  countryNames: string[];
  /** Countries whose applicants enter through this target's *domestic* pathway rather than
   * its international one. Only Ireland needs this today (CAO covers EU/EFTA/UK fee status,
   * not just Irish residents). */
  domesticEquivalentCountries?: string[];
  domestic: PathwaySystem;
  international: PathwaySystem;
  fieldOverrides?: FieldOverride[];
  institutionOverrides?: InstitutionOverride[];
  sources: string[];
}

const DOC = (name: string) => `docs/research/admissions-systems/${name}`;
const SPEC_18 = "docs/research/counseling-intelligence/18-geography-conditional-scoring-design-spec.md";

/** EU/EFTA plus the UK — the population Ireland's CAO route covers. Fee status is actually a
 * residence-history test (broadly three of the last five years in the EEA), which Oryn has no
 * way to evaluate; membership is the closest factual proxy and is recorded as such rather
 * than presented as a determination. Used by exactly one entry. */
const IRELAND_CAO_FEE_STATUS_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland",
  "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Norway", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
  "Switzerland", "United Kingdom", "UK",
];

/**
 * The 15 countries `docs/research/admissions-systems/` covers. A country absent from this
 * list resolves to `shape: "unknown"`, which changes nothing about the outlook Oryn already
 * produced — the alternative (assuming an unresearched country works like one of the three
 * shapes) is exactly the guess this whole module exists to stop.
 */
const REGISTRY: AdmissionSystemEntry[] = [
  {
    countryNames: ["United States", "United States of America", "USA", "US"],
    domestic: {
      shape: "holistic_review",
      mechanism:
        "US undergraduate admission is holistic: grades and course rigor carry the most weight, then testing, then essays, recommendations and your activities list — all of which are genuinely read.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "US undergraduate admission is holistic for international applicants too: grades and course rigor first, then testing, then essays, recommendations and your activities list — all of which are genuinely read.",
    },
    sources: [DOC("united-states.md"), `${SPEC_18} §3.1`],
  },
  {
    countryNames: ["United Kingdom", "UK", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland"],
    domestic: {
      shape: "holistic_review",
      mechanism:
        "UCAS applications carry one personal statement and one school reference, and both are read — but far more narrowly than in the US. Subject-relevant (\"super-curricular\") work counts; general breadth and leadership titles count for much less.",
      // "personal statement" kept bilingual, same convention as Turkey's OBP — it's UCAS's
      // own named artifact, and "kişisel beyan" alone (with no anchor to the English term a
      // Turkish student will see inside the actual UCAS form) would risk reading as a
      // paraphrase rather than the real thing. "super-curricular" stays English + quoted,
      // matching the source's own treatment of it as UCAS jargon rather than ordinary prose.
      mechanismTr:
        "UCAS başvuruları bir kişisel beyan (personal statement) ve bir okul referansı içerir; ikisi de okunur — ancak ABD'dekinden çok daha dar kapsamda. Derse özgü (\"super-curricular\") çalışmalar önemlidir; genel çok yönlülük ve liderlik unvanları çok daha az ağırlık taşır.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "UCAS applications carry one personal statement and one school reference, and both are read — but far more narrowly than in the US. Subject-relevant (\"super-curricular\") work counts; general breadth and leadership titles count for much less.",
      mechanismTr:
        "UCAS başvuruları bir kişisel beyan (personal statement) ve bir okul referansı içerir; ikisi de okunur — ancak ABD'dekinden çok daha dar kapsamda. Derse özgü (\"super-curricular\") çalışmalar önemlidir; genel çok yönlülük ve liderlik unvanları çok daha az ağırlık taşır.",
    },
    sources: [DOC("united-kingdom.md"), `${SPEC_18} §3.2`],
  },
  {
    countryNames: ["Turkey", "Türkiye", "Turkiye"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "ÖSYM's YKS placement algorithm is the admission decision itself: exam scores plus your school grade average produce one number, and places are filled in strict rank order against each programme's quota. There is no application file at any point — no essay, no interview, no recommendation letter, no activity record — so non-academic evidence has no channel into the result at all.",
      // "school grade average" is Turkey's own official OBP (Okul Başarı Puanı) — named
      // explicitly rather than left generic, since a real YKS candidate reading this would
      // recognize the term immediately and a vaguer phrase would read as if Oryn didn't
      // actually know the mechanism it's describing.
      mechanismTr:
        "ÖSYM'nin YKS yerleştirme algoritması kabul kararının kendisidir: sınav puanların ile okul başarı puanın (OBP) tek bir sayı üretir ve yerleşmeler her programın kontenjanına göre kesin sıralama sırasıyla yapılır. Hiçbir aşamada bir başvuru dosyası yoktur — ne kompozisyon, ne mülakat, ne referans mektubu, ne de aktivite kaydı — bu yüzden akademik olmayan hiçbir kanıt sonuca hiçbir şekilde etki etmez.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Students who completed secondary school outside Türkiye enter through the separate foreign-national pathway, where each university sets its own accepted credentials (TR-YÖS, SAT, A-Level, IB, Abitur, or the diploma score alone) and fills its own quota in score order. A small number of institutions add one further criterion of their own; essays and recommendation letters are not a general part of it.",
      mechanismTr:
        "Ortaöğretimini Türkiye dışında tamamlayan öğrenciler, her üniversitenin kendi kabul ettiği belgeleri (TR-YÖS, SAT, A-Level, IB, Abitur veya yalnızca diploma notu) belirlediği ve kendi kontenjanını puan sırasına göre doldurduğu ayrı yabancı uyruklu öğrenci yolundan girer. Az sayıda kurum kendi ek bir kriterini daha uygular; kompozisyon ve referans mektupları bunun genel bir parçası değildir.",
    },
    sources: [DOC("turkey.md"), `${SPEC_18} §3.3`, "docs/research/turkish-exams/06-counseling-implications.md"],
  },
  {
    countryNames: ["Germany", "Deutschland"],
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "German admission is credential-gated: the question is whether your qualification is recognized and meets the stated threshold. Extracurricular activities are explicitly not a primary factor for the great majority of programmes, and personal statements and recommendation letters are not standard parts of the application.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "German admission is credential-gated: the question is whether your qualification is recognized (Anabin/uni-assist) and meets the stated threshold. Extracurricular activities are explicitly not a primary factor for the great majority of programmes, and personal statements and recommendation letters are not standard parts of the application.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Medicine is one of four nationally-coordinated NC subjects: places are allocated through hochschulstart.de in Abitur-grade rank order against a fixed number of seats. One narrow exception exists inside the AdH quota at some universities — it weights health-related professional or vocational experience (nursing training, paramedic work, relevant clinical internships), not general leadership, clubs or sport.",
        },
      },
    ],
    sources: [DOC("germany.md"), `${SPEC_18} §3.4`],
  },
  {
    countryNames: ["Netherlands", "The Netherlands", "Holland"],
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "For open (non-numerus-fixus) Dutch programmes, meeting the qualification and subject requirements is effectively the decision — eligible and admitted are the same thing. Recommendation letters are not a standard requirement and there is no activities review.",
      // "numerus fixus" is the real term used in Dutch admissions itself (Latin-derived,
      // unchanged in Dutch, English AND this Turkish sentence) — not translated, the same
      // way ÖSYM/YKS stayed untranslated for Turkey.
      mechanismTr:
        "Açık (numerus fixus olmayan) Hollanda programlarında, nitelik ve ders şartlarını karşılamak fiilen kabul kararının kendisidir — uygun olmak ile kabul edilmek aynı şeydir. Referans mektupları standart bir gereklilik değildir ve aktivite incelemesi yapılmaz.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "For open (non-numerus-fixus) Dutch programmes, meeting the qualification and subject requirements is effectively the decision — eligible and admitted are the same thing. Recommendation letters are not a standard requirement and there is no activities review.",
      mechanismTr:
        "Açık (numerus fixus olmayan) Hollanda programlarında, nitelik ve ders şartlarını karşılamak fiilen kabul kararının kendisidir — uygun olmak ile kabul edilmek aynı şeydir. Referans mektupları standart bir gereklilik değildir ve aktivite incelemesi yapılmaz.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "holistic_review",
          mechanism:
            "Dutch Medicine is numerus fixus — a capped programme whose selection procedure must legally use at least two qualitative criteria, commonly including a motivation letter and CV. That is a programme-specific selection procedure rather than US-style holistic review, and the criteria are set per university, so check the specific programme's own published method.",
          // "motivation letter" -> "motivasyon mektubu" is the standard Turkish rendering
          // used by Turkish counselors advising on Dutch admissions, not an invented phrase.
          mechanismTr:
            "Hollanda'da Tıp numerus fixus'tur — seçim sürecinin yasal olarak en az iki niteliksel kriter kullanması gerekir; bunlar genellikle bir motivasyon mektubu (motivation letter) ve özgeçmiş (CV) içerir. Bu, ABD tarzı bütüncül (holistic) değerlendirmeden çok, programa özgü bir seçim sürecidir ve kriterler üniversiteye göre belirlenir — bu yüzden ilgili programın kendi yayımladığı yöntemi kontrol et.",
        },
      },
    ],
    sources: [DOC("netherlands.md")],
  },
  {
    countryNames: ["Italy", "Italia"],
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "Ordinary Italian admission runs on qualification and test thresholds. Essays, recommendation letters and activity records are not standard parts of it.",
      mechanismTr:
        "Olağan İtalyan kabulü, nitelik ve sınav eşiklerine dayanır. Kompozisyonlar, referans mektupları ve aktivite kayıtları bunun standart bir parçası değildir.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "Ordinary Italian admission runs on qualification and test thresholds, plus proof that the origin qualification is complete. Essays, recommendation letters and activity records are not standard parts of it.",
      mechanismTr:
        "Olağan İtalyan kabulü, nitelik ve sınav eşiklerine dayanır; buna ek olarak kaynak ülke diplomasının tamamlanmış olduğunun kanıtlanması gerekir. Kompozisyonlar, referans mektupları ve aktivite kayıtları bunun standart bir parçası değildir.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Italian Medicine is numero chiuso: a nationally-run ranked exam decides places in score order — IMAT for English-taught courses, and the semestre filtro exams for Italian-taught courses since 2025/26.",
          // "numero chiuso", "IMAT" and "semestre filtro" are the actual official Italian/
          // international terms (the last two are proper names of specific exams) — kept
          // exactly as Italian universities themselves name them, not translated.
          mechanismTr:
            "İtalya'da Tıp numero chiuso'dur: ulusal düzeyde yürütülen sıralamalı bir sınav, yerleri puan sırasına göre belirler — İngilizce eğitim veren programlar için IMAT, 2025/26'dan itibaren İtalyanca eğitim veren programlar için ise semestre filtro sınavları.",
        },
      },
    ],
    sources: [DOC("italy.md")],
  },
  {
    countryNames: ["France"],
    domestic: {
      shape: "holistic_review",
      mechanism:
        "Parcoursup formations read your livret scolaire (actual in-progress grades), the Fiche Avenir teacher appraisal, and — where the specific formation asks for one — a 1,500-character projet de formation motivé. Real evidence review, but much narrower than the US: there is no activities list.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "Students holding a non-French, non-European diploma and living in one of the ~72 Études en France countries (Türkiye among them) apply through the DAP dossier instead of Parcoursup: capped at 3 university choices, gated by the TCF French-language test, and assessed by each university's own commission. The official DAP form carries no essay or recommendation field at all.",
    },
    sources: [DOC("france.md"), `${SPEC_18} §3.2`],
  },
  {
    countryNames: ["Ireland", "Republic of Ireland"],
    domesticEquivalentCountries: IRELAND_CAO_FEE_STATUS_COUNTRIES,
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "CAO totals your best six Leaving Certificate subject grades (plus the Higher Level Mathematics bonus) and allocates places in strict points order. No essays, no references, no predicted grades — and extracurriculars have essentially no role.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "Applicants outside EU/EFTA/UK fee status generally bypass CAO entirely and apply direct to each institution, into a genuinely different and evidence-richer process — Trinity, for example, asks for a 500-word statement of purpose and two academic references, and will read predicted scores.",
    },
    sources: [DOC("ireland.md")],
  },
  {
    countryNames: ["Hong Kong", "Hong Kong SAR", "Hong Kong SAR China", "Hongkong"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "JUPAS feeds final HKDSE results into a blinded merit-order matching algorithm that produces exactly one offer. It is a ranking mechanism, not a review of who you are.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "JUPAS has been categorically closed to non-local applicants since the 2020 cycle, so every international applicant applies direct to each university through its own non-JUPAS scheme — where a personal statement and an interview are common.",
    },
    sources: [DOC("hong-kong.md")],
  },
  {
    countryNames: ["Singapore"],
    domestic: {
      shape: "holistic_review",
      mechanism:
        "NUS asks every applicant to every programme for a structured achievements list and short-response questions that feed a holistic faculty review; SMU is described the same way. It is a structured form rather than a US-style free-form essay, and the same mechanism is not confirmed at NTU.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "NUS asks every applicant to every programme for a structured achievements list and short-response questions that feed a holistic faculty review; SMU is described the same way. Separately, a government ceiling caps international undergraduates at roughly 10% of enrolment across all six universities, independent of any programme's own capacity.",
    },
    sources: [DOC("singapore.md")],
  },
  {
    countryNames: ["Switzerland", "Schweiz", "Suisse"],
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "Swiss admission is credential-gated: a recognized qualification establishes eligibility. Essays and recommendation letters are not a standard requirement at any institution reviewed.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "Swiss admission is credential-gated, and for many foreign diplomas eligibility additionally requires a university-set entrance examination (ETH Zurich and EPFL each run their own). Essays and recommendation letters are not a standard requirement at any institution reviewed.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Medicine is the one Swiss exception: the EMS aptitude test gates entry at Basel, Bern, Fribourg, Zurich, USI and ETH Zurich whenever demand exceeds places by more than 20%, while Geneva, Lausanne and Neuchâtel instead select at the end of the first year.",
        },
      },
    ],
    sources: [DOC("switzerland.md")],
  },
  {
    countryNames: ["Spain", "España", "Espana"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Spanish admission runs on the nota de admisión — EBAU results plus weighted subject bonuses — with places allocated in ranked order through each region's Distrito Único until they run out. Extracurriculars are not in the formula and there is no essay or reference step.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "International applicants reach the same ranked pool through homologación followed by a UNEDasiss accreditation that generates the admission grade. Extracurriculars are not in the formula and there is no essay or reference step.",
    },
    sources: [DOC("spain.md")],
  },
  {
    countryNames: ["Australia"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Australian admission runs on ATAR or an equivalent selection rank against a cutoff that floats every year with demand. Essays and references are not part of standard entry, and activities matter only inside specific named schemes such as UNSW's Elite Athletes, Performers and Leaders scheme.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Most overseas-qualification holders apply direct to each university rather than through a state admissions centre, but the decision is still a qualification-and-rank one. Essays and references are not part of standard entry, and activities matter only inside specific named schemes.",
    },
    sources: [DOC("australia.md")],
  },
  {
    countryNames: ["New Zealand", "Aotearoa"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Each New Zealand university decides independently on a credit-based Rank Score sitting above the national University Entrance floor, and most named Bachelor's programmes are genuinely competitive beyond bare UE. Rank Score is purely academic — despite the name it has nothing to do with US-style class rank, and no activities list feeds it.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Each New Zealand university decides independently, end to end — there is no shared platform at any layer — on an academic Rank Score above the national University Entrance floor. No activities list feeds it.",
    },
    sources: [DOC("new-zealand.md")],
  },
  {
    countryNames: ["Canada"],
    // Deliberately "unknown" at country level rather than a guess. RULE-ADMISSIONS-008 names
    // Canada as the starkest case of within-country variation on exactly this question, so a
    // single country-level answer here would be wrong for roughly half of Canadian targets.
    // Named institutions below are resolved; everything else honestly is not.
    domestic: {
      shape: "unknown",
      mechanism:
        "Canadian admission is transcript-driven, but whether anything beyond grades is read varies by institution rather than nationally — the University of Toronto's general Arts & Science admission does not consider extracurriculars at all, while UBC's mandatory Personal Profile weighs them heavily. Check the specific university's own admissions page.",
    },
    international: {
      shape: "unknown",
      mechanism:
        "Canadian admission is transcript-driven, but whether anything beyond grades is read varies by institution rather than nationally — the University of Toronto's general Arts & Science admission does not consider extracurriculars at all, while UBC's mandatory Personal Profile weighs them heavily. Check the specific university's own admissions page.",
    },
    institutionOverrides: [
      {
        names: ["University of British Columbia", "UBC", "The University of British Columbia"],
        system: {
          shape: "holistic_review",
          mechanism:
            "UBC requires a Personal Profile from every applicant and weighs it heavily alongside grades — one of the few Canadian institutions where non-academic evidence genuinely enters the decision.",
        },
      },
      {
        names: ["University of Toronto", "U of T", "UofT", "Toronto"],
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "The University of Toronto admits on grade average against a competitive cutoff; its general Arts & Science admission does not consider extracurriculars at all. Some individual faculties run their own supplementary process, so check the specific programme.",
        },
      },
      {
        names: ["University of Waterloo", "Waterloo"],
        system: {
          shape: "holistic_review",
          mechanism:
            "Waterloo layers an Admission Information Form on top of grades for several programmes, which does read what you have actually done — check whether the specific programme requires one.",
        },
      },
    ],
    sources: [DOC("canada.md")],
  },
  {
    countryNames: ["Sweden", "Sverige"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Swedish admission runs on meritvärde — a merit rating computed through one of four parallel national selection groups (grades alone, grades plus supplementary courses, folk-high-school assessment, or the Högskoleprovet aptitude test, which alone fills at least a third of all places) — with antagning.se allocating places in strict rank order until each programme's fixed count runs out. No essay, no reference, and extracurriculars are not in the formula. A real but locally-set 'Alternativt Urval' exception exists at some programmes — check the specific institution's own page.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Applicants requiring a visa apply through universityadmissions.se into the same meritvärde rank-order mechanism — some universities reserve a separate fee-paying selection pool, which changes who you compete against, not how the merit rating itself is computed. No essay, no reference, and extracurriculars are not in the formula.",
    },
    sources: [DOC("sweden.md")],
  },
  {
    countryNames: ["Norway", "Norge"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Norwegian-taught programmes admit through Samordna Opptak, a national points-based rank system: up to 60 points from your average grade plus bonus points for specific subjects, age and completed higher education, competed for across two parallel grade-based quotas. No essay, no reference, no interview.",
    },
    international: {
      shape: "unknown",
      mechanism:
        "Most international applicants target English-taught programmes, which sit outside Samordna Opptak entirely — each institution runs its own separate application, and this pass could not establish one common selection mechanism across them. Check the specific institution's own admissions page.",
    },
    institutionOverrides: [
      {
        names: ["Norwegian University of Science and Technology", "NTNU"],
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "NTNU's own admissions page states that its English-taught Bachelor in Engineering programme is applied for through Samordna Opptak — the same points-based rank mechanism as Norwegian-taught programmes, despite the language of instruction.",
        },
      },
    ],
    sources: [DOC("norway.md")],
  },
  {
    countryNames: ["Portugal"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "The Concurso Nacional de Acesso ranks candidates by nota de candidatura (secondary-school results combined with national exam scores) and places them in strict order until each institution/course pair's fixed places run out. No essay, interview, or reference letter anywhere in the mechanism.",
    },
    international: {
      shape: "unknown",
      mechanism:
        "The separate Concurso Especial para Estudantes Internacionais is nationally defined (who counts as an International Student) but not nationally decided — DGES's own page states admission requirements and procedures vary by institution, and the University of Porto's own page narrows this further to varying by faculty within one university. This pass could not confirm one common selection mechanism. Check the specific faculty's own published criteria.",
    },
    sources: [DOC("portugal.md")],
  },
  {
    countryNames: ["Greece", "Ελλάδα", "Hellas"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "The Panhellenic exams score four subjects against each faculty's own published weighting factors into a 0–20,000 point total. Each faculty separately sets a minimum admission grade that only qualifies you to list it as a preference — final placement is strict descending-score order on the computerized preference form. No essay, interview, or reference letter.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Foreign-national applicants skip the Panhellenic exams entirely — the Technical University of Crete's own admissions page states the criterion is simply the applicant's existing secondary-school graduation grade, placed through the same computerized preference form into a reserved quota. No essay, interview, or reference letter; Greek B2 language proficiency is required to enrol once admitted, not to be admitted.",
    },
    sources: [DOC("greece.md")],
  },
  {
    countryNames: ["Poland", "Polska"],
    // No central government admissions body exists (unlike Sweden/Norway/Portugal/Greece
    // already in this registry) — this shape is recorded because two independently-checked
    // universities (Silesia, Warsaw) converge on the same mechanism type, the same basis this
    // registry already uses for New Zealand's decentralized-but-convergent entry.
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "Each university runs its own recruitment, but converts matura results into qualification points (1% basic level = 1 point, 1% extended = 1.5, 1% bilingual = 2, weighted by subject) and admits in descending rank order off a ranking list until each programme's place limit fills. No essay, interview, or reference letter.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Foreign qualifications are converted directly onto the same ranking lists — the best grade on a foreign document equals 100% of the Polish matura, the lowest positive grade equals 30%, then weighted the same way as the domestic scale. Applicants from outside the EU, EFTA and OECD may additionally face a university-set entrance exam; Türkiye's OECD membership suggests this narrower gate would not apply to a Turkish applicant, but that reading was not independently confirmed this pass.",
    },
    sources: [DOC("poland.md")],
  },
  {
    countryNames: ["Denmark", "Danmark"],
    // The one country in this expansion line that does NOT reduce to one shape per pathway.
    // Kvote 1 (grades-only, rank-competitive) and Kvote 2 (genuinely holistic: essay,
    // experience, often an interview) exist in parallel and the APPLICANT chooses between
    // them where eligible — see docs/research/admissions-systems/denmark.md §D. Domestic is
    // recorded "unknown" deliberately: forcing either shape would misdescribe whichever track
    // the specific student is not using. International is a confident holistic_review, because
    // a non-EU/non-IB/non-EB applicant (the realistic MEB case) has no Kvote 1 option at all —
    // see denmark.md §E for the one honest exception (a Turkish IB-Diploma holder).
    domestic: {
      shape: "unknown",
      mechanism:
        "Denmark runs two structurally opposite tracks in parallel through Optagelse.dk, and eligible applicants choose between them: Kvote 1 admits purely on grade point average (EU/IB/EB qualifications only) in strict rank order; Kvote 2 is genuinely holistic — a motivational essay, relevant experience, and often an interview, open to everyone. Oryn cannot tell which track a specific student is pursuing, so neither shape can be claimed as the general answer.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "Applicants whose qualification does not convert onto the Danish grading scale (a Turkish Lise Diploması, for most students) are automatically assessed in Kvote 2 only — no Kvote 1 alternative exists for them. Kvote 2 is genuinely holistic: a motivational essay described as the most important part of the application, relevant experience, and often an interview. A Turkish student who instead holds a full IB Diploma would also qualify for the grades-only Kvote 1, reintroducing the same choice domestic applicants face.",
    },
    sources: [DOC("denmark.md")],
  },
  {
    countryNames: ["Hungary", "Magyarország"],
    // Splits by funding/residence eligibility, not a wording-only difference — see
    // docs/research/admissions-systems/hungary.md §A. domestic maps onto the state-financed
    // Felvi.hu route (citizens and Hungary-registered residents only); international maps onto
    // the self-funded, direct-to-institution route everyone else actually uses.
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "The Felvi.hu route scores up to 400 points from secondary grades and school-leaving exam results plus up to 100 institution-set points, out of 500. The minimum score per programme is not fixed — an algorithm recomputes it each cycle from the number of applicants, their scores, and free places — and candidates are admitted to their highest-ranked choice their score clears. No essay, interview, or reference letter.",
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "Applicants without Hungarian citizenship or registered residence compete only for self-funded places, evaluated directly by each institution rather than through Felvi.hu. Hungary's own Tempus Public Foundation education-promotion site lists a CV, a letter of motivation, and two academic reference letters as generally required, alongside GPA — some courses add an entrance exam on top. Exact requirements vary by institution, but the holistic pattern itself is consistently confirmed.",
    },
    sources: [DOC("hungary.md")],
  },
  {
    countryNames: ["Austria", "Österreich", "Oesterreich"],
    // Different in kind from every other country in this line: the DEFAULT posture is
    // threshold, not competition — open access once a recognized qualification is held, the
    // same category this registry already gives the Netherlands/Italy/Switzerland's general
    // routes. Restriction is the named exception (Medicine/Dentistry via MedAT), recorded as a
    // fieldOverride the same way Switzerland's EMS and Germany's NC-Medicine already are — see
    // docs/research/admissions-systems/austria.md.
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "Austria runs on freier Hochschulzugang (open access): meeting the entry qualification (Matura, IB Diploma, European Baccalaureate, or an automatically-recognized equivalent) is generally sufficient for admission on its own, with no ranking against other applicants. No essay, interview, or reference letter.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "The same open-access mechanism applies, but non-EU/EEA applicants face an added eligibility step confirmed by Austria's own government portal: proof they would have a place to study the same subject in their home country. Once that and qualification-equivalence are established, admission works the same way — no ranking, no essay, no interview.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Medicine and Dentistry are the named exception to open access: MedAT, a single nationwide entrance exam, decides admission purely by score against a fixed national quota (1,950 places for 2026/27) — roughly 17,000 applicants compete for them. At least 95% of places are reserved for EU citizens/equivalent-access holders and at least 75% for Austrian-or-equivalent-certificate holders, a quota over who competes in which pool, not a change to the score-only ranking itself.",
        },
      },
    ],
    sources: [DOC("austria.md")],
  },
  {
    countryNames: ["Czechia", "Czech Republic", "Česko", "Česká republika"],
    // No central body AND genuine divergence, not just decentralization -- Charles University's
    // own admissions page confirms mechanism varies by PROGRAMME within one institution, a
    // finer grain than even Canada's confirmed institution-level divergence in this registry.
    // Recorded unknown deliberately for both pathways, same treatment as Canada's entry, not a
    // gap -- see docs/research/admissions-systems/czechia.md §A-B.
    domestic: {
      shape: "unknown",
      mechanism:
        "Each Czech university runs its own admission process, and Charles University's own page confirms this varies even by programme within one institution: some programmes assess on submitted documents alone, others require a written exam plus an interview that explicitly weighs motivation. No single mechanism describes Czechia generally — check the specific target programme.",
    },
    international: {
      shape: "unknown",
      mechanism:
        "Each Czech university runs its own admission process, and Charles University's own page confirms this varies even by programme within one institution: some programmes assess on submitted documents alone, others require a written exam plus an interview that explicitly weighs motivation. No single mechanism describes Czechia generally — check the specific target programme.",
    },
    sources: [DOC("czechia.md")],
  },
  {
    countryNames: ["Belgium", "België", "Belgique", "Belgien"],
    // No country-level admissions body at all -- Flanders and the French Community run
    // genuinely separate legislation, not just separate institutions. Recorded as
    // academic_threshold because BOTH were independently checked and confirmed to converge on
    // the same general shape (credential/equivalence-based, no ranking, no essay) -- unlike
    // Czechia, this is a confirmed convergence, not an assumption carried across communities.
    // See docs/research/admissions-systems/belgium.md §A-D for why the Community-level nuance
    // (differing restricted-fields lists, only the French Community's centralized quota
    // confirmed) isn't represented beyond the one shared "medicine" fieldOverride.
    domestic: {
      shape: "academic_threshold",
      mechanism:
        "Belgium has no country-level admissions body — Flanders and the French Community run separate legislation — but both were independently confirmed to admit on diploma/equivalence alone for most programmes, with no ranking against other applicants and no essay or interview.",
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "The same threshold mechanism applies once a foreign diploma's equivalence to the relevant Community's secondary certificate is recognized (or, in the French Community, an entrance exam is passed in its place) — no ranking, no essay, no interview either way.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Medicine is a confirmed restricted exception in both Communities, though the mechanism specifics differ: the French Community runs a single centralized, genuinely competitive exam (ARES, same day for every university) with non-resident admission capped at 15% of places — the clearer-sourced case. Flanders also requires a mandatory entrance exam for medicine, but this pass could not independently confirm whether it is rank-competitive or pass/fail. Check the specific target university's own Community.",
        },
      },
    ],
    sources: [DOC("belgium.md")],
  },
];

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface AdmissionSystemQuery {
  /** `universities.country`. */
  targetCountry: string | null;
  /** `profiles.country` — residence/school location, never citizenship. See
   * `ApplicantPathway` for why that is the correct field and not an approximation of a
   * better one Oryn is missing. */
  studentCountry: string | null;
  /** `universities.name`, for the institution-override layer. */
  targetUniversityName?: string | null;
  /** The student's intended field at this target, and only when they have actually stated
   * it — never inferred from a general interest by this function. Callers decide what
   * counts as "stated"; see `lib/universities/counseling-adapter.ts` for the rule this
   * codebase uses (an explicitly targeted programme, not a matched interest label). */
  targetField?: ProgramSubjectTaxonomy | null;
}

const UNRESOLVED: AdmissionSystemResolution = {
  shape: "unknown",
  pathway: "unknown",
  pathwayBasis: "undetermined",
  basis: "no_entry",
  mechanism: null,
  sources: [],
};

function matchesCountry(names: string[], country: string): boolean {
  return names.some((name) => isSameCountry(name, country));
}

function matchesInstitution(override: InstitutionOverride, universityName: string): boolean {
  const target = normalizeEntitySearchText(universityName);
  return override.names.some((name) => normalizeEntitySearchText(name) === target);
}

function resolvePathway(entry: AdmissionSystemEntry, studentCountry: string | null): { pathway: ApplicantPathway; basis: PathwayBasis } {
  const isSplit = entry.domestic.shape !== entry.international.shape || entry.domestic.mechanism !== entry.international.mechanism;
  if (!isSplit) return { pathway: "domestic", basis: "not_pathway_split" };
  if (studentCountry === null || studentCountry.trim() === "") return { pathway: "unknown", basis: "undetermined" };

  const domesticSide = [...entry.countryNames, ...(entry.domesticEquivalentCountries ?? [])];
  return {
    pathway: matchesCountry(domesticSide, studentCountry) ? "domestic" : "international",
    basis: "residence",
  };
}

/**
 * Resolves Gate 1 for one student against one target.
 *
 * Total: every input, including an entirely empty one, produces a resolution. An
 * unrecognized country, an unrecognized institution, and an unresolvable pathway all yield
 * `shape: "unknown"`, which callers must treat as "keep doing what you were doing" rather
 * than as any particular mechanism — see `computeAdmissionOutlook`, which changes nothing at
 * all for an unknown shape.
 */
/** Falls back to English even under locale "tr" when no `mechanismTr` exists yet — a correct
 *  English sentence beats a missing one. See PathwaySystem.mechanismTr's own doc. */
function mechanismFor(system: PathwaySystem, locale: Locale): string {
  return locale === "tr" && system.mechanismTr ? system.mechanismTr : system.mechanism;
}

/**
 * `locale` defaults to English; see lib/counselor/evidence.ts's buildRecommendation for the
 * reasoning shared across this codebase's i18n work. Only ~2 of the ~30 mechanism sentences
 * this function can return are actually translated today (Turkey's domestic/international
 * entries) — see PathwaySystem.mechanismTr.
 */
export function resolveAdmissionSystem(query: AdmissionSystemQuery, locale: Locale = DEFAULT_LOCALE): AdmissionSystemResolution {
  const country = query.targetCountry?.trim();
  if (!country) return UNRESOLVED;

  const entry = REGISTRY.find((candidate) => matchesCountry(candidate.countryNames, country));
  if (!entry) return UNRESOLVED;

  const { pathway, basis: pathwayBasis } = resolvePathway(entry, query.studentCountry);

  // Institution overrides sit above field overrides, which sit above the country/pathway
  // default (implementation-gap Gap 3): NUS Engineering vs. Architecture and TU Dublin vs.
  // UCD are both cases where the institution, not the field, is the operative variable.
  const universityName = query.targetUniversityName?.trim();
  if (universityName && entry.institutionOverrides) {
    const applicable = entry.institutionOverrides.filter((override) => matchesInstitution(override, universityName));
    const fieldScoped = query.targetField ? applicable.find((override) => override.field === query.targetField) : undefined;
    const institutionWide = applicable.find((override) => override.field === undefined);
    const chosen = fieldScoped ?? institutionWide;
    if (chosen) {
      return {
        shape: chosen.system.shape,
        pathway,
        pathwayBasis,
        basis: fieldScoped ? "institution_field" : "institution",
        mechanism: mechanismFor(chosen.system, locale),
        sources: entry.sources,
      };
    }
  }

  if (query.targetField && entry.fieldOverrides) {
    const override = entry.fieldOverrides.find((candidate) => candidate.field === query.targetField);
    if (override) {
      return {
        shape: override.system.shape,
        pathway,
        pathwayBasis,
        basis: "country_field",
        mechanism: mechanismFor(override.system, locale),
        sources: entry.sources,
      };
    }
  }

  if (pathway === "unknown") {
    // The country genuinely runs two architectures and Oryn cannot tell which one applies.
    // Both are described rather than one being picked — picking would be a coin flip
    // presented as a finding, and for Ireland and Hong Kong the two sides land on opposite
    // Gate-1 answers.
    const connector = locale === "tr" ? "Ortaöğretimini başka bir yerde tamamlayan başvuru sahipleri için ayrı bir yol geçerlidir:" : "A separate pathway applies to applicants who completed secondary school elsewhere:";
    return {
      shape: entry.domestic.shape === entry.international.shape ? entry.domestic.shape : "unknown",
      pathway,
      pathwayBasis,
      basis: "pathway_undetermined",
      mechanism: `${mechanismFor(entry.domestic, locale)} ${connector} ${mechanismFor(entry.international, locale)}`,
      sources: entry.sources,
    };
  }

  const system = pathway === "domestic" ? entry.domestic : entry.international;
  return {
    shape: system.shape,
    pathway,
    pathwayBasis,
    basis: pathwayBasis === "not_pathway_split" ? "country" : "country_pathway",
    mechanism: mechanismFor(system, locale),
    sources: entry.sources,
  };
}
