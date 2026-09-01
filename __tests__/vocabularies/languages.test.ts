import { describe, expect, test } from "vitest";
import {
  LANGUAGE_PROFICIENCY_LEVELS,
  languageProficiencyHint,
  languageProficiencyLabel,
} from "@/lib/vocabularies/languages";

// 2026-09-01 — the last of the three files oryn-a7's fixed check:i18n scanner surfaced
// (after lib/scoring/completeness.ts and features/profile/field-config.ts, same night).

describe("languageProficiencyLabel", () => {
  test("returns null for null (no proficiency on file)", () => {
    expect(languageProficiencyLabel(null)).toBeNull();
    expect(languageProficiencyLabel(null, "tr")).toBeNull();
  });

  test("English matches each level's own stored label, for every value — omitting locale is the same as passing 'en'", () => {
    for (const level of LANGUAGE_PROFICIENCY_LEVELS) {
      expect(languageProficiencyLabel(level.value)).toBe(level.label);
      expect(languageProficiencyLabel(level.value, "en")).toBe(level.label);
    }
  });

  test("Turkish is a real, distinct translation for every value", () => {
    for (const level of LANGUAGE_PROFICIENCY_LEVELS) {
      const tr = languageProficiencyLabel(level.value, "tr");
      expect(tr).not.toBeNull();
      expect(tr).not.toBe(level.label);
    }
  });

  test("a legacy/unrecognized value falls back to the raw value itself, not null — in both locales", () => {
    expect(languageProficiencyLabel("some-legacy-code")).toBe("some-legacy-code");
    expect(languageProficiencyLabel("some-legacy-code", "tr")).toBe("some-legacy-code");
  });

  test("Native and Bilingual translate distinctly from the CEFR-ladder values, matching the file's own point about them being a different kind of claim", () => {
    expect(languageProficiencyLabel("native", "tr")).toBe("Anadil");
    expect(languageProficiencyLabel("bilingual", "tr")).toBe("İki Dilli");
  });
});

describe("languageProficiencyHint", () => {
  // Nothing in the app renders `hint` yet (confirmed by grep before this file was touched —
  // see lib/vocabularies/languages.ts's own comment) — this locks in the accessor's
  // contract now so whoever builds that UI later finds a working, tested function rather
  // than untranslated data with no way to read the Turkish side.
  test("English matches each level's own stored hint, for every value", () => {
    for (const level of LANGUAGE_PROFICIENCY_LEVELS) {
      expect(languageProficiencyHint(level.value, "en")).toBe(level.hint);
    }
  });

  test("Turkish is a real, distinct translation for every value", () => {
    for (const level of LANGUAGE_PROFICIENCY_LEVELS) {
      const tr = languageProficiencyHint(level.value, "tr");
      expect(tr).not.toBeNull();
      expect(tr).not.toBe(level.hint);
    }
  });

  test("an unrecognized value returns null, not the value itself — a hint has no meaningful raw-value fallback", () => {
    expect(languageProficiencyHint("some-legacy-code", "en")).toBeNull();
    expect(languageProficiencyHint("some-legacy-code", "tr")).toBeNull();
  });
});
