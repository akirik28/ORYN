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

// id-associated fields (step 1's school field, via its own <Label htmlFor="school">) get no
// aria-label, so getByLabelText resolves through the association as normal; ImportStep's
// per-achievement-item organization/school combobox passes no id at all, so it falls back
// to aria-label from its own placeholder (onboarding.import.schoolPlaceholder/
// organizationPlaceholder resolve to the literal "School"/"Organization" — a different,
// shorter namespace than the wizard's own step-1 field text). Giving an id-bearing instance
// both would let aria-label silently win the accessible name over the <Label> text.
vi.mock("@/features/entities/entity-combobox", () => ({
  EntityCombobox: ({
    id,
    value,
    placeholder,
    onChange,
  }: {
    id?: string;
    value: string;
    placeholder?: string;
    onChange: (next: { id: string | null; displayName: string }) => void;
  }) => (
    <input id={id} aria-label={id ? undefined : placeholder} value={value ?? ""} onChange={(e) => onChange({ id: null, displayName: e.target.value })} />
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

/**
 * 2026-09-02, oryn-a7's follow-up: the same chain, proven above for skills/languages, was
 * never proven for the other six extraction categories (education, activities, awards,
 * projects, research, workExperience) — `reviewedItems` in ImportStep, `extractedItems` in
 * completeOnboarding's payload. Audited before writing anything (per oryn-a7's own framing:
 * report the precise gap, don't write six redundant tests):
 *
 * - The extraction->flatten mapping is already covered at the pure-function level, including
 *   education's one genuinely distinct behavior (preferring the dedicated `schoolName` field
 *   over `organization`) — __tests__/onboarding/import-step-flatten.test.ts.
 * - The review-screen edit/uncheck/delete mechanism for achievement items is already proven
 *   generically on the *other* surface — __tests__/profile/cv-import-flow.test.tsx covers
 *   both education (organization/school field edit) and activities (title edit, uncheck,
 *   delete, low-confidence default). Grepping both import-step.tsx and cv-import-flow.tsx
 *   for `.category ===` found exactly one branch in each — education's placeholder/label
 *   text — and CV_IMPORT_CATEGORY_TO_ORGANIZATION_SCOPE/CATEGORY_LABEL_KEYS are both
 *   `satisfies Record<CvImportCategory, ...>`, so a missing category is a compile error, not
 *   a silent gap. The other four categories (awards, projects, research, workExperience)
 *   share 100% identical update/remove/save code with activities — no category-specific
 *   logic exists for them to test separately.
 * - What had **zero** coverage, isolated or chained: ImportStep's own rendering of
 *   `reviewedItems` on the onboarding surface. import-step-skills-languages.test.tsx always
 *   renders with `reviewedItems={[]}`; onboarding-wizard.test.tsx mocks ImportStep away
 *   entirely; the skills/languages tests above never populate `reviewedItems`. Nothing
 *   before this traced an edited or unchecked achievement item through finish() into
 *   completeOnboarding's `extractedItems` — the same shape of gap the skills/languages
 *   package closed, one field over.
 *
 * These three tests close that specific gap: one edit (a non-education category, to prove
 * the generic path independently of education's own distinct handling), one edit of
 * education's School field specifically (the one place a wrong mapping could hide), and one
 * uncheck. Not six tests for six categories — the mechanism is proven generic above, and
 * repeating it per category would just be re-asserting the same lookup-table completeness
 * TypeScript already guarantees at compile time.
 */
const ITEMS_EXTRACTION: CVExtractionResult = {
  education: [
    {
      title: "IB Diploma",
      organization: null,
      schoolName: "Test International School",
      description: null,
      startDate: null,
      endDate: null,
      confidence: "high",
    },
  ],
  activities: [],
  awards: [],
  projects: [],
  research: [
    {
      title: "Youth Unemployment Study",
      organization: "Local University",
      description: null,
      startDate: null,
      endDate: null,
      confidence: "high",
    },
  ],
  workExperience: [],
  skills: [],
  languages: [],
  unclassified: [],
};

async function reachItemsReview() {
  await reachImportStep();
  fireEvent.click(screen.getByText("Upload CV"));
  uploadAndExtractCV.mockResolvedValue({ success: true, extraction: ITEMS_EXTRACTION, filePath: "u/1-cv.pdf" });
  const file = new File(["cv content"], "cv.pdf", { type: "application/pdf" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await fireEvent.change(input, { target: { files: [file] } });
  return await screen.findByDisplayValue("IB Diploma");
}

describe("OnboardingWizard — an achievement-item edit reaches the real completeOnboarding payload", () => {
  test("editing a non-education item's title sends the edited value, not the extracted one", async () => {
    await reachItemsReview();
    fireEvent.change(screen.getByDisplayValue("Youth Unemployment Study"), {
      target: { value: "Youth Unemployment Study (extended)" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedItems).toContainEqual(
      expect.objectContaining({ category: "research", title: "Youth Unemployment Study (extended)" }),
    );
  });

  test("editing the education item's School field sends the edited displayName, with no entity link", async () => {
    await reachItemsReview();
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "Springfield International School" } });

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedItems).toContainEqual(
      expect.objectContaining({
        category: "education",
        organization: "Springfield International School",
        organizationEntityId: null,
      }),
    );
  });

  test("unchecking an item excludes it from the payload while the untouched item is still sent", async () => {
    await reachItemsReview();
    // Render order matches CATEGORY_LABELS' key order: education first, research second.
    fireEvent.click(screen.getAllByRole("checkbox")[0]); // education item

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    const payload = completeOnboarding.mock.calls[0][0];
    expect(payload.extractedItems).toEqual([
      expect.objectContaining({ category: "research", title: "Youth Unemployment Study" }),
    ]);
  });
});
