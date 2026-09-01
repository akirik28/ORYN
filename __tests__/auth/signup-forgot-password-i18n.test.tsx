// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Turkish coverage for the signup and forgot-password forms (2026-09-01 i18n pass) — both
 * were entirely hardcoded English, unlike login/reset-password which already used the
 * auth.login / auth.resetPassword namespaces this pass reuses for the shared validators.
 */

vi.mock("@/app/(auth)/actions", () => ({ signUp: vi.fn(), requestPasswordReset: vi.fn() }));

import { SignUpForm } from "@/app/(auth)/_components/signup-form";
import { ForgotPasswordForm } from "@/app/(auth)/_components/forgot-password-form";

afterEach(() => {
  cleanup();
});

function withLocale(messages: typeof en, ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SignUpForm renders translated copy", () => {
  test("Turkish: every label, the password hint, and the submit button translate", () => {
    withLocale(tr, <SignUpForm locale="tr" />);
    expect(screen.getByText("Görünen ad")).toBeInTheDocument();
    expect(screen.getByText("E-posta")).toBeInTheDocument();
    expect(screen.getByText("Şifre")).toBeInTheDocument();
    expect(screen.getByText("En az 8 karakter, bir harf ve bir rakam içermeli.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hesap oluştur" })).toBeInTheDocument();
  });

  test("English: unaffected by the Turkish catalog", () => {
    withLocale(en, <SignUpForm locale="en" />);
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });
});

describe("ForgotPasswordForm renders translated copy", () => {
  test("Turkish: the email label and submit button translate", () => {
    withLocale(tr, <ForgotPasswordForm />);
    expect(screen.getByText("E-posta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sıfırlama bağlantısı gönder" })).toBeInTheDocument();
  });

  test("English: unaffected by the Turkish catalog", () => {
    withLocale(en, <ForgotPasswordForm />);
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });
});
