/**
 * Multi-signal near-duplicate detection for opportunities (data-quality sprint, Part O).
 * Deliberately not title-only (spec Part 4/O): two rows sharing an official-domain and a
 * substantially overlapping title are the actual duplicate signal that caught the real
 * pairs found by hand in `supabase/data-batches/2026-08-20-status-consistency-and-dedup.md`
 * and `2026-08-20-thin-category-enrichment.md` (Diamond Challenge, RSI at MIT, Clark
 * Scholars, TechGirls) — this module formalizes that same manual process into something
 * repeatable rather than tooling built once and thrown away.
 *
 * Pure, network-free — the runner (scripts/audit-opportunity-duplicates.ts) does the DB read.
 */

import { getDomain } from "tldts";

export type DuplicateConfidence = "deterministic" | "probable" | "needs_review";

export interface OpportunityForDuplicateCheck {
  id: string;
  title: string;
  official_url: string | null;
}

export interface DuplicateCandidate {
  a: OpportunityForDuplicateCheck;
  b: OpportunityForDuplicateCheck;
  domain: string;
  titleSimilarity: number;
  confidence: DuplicateConfidence;
}

/**
 * Registrable domain (eTLD+1), not exact hostname. Found by hand 2026-09-03
 * (docs/opportunity-duplicate-pairs-2026-09-03.md): grouping by exact hostname meant two
 * pages describing the same programme on different subdomains of one institution — a news
 * office vs. the programme's own page, a continuing-studies portal vs. the main site, one
 * school's subdomain vs. another's — were never even placed in the same comparison group,
 * regardless of title similarity. `global.lehigh.edu` and `health.lehigh.edu` both reduce to
 * `lehigh.edu`; `col.ed.ac.uk` and `study.ed.ac.uk` both reduce to `ed.ac.uk`. A hand-rolled
 * "last two labels" heuristic breaks on multi-part TLDs (`.ac.uk`, `.edu.tr`, `.co.uk`), so
 * this uses `tldts`, which ships an actual public-suffix list, rather than approximating one.
 */
function domainOf(url: string | null): string | null {
  if (!url) return null;
  return getDomain(url);
}

/** Generic filler words stripped before comparing — "Program"/"Competition"/"Summer" appear
 * in enough real, genuinely-different titles from the same provider (e.g. a provider running
 * both a "Summer Program" and a "Summer Competition") that leaving them in would inflate
 * similarity between two actually-distinct offerings. */
const STOPWORDS = new Set(["the", "and", "for", "program", "programme", "competition", "challenge", "summer", "at", "of", "in"]);

function normalizedWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Jaccard similarity over normalized word sets — simple, deterministic, no external NLP
 * dependency (Tavily/Anthropic may be unavailable, per spec Part 18, and this needs to run
 * regardless). Not a semantic-similarity model; catches "Research Science Institute (RSI)" vs
 * "RSI (Research Science Institute) at MIT" (real pair, similarity 0.80) by design, same as
 * every duplicate this session actually found by hand. */
function titleSimilarity(a: string, b: string): number {
  const wordsA = normalizedWords(a);
  const wordsB = normalizedWords(b);
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Known, honest limitation: a real duplicate whose second title adds enough extra words
 * ("TechGirls" vs "TechGirls (w Virginia Tech University) 2026" — confirmed the same program
 * by hand this session, word-overlap similarity only ~0.2) scores below this floor and is
 * NOT flagged. Raising the floor to catch it would flood domains with several genuinely
 * distinct sibling programs (e.g. 6 different Columbia pre-college offerings on one domain)
 * with noise on every run. Word-overlap is one real signal, not a semantic-similarity model —
 * this tool narrows the review queue, it doesn't replace reading the results.
 */
function confidenceFor(similarity: number): DuplicateConfidence | null {
  if (similarity >= 0.75) return "deterministic";
  if (similarity >= 0.5) return "probable";
  if (similarity >= 0.3) return "needs_review";
  return null;
}

/**
 * Only compares opportunities that share an official-domain — a title-similarity match
 * across two unrelated domains is coincidence (two different "Summer Research Program"
 * titles from two different universities), not evidence of a duplicate. Never auto-resolves
 * anything; the runner script decides what to do with the output (spec: "Do not auto-delete
 * ambiguous records").
 */
export function findDuplicateCandidates(opportunities: OpportunityForDuplicateCheck[]): DuplicateCandidate[] {
  const byDomain = new Map<string, OpportunityForDuplicateCheck[]>();
  for (const o of opportunities) {
    const domain = domainOf(o.official_url);
    if (!domain) continue;
    const group = byDomain.get(domain) ?? [];
    group.push(o);
    byDomain.set(domain, group);
  }

  const candidates: DuplicateCandidate[] = [];
  for (const [domain, group] of byDomain) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const similarity = titleSimilarity(group[i].title, group[j].title);
        const confidence = confidenceFor(similarity);
        if (confidence === null) continue;
        candidates.push({ a: group[i], b: group[j], domain, titleSimilarity: similarity, confidence });
      }
    }
  }

  return candidates.sort((x, y) => y.titleSimilarity - x.titleSimilarity);
}
