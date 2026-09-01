// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import type { DimensionSignal } from "@/lib/scoring/signal";

/**
 * Turkish coverage for UserMenu (features/app-shell/user-menu.tsx), part of the 2026-09-01
 * pass through check:i18n's four "partly translated" files. Unlike dashboard-view.tsx (see
 * that file's own top-of-interface comment) or app/(app)/profile/page.tsx, this component
 * had zero already-bilingual coverage of its own strings — its only prior next-intl usage
 * was `useTranslations("nav")` for the shared secondary-nav labels, which is why it
 * registered as "locale-aware" at all while every string this file owns directly (the
 * account-menu aria-label, "Career profile", "Sign out", and the three-way coverage
 * summary) was still hardcoded English. Real gaps, not conditional branches — see this
 * session's report to CEO for the full per-file split across all four files.
 *
 * Menu-open pattern matches __tests__/app-shell/notification-bell.test.tsx's own
 * fireEvent.click + findByText approach for the same Base UI popover shape.
 */

vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));

import { UserMenu } from "@/features/app-shell/user-menu";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Only aggregate coverage counts (signalCoverage) are read by this component, so a
// repeated dimension key across entries is harmless here.
function signal(overrides: Partial<DimensionSignal>[]): DimensionSignal[] {
  return overrides.map((o) => ({ dimension: "academics", state: "not_assessed", score: 0, confidence: "low", ...o }));
}

function renderMenu(messages: typeof en, props: Partial<React.ComponentProps<typeof UserMenu>> = {}) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      <UserMenu displayName="Ada" email="ada@example.com" signal={[]} {...props} />
    </NextIntlClientProvider>,
  );
}

async function openMenu(triggerLabel: string) {
  fireEvent.click(screen.getByLabelText(triggerLabel));
  await screen.findByRole("menuitem", { name: /çıkış|sign out/i });
}

describe("UserMenu renders translated copy, not the hardcoded English it used to", () => {
  test("Turkish: both trigger variants get the translated aria-label", () => {
    renderMenu(tr, { variant: "sidebar" });
    expect(screen.getByLabelText("Hesap menüsü")).toBeInTheDocument();
    cleanup();
    renderMenu(tr, { variant: "compact" });
    expect(screen.getByLabelText("Hesap menüsü")).toBeInTheDocument();
  });

  test("English: the aria-label stays English", () => {
    renderMenu(en, { variant: "compact" });
    expect(screen.getByLabelText("Account menu")).toBeInTheDocument();
  });

  test("Turkish: 'Career profile' and 'Sign out' both translate once the menu opens", async () => {
    renderMenu(tr);
    await openMenu("Hesap menüsü");
    expect(screen.getByText("Kariyer profili")).toBeInTheDocument();
    expect(screen.getByText("Çıkış yap")).toBeInTheDocument();
  });

  test("Turkish: zero assessed dimensions shows the translated call-to-action, not a score", async () => {
    renderMenu(tr, { signal: signal([{ state: "not_assessed" }, { state: "not_assessed" }]) });
    await openMenu("Hesap menüsü");
    expect(screen.getByText("Neler yaptığını ekle")).toBeInTheDocument();
  });

  test("Turkish: at least one strong dimension shows the translated, correctly-pluralized count", async () => {
    renderMenu(tr, { signal: signal([{ state: "strong" }, { state: "strong" }, { state: "developing" }]) });
    await openMenu("Hesap menüsü");
    expect(screen.getByText("2 alan güçlü")).toBeInTheDocument();
  });

  test("Turkish: assessed-but-not-strong shows the translated assessed count", async () => {
    renderMenu(tr, { signal: signal([{ state: "developing" }, { state: "emerging" }]) });
    await openMenu("Hesap menüsü");
    expect(screen.getByText("2 alan değerlendirildi")).toBeInTheDocument();
  });

  test("English: singular vs plural both read naturally", async () => {
    renderMenu(en, { signal: signal([{ state: "strong" }]) });
    await openMenu("Account menu");
    expect(screen.getByText("1 area strong")).toBeInTheDocument();
  });
});
