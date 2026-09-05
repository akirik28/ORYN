// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { renderEligibilityNotes, classifyEligibilityGap, type EligibilityNote } from "@/lib/opportunities/matching";
import type { Opportunity } from "@/types/database";

/**
 * CEO, 2026-09-05: `opportunity-card.tsx` badged three meaningfully different "we don't have a
 * confirmed answer" situations identically — one generic orange "Eligibility unknown" warning,
 * regardless of whether the gap was in the OPPORTUNITY's own research (never looked / looked and
 * the source stayed silent) or in the STUDENT's own profile (age/country/grade not entered yet).
 * A brand-new, empty-profile account was the worst case: nearly every card on "For You" would
 * carry the identical warning, for a reason the student could fix in seconds. This file proves
 * the fix render-first (real component, real DOM, real message catalogs in both locales), not by
 * reading the JSX — same discipline as university-card-honest-badge.test.tsx.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/(app)/opportunities/actions", () => ({ setOpportunityStatus: vi.fn() }));

import { OpportunityCard } from "@/features/opportunities/opportunity-card";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    title: "Test Summer Research Program",
    organization: "Test University",
    description: "A real research opportunity.",
    category: "research",
    official_url: "https://example.org",
    application_url: null,
    country: null,
    remote_allowed: null,
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    fields: [],
    cost: null,
    funding_available: null,
    deadline: "2027-01-15",
    start_date: null,
    end_date: null,
    source: null,
    source_url: null,
    source_confidence: "medium",
    last_verified_at: "2026-09-01T00:00:00Z",
    status: "active",
    normalized_title: "test summer research program",
    cycle_status: "open",
    selectivity_tier: "unknown",
    verification_state: "unverified",
    application_open_date: null,
    eligible_grades: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    eligible_citizenships: [],
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    languages_of_instruction: [],
    image_url: null,
    image_source_url: null,
    image_attribution: null,
    verified_at: "2026-09-01T00:00:00Z",
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
    age_eligibility_confirmed_open: false,
    grade_eligibility_confirmed_open: false,
    age_eligibility_basis: null,
    grade_eligibility_basis: null,
    country_eligibility_basis: null,
    source_verified_at: "2026-09-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const baseProps = {
  opportunity: makeOpportunity(),
  matchScore: 70,
  reasonCodes: [] as string[],
  initialStatus: null,
};

function renderCard(
  locale: "en" | "tr",
  notes: EligibilityNote[],
  opts: { eligible?: boolean } = {},
) {
  const eligibilityNotes = renderEligibilityNotes(notes, locale);
  const eligibilityGap = classifyEligibilityGap(notes);
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en}>
      <OpportunityCard
        {...baseProps}
        eligible={opts.eligible ?? true}
        eligibilityNotes={eligibilityNotes}
        eligibilityGap={eligibilityGap}
      />
    </NextIntlClientProvider>,
  );
}

describe("profile_incomplete — the student's own missing data, not a caveat about the opportunity", () => {
  test("RED->GREEN: does NOT show the generic warning badge (the old, undifferentiated behavior)", () => {
    renderCard("en", [{ code: "age_unknown" }]);
    // Would have matched before this fix — the old code showed this badge for ANY non-empty
    // notes whenever eligible was true, with no distinction by cause.
    expect(screen.queryByText("Eligibility unknown")).not.toBeInTheDocument();
    expect(screen.queryByText("Checked, not stated")).not.toBeInTheDocument();
  });

  test("RED->GREEN: the caveat itself becomes a real link to /profile", () => {
    renderCard("en", [{ code: "age_unknown" }]);
    const link = screen.getByRole("link", { name: /add your birth year to check/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/profile");
  });

  test("country_unknown and grade_unknown both route to the same profile-completion link", () => {
    renderCard("en", [{ code: "country_unknown" }]);
    expect(screen.getByRole("link", { name: /add your country to check/i })).toHaveAttribute("href", "/profile");
    cleanup();
    renderCard("en", [{ code: "grade_unknown" }]);
    expect(screen.getByRole("link", { name: /add your graduation year to check/i })).toHaveAttribute("href", "/profile");
  });

  test("Turkish locale: the same real sentence, also a link, not a re-scoped claim", () => {
    renderCard("tr", [{ code: "age_unknown" }]);
    const link = screen.getByRole("link", { name: /doğum yılını ekle/i });
    expect(link).toHaveAttribute("href", "/profile");
    expect(screen.queryByText("Uygunluk belirsiz")).not.toBeInTheDocument();
  });

  test("wins over a simultaneous unverified note on a different axis (precedence, matching classifyEligibilityGap's own contract)", () => {
    renderCard("en", [{ code: "age_unknown" }, { code: "country_eligibility_unverified" }]);
    expect(screen.queryByText("Eligibility unknown")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add your birth year to check/i })).toHaveAttribute("href", "/profile");
  });
});

describe("checked_not_stated — a real research pass, source silent — stays distinct from unverified", () => {
  test("RED->GREEN: shows its own calmer badge, not the plain warning", () => {
    renderCard("en", [{ code: "age_eligibility_checked_not_stated", params: { checkedAt: "" } }]);
    expect(screen.getByText("Checked, not stated")).toBeInTheDocument();
    expect(screen.queryByText("Eligibility unknown")).not.toBeInTheDocument();
  });

  test("Turkish locale carries the same distinction", () => {
    renderCard("tr", [{ code: "age_eligibility_checked_not_stated", params: { checkedAt: "" } }]);
    expect(screen.getByText("Kontrol edildi, belirtilmemiş")).toBeInTheDocument();
    expect(screen.queryByText("Uygunluk belirsiz")).not.toBeInTheDocument();
  });

  test("the underlying sentence is plain text here, not a link — there's nothing the student can do about it", () => {
    renderCard("en", [{ code: "age_eligibility_checked_not_stated", params: { checkedAt: "" } }]);
    expect(screen.queryByRole("link", { name: /does?n't state an age requirement/i })).not.toBeInTheDocument();
    expect(screen.getByText(/does?n't state an age requirement/i)).toBeInTheDocument();
  });
});

describe("plain unverified — regression: the untouched case keeps today's exact behavior", () => {
  test("still shows the plain warning badge, unchanged", () => {
    renderCard("en", [{ code: "age_eligibility_unverified" }]);
    expect(screen.getByText("Eligibility unknown")).toBeInTheDocument();
  });

  test("stays the warning badge even alongside a checked_not_stated note on another axis (unverified doesn't get softened by proximity)", () => {
    renderCard("en", [{ code: "age_eligibility_unverified" }, { code: "country_eligibility_checked_not_stated", params: { checkedAt: "" } }]);
    expect(screen.getByText("Eligibility unknown")).toBeInTheDocument();
    expect(screen.queryByText("Checked, not stated")).not.toBeInTheDocument();
  });
});
