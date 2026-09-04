/**
 * Maps a raw OpenAlex research topic string (e.g. "Particle physics theoretical and
 * experimental studies", "Immune Cell Function and Interaction") down to one of a small set of
 * short, student-legible categories.
 *
 * Originally the university CARD only — the detail and compare pages kept the raw, uncapped
 * OpenAlex phrases as-is. CEO, 2026-09-04, from the measured cost of that gap
 * (docs/research-topics-display-honesty-2026-09-04.md): 934 universities carry this metric,
 * and 69.3% of them have zero of their 5 raw topics land in a field a business/economics/
 * humanities-interested student would recognize as relevant — shown raw, a student reads
 * Oxford's own "research strengths" section as astrophysics, a wrong impression on screen, not
 * just an unhelpful one. Extended to `app/(app)/universities/[id]/page.tsx` (detail) and
 * `app/(app)/universities/compare/page.tsx` (compare) the same day — same taxonomy, no new
 * categorization logic invented per surface, just a different `max` and a different
 * empty-result treatment (see each page's own comment for why they differ).
 *
 * Deliberately rule-based (keyword match), not an AI call: classifying up to 5 short topic
 * strings per university, times ~1019 universities, is exactly the kind of high-volume/low-
 * ambiguity task the founder's spec says shouldn't cost an AI round trip — and a rule-based
 * match is trivially auditable (see the test file) in a way a model call isn't. A topic that
 * matches nothing is dropped, never forced into a wrong bucket — consistent with this
 * codebase's "never fabricate/never guess past a gap" rule applied to display, not just to
 * acquisition.
 */

interface TaxonomyEntry {
  category: string;
  /** Lowercase keyword roots. Matched with a LEADING word-boundary only (not a trailing one),
   * so "network" also catches "networks"/"networking" while "law" still correctly refuses to
   * match inside "outlaw" or "flaw" (both fail the leading-boundary check). */
  keywords: string[];
}

// Checked in order — more specific/distinctive categories first, so e.g. "machine learning"
// resolves to AI rather than the broader Computer Science bucket.
const TAXONOMY: TaxonomyEntry[] = [
  {
    category: "AI",
    keywords: [
      "artificial intelligence",
      "machine learning",
      "deep learning",
      "neural network",
      "reinforcement learning",
      "natural language processing",
      "computer vision",
      "generative model",
      "large language model",
    ],
  },
  {
    category: "Computer Science",
    keywords: [
      "computer science",
      "algorithm",
      "software",
      "programming",
      "computing",
      "database",
      "cybersecurity",
      "cyber security",
      "distributed system",
      "computer network",
      "data structure",
      "human-computer interaction",
      "information system",
    ],
  },
  {
    category: "Physics",
    keywords: [
      "physics",
      "quantum",
      "particle physics",
      "astrophysics",
      "astronomy",
      "cosmology",
      "galax",
      "thermodynamic",
      "optics",
      "condensed matter",
      "nuclear physics",
      "relativity",
    ],
  },
  {
    category: "Medicine",
    keywords: [
      "medicine",
      "medical",
      "clinical",
      "cancer",
      "oncology",
      "disease",
      "patient",
      "therapeutic",
      "therapy",
      "diagnos",
      "pharma",
      "surgery",
      "surgical",
      "neuroscience",
      "psychiatry",
      "epidemiology",
      "public health",
    ],
  },
  {
    category: "Biology",
    keywords: [
      "biology",
      "biological",
      "cellular",
      "genetic",
      "genome",
      "protein",
      "microbio",
      "immun",
      "ecology",
      "ecological",
      "organism",
      "biochemistry",
      "molecular biology",
      "evolutionary biology",
      "botany",
      "zoology",
    ],
  },
  {
    category: "Engineering",
    keywords: [
      "engineering",
      "mechanical",
      "materials science",
      "robotics",
      "robot",
      "aerospace",
      "manufacturing",
      "structural",
      "control system",
      "renewable energy",
      "electronics",
      "civil engineering",
      "electrical engineering",
      "chemical engineering",
    ],
  },
  {
    category: "Mathematics",
    keywords: ["mathematic", "algebra", "geometry", "calculus", "topology", "number theory", "combinatorics", "statistic", "probability"],
  },
  {
    category: "Economics",
    keywords: ["economic", "econometric", "macroeconomic", "microeconomic", "monetary policy", "inflation", "labor market", "labour market", "financial market"],
  },
  {
    category: "Business",
    keywords: ["business", "finance", "financial management", "management", "marketing", "corporate", "entrepreneurship", "accounting", "supply chain", "organizational behavior"],
  },
  {
    category: "Social Sciences",
    keywords: [
      "sociology",
      "sociological",
      "political",
      "anthropolog",
      "psychology",
      "demograph",
      "governance",
      "international relations",
      "social policy",
      "education policy",
      "urban studies",
      "gender studies",
      "public policy",
    ],
  },
  {
    category: "Law",
    keywords: ["legal", "law", "jurisprudence", "constitutional", "criminal justice", "human rights law", "international law", "regulation"],
  },
  {
    category: "Arts & Humanities",
    keywords: ["literature", "literary", "history", "historical", "philosophy", "linguistics", "cultural", "religio", "music", "language", "art history", "humanities", "archaeology", "theology"],
  },
];

function matchesKeyword(topicLower: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`).test(topicLower);
}

/** One category label for a single raw OpenAlex topic string, or null when nothing matches. */
export function categorizeResearchTopic(rawTopic: string): string | null {
  const topic = rawTopic.toLowerCase();
  for (const entry of TAXONOMY) {
    if (entry.keywords.some((keyword) => matchesKeyword(topic, keyword))) return entry.category;
  }
  return null;
}

/**
 * Categorizes a list of raw topics (already split from `research_topics_top5`'s
 * `" | "`-delimited string), drops unmatched ones, de-duplicates by category (three physics
 * sub-topics should show "Physics" once, not three times), and caps the result at `max` short
 * chips. Default of 3 is the university card's own original space constraint — callers with
 * more room (the detail page passes 5) raise it explicitly rather than this function guessing
 * a per-surface value on their behalf.
 */
export function categorizeAndDedupeResearchTopics(rawTopics: string[], max = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of rawTopics) {
    const category = categorizeResearchTopic(raw);
    if (category && !seen.has(category)) {
      seen.add(category);
      result.push(category);
      if (result.length >= max) break;
    }
  }
  return result;
}
