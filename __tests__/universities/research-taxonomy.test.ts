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
});
