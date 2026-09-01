// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { checkUndergraduateFieldAvailability } from "@/lib/admissions/field-availability";
import { computeAdmissionOutlook } from "@/lib/admissions/outlook";
import { resolveAdmissionSystem } from "@/lib/admissions/system-shape";

/**
 * `not_applicable` (migration 0049) is one persisted enum member standing for reasons that
 * are not variations of each other, and the badge described all of them with the sentence
 * that fits only one.
 *
 * "Not a profile-review system" is true of a Turkish or Dutch target: an undergraduate
 * admission exists and the mechanism simply doesn't read a student's activities. It is flatly
 * false of undergraduate Medicine or Law in the US, where the finding (RULE-ADMISSIONS-021)
 * is that the degree does not exist at that level — there is no admission of any kind to
 * characterise, so the badge was implying a judgement about a process the student would then
 * go looking for.
 *
 * The inputs below are computed through the real `computeAdmissionOutlook` rather than
 * hand-written props, so this fails if the badge and the model ever disagree about which kind
 * a target produces.
 */

afterEach(cleanup);

const HIGH_ACHIEVER = { profileStrength: 85, admissionRate: 0.12, dataConfidence: "high" as const };

describe("OutlookBadge — US undergraduate Medicine and Law do not exist as bachelor's degrees", () => {
  test("US undergraduate Medicine reads as 'Not an undergraduate degree here', not as a judgement on a review process", () => {
    const outlook = computeAdmissionOutlook({
      ...HIGH_ACHIEVER,
      fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }),
    });
    expect(outlook.outlook).toBe("not_applicable");
    expect(outlook.notApplicableKind).toBe("field_not_offered_at_undergraduate");

    render(<OutlookBadge outlook={outlook.outlook} notApplicableKind={outlook.notApplicableKind} />);
    expect(screen.getByText("Not an undergraduate degree here")).toBeInTheDocument();
    expect(screen.queryByText("Not a profile-review system")).not.toBeInTheDocument();
  });

  test("US undergraduate Law reads the same way — the JD is a postgraduate degree", () => {
    const outlook = computeAdmissionOutlook({
      ...HIGH_ACHIEVER,
      fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "law" }),
    });
    render(<OutlookBadge outlook={outlook.outlook} notApplicableKind={outlook.notApplicableKind} />);
    expect(screen.getByText("Not an undergraduate degree here")).toBeInTheDocument();
  });

  test("a Turkish target still reads as 'Not a profile-review system' — the two reasons stay distinct", () => {
    const outlook = computeAdmissionOutlook({
      ...HIGH_ACHIEVER,
      admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey", targetUniversityName: "Boğaziçi University", targetField: null }),
    });
    expect(outlook.outlook).toBe("not_applicable");
    render(<OutlookBadge outlook={outlook.outlook} notApplicableKind={outlook.notApplicableKind} />);
    expect(screen.getByText("Not a profile-review system")).toBeInTheDocument();
  });

  test("with no kind supplied the badge claims only what not_applicable itself guarantees", () => {
    // The dashboard's case: it lists targets without resolving each one's field or admissions
    // mechanism. A neutral truth there beats a specific falsehood — asserting "not a
    // profile-review system" over a US Medicine target would be exactly wrong.
    render(<OutlookBadge outlook="not_applicable" />);
    expect(screen.getByText("Not rated on this scale")).toBeInTheDocument();
    expect(screen.queryByText("Not a profile-review system")).not.toBeInTheDocument();
  });

  test("UK Medicine is an undergraduate degree, so the scale still applies and a normal label is shown", () => {
    const outlook = computeAdmissionOutlook({
      ...HIGH_ACHIEVER,
      fieldAvailability: checkUndergraduateFieldAvailability({ country: "United Kingdom", field: "medicine" }),
    });
    expect(outlook.outlook).not.toBe("not_applicable");
    render(<OutlookBadge outlook={outlook.outlook} />);
    expect(screen.queryByText(/Not an undergraduate degree here|Not rated on this scale/)).not.toBeInTheDocument();
  });

  test("an unassessed target is still distinct from an inapplicable one", () => {
    render(<OutlookBadge outlook={null} />);
    expect(screen.getByText("Not yet assessed")).toBeInTheDocument();
  });
});

/**
 * Turkish coverage added 2026-09-01 i18n pass. "Reach/Competitive/Likely" are Oryn's own
 * classification words, not fixed external vocabulary a student has to recognize on a real
 * form (unlike "Early Decision" — see applications.newDialog's own catalog comment on that
 * distinction) — translated rather than kept as English loanwords. `locale` defaults to
 * English, so every test above this block is unaffected by these labels existing at all.
 */
describe("OutlookBadge renders Turkish labels when locale=\"tr\"", () => {
  test("the five real outlook classes translate", () => {
    const cases: [ReturnType<typeof computeAdmissionOutlook>["outlook"], string][] = [
      ["extreme_reach", "Aşırı Zorlu"],
      ["reach", "Zorlu"],
      ["competitive", "Rekabetçi"],
      ["strong", "Güçlü"],
      ["likely", "Olası"],
    ];
    for (const [outlook, label] of cases) {
      const { unmount } = render(<OutlookBadge outlook={outlook} locale="tr" />);
      expect(screen.getByText(label), outlook).toBeInTheDocument();
      unmount();
    }
  });

  test("not_applicable with no kind reads the translated neutral fallback", () => {
    render(<OutlookBadge outlook="not_applicable" locale="tr" />);
    expect(screen.getByText("Bu ölçekte değerlendirilmiyor")).toBeInTheDocument();
  });

  test("the two not_applicable reason classes stay distinct in Turkish too", () => {
    const fieldGap = computeAdmissionOutlook({
      ...HIGH_ACHIEVER,
      fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }),
    });
    render(<OutlookBadge outlook={fieldGap.outlook} notApplicableKind={fieldGap.notApplicableKind} locale="tr" />);
    expect(screen.getByText("Burada lisans programı değil")).toBeInTheDocument();
    expect(screen.queryByText("Profil değerlendirmeli bir sistem değil")).not.toBeInTheDocument();
  });

  test("an unassessed target translates too", () => {
    render(<OutlookBadge outlook={null} locale="tr" />);
    expect(screen.getByText("Henüz değerlendirilmedi")).toBeInTheDocument();
  });
});
