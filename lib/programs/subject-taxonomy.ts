/** Controlled vocabulary mirroring the CHECK constraint on university_programs.subject_taxonomy
 * (migration 0042). Keep these two in sync — an unlisted value is rejected at insert time. */
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
  "other",
] as const;

export type SubjectTaxonomy = (typeof SUBJECT_TAXONOMY)[number];

/** Ordered: first keyword hit wins as the primary tag; further hits become secondary tags.
 * Deliberately a plain keyword match, not a model — every classification is inspectable
 * and reproducible, which matters more here than marginal accuracy on ambiguous titles. */
const SUBJECT_KEYWORDS: [Exclude<SubjectTaxonomy, "other">, string[]][] = [
  ["computer_science", ["computer science", "computing", "informatics", "software engineering"]],
  ["artificial_intelligence", ["artificial intelligence", "machine learning", "data science"]],
  ["economics", ["economic"]],
  ["finance", ["finance", "financial"]],
  ["business", ["business", "management"]],
  ["entrepreneurship", ["entrepreneur"]],
  ["engineering", ["engineering"]],
  ["medicine", ["medicine", "medical"]],
  ["law", [" law", "laws", "legal studies"]],
  ["psychology", ["psycholog"]],
  ["international_relations", ["international relations"]],
  ["political_science", ["political science", "politics", "government"]],
  ["mathematics", ["mathematic"]],
  ["physics", ["physics"]],
  ["architecture", ["architecture"]],
  ["design", ["design"]],
];

export interface SubjectClassification {
  primary: SubjectTaxonomy;
  secondary: Exclude<SubjectTaxonomy, "other">[];
}

export function classifySubjects(programName: string): SubjectClassification {
  const haystack = ` ${programName.toLowerCase()} `;
  const matches: Exclude<SubjectTaxonomy, "other">[] = [];
  for (const [tag, keywords] of SUBJECT_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) matches.push(tag);
  }
  if (matches.length === 0) return { primary: "other", secondary: [] };
  const [primary, ...secondary] = matches;
  return { primary, secondary };
}
