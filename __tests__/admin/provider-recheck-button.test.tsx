// @vitest-environment jsdom
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * "not configured" (no API key — Tavily/College Scorecard today) must read as a calm,
 * distinct fact from a real check that failed — collapsing the two into the same error
 * toast would make an unconfigured provider look like it's actively broken.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/admin/actions", () => ({ recheckProvider: vi.fn() }));

import { ProviderRecheckButton } from "@/features/admin/provider-recheck-button";
import { recheckProvider } from "@/app/(app)/admin/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderButton(provider: string, label: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ProviderRecheckButton provider={provider} label={label} />
    </NextIntlClientProvider>,
  );
}

test("a real success shows a success toast naming the provider", async () => {
  vi.mocked(recheckProvider).mockResolvedValue({});
  renderButton("openalex", "OpenAlex");
  fireEvent.click(screen.getByRole("button", { name: "Re-check now" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("OpenAlex responded OK just now."));
});

test("an unconfigured provider (no API key) shows an info toast, not an error", async () => {
  vi.mocked(recheckProvider).mockResolvedValue({ notConfigured: true });
  renderButton("tavily", "Tavily");
  fireEvent.click(screen.getByRole("button", { name: "Re-check now" }));
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Tavily has no API key configured — nothing to check yet."));
  expect(toast.error).not.toHaveBeenCalled();
});

test("a real check failure shows an error toast with the actual message", async () => {
  vi.mocked(recheckProvider).mockResolvedValue({ error: "Anthropic rejected the API credential (HTTP 401)." });
  renderButton("anthropic", "Anthropic");
  fireEvent.click(screen.getByRole("button", { name: "Re-check now" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Anthropic check failed: Anthropic rejected the API credential (HTTP 401)."),
  );
});

test("calls recheckProvider with the raw provider id, not the display label", async () => {
  vi.mocked(recheckProvider).mockResolvedValue({});
  renderButton("college_scorecard", "College Scorecard");
  fireEvent.click(screen.getByRole("button", { name: "Re-check now" }));
  await waitFor(() => expect(recheckProvider).toHaveBeenCalledWith("college_scorecard"));
});
