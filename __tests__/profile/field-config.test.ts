import { describe, expect, test } from "vitest";
import {
  ACTIVITY_FIELDS,
  AWARD_FIELDS,
  COURSE_FIELDS,
  localizeFields,
  SPORTS_FIELDS,
  type FieldConfig,
} from "@/features/profile/field-config";

// The 2026-09-01 first-run i18n pass: every FieldConfig array is English source data, and
// localizeFields() is the single place (called once, inside DynamicFormFields) that resolves
// it to a student's locale. Coverage here is about the resolver's own contract — every real
// FieldConfig array getting a matching Turkish string is verified structurally in the last
// test below, not by hand-listing all ~137 strings again.

describe("localizeFields", () => {
  test("English is a no-op — the arrays are already English source data", () => {
    expect(localizeFields(ACTIVITY_FIELDS, "en")).toEqual(ACTIVITY_FIELDS);
  });

  test("Turkish translates label, placeholder, and select option labels", () => {
    const [turkish] = localizeFields(ACTIVITY_FIELDS, "tr");
    expect(turkish.label).toBe("Başlık"); // ACTIVITY_FIELDS[0] is the "Title" text field
    expect("placeholder" in turkish ? turkish.placeholder : undefined).toBe("örn. Robotik Kulübü Kaptanı");

    const category = localizeFields(ACTIVITY_FIELDS, "tr").find((f) => f.name === "category");
    expect(category?.type).toBe("select");
    if (category?.type === "select") {
      expect(category.options.map((o) => o.label)).toContain("Kulüp"); // "Club"
      expect(category.options.map((o) => o.value)).toContain("club"); // value never translated
    }
  });

  test("the same English string translates identically regardless of which array it's in — 'Description' means the same thing everywhere it appears", () => {
    const sportsDescription = localizeFields(SPORTS_FIELDS, "tr").find((f) => f.name === "description");
    const courseDescription = localizeFields(AWARD_FIELDS, "tr").find((f) => f.name === "description");
    expect(sportsDescription?.label).toBe("Açıklama");
    expect(courseDescription?.label).toBe("Açıklama");
  });

  // COURSE_FIELDS's "level" (rigor: Regular..Dual enrollment) and SPORTS_FIELDS's "level"
  // (Recreational..International, exposed as label "Competitive level") share a field
  // `name` but mean different things — proof the map is keyed by source text, not `name`.
  test("the same field name in different arrays keeps each array's own distinct English meaning", () => {
    const sportsLevel = localizeFields(SPORTS_FIELDS, "tr").find((f) => f.name === "level");
    const courseLevel = localizeFields(COURSE_FIELDS, "tr").find((f) => f.name === "level");
    expect(sportsLevel?.label).toBe("Yarışma seviyesi"); // "Competitive level"
    expect(courseLevel?.label).toBe("Seviye"); // "Level"
  });

  test("curriculum loanwords (AP/IB/A-Level/Honors) fall through to English on purpose, not silently broken", () => {
    const levelField = localizeFields(COURSE_FIELDS, "tr").find((f) => f.name === "level");
    expect(levelField?.type).toBe("select");
    if (levelField?.type === "select") {
      const byValue = Object.fromEntries(levelField.options.map((o) => [o.value, o.label]));
      expect(byValue.ap).toBe("AP");
      expect(byValue.honors).toBe("Honors");
      expect(byValue.ib_hl).toBe("IB Üst Düzey (HL)"); // the surrounding phrase IS translated
    }
  });

  test("name, type, quickAdd, and customLabel are untouched by locale", () => {
    const [english] = ACTIVITY_FIELDS;
    const [turkish] = localizeFields(ACTIVITY_FIELDS, "tr");
    expect(turkish.name).toBe(english.name);
    expect(turkish.type).toBe(english.type);
    expect(turkish.quickAdd).toBe(english.quickAdd);

    const org = AWARD_FIELDS.find((f) => f.type === "entity");
    const orgTr = localizeFields(AWARD_FIELDS, "tr").find((f) => f.type === "entity");
    if (org?.type === "entity" && orgTr?.type === "entity") {
      expect(orgTr.customLabel).toBe(org.customLabel); // deliberately untranslated — see field-config.ts's header comment
    }
  });

  test("every label/placeholder/option-label across every exported field array has a Turkish string, or is a named loanword exception", () => {
    // Curriculum terms with no natural Turkish equivalent, matching the convention already
    // used elsewhere in this codebase (e.g. onboarding-wizard.tsx's own curriculum options).
    // "Mentor" matches existing precedent too — messages/tr.json's own
    // profile.recommendations.relationships.mentor is already the identical loanword
    // "Mentor", not "Danışman" (which this codebase reserves for the Counselor feature).
    // "Poster" is identical in both languages (a standard Turkish word, not an
    // untranslated gap) — same reasoning as "Mentor", just without a catalog precedent to
    // cite since nothing else in messages/tr.json happens to use the word yet.
    const LOANWORDS = new Set(["AP", "IB", "A-Level", "Honors", "Mentor", "Poster"]);

    // LANGUAGE_FIELDS's "proficiency" options (lib/vocabularies/languages.ts's
    // LANGUAGE_PROFICIENCY_OPTIONS) were the last still-untranslated FieldConfig array when
    // this test was first written — now translated (2026-09-01, same pass as
    // lib/vocabularies/languages.ts's own locale-aware accessors), so no array needs
    // excluding here any more. If a future FieldConfig array genuinely can't be covered yet,
    // exclude it explicitly with a comment the way this one used to be, rather than silently
    // narrowing the walk.
    async function allFieldArrays(): Promise<FieldConfig[][]> {
      const mod = await import("@/features/profile/field-config");
      return Object.entries(mod)
        .filter(([name, value]) => name.endsWith("_FIELDS") && Array.isArray(value))
        .map(([, value]) => value as FieldConfig[]);
    }

    return allFieldArrays().then((arrays) => {
      for (const fields of arrays) {
        const localized = localizeFields(fields, "tr");
        for (let i = 0; i < fields.length; i++) {
          const original = fields[i];
          const translated = localized[i];
          if (!LOANWORDS.has(original.label)) {
            expect(translated.label, `label "${original.label}"`).not.toBe(original.label);
          }
          if (original.type === "select" && translated.type === "select") {
            for (let j = 0; j < original.options.length; j++) {
              const originalOption = original.options[j].label;
              if (!LOANWORDS.has(originalOption)) {
                expect(translated.options[j].label, `option label "${originalOption}"`).not.toBe(originalOption);
              }
            }
          }
        }
      }
    });
  });
});
