import { describe, expect, test } from "vitest";
import { blockingDescriptionDefect, inspectDescription } from "@/lib/opportunities/description-quality";

describe("inspectDescription — multi_program_concatenation (reject: no legitimate form)", () => {
  test("flags a description with 2+ ' | ' separators where a segment is a bare URL", () => {
    const findings = inspectDescription(
      "Robomaster High School Summer Camp",
      "Robomaster High School Summer Camp | https://www.robomaster.com/en-US/campus/highSchool | University of Nottingham Malaysia Campus | International High School program: 6 day sampling."
    );
    expect(findings.some((f) => f.defect === "multi_program_concatenation" && f.severity === "reject")).toBe(true);
  });

  test("negative: a single 'A | B' shorthand with no bare-URL segment does not trip it", () => {
    const findings = inspectDescription("Model UN", "Model UN | Debate Society joint session for grades 9-12.");
    expect(findings.some((f) => f.defect === "multi_program_concatenation")).toBe(false);
  });

  test("negative: two segments (one separator) never trips it, even with a bare URL", () => {
    const findings = inspectDescription("AI Scholars", "AI Scholars | https://www.cmu.edu/pre-college/academic-programs/ai_scholars.html");
    expect(findings.some((f) => f.defect === "multi_program_concatenation")).toBe(false);
  });

  test("real corpus case: AI Scholars (3f7170ba) — three CMU programmes glued together", () => {
    const findings = inspectDescription(
      "AI Scholars",
      "AI Scholars: | https://www.cmu.edu/pre-college/academic-programs/ai_scholars.html | CS Scholars: | https://www.cmu.edu/pre-college/academic-programs/computer-science-scholars.html | General application info (I-20 issues): | https://www.cmu.edu/pre-college/apply/international.html"
    );
    const finding = findings.find((f) => f.defect === "multi_program_concatenation");
    expect(finding?.severity).toBe("reject");
  });
});

describe("inspectDescription — restates_title (flag: has a legitimate form)", () => {
  test("flags when description opens with the title verbatim", () => {
    const findings = inspectDescription(
      "New York University (NY, USA)",
      "New York University (NY, USA) | https://www.nyu.edu/admissions/high-school-and-middle-school-programs/find-a-program.html | High School programs open to international students."
    );
    const finding = findings.find((f) => f.defect === "restates_title");
    expect(finding?.severity).toBe("flag");
  });

  test("negative: unrelated opening prose does not trip it", () => {
    const findings = inspectDescription(
      "PROMYS",
      "A rigorous six-week summer mathematics program for high school students at Boston University."
    );
    expect(findings.some((f) => f.defect === "restates_title")).toBe(false);
  });

  test("negative: a short/generic title never trips the prefix check (avoids false positives on common openers)", () => {
    const findings = inspectDescription("AI Scholars", "AI Scholars is a two-week research-mentorship program at CMU.");
    expect(findings.some((f) => f.defect === "restates_title")).toBe(false);
  });

  test("legitimate form is preserved as advisory, not blocking: a real record naming itself is still accepted-shape", () => {
    const findings = inspectDescription(
      "The Diamond Challenge",
      "The Diamond Challenge is a global entrepreneurship competition for teams of high schoolers."
    );
    expect(findings.every((f) => f.severity !== "reject")).toBe(true);
  });
});

describe("inspectDescription — embedded_url (flag: has a legitimate form)", () => {
  test("flags a raw http(s) URL inside the description body", () => {
    const findings = inspectDescription("Pre-College Program", "Pre-College Program | https://precollege.example.edu/apply");
    const finding = findings.find((f) => f.defect === "embedded_url");
    expect(finding?.severity).toBe("flag");
  });

  test("negative: no URL in the body does not trip it", () => {
    const findings = inspectDescription("PROMYS", "A rigorous six-week summer mathematics program.");
    expect(findings.some((f) => f.defect === "embedded_url")).toBe(false);
  });
});

describe("inspectDescription — truncated (flag: ambiguous, cannot be proven mid-word)", () => {
  test("flags a description ending in an ellipsis character", () => {
    const findings = inspectDescription(
      "Summer Programs in the Netherlands",
      "Should be examined in each link, not all of them are for high school students…"
    );
    const finding = findings.find((f) => f.defect === "truncated");
    expect(finding?.severity).toBe("flag");
  });

  test("flags a description ending in three literal dots", () => {
    const findings = inspectDescription("Some Program", "Applications open in the fall and close...");
    expect(findings.some((f) => f.defect === "truncated")).toBe(true);
  });

  test("negative: a description ending in ordinary punctuation does not trip it", () => {
    const findings = inspectDescription("PROMYS", "Applications close on March 1st.");
    expect(findings.some((f) => f.defect === "truncated")).toBe(false);
  });
});

describe("inspectDescription — clean descriptions produce no findings", () => {
  test("a normal, well-formed description has zero findings", () => {
    expect(inspectDescription("PROMYS", "A rigorous six-week summer mathematics program for high school students at Boston University.")).toEqual([]);
  });

  test("null/undefined/empty description is not itself a defect (missing content is a different, existing check)", () => {
    expect(inspectDescription("PROMYS", null)).toEqual([]);
    expect(inspectDescription("PROMYS", undefined)).toEqual([]);
    expect(inspectDescription("PROMYS", "   ")).toEqual([]);
  });
});

describe("blockingDescriptionDefect", () => {
  test("returns the reject finding when one exists", () => {
    const finding = blockingDescriptionDefect(
      "Robomaster High School Summer Camp",
      "Robomaster High School Summer Camp | https://www.robomaster.com/highSchool | University of Nottingham Malaysia Campus | 6 day sampling."
    );
    expect(finding?.defect).toBe("multi_program_concatenation");
  });

  test("returns null when only advisory findings exist (flag-not-reject default)", () => {
    const finding = blockingDescriptionDefect("PROMYS", "PROMYS is a rigorous program. See https://promys.org for details.");
    expect(finding).toBeNull();
  });

  test("returns null for a clean description", () => {
    expect(blockingDescriptionDefect("PROMYS", "A rigorous six-week summer mathematics program.")).toBeNull();
  });
});
