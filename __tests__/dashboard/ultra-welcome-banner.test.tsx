// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { UltraWelcomeBanner } from "@/features/dashboard/ultra-welcome-banner";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

afterEach(cleanup);

function renderBanner(locale: "en" | "tr" = "en") {
  const messages = locale === "tr" ? trMessages : enMessages;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UltraWelcomeBanner locale={locale} />
    </NextIntlClientProvider>,
  );
}

// Plain vitest matchers, not jest-dom's toBeInTheDocument (not registered in this
// project's vitest setup) — same convention __tests__/advisor/response-mode-slider.test.tsx
// already establishes: getByText/getByRole throw if nothing matches, so a truthy result IS
// "found"; queryBy* returns null on no match, so null IS "not found".
describe("UltraWelcomeBanner", () => {
  test("renders the real English copy naming the two genuine tier differences", () => {
    renderBanner("en");
    expect(screen.getByText("Welcome to Ultra")).toBeTruthy();
    // Reuses the exact comparison-table phrase (settings.plan.comparison.advisorAllowance.ultra)
    // rather than a paraphrase, so this claim can never quietly drift from the one it's
    // grounded in.
    expect(screen.getByText(/full-length replies for longer/i)).toBeTruthy();
  });

  test("renders real Turkish copy, not a translated placeholder", () => {
    renderBanner("tr");
    expect(screen.getByText("Ultra'ya hoş geldin")).toBeTruthy();
    expect(screen.getByText(/tam uzunlukta yanıtlar/i)).toBeTruthy();
  });

  test("dismiss button hides the banner immediately, with no server round-trip", () => {
    renderBanner("en");
    expect(screen.getByRole("note")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("note")).toBeNull();
  });

  test("never congratulates or praises -- states only what's available, per Phase 57", () => {
    renderBanner("en");
    const text = screen.getByRole("note").textContent ?? "";
    for (const word of ["congrat", "great choice", "amazing", "awesome"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });
});
