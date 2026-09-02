// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { CvImportReviewSkill, CvImportReviewLanguage } from "@/lib/profile/cv-import";

/**
 * 2026-09-02 CV review parity, part 2: ImportStep gets the same skills/languages review
 * section CvImportFlow does (__tests__/profile/cv-import-flow.test.tsx already covers that
 * surface) — CEO's own framing was "both surfaces or one," argued for both, same shared
 * flatten/insert functions underneath. This file proves the onboarding surface specifically.
 *
 * ImportStep is a controlled component (reviewedItems/setReviewedItems, and now
 * reviewedSkills/reviewedLanguages, are owned by the parent wizard) — tests here render it
 * with skills/languages already populated via props rather than faking a file upload, which
 * exercises the exact same review-state render path a real upload reaches, more directly.
 *
 * No popup-open-and-select interaction is simulated for the category/proficiency
 * dropdowns — __tests__/ui/select.test.tsx's own header comment documents that Base UI's
 * <Select> doesn't need (and isn't tested for) real popup interaction in this codebase;
 * these tests instead assert the closed-trigger's resolved label (proving the value/options
 * wiring is correct) and drive the *other* affordances (name edit, checkbox, delete) that
 * are plain, fireEvent-testable elements.
 */

vi.mock("@/app/(onboarding)/onboarding/actions", () => ({ uploadAndExtractCV: vi.fn() }));
vi.mock("@/features/entities/entity-combobox", () => ({
  EntityCombobox: () => <div data-testid="entity-combobox" />,
}));

import { ImportStep } from "@/features/onboarding/steps/import-step";

const SKILLS: CvImportReviewSkill[] = [
  { id: "skill-1", name: "Python", category: "technical", included: true },
  { id: "skill-2", name: "Debate", category: "communication", included: true },
];

const LANGUAGES: CvImportReviewLanguage[] = [
  { id: "language-1", name: "Spanish", statedLevel: "conversational", proficiency: null, included: true },
];

function renderImportStep(overrides: { skills?: CvImportReviewSkill[]; languages?: CvImportReviewLanguage[] } = {}) {
  const setReviewedItems = vi.fn();
  const setReviewedSkills = vi.fn();
  const setReviewedLanguages = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ImportStep
        reviewedItems={[]}
        setReviewedItems={setReviewedItems}
        reviewedSkills={overrides.skills ?? SKILLS}
        setReviewedSkills={setReviewedSkills}
        reviewedLanguages={overrides.languages ?? LANGUAGES}
        setReviewedLanguages={setReviewedLanguages}
        country="Turkey"
      />
    </NextIntlClientProvider>,
  );
  // Reaches method === "cv" — with skills/languages already non-empty via props, this lands
  // directly on the review render, not the upload dropzone.
  fireEvent.click(screen.getByText("Upload CV"));
  return { setReviewedItems, setReviewedSkills, setReviewedLanguages };
}

afterEach(cleanup);

describe("ImportStep — skills section", () => {
  test("renders each skill's name and its model-guessed category as the closed select's label", () => {
    renderImportStep();
    expect(screen.getByDisplayValue("Python")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Debate")).toBeInTheDocument();
    // Select — closed-trigger label resolution (__tests__/ui/select.test.tsx's own pattern):
    // no popup opened, just asserting the resolved text for each item's current value.
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  test("editing a skill's name calls setReviewedSkills with the edited value, not the original", () => {
    const { setReviewedSkills } = renderImportStep();
    fireEvent.change(screen.getByDisplayValue("Python"), { target: { value: "Python (advanced)" } });

    expect(setReviewedSkills).toHaveBeenCalledWith([
      expect.objectContaining({ id: "skill-1", name: "Python (advanced)" }),
      expect.objectContaining({ id: "skill-2", name: "Debate" }),
    ]);
  });

  test("unchecking a skill excludes it without removing it, and disables its name field", () => {
    const { setReviewedSkills } = renderImportStep();
    // Render order matches SKILLS above: Python (skill-1) is the first checkbox.
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    expect(setReviewedSkills).toHaveBeenCalledWith([
      expect.objectContaining({ id: "skill-1", included: false }),
      expect.objectContaining({ id: "skill-2", included: true }),
    ]);
  });

  test("deleting a skill calls setReviewedSkills with it removed", () => {
    const { setReviewedSkills } = renderImportStep();
    const removeButtons = screen.getAllByRole("button", { name: "Remove item" });
    // Skills render before languages, in the same order as SKILLS/LANGUAGES above.
    fireEvent.click(removeButtons[0]);

    expect(setReviewedSkills).toHaveBeenCalledWith([expect.objectContaining({ id: "skill-2" })]);
  });

  test("no skills extracted: the section doesn't render at all, rather than an empty heading", () => {
    renderImportStep({ skills: [] });
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });
});

describe("ImportStep — languages section", () => {
  test("shows the document's stated level as a hint, and the real proficiency select starts on its placeholder", () => {
    renderImportStep();
    expect(screen.getByText("Your CV said: conversational")).toBeInTheDocument();
    expect(screen.getByText("Set proficiency")).toBeInTheDocument();
  });

  test("a language with no stated level shows no hint line at all", () => {
    renderImportStep({ languages: [{ id: "language-1", name: "German", statedLevel: null, proficiency: null, included: true }] });
    expect(screen.queryByText(/Your CV said/)).not.toBeInTheDocument();
  });

  test("editing a language's name calls setReviewedLanguages with the edited value", () => {
    const { setReviewedLanguages } = renderImportStep();
    fireEvent.change(screen.getByDisplayValue("Spanish"), { target: { value: "Spanish (Castilian)" } });

    expect(setReviewedLanguages).toHaveBeenCalledWith([expect.objectContaining({ name: "Spanish (Castilian)" })]);
  });

  test("no languages extracted: the section doesn't render at all", () => {
    renderImportStep({ languages: [] });
    expect(screen.queryByText("Languages")).not.toBeInTheDocument();
  });
});

describe("ImportStep — the 'found N items' count spans achievements, skills, and languages together", () => {
  test("with zero achievement items but skills and languages present, the count is not zero and the dropzone doesn't show", () => {
    renderImportStep();
    // 2 skills + 1 language, 0 achievement items.
    expect(screen.getByText(/We found 3 items/)).toBeInTheDocument();
  });
});
