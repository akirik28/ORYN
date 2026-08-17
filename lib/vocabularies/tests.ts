/**
 * Canonical test-name vocabulary (University Intelligence Spine — data/support layer; see
 * lib/vocabularies/subjects.ts for the equivalent AP/IB/A-Level curriculum vocabularies and the
 * module-level note on how these are consumed by the shared "suggest" field type).
 *
 * Real, defensible test names an ORYN student plausibly reports — not the founder brief's
 * example list copied blindly (the brief explicitly warned against that): checked against this
 * app's own stated geographic focus (US/UK/Europe/Turkey — AGENTS.md) and against the
 * `test_scores` schema, which has no existing test-type enum to draw from (`test_name` is plain
 * text with no prior canonical list anywhere in the codebase). YKS included alongside the
 * international standard tests since Turkey is an explicit focus market and this session
 * already established YKS as a real, distinct national exam
 * (lib/acquisition/admissions.ts's application-system taxonomy). A student whose real test isn't
 * here can still type it — this is a suggestion list, not a closed set.
 */
export const TEST_NAME_SUGGESTIONS = [
  "SAT",
  "ACT",
  "PSAT/NMSQT",
  "AP",
  "IB Predicted",
  "IB Final",
  "A-Level",
  "IELTS Academic",
  "IELTS General Training",
  "TOEFL iBT",
  "Duolingo English Test",
  "Cambridge English (C1 Advanced)",
  "Cambridge English (C2 Proficiency)",
  "YKS",
];
