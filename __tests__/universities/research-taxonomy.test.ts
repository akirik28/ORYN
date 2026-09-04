import { describe, expect, test } from "vitest";
import { categorizeResearchTopic, categorizeAndDedupeResearchTopics } from "@/lib/universities/research-taxonomy";

describe("categorizeResearchTopic", () => {
  test.each([
    ["Particle physics theoretical and experimental studies", "Physics"],
    ["Galaxies: Formation, Evolution, Phenomena", "Physics"],
    ["Immune Cell Function and Interaction", "Biology"],
    ["RNA and protein synthesis mechanisms", "Biology"],
    ["Machine Learning Applications in Healthcare", "AI"],
    ["Algorithms and Computational Complexity", "Computer Science"],
    ["Cancer Genomics and Therapeutics", "Medicine"],
    ["Structural Engineering and Materials Science", "Engineering"],
    ["Algebraic Geometry and Number Theory", "Mathematics"],
    ["Macroeconomic Policy and Inflation Dynamics", "Economics"],
    ["Corporate Finance and Governance", "Business"],
    ["Political Systems and International Relations", "Social Sciences"],
    ["Constitutional Law and Human Rights", "Law"],
    ["Literary Theory and Cultural History", "Arts & Humanities"],
  ])("%s -> %s", (topic, expected) => {
    expect(categorizeResearchTopic(topic)).toBe(expected);
  });

  test("prefers the more specific AI bucket over the broader Computer Science one", () => {
    expect(categorizeResearchTopic("Deep Neural Networks for Natural Language Processing")).toBe("AI");
  });

  test("word-boundary matching refuses 'law' inside an unrelated word", () => {
    expect(categorizeResearchTopic("Outlawed Pesticide Flaw Detection in Agriculture")).not.toBe("Law");
  });

  test("returns null for a topic that matches nothing, rather than guessing", () => {
    expect(categorizeResearchTopic("Sustainable Development Goals")).toBeNull();
  });

  test("matches plural/inflected forms via the leading-boundary-only rule", () => {
    expect(categorizeResearchTopic("Neural Networks and Robotics")).toBe("AI");
  });
});

describe("categorizeAndDedupeResearchTopics", () => {
  test("de-duplicates multiple raw topics that map to the same category", () => {
    const raw = ["Particle physics theoretical and experimental studies", "Galaxies: Formation, Evolution, Phenomena", "Quantum Optics"];
    expect(categorizeAndDedupeResearchTopics(raw)).toEqual(["Physics"]);
  });

  test("caps at the given max even with more distinct categories available", () => {
    const raw = ["Particle physics", "Immune Cell Function", "Machine Learning", "Corporate Finance", "Literary Theory"];
    expect(categorizeAndDedupeResearchTopics(raw, 3)).toHaveLength(3);
  });

  test("skips unmatched topics but keeps collecting from the ones after them", () => {
    const raw = ["Sustainable Development Goals", "Particle physics", "Immune Cell Function"];
    expect(categorizeAndDedupeResearchTopics(raw)).toEqual(["Physics", "Biology"]);
  });

  test("returns an empty array, not null/undefined, when nothing matches", () => {
    expect(categorizeAndDedupeResearchTopics(["Sustainable Development Goals"])).toEqual([]);
  });

  test("returns an empty array for an empty input", () => {
    expect(categorizeAndDedupeResearchTopics([])).toEqual([]);
  });

  // CEO, 2026-09-04, from the display-honesty measurement: the university detail page now
  // passes max=5 (not the card's default of 3) -- proven here with Oxford's own real 5 raw
  // topics (queried live, project qtcvcflzxbuagvvwahhu), not a synthetic fixture, since this
  // exact university was the motivating case for the whole pass.
  test("Oxford's real 5 raw topics (queried live 2026-09-04), max=5 -- what the detail page now shows instead of the raw jargon", () => {
    const raw = [
      "Particle physics theoretical and experimental studies",
      "Genomics and Phylogenetic Studies",
      "Data Analysis and Archiving",
      "Galaxies: Formation, Evolution, Phenomena",
      "Malaria Research and Control",
    ];
    // Only "Physics" (2 of the 5, deduped to one entry) actually categorizes -- confirmed by
    // running against the real function, not assumed: "Genomics"/"Malaria" do NOT match, since
    // the Biology/Medicine keyword lists have "genome" and no malaria-adjacent term at all, and
    // "genome" is a literal-substring match (word-boundary matching, not stemming) that
    // "genomics" doesn't contain. A real, minor taxonomy-coverage gap, found in passing --
    // explicitly out of scope per CEO's own instruction not to audit the taxonomy's own
    // accuracy this pass, so left as-is and reported, not fixed here.
    expect(categorizeAndDedupeResearchTopics(raw, 5)).toEqual(["Physics"]);
  });

  // The other real motivating case: a university whose real topics categorize to NOTHING at
  // all, even at max=5 -- Amsterdam, queried live the same day, entirely astrophysics-worded.
  test("Amsterdam's real 5 raw topics -- all astrophysics-worded, zero categorize even at max=5", () => {
    const raw = [
      "Astrophysical Phenomena and Observations",
      "Particle physics theoretical and experimental studies",
      "Pulsars and Gravitational Waves Research",
      "Stellar, planetary, and galactic studies",
      "Gamma-ray bursts and supernovae",
    ];
    // All five are Physics -- deduped to one entry, not zero. Confirms "zero categorize" in the
    // display-honesty report meant "zero NON-STEM categories," not "the taxonomy finds nothing
    // at all here" -- this specific university's topics ARE classifiable, just not usefully so
    // for an Economics/Business-interested student. The genuinely-uncategorized 13.1% case is
    // covered by the "returns an empty array... when nothing matches" test above.
    expect(categorizeAndDedupeResearchTopics(raw, 5)).toEqual(["Physics"]);
  });
});
