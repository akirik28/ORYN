// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";

/**
 * 2026-09-02 CV-review parity package: this component had zero coverage before. Written
 * alongside adding edit/delete affordances that bring this surface (reachable from
 * /profile/import, for a returning student re-scanning a CV) up to the same capability
 * features/onboarding/steps/import-step.tsx already had — non-negotiable #10 in AGENTS.md
 * is "Students must be able to edit AI-extracted information," not just choose which items
 * to keep.
 *
 * EntityCombobox is mocked as a plain, real `<input>` wired to the same `onChange` shape
 * the real component uses (`{ id, displayName }`) — interactive enough to prove an edit
 * actually reaches save(), unlike the inert `<div data-testid>` stub
 * __tests__/onboarding/onboarding-wizard.test.tsx uses where the combobox's own behavior
 * isn't what's under test. uploadAndExtractCV/importReviewedCvItems are mocked per the same
 * house pattern (mock what the component imports, render for real, assert on behavior).
 */

const uploadAndExtractCV = vi.hoisted(() => vi.fn());
const importReviewedCvItems = vi.hoisted(() => vi.fn(async () => ({ inserted: 1 })));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(onboarding)/onboarding/actions", () => ({ uploadAndExtractCV }));
vi.mock("@/app/(app)/profile/import/actions", () => ({ importReviewedCvItems }));
vi.mock("@/features/entities/entity-combobox", () => ({
  EntityCombobox: ({
    value,
    placeholder,
    onChange,
  }: {
    value: string;
    placeholder?: string;
    onChange: (next: { id: string | null; displayName: string }) => void;
  }) => (
    <input aria-label={placeholder} value={value} onChange={(e) => onChange({ id: null, displayName: e.target.value })} />
  ),
}));

import { CvImportFlow } from "@/features/profile/cv-import-flow";

function renderFlow() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CvImportFlow country="Turkey" />
    </NextIntlClientProvider>,
  );
}

// Two items on purpose: one education (to pin the schoolName-over-organization fix), one
// low-confidence activity (to pin the deliberate default-unchecked behavior).
const EXTRACTION: CVExtractionResult = {
  education: [
    {
      title: "Diploma",
      organization: null,
      schoolName: "Lincoln High School",
      description: null,
      startDate: null,
      endDate: null,
      confidence: "high",
    },
  ],
  activities: [
    {
      title: "Robotics Club",
      organization: "Robotics Society",
      description: null,
      startDate: null,
      endDate: null,
      confidence: "high",
    },
    {
      title: "Debate Team",
      organization: "School Debate Society",
      description: null,
      startDate: null,
      endDate: null,
      confidence: "low",
    },
  ],
  awards: [],
  projects: [],
  research: [],
  workExperience: [],
  skills: [],
  languages: [],
  unclassified: [],
};

async function uploadAndReachReview() {
  renderFlow();
  uploadAndExtractCV.mockResolvedValue({ success: true, extraction: EXTRACTION, filePath: "u/1-cv.pdf" });
  const file = new File(["cv content"], "cv.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await fireEvent.change(input, { target: { files: [file] } });
  return await screen.findAllByRole("listitem");
}

beforeEach(() => {
  uploadAndExtractCV.mockReset();
  importReviewedCvItems.mockClear();
  importReviewedCvItems.mockResolvedValue({ inserted: 1 });
});

afterEach(() => {
  cleanup();
});

describe("CvImportFlow — review matches import-step.tsx's edit/delete affordances", () => {
  test("an education item's dedicated schoolName is preferred over the (here, null) organization field", async () => {
    const items = await uploadAndReachReview();
    // Regression pin for the bug found while wiring this field up to be editable: without
    // preferring schoolName, this input would render empty even though the model correctly
    // extracted "Lincoln High School".
    expect(within(items[0]).getByDisplayValue("Lincoln High School")).toBeInTheDocument();
  });

  test("the organization field is scoped per category — School for education, Organization elsewhere", async () => {
    const items = await uploadAndReachReview();
    expect(within(items[0]).getByLabelText("School")).toBeInTheDocument();
    expect(within(items[1]).getByLabelText("Organization")).toBeInTheDocument();
  });

  test("a low-confidence item starts unchecked; everything else starts checked", async () => {
    const items = await uploadAndReachReview();
    const checkboxOf = (li: HTMLElement) => within(li).getByRole("checkbox");
    expect(checkboxOf(items[0])).toHaveAttribute("aria-checked", "true"); // education, high
    expect(checkboxOf(items[1])).toHaveAttribute("aria-checked", "true"); // Robotics, high
    expect(checkboxOf(items[2])).toHaveAttribute("aria-checked", "false"); // Debate, low
  });

  test("editing a title and saving sends the edited value, not the originally-extracted one", async () => {
    const items = await uploadAndReachReview();
    const titleInput = within(items[1]).getByDisplayValue("Robotics Club");
    fireEvent.change(titleInput, { target: { value: "Robotics Club — Regional Director" } });

    fireEvent.click(screen.getByRole("button", { name: /Add.*items? to my profile/ }));

    expect(importReviewedCvItems).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ title: "Robotics Club — Regional Director" })]),
    );
  });

  test("editing the organization field and saving sends the edited displayName and clears the entity link", async () => {
    const items = await uploadAndReachReview();
    const orgInput = within(items[0]).getByLabelText("School");
    fireEvent.change(orgInput, { target: { value: "Springfield High School" } });

    fireEvent.click(screen.getByRole("button", { name: /Add.*items? to my profile/ }));

    expect(importReviewedCvItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ organization: "Springfield High School", organizationEntityId: null }),
      ]),
    );
  });

  test("deleting an item removes it from the list and it is never sent to save", async () => {
    const items = await uploadAndReachReview();
    fireEvent.click(within(items[1]).getByRole("button", { name: "Remove item" }));

    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Add.*items? to my profile/ }));

    expect(importReviewedCvItems).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ title: "Robotics Club" })]),
    );
  });

  test("unchecking an item disables editing it and excludes it from save, without deleting it", async () => {
    const items = await uploadAndReachReview();
    fireEvent.click(within(items[1]).getByRole("checkbox"));

    expect(within(items[1]).getByDisplayValue("Robotics Club")).toBeDisabled();
    expect(await screen.findAllByRole("listitem")).toHaveLength(3); // still present, just excluded

    fireEvent.click(screen.getByRole("button", { name: /Add.*items? to my profile/ }));
    expect(importReviewedCvItems).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ title: "Robotics Club" })]),
    );
  });
});
