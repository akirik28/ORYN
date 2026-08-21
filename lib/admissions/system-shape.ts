import { isSameCountry } from "@/lib/opportunities/matching";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";
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
    },
    international: {
      shape: "holistic_review",
      mechanism:
        "UCAS applications carry one personal statement and one school reference, and both are read — but far more narrowly than in the US. Subject-relevant (\"super-curricular\") work counts; general breadth and leadership titles count for much less.",
    },
    sources: [DOC("united-kingdom.md"), `${SPEC_18} §3.2`],
  },
  {
    countryNames: ["Turkey", "Türkiye", "Turkiye"],
    domestic: {
      shape: "academic_rank_competitive",
      mechanism:
        "ÖSYM's YKS placement algorithm is the admission decision itself: exam scores plus your school grade average produce one number, and places are filled in strict rank order against each programme's quota. There is no application file at any point — no essay, no interview, no recommendation letter, no activity record — so non-academic evidence has no channel into the result at all.",
    },
    international: {
      shape: "academic_rank_competitive",
      mechanism:
        "Students who completed secondary school outside Türkiye enter through the separate foreign-national pathway, where each university sets its own accepted credentials (TR-YÖS, SAT, A-Level, IB, Abitur, or the diploma score alone) and fills its own quota in score order. A small number of institutions add one further criterion of their own; essays and recommendation letters are not a general part of it.",
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
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "For open (non-numerus-fixus) Dutch programmes, meeting the qualification and subject requirements is effectively the decision — eligible and admitted are the same thing. Recommendation letters are not a standard requirement and there is no activities review.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "holistic_review",
          mechanism:
            "Dutch Medicine is numerus fixus — a capped programme whose selection procedure must legally use at least two qualitative criteria, commonly including a motivation letter and CV. That is a programme-specific selection procedure rather than US-style holistic review, and the criteria are set per university, so check the specific programme's own published method.",
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
    },
    international: {
      shape: "academic_threshold",
      mechanism:
        "Ordinary Italian admission runs on qualification and test thresholds, plus proof that the origin qualification is complete. Essays, recommendation letters and activity records are not standard parts of it.",
    },
    fieldOverrides: [
      {
        field: "medicine",
        system: {
          shape: "academic_rank_competitive",
          mechanism:
            "Italian Medicine is numero chiuso: a nationally-run ranked exam decides places in score order — IMAT for English-taught courses, and the semestre filtro exams for Italian-taught courses since 2025/26.",
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
export function resolveAdmissionSystem(query: AdmissionSystemQuery): AdmissionSystemResolution {
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
        mechanism: chosen.system.mechanism,
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
        mechanism: override.system.mechanism,
        sources: entry.sources,
      };
    }
  }

  if (pathway === "unknown") {
    // The country genuinely runs two architectures and Oryn cannot tell which one applies.
    // Both are described rather than one being picked — picking would be a coin flip
    // presented as a finding, and for Ireland and Hong Kong the two sides land on opposite
    // Gate-1 answers.
    return {
      shape: entry.domestic.shape === entry.international.shape ? entry.domestic.shape : "unknown",
      pathway,
      pathwayBasis,
      basis: "pathway_undetermined",
      mechanism: `${entry.domestic.mechanism} A separate pathway applies to applicants who completed secondary school elsewhere: ${entry.international.mechanism}`,
      sources: entry.sources,
    };
  }

  const system = pathway === "domestic" ? entry.domestic : entry.international;
  return {
    shape: system.shape,
    pathway,
    pathwayBasis,
    basis: pathwayBasis === "not_pathway_split" ? "country" : "country_pathway",
    mechanism: system.mechanism,
    sources: entry.sources,
  };
}
