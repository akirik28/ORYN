// @vitest-environment jsdom
import { describe, expect, test, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { UniversityCard } from "@/features/universities/university-card";
import type { University } from "@/types/database";

/**
 * CEO's fix, following the browse-list-honesty-audit-2026-09-04.md finding: the "Detailed
 * profile" badge and the detail page's own honest empty-state notes were making opposite
 * claims about the same university. Confirmed live for two real cases — MIT (badged
 * "Detailed profile" on the card; detail page says "Proxola hasn't confirmed this
 * university's application deadline yet") and Oxford (same badge; detail page says
 * "admission rate, test scores, and graduation rate aren't in Proxola's records yet").
 *
 * CEO's decision, deliberately NOT one of the two options this audit proposed: don't touch
 * the underlying check (`getAllResearchDepthUniversityIds` / `hasResearchDepth` — "this
 * university has SOME real research on file" is a true and useful signal, the 316-vs-703
 * split it draws is real information). Don't add a second, narrower badge either ("a badge on
 * every card teaches the warning, it blinds you" — said three times tonight). Change what the
 * one badge CLAIMS instead: from "Detailed profile" (a completeness promise the detail page
 * then breaks) to "Researched" (a status statement the same data genuinely supports — some
 * research exists, no claim about how much).
 *
 * This file proves the new claim, not the old one: renders the real `UniversityCard`
 * component with MIT's own real props (id, name, city, country — same real values as
 * compare-page-render.test.tsx's own MIT fixture) and `hasResearchDepth={true}` (the true
 * state for MIT — it has real rows in all four depth tables), through the real
 * `NextIntlClientProvider` with the real, just-edited message catalogs — not a mocked
 * translation key — so this is the actual string a student would read, in both locales.
 */

const MIT: University = {
  id: "03167d0c-2315-49e3-a37e-f9c9c7d2d27c",
  name: "Massachusetts Institute of Technology",
  country: "United States",
  city: "Cambridge",
  institution_type: "Private nonprofit",
  canonical_entity_id: null,
  country_entity_id: null,
  city_entity_id: null,
  website_url: "https://mit.edu",
  admissions_url: "https://mitadmissions.org",
  application_system: null,
  logo_url: null,
  description: null,
  selectivity: null,
  student_size: 11816,
  latitude: null,
  longitude: null,
  external_ids: {},
  data_confidence: "high",
  data_status: "fresh",
  last_checked_at: null,
  last_changed_at: null,
  last_change_kind: null,
  duplicate_status: "canonical",
  superseded_by_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderCard(locale: "en" | "tr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en}>
      <UniversityCard university={MIT} isSaved={false} hasResearchDepth={true} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("UniversityCard's depth badge — status, not a promise (CEO's fix, 2026-09-04)", () => {
  test("RED->GREEN: the old completeness claim is gone", () => {
    renderCard("en");
    // Would have matched before this fix — asserting its absence is the actual proof this
    // test protects, not just that some replacement text showed up.
    expect(screen.queryByText("Detailed profile")).not.toBeInTheDocument();
  });

  test("RED->GREEN: the new status text renders instead, in English", () => {
    renderCard("en");
    expect(screen.getByText("Researched")).toBeInTheDocument();
  });

  test("the Turkish string makes the identical claim, not a differently-scoped one", () => {
    renderCard("tr");
    expect(screen.queryByText("Detaylı profil")).not.toBeInTheDocument();
    expect(screen.getByText("Araştırılmış")).toBeInTheDocument();
  });

  test("the new text does not itself smuggle a completeness claim back in", () => {
    // The whole point of the fix: nothing in the badge's own text should read as "this
    // university's profile is thorough/complete" the way "Detailed profile" did. A word-level
    // check that the specific claims the detail page can contradict aren't present.
    renderCard("en");
    const badge = screen.getByText("Researched");
    const claimWords = ["detail", "complete", "full", "thorough"];
    for (const word of claimWords) {
      expect(badge.textContent?.toLowerCase()).not.toContain(word);
    }
  });

  test("never rendered as an explicit negative — a university with no depth still shows no badge at all, same as before this fix", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <UniversityCard university={{ ...MIT, id: "no-depth-university" }} isSaved={false} hasResearchDepth={false} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText("Researched")).not.toBeInTheDocument();
    expect(screen.queryByText(/not researched/i)).not.toBeInTheDocument();
  });
});

/**
 * The second half of "prove they no longer contradict": MIT's real detail-page message,
 * confirmed live and quoted verbatim in browse-list-honesty-audit-2026-09-04.md §5 (no
 * detail-page render harness existed to extend the way compare-page-render.test.tsx did for
 * the compare page — building one from scratch is a much larger undertaking than this fix,
 * which only ever touched two message-catalog strings; the live-verified quote plus this
 * card-level proof together cover the actual change).
 */
describe("the juxtaposition this fix removes — quoted from the real detail-page message a click-through shows", () => {
  test("MIT's badge claim and MIT's detail-page message no longer assert opposite things", () => {
    renderCard("en");
    const badgeText = screen.getByText("Researched").textContent ?? "";
    // Verified live 2026-09-04 (browse-list-honesty-audit-2026-09-04.md §5): MIT's real
    // university_deadlines rows are both deadline_type "scholarship" -- lacksApplicationDeadline
    // is true -- app/(app)/universities/[id]/page.tsx renders exactly this en.json string.
    const detailPageMessage = en.universities.detail.applicationDeadlineUnconfirmedMessage;

    // Before this fix: badgeText was "Detailed profile" -- a completeness claim -- while the
    // detail page said the deadline "hasn't [been] confirmed... yet". Those two sentences
    // describe the same university in opposite terms. After this fix, the badge claims only
    // that some research happened; it makes no claim the detail page could then contradict.
    expect(badgeText).toBe("Researched");
    expect(detailPageMessage).toContain("hasn't confirmed");
    expect(badgeText.toLowerCase()).not.toContain("confirmed");
    expect(badgeText.toLowerCase()).not.toContain("deadline");
  });
});
