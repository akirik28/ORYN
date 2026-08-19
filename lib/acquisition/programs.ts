/**
 * Undergraduate programme extraction — deterministic, official-source-only.
 *
 * No language model is involved anywhere in this path, by requirement. Programme names and
 * URLs come from an official catalogue page's own markup, matched by a per-university link
 * pattern that a human verified against that specific catalogue. That is slower to set up than
 * an AI extractor and far easier to defend: every programme either appears as a link in the
 * university's own undergraduate catalogue or it does not appear at all.
 *
 * The rules that matter here are about *not* over-claiming:
 *
 *   - Undergraduate level is asserted only when the evidence supports it, and the evidence is
 *     recorded (`catalogue_section` when the official catalogue section itself is titled
 *     bachelors/undergraduate, `program_name` when the name carries an explicit degree token).
 *     No page context, no level claim.
 *   - "Economics BA" and "Economics BSc" are different programmes. The dedup key includes the
 *     degree token precisely so they are never collapsed.
 *   - A university-wide entry requirement is never attached to a programme as if it were
 *     programme-specific; scope is explicit and defaults to the weaker claim.
 */

/** Where the undergraduate-level claim comes from. Never assumed. */
export type DegreeLevelEvidence = "catalogue_section" | "program_name" | "none";

/** Whose rule a requirement actually is. Defaulting to the weaker claim is deliberate. */
export type RequirementScope = "PROGRAM_SPECIFIC" | "FACULTY_WIDE" | "UNIVERSITY_WIDE" | "COUNTRY_SYSTEM_GENERAL";

export interface ExtractedProgram {
  /** Official name exactly as the catalogue renders it, entity-decoded but not reworded. */
  officialName: string;
  /** Absolute URL on the university's own domain. */
  officialUrl: string;
  /** Explicit degree token found in the name ("BSc", "BA", "BEng", ...) or null. */
  degreeToken: string | null;
  degreeLevel: "bachelor" | null;
  degreeLevelEvidence: DegreeLevelEvidence;
  /** Deterministic dedup key, see programKey(). */
  key: string;
}

/** Degree tokens that unambiguously indicate an undergraduate award. */
const BACHELOR_TOKENS = [
  "BSc",
  "BA",
  "BEng",
  "BBA",
  "LLB",
  "BCom",
  "BComm",
  "BFA",
  "BArch",
  "BASc",
  "BMus",
  "BEd",
  "BN",
  "MBBS",
  "BS",
];

/** Tokens that mean a listing is NOT an undergraduate programme. Checked before acceptance so a
 * masters or doctoral entry sitting inside an undergraduate index is rejected rather than
 * mislabelled — the single most likely way to publish a wrong level. */
const NON_BACHELOR_TOKENS = ["MSc", "MA ", "MEng", "MBA", "LLM", "PhD", "MPhil", "MRes", "Doctorate", "Masters", "Master's", "Graduate Diploma"];

/** Decode the handful of HTML entities that actually appear in programme names. */
export function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;|&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&auml;/g, "ä")
    .replace(/\s+/g, " ")
    .trim();
}

/** The explicit degree token in a programme name, if the name carries one. */
export function degreeTokenOf(name: string): string | null {
  for (const token of BACHELOR_TOKENS) {
    // Word-boundary match so "BA" does not fire inside "Urban" and "BS" not inside "BSc".
    const pattern = new RegExp(`(^|[\\s(\\[/,-])${token}([\\s)\\]/,.-]|$)`, "i");
    if (pattern.test(name)) return token;
  }
  return null;
}

/** True when the name explicitly names a postgraduate award. */
export function looksPostgraduate(name: string): boolean {
  return NON_BACHELOR_TOKENS.some((t) => new RegExp(`(^|[\\s(\\[/,-])${t.trim()}([\\s)\\]/,.-]|$)`, "i").test(name));
}

/**
 * Normalised comparison form of a programme name: case- and punctuation-insensitive, with the
 * degree token removed so it can be compared separately rather than smuggled into the name.
 */
export function normalizeProgramName(name: string): string {
  return decodeEntities(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(BSc|BA|BEng|BBA|LLB|BCom|BComm|BFA|BArch|BASc|BMus|BEd|MBBS|BS)\b/gi, " ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Deterministic dedup key.
 *
 * Includes the degree token on purpose: "Economics BA" and "Economics BSc" are genuinely
 * different degrees and must never collapse into one row. Campus is included when supplied,
 * because the same programme taught at two campuses is two offerings.
 */
export function programKey(input: { universityId: string; officialName: string; degreeToken?: string | null; campus?: string | null }): string {
  return [
    input.universityId,
    normalizeProgramName(input.officialName),
    (input.degreeToken ?? "").toLowerCase(),
    (input.campus ?? "").toLowerCase().trim(),
  ].join("|");
}

/** Absolutise a catalogue href against its page, returning null for anything unusable. */
export function absoluteUrl(href: string, pageUrl: string): string | null {
  try {
    const url = new URL(href, pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Registrable-domain comparison, so `study.unimelb.edu.au` counts as `unimelb.edu.au`. */
export function sameInstitutionDomain(url: string, officialWebsite: string): boolean {
  try {
    const a = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const b = new URL(officialWebsite).hostname.toLowerCase().replace(/^www\./, "");
    if (a === b) return true;
    const tail = (h: string) => h.split(".").slice(-3).join(".");
    return a.endsWith(`.${b}`) || b.endsWith(`.${a}`) || tail(a) === tail(b);
  } catch {
    return false;
  }
}

export interface CatalogueRule {
  /** Substring or regex source an href must match to be considered a programme page. */
  hrefPattern: string;
  /** Hrefs matching any of these are rejected (index pages, fee pages, language switchers). */
  excludePatterns?: string[];
  /** True when the catalogue section itself establishes undergraduate level. */
  sectionIsUndergraduate: boolean;
  /** Shortest acceptable link text, to drop nav fragments. */
  minTextLength?: number;
}

const DEFAULT_EXCLUDES = [
  "/fees",
  "/a-z",
  "/apply",
  "/how-to-apply",
  "/scholarships",
  "/contact",
  "/news",
  "/events",
  "/open-day",
  "/opendag",
  "/student-life",
  "/why-",
  "#",
  "/search",
  "/index",
];

/**
 * Extract candidate undergraduate programmes from one catalogue page's HTML.
 *
 * Deliberately conservative: a link must match the university's verified programme-path
 * pattern, sit on the university's own domain, carry plausible link text, and must not name a
 * postgraduate award. Everything else is dropped rather than guessed at.
 */
export function extractPrograms(
  html: string,
  context: { pageUrl: string; officialWebsite: string; universityId: string; rule: CatalogueRule }
): ExtractedProgram[] {
  const { pageUrl, officialWebsite, universityId, rule } = context;
  const anchor = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const hrefRe = new RegExp(rule.hrefPattern, "i");
  const excludes = [...(rule.excludePatterns ?? []), ...DEFAULT_EXCLUDES];
  const minLength = rule.minTextLength ?? 4;

  const byKey = new Map<string, ExtractedProgram>();
  let match: RegExpExecArray | null;

  while ((match = anchor.exec(html)) !== null) {
    const rawHref = match[1];
    const text = decodeEntities(match[2].replace(/<[^>]*>/g, " "));
    if (text.length < minLength || text.length > 120) continue;
    if (!hrefRe.test(rawHref)) continue;
    if (excludes.some((x) => rawHref.toLowerCase().includes(x))) continue;

    const url = absoluteUrl(rawHref, pageUrl);
    if (!url) continue;
    // A programme URL that is not on the institution's own domain is not an official source.
    if (!sameInstitutionDomain(url, officialWebsite)) continue;
    // Reject a postgraduate award listed inside an undergraduate index rather than mislabel it.
    if (looksPostgraduate(text)) continue;

    const degreeToken = degreeTokenOf(text);
    const evidence: DegreeLevelEvidence = degreeToken ? "program_name" : rule.sectionIsUndergraduate ? "catalogue_section" : "none";
    if (evidence === "none") continue; // No evidence of level means no level claim, so no row.

    const key = programKey({ universityId, officialName: text, degreeToken });
    if (byKey.has(key)) continue;
    byKey.set(key, {
      officialName: text,
      officialUrl: url,
      degreeToken,
      degreeLevel: "bachelor",
      degreeLevelEvidence: evidence,
      key,
    });
  }

  return [...byKey.values()];
}

/** Broad ORYN subject buckets, mapped from an official programme name by explicit keyword.
 * Returns null rather than a guess — an unmapped subject is better than a wrong one. */
export function subjectCategoryOf(name: string): string | null {
  const n = normalizeProgramName(name);
  const rules: [RegExp, string][] = [
    [/\b(computer science|computing|informatics|software|artificial intelligence|data science)\b/, "computer_science"],
    [/\b(economics|econometrics)\b/, "economics"],
    [/\b(finance|accounting|actuarial)\b/, "finance"],
    [/\b(business|management|entrepreneurship|commerce)\b/, "business"],
    [/\b(law|laws|legal)\b/, "law"],
    [/\b(medicine|medical|surgery|dentistry|pharmacy|nursing)\b/, "medicine"],
    [/\b(psychology|psychological)\b/, "psychology"],
    [/\b(political|politics|international relations|public policy|government)\b/, "political_science"],
    [/\b(mathematic|mathematics|applied mathematics)\b/, "mathematics"],
    [/\b(physic|physics|astronomy|astrophysic)\b/, "physics"],
    [/\b(chemistry|chemical)\b/, "chemistry"],
    [/\b(biolog|life science|biochem|biomedical|genetic|neuroscience)\b/, "biology"],
    [/\b(architect|urbanism|built environment)\b/, "architecture"],
    [/\b(engineering|mechanical|electrical|civil|aerospace|robotic)\b/, "engineering"],
  ];
  for (const [pattern, category] of rules) if (pattern.test(n)) return category;
  return null;
}
