// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Turkish coverage for the three route-level error/not-found surfaces (2026-09-01 i18n
 * pass) — app/(app)/error.tsx, app/(app)/not-found.tsx, app/not-found.tsx. Named as the
 * "worst possible moment for the seam to show": these render exactly when something has
 * already gone wrong, so an untranslated English page here reads worse than anywhere else
 * in an otherwise-Turkish product.
 *
 * error.tsx is a Client Component, tested directly. The two not-found pages are async
 * Server Components that call next-intl/server's getTranslations — tried rendering them
 * directly first (`render(await Component())`), and it fails outside real Next.js RSC
 * rendering: next-intl's own guard throws "getTranslations is not supported in Client
 * Components" the moment Vitest/jsdom (which has no RSC server context at all) evaluates
 * it, regardless of how the component itself is written. That is a hard constraint on the
 * test environment, not a missing convention — worth recording here so the next person
 * doesn't rediscover it by hand. Reused save-university-button.test.tsx's Server Action
 * mocking pattern for next-intl/server instead: replace the one function jsdom can't run
 * with a thin stand-in reading the real message catalogs, so the component's own key/
 * namespace usage is still what's under test, not a hand-typed string.
 */

function resolvePath(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
}

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages = (globalThis as { __testLocale?: "en" | "tr" }).__testLocale === "tr" ? tr : en;
    // Real next-intl translators accept dot-paths *within* the fetched namespace, not just
    // single-segment keys — resolved the same way here so a mock bug can't look like a
    // real component bug (both would otherwise render empty identically).
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

describe("app/(app)/error.tsx renders translated copy", () => {
  test("Turkish: description and both actions translate", async () => {
    const { default: AppError } = await import("@/app/(app)/error");
    withLocale(tr, <AppError error={Object.assign(new Error("boom"), { digest: "d1" })} retry={() => {}} />);
    expect(screen.getByText("Bu sayfa yüklenirken bir sorun oluştu. Hiçbir şey kaybolmadı — tekrar dene ya da panele geri dön.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Panele dön" })).toBeInTheDocument();
  });

  test("English: unaffected by the Turkish catalog", async () => {
    const { default: AppError } = await import("@/app/(app)/error");
    withLocale(en, <AppError error={Object.assign(new Error("boom"), { digest: "d1" })} retry={() => {}} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to dashboard" })).toBeInTheDocument();
  });
});

describe("app/(app)/not-found.tsx renders translated copy", () => {
  test("Turkish: title, description, and the dashboard link translate", async () => {
    (globalThis as { __testLocale?: "en" | "tr" }).__testLocale = "tr";
    const { default: AppNotFound } = await import("@/app/(app)/not-found");
    withLocale(tr, await AppNotFound());
    expect(screen.getByText("Bunu bulamadık")).toBeInTheDocument();
    expect(screen.getByText("Bu kaldırılmış olabilir, ya da bağlantı güncel değil.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Panele dön" })).toBeInTheDocument();
  });

  test("English: unaffected by the Turkish catalog", async () => {
    const { default: AppNotFound } = await import("@/app/(app)/not-found");
    withLocale(en, await AppNotFound());
    expect(screen.getByRole("button", { name: "Back to dashboard" })).toBeInTheDocument();
  });
});

describe("app/not-found.tsx (root) renders translated copy", () => {
  test("Turkish: same title/description as the app-level page, but links home not to the dashboard", async () => {
    (globalThis as { __testLocale?: "en" | "tr" }).__testLocale = "tr";
    const { default: RootNotFound } = await import("@/app/not-found");
    withLocale(tr, await RootNotFound());
    expect(screen.getByText("Bunu bulamadık")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ana sayfaya dön" })).toBeInTheDocument();
  });

  test("English: unaffected by the Turkish catalog", async () => {
    const { default: RootNotFound } = await import("@/app/not-found");
    withLocale(en, await RootNotFound());
    expect(screen.getByRole("button", { name: "Back to home" })).toBeInTheDocument();
  });
});
