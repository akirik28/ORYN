// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Turkish coverage for features/catalog/features-view.tsx (2026-09-01 i18n pass) —
 * check:i18n's own regex reported this file at 1 untranslated string; it actually had
 * ~21 (10 tile titles, 10 descriptions, "Open"), every one held in the FEATURES const
 * array, one of the two blind spots docs/i18n-coverage.md names explicitly ("strings held
 * in arrays and const maps"). Every tile is asserted here in both locales so a future
 * regression in any one of the ten isn't invisible to the same regex that missed them
 * the first time.
 *
 * Same next-intl/server environment constraint as error-surfaces-i18n.test.tsx — mocked
 * the same way, catalog-backed rather than hand-typed.
 */

function resolvePath(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages = (globalThis as { __testLocale?: "en" | "tr" }).__testLocale === "tr" ? tr : en;
    // Real next-intl translators accept dot-paths *within* the fetched namespace
    // (t("groups.yourRecord") when getTranslations("catalog") was the call) — this must
    // resolve the same way, not just single-segment keys, or a real component bug and a
    // mock bug look identical (both render empty).
    return (key: string) => resolvePath(messages, `${namespace}.${key}`) as string;
  },
}));

afterEach(() => {
  cleanup();
  delete (globalThis as { __testLocale?: "en" | "tr" }).__testLocale;
});

function withLocale(messages: typeof en, ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const EXPECTED_TILES_TR = [
  "CV Oluşturucu",
  "CV Tara",
  "Deneme Hikaye Bankası",
  "Portföy",
  "Belgeler",
  "Herkese açık profil",
  "Haftalık plan",
  "İlerleme",
  "Üniversiteleri karşılaştır",
  "Araştırma fikri üretici",
];

const EXPECTED_TILES_EN = [
  "CV Generator",
  "Scan a CV",
  "Essay Story Bank",
  "Portfolio",
  "Documents",
  "Public profile",
  "Weekly plan",
  "Progress",
  "Compare universities",
  "Research idea generator",
];

describe("FeaturesView renders every tile's translated title", () => {
  test("Turkish: all ten tile titles, the three group headers, and the page header translate", async () => {
    (globalThis as { __testLocale?: "en" | "tr" }).__testLocale = "tr";
    const { FeaturesView } = await import("@/features/catalog/features-view");
    withLocale(tr, await FeaturesView({ userId: "u-1" }));

    expect(screen.getByText("Oryn'ın yapabileceği her şey.")).toBeInTheDocument();
    expect(screen.getByText("Kaydın")).toBeInTheDocument();
    expect(screen.getByText("Planlama")).toBeInTheDocument();
    expect(screen.getByText("Keşif")).toBeInTheDocument();
    for (const title of EXPECTED_TILES_TR) {
      expect(screen.getByText(title), title).toBeInTheDocument();
    }
    expect(screen.getAllByText("Aç").length).toBe(10);
  });

  test("English: unaffected by the Turkish catalog", async () => {
    const { FeaturesView } = await import("@/features/catalog/features-view");
    withLocale(en, await FeaturesView({ userId: "u-1" }));

    expect(screen.getByText("Everything Oryn can do.")).toBeInTheDocument();
    for (const title of EXPECTED_TILES_EN) {
      expect(screen.getByText(title), title).toBeInTheDocument();
    }
  });
});
