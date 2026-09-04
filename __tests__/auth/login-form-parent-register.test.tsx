// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import "@testing-library/jest-dom/vitest";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

/**
 * Turkish voice pass (2026-09-04) — app/(auth)/_components/login-form.tsx is shared between
 * /login (student, "sen") and /parent/login (parent, "siz" — this codebase's own established
 * parent register, see features/parent/parent-panel-view.tsx). Found live: the form's
 * "Forgot your password?" link read "Şifreni mi unuttun?" (sen) even on the parent login
 * page, whose own surrounding heading/subheading already correctly used "siz". Same
 * shared-component-two-audiences shape as features/advisor/upgrade-prompt-overlay.tsx's
 * namespace prop, fixed the identical way — pins that both namespaces actually render, and
 * that they differ exactly where the register does (the one string with a real sen/siz
 * marker), not that they're byte-identical (they aren't, and shouldn't be).
 */

vi.mock("@/app/(auth)/actions", () => ({ signIn: vi.fn() }));

import { LoginForm } from "@/app/(auth)/_components/login-form";

afterEach(() => cleanup());

function renderForm(locale: "en" | "tr", namespace?: "auth.login" | "parent.login") {
  const messages = locale === "tr" ? trMessages : enMessages;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoginForm namespace={namespace} />
    </NextIntlClientProvider>,
  );
}

describe("LoginForm — default namespace (student /login), unchanged", () => {
  test("Turkish renders the student (sen) forgot-password copy by default", () => {
    renderForm("tr");
    expect(screen.getByText("Şifreni mi unuttun?")).toBeInTheDocument();
  });

  test("English is register-neutral either way", () => {
    renderForm("en");
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});

describe("LoginForm — namespace=\"parent.login\" (the parent entrance)", () => {
  test("Turkish renders the parent (siz) forgot-password copy, not the student's sen version", () => {
    renderForm("tr", "parent.login");
    expect(screen.getByText("Şifrenizi mi unuttunuz?")).toBeInTheDocument();
    expect(screen.queryByText("Şifreni mi unuttun?")).not.toBeInTheDocument();
  });

  test("email/password labels and the submit button still resolve under the parent namespace", () => {
    renderForm("tr", "parent.login");
    expect(screen.getByText("E-posta")).toBeInTheDocument();
    expect(screen.getByText("Şifre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Giriş yapın" })).toBeInTheDocument();
  });
});
