// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";
import type { CompleteOnboardingInput } from "@/lib/validation/onboarding";

/**
 * 2026-09-02, oryn-a7's ask after the browser file-input limitation was confirmed closed
 * (three independent repros, tooling not product): prove a review-screen edit survives to
 * the real submit payload, not just to the reviewing component's own state.
 *
 * __tests__/onboarding/import-step-skills-languages.test.tsx already proves ImportStep calls
 * setReviewedSkills/setReviewedLanguages with the edited/unchecked value — but ImportStep is
 * a controlled component; that state lives in, and is only ever read by,
 * features/onboarding/onboarding-wizard.tsx's own finish(), which filters by `included` and
 * re-maps into CompleteOnboardingInput before calling the real completeOnboarding. Nothing
 * before this file exercised that second step: __tests__/onboarding/onboarding-wizard.test.tsx
 * mocks ImportStep out entirely (by design — it's testing step-transition timing, not this
 * surface) and never reaches step 4. A bug in finish()'s filter/map — wrong field name, a
 * forgotten .filter(included), stale closure — would be invisible to every existing test
 * while ImportStep itself keeps rendering and updating correctly, the same shape as the
 * notification-settings bug oryn-bd found tonight (seven switches that rendered and toggled
 * correctly and saved nothing).
 *
 * This file therefore renders the real, unmocked OnboardingWizard end to end: click through
 * steps 0-3 with minimum valid data (SuggestInput/EntityCombobox/Select are mocked as plain
 * interactive elements — none of them is what's under test, matching the mocking convention
 * __tests__/profile/cv-import-flow.test.tsx and the existing wizard test both already use),
 * reach the real ImportStep at step 4, upload (uploadAndExtractCV mocked, same technique as
 * __tests__/profile/cv-import-flow.test.tsx), edit/uncheck a skill or language, click Finish,
 * and assert on completeOnboarding's actual call argument.
 *
 * What this proves: an edit or an uncheck made on the review screen reaches the Server
 * Action's input, exactly as constructed by finish() today. What it does NOT prove: that
 * completeOnboarding's own server-side handling of extractedSkills/extractedLanguages writes
 * correctly to the database — that's [[project_oryn_cv_upload_live_proof]]'s server-side
 * result (real extraction, real insert, source: 'cv_import' confirmed against the live DB for
 * the shared insertCvImportSkills/insertCvImportLanguages helpers completeOnboarding itself
 * calls). Combined, the two close the chain; neither alone is an end-to-end click-through
 * proof, and this file doesn't claim to be one.
 */

const uploadAndExtractCV = vi.hoisted(() => vi.fn());
const completeOnboarding = vi.hoisted(() => vi.fn<(input: CompleteOnboardingInput) => Promise<{ error?: string }>>());

vi.mock("@/app/(onboarding)/onboarding/actions", () => ({ uploadAndExtractCV, completeOnboarding }));

vi.mock("@/features/entities/entity-combobox", () => ({
  EntityCombobox: ({ id, value, onChange }: { id?: string; value: string; onChange: (next: { id: string | null; displayName: string }) => void }) => (
    <input id={id} value={value ?? ""} onChange={(e) => onChange({ id: null, displayName: e.target.value })} />
  ),
}));
vi.mock("@/features/entities/suggest-input", () => ({
  SuggestInput: ({ id, value, onChange }: { id?: string; value: string; onChange: (next: string) => void }) => (
    <input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/features/onboarding/steps/interests-step", () => ({
  InterestsStep: () => <div data-testid="interests-step" />,
}));
// Base UI's <Select> needs real layout/portal machinery jsdom doesn't provide — this
// codebase's own convention (see __tests__/ui/select.test.tsx's header comment) is to never
// drive its popup in tests. Curriculum is the one Select gating step-1 validation on the
// path to step 4; nothing about the review-payload behavior under test depends on it being
// the real Base UI component, so it's swapped for a plain native <select> wired to the same
// onValueChange shape.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value?: string | null; onValueChange?: (v: string) => void; children: React.ReactNode }) => (
    <select data-testid="curriculum-select" value={value ?? ""} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

const currentYear = new Date().getFullYear();

// Two skills, one language, zero achievement items — mirrors
// __tests__/profile/cv-import-flow.test.tsx's SKILLS_LANGUAGES_EXTRACTION fixture, kept
// separate from any achievement fixture for the same reason that file gives: shared list
// rendering means mixing categories would change checkbox/row indices between tests.
const EXTRACTION: CVExtractionResult = {
  education: [],
  activities: [],
  awards: [],
  projects: [],
  research: [],
  workExperience: [],
  skills: [
    { name: "Python", category: "technical" },
    { name: "Debate", category: "communication" },
  ],
  languages: [{ name: "Spanish", statedLevel: "conversational" }],
  unclassified: [],
};

function renderWizard() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OnboardingWizard />
    </NextIntlClientProvider>,
  );
}

/** Steps 0-3 have no required fields except step 1 (country/school/curriculum/graduation
 * year/birth year) — drives exactly the minimum needed to reach step 4's real ImportStep. */
async function reachImportStep() {
  renderWizard();
  fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // step 0 -> 1, ungated

  await screen.findByRole("heading", { name: "Tell us about your school" });
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Turkey" } });
  fireEvent.change(screen.getByLabelText("School"), { target: { value: "Test High School" } });
  fireEvent.change(screen.getByLabelText("Year you were born"), { target: { value: String(currentYear - 17) } });
  fireEvent.change(screen.getByTestId("curriculum-select"), { target: { value: "ap" } });
  // graduationYear keeps the wizard's own default (currentYear + 1) — already in range.
  fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // step 1 -> 2

  await screen.findByRole("heading", { name: "What are you interested in?" });
  fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // step 2 -> 3, ungated

  await screen.findByRole("heading", { name: "Where might you want to study?" });
  fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // step 3 -> 4, ungated

  await screen.findByRole("heading", { name: "Import your profile" });
}

/** Reaches the real, unmocked ImportStep, uploads (mocked extraction), and lands on the
 * populated review screen — same upload technique as
 * __tests__/profile/cv-import-flow.test.tsx's uploadAndReachReview(). */
async function reachCvReview() {
  await reachImportStep();
  fireEvent.click(screen.getByText("Upload CV")); // "choose" -> "cv" method
  uploadAndExtractCV.mockResolvedValue({ success: true, extraction: EXTRACTION, filePath: "u/1-cv.pdf" });
  const file = new File(["cv content"], "cv.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await fireEvent.change(input, { target: { files: [file] } });
  return await screen.findByDisplayValue("Python");
}

beforeEach(() => {
  uploadAndExtractCV.mockReset();
  completeOnboarding.mockReset();
  completeOnboarding.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe("OnboardingWizard — a CV-review edit reaches the real completeOnboarding payload", () => {
  test("editing a skill's name sends the edited value, not the extracted one", async () => {
    await reachCvReview();
    fireEvent.change(screen.getByDisplayValue("Python"), { target: { value: "Python (advanced)" } });

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedSkills).toContainEqual({ name: "Python (advanced)", category: "technical", proficiency: null });
  });

  test("unchecking a skill excludes it from the payload while the untouched skill is still sent", async () => {
    await reachCvReview();
    // Render order: Python's checkbox, Debate's checkbox, Spanish's checkbox.
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedSkills).toEqual([{ name: "Debate", category: "communication", proficiency: null }]);
  });

  test("editing a language's name sends the edited value, not the extracted one", async () => {
    await reachCvReview();
    fireEvent.change(screen.getByDisplayValue("Spanish"), { target: { value: "Spanish (Castilian)" } });

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedLanguages).toEqual([{ name: "Spanish (Castilian)", proficiency: null }]);
  });

  test("unchecking the language excludes it from the payload while both untouched skills are still sent", async () => {
    await reachCvReview();
    fireEvent.click(screen.getAllByRole("checkbox")[2]); // Spanish's checkbox

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedLanguages).toEqual([]);
    expect(payload.extractedSkills).toEqual([
      { name: "Python", category: "technical", proficiency: null },
      { name: "Debate", category: "communication", proficiency: null },
    ]);
  });
});
