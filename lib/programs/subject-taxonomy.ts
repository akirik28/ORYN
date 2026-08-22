import { nameKey } from "@/lib/acquisition/normalize";

/** Controlled vocabulary mirroring the CHECK constraint on university_programs.subject_taxonomy
 * (migration 0044, widened by 0060). Keep these two in sync — an unlisted value is rejected
 * at insert time.
 *
 * The original 16 categories mirror Phase 3's onboarding-interest list, not a full academic
 * ontology — which is why a live measurement (2026-08-22, `qtcvcflzxbuagvvwahhu`) found 63.3%
 * of programmes (9,145/14,457) landing in `other`. Sampling that population directly (not
 * guessing) showed the dominant cause was a genuine vocabulary gap: over half of the `other`
 * rows are English-named programmes in ordinary, commonly-searched subjects — Biology,
 * History, Education, Arts, Chemistry, Philosophy — that the original 16 categories never
 * anticipated. A secondary population (~850 rows) is English-taxonomy-blind because the
 * programme *name* is Turkish or German regardless of what language_of_instruction says
 * (e.g. "Çevre Mühendisliği (İngilizce)" — Environmental Engineering, taught in English, but
 * named in Turkish). The 8 categories below close the highest-volume gaps found in that
 * measurement; `other` remains a real, correct answer for faculty-level, highly
 * interdisciplinary, or genuinely rare-subject rows — it is not a target to drive to zero. */
export const SUBJECT_TAXONOMY = [
  "economics",
  "business",
  "finance",
  "computer_science",
  "artificial_intelligence",
  "engineering",
  "medicine",
  "law",
  "psychology",
  "political_science",
  "international_relations",
  "mathematics",
  "physics",
  "architecture",
  "design",
  "entrepreneurship",
  "biology",
  "chemistry",
  "history",
  "environmental_science",
  "education",
  "arts_humanities",
  "social_sciences",
  "health_sciences",
  "other",
] as const;

export type SubjectTaxonomy = (typeof SUBJECT_TAXONOMY)[number];

/** Ordered: first keyword hit wins as the primary tag; further hits become secondary tags.
 * Deliberately a plain keyword match, not a model — every classification is inspectable
 * and reproducible, which matters more here than marginal accuracy on ambiguous titles.
 *
 * Keywords are matched against `nameKey(programName)` (see `classifySubjects()` below for
 * why), but the keyword strings themselves are written PRE-FOLDED to the same ASCII form
 * nameKey() would produce (ü→u, ş→s, ğ→g, ö→o, ç→c, ı/İ→i, ä→a, ...) — natural spelling is
 * given as a trailing comment where it isn't obvious. Keywords are NOT run through
 * nameKey() themselves: that function also `.trim()`s and drops a leading "the", which
 * would silently eat the leading space " law" relies on to avoid matching inside e.g.
 * "Flawless" — a real regression caught by the existing test for exactly that guard.
 * Pre-folding by hand, once, for a short static list is safer than re-deriving it at
 * runtime with a function built for a different job (whole-name comparison).
 *
 * Turkish stems are deliberately truncated before the point where Turkish's regular
 * consonant softening (k→ğ, t→d, p→b, ç→c before a vowel suffix) would break a naive
 * dictionary-root match — e.g. "mühendislik" (engineering) inflects to "mühendisliği" in
 * the overwhelmingly common possessive form ("... Mühendisliği" = "... Engineering"), so
 * the safe match stem is "muhendisli" (folded), not the bare root. Verified against the
 * live corpus via ILIKE before being encoded here, not guessed. This is not exhaustive
 * Turkish/German morphology — it covers the forms actually observed in the corpus at
 * measurement time. German compounds (e.g. "Politikwissenschaft") are matched as whole
 * compounds, never as the bare "wissenschaft" suffix alone — that suffix means
 * "-science/-studies" attached to dozens of unrelated subjects (Sportwissenschaft,
 * Musikwissenschaft, ...) and carries no subject signal by itself. */
const SUBJECT_KEYWORDS: [Exclude<SubjectTaxonomy, "other">, string[]][] = [
  ["computer_science", ["computer science", "computing", "informatics", "software engineering", "informatik", "bilgisayar"]],
  ["artificial_intelligence", ["artificial intelligence", "machine learning", "data science", "yapay zeka", "kunstliche intelligenz" /* künstliche */]],
  ["economics", ["economic", "iktisat", "ekonomi", "wirtschaftswissenschaft"]],
  ["finance", ["finance", "financial", "accounta", "muhasebe"]],
  ["business", ["business", "management", "isletme" /* işletme */, "betriebswirtschaft"]],
  ["entrepreneurship", ["entrepreneur", "girisimcilik" /* girişimcilik */]],
  ["engineering", ["engineering", "muhendisli" /* mühendisli(k/ği) */, "ingenieurwesen"]],
  ["medicine", ["medicine", "medical", "tip" /* tıp */, "medizin"]],
  ["law", [" law", "laws", "legal studies", "hukuk", "rechtswissenschaft", "jura"]],
  ["psychology", ["psycholog", "psikoloji"]],
  ["international_relations", ["international relations", "uluslararasi iliskiler" /* uluslararası ilişkiler */]],
  ["political_science", ["political science", "politics", "government", "siyaset bilimi", "politika", "politikwissenschaft"]],
  ["mathematics", ["mathemati", "matemati" /* covers matematik/matematiği too */]],
  ["physics", ["physics", "physik", "fizik"]],
  ["architecture", ["architecture", "mimarl" /* mimarlık/mimarlığı */, "architektur"]],
  ["design", ["design", "tasarim" /* tasarım */]],
  // New categories (2026-08-22 measurement) — kept after the original 16 so an ambiguous
  // title (e.g. "Environmental Engineering") still primary-matches the more specific
  // original category, with the new one landing as a secondary tag instead.
  ["biology", ["biolog", "biyoloji", "biowissenschaft", "genomic"]],
  ["chemistry", ["chemis", "chemie", "kimya"]],
  ["history", ["histor", "geschicht", "tarih"]],
  ["environmental_science", ["environmental science", "environmental studies", "umweltwissenschaft", "geowissenschaft"]],
  [
    "education",
    [
      "educat",
      "bildungswissenschaft",
      "padagogik" /* pädagogik */,
      "egitim" /* eğitim */,
      "ogretmenli" /* öğretmenli(k/ği), Turkish teacher-education suffix */,
      "lehramt" /* German teacher-training qualification, e.g. "Lehramt an Gymnasien" */,
      "master of education",
    ],
  ],
  [
    "arts_humanities",
    [
      "philosoph",
      "religio",
      "theolog",
      "literatur",
      "linguistic",
      "classics",
      "classical stud",
      "theatre",
      "theater",
      "drama",
      "music",
      "fine art",
      "visual art",
      "performing art",
      "studio art",
      "sprachwissenschaft",
      "musikwissenschaft",
      "theaterwissenschaft",
      "kulturwissenschaft",
      "kommunikationswissenschaft",
      "medienwissenschaft",
      "islamwissenschaft",
      "felsefe",
      "edebiyat",
    ],
  ],
  ["social_sciences", ["sociolog", "anthropolog", "geography", "soziolog", "sosyoloji"]],
  ["health_sciences", ["nursing", "pharmac", "public health", "pflegewissenschaft", "hemsirelik" /* hemşirelik */, "eczacilik" /* eczacılık */]],
];

export interface SubjectClassification {
  primary: SubjectTaxonomy;
  secondary: Exclude<SubjectTaxonomy, "other">[];
}

export function classifySubjects(programName: string): SubjectClassification {
  // nameKey(), not a bare toLowerCase(): the same NFD-decompose-and-strip-combining-marks
  // pass already relied on for institution-name matching (lib/acquisition/normalize.ts) —
  // handles ö/ü/ä/ç/ş/ğ generically and, critically, avoids the Turkish İ/I casing trap
  // (plain .toLowerCase() is locale-independent by spec, so "İstanbul" folds to "i̇stanbul"
  // rather than "istanbul" unless the dotted-I decomposition is stripped first; nameKey
  // already does this). Padded on both sides so leading-space-anchored keywords (" law")
  // still only match on a real word boundary, matching the original function's behavior.
  // The keyword list itself is pre-folded by hand (see SUBJECT_KEYWORDS's own comment) —
  // deliberately NOT re-normalized here, since nameKey() would trim away that same leading
  // space and reintroduce the exact false-positive it exists to prevent.
  const haystack = ` ${nameKey(programName)} `;
  const matches: Exclude<SubjectTaxonomy, "other">[] = [];
  for (const [tag, keywords] of SUBJECT_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) matches.push(tag);
  }
  if (matches.length === 0) return { primary: "other", secondary: [] };

  // A teacher-education signal ("X Öğretmenliği" = X Teacher Education; German "Lehramt" =
  // teaching qualification; "Master of Education") names a programme that TEACHES subject X,
  // not a degree IN X — the credential is a teaching qualification, even though X's own
  // keyword matches too. Measured: 35 Öğretmenliği + 82 Lehramt + 73 Master of Education
  // real `other` rows carry one of these, and without this re-rank they'd land on the
  // subject (mathematics, physics, computer_science, ...) instead of education, since those
  // are checked earlier in SUBJECT_KEYWORDS. Re-ranking rather than reordering the whole
  // keyword list, which would risk shifting other, unmeasured cases along with it.
  const isTeacherEducation = ["ogretmenli", "lehramt", "master of education"].some((kw) => haystack.includes(kw));
  if (isTeacherEducation && matches[0] !== "education") {
    const rest = matches.filter((m) => m !== "education");
    const [primary, ...secondary] = ["education" as const, ...rest];
    return { primary, secondary };
  }

  const [primary, ...secondary] = matches;
  return { primary, secondary };
}
