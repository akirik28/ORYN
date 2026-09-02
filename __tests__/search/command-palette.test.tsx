// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import type { SearchResult } from "@/lib/search/types";

/**
 * 2026-09-02 search audit: this file (and search-view.tsx) had zero test coverage before.
 * The one real, confirmed finding from the audit is pinned here — before this package,
 * nothing in the app linked to app/(app)/search/page.tsx (the full search page: a
 * shareable URL, a real GET form, works without JS) at all. Not the nav (checked
 * nav-items.ts directly), not this dialog. A student could only reach it by typing the URL.
 * The fix is the "view all results" link this test covers; everything else about this
 * feature (what it searches, RLS scoping, empty states) was found to already be correctly,
 * thoroughly built — see docs/search-audit-2026-09-02.md.
 *
 * DEBOUNCE_MS in command-palette.tsx is 250 — same real-timer + generous-findBy-timeout
 * convention __tests__/entities/entity-combobox.test.tsx already established for its own
 * 300ms debounce, not vi.useFakeTimers().
 */
const DEBOUNCE_MS = 250;
const AFTER_DEBOUNCE = DEBOUNCE_MS + 200;

const searchAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/(app)/search/actions", () => ({ searchAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CommandPalette } from "@/features/search/command-palette";

function renderPalette() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CommandPalette />
    </NextIntlClientProvider>,
  );
}

async function openAndType(query: string) {
  renderPalette();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  const input = await screen.findByPlaceholderText("Search universities, opportunities, your profile…");
  fireEvent.change(input, { target: { value: query } });
  return input;
}

afterEach(() => {
  searchAction.mockReset();
  cleanup();
});

const RESULT: SearchResult = { type: "opportunity", id: "opp-1", title: "Breakthrough Junior Challenge", subtitle: "Breakthrough Prize", href: "/opportunities" };

describe("CommandPalette — 'view all results' link to the full search page", () => {
  test("appears once a real query is typed, pointing at /search with the query, and is not present before typing", async () => {
    searchAction.mockResolvedValue([RESULT]);
    await openAndType("robotics");

    const link = await screen.findByRole("link", { name: 'View all results for "robotics"' }, { timeout: AFTER_DEBOUNCE });
    expect(link).toHaveAttribute("href", "/search?q=robotics");
  });

  test("still appears with zero results — the escape hatch matters most exactly when the quick search comes up empty", async () => {
    searchAction.mockResolvedValue([]);
    await openAndType("zzz-nothing-matches");

    expect(await screen.findByText('No results for "zzz-nothing-matches".', {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: 'View all results for "zzz-nothing-matches"' })).toHaveAttribute(
      "href",
      "/search?q=zzz-nothing-matches",
    );
  });

  test("still appears when the quick search itself fails — the full page runs its own independent server fetch", async () => {
    searchAction.mockRejectedValue(new Error("network error"));
    await openAndType("robotics");

    expect(await screen.findByText("Search isn't available right now. Please try again.", {}, { timeout: AFTER_DEBOUNCE })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: 'View all results for "robotics"' })).toHaveAttribute("href", "/search?q=robotics");
  });

  test("does not appear for a query under 2 characters, or for an empty query", async () => {
    searchAction.mockResolvedValue([]);
    await openAndType("r");

    expect(screen.getByText("Keep typing — at least 2 characters.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View all results/ })).not.toBeInTheDocument();
  });

  test("clicking it closes the dialog", async () => {
    searchAction.mockResolvedValue([RESULT]);
    await openAndType("robotics");
    const link = await screen.findByRole("link", { name: 'View all results for "robotics"' }, { timeout: AFTER_DEBOUNCE });

    fireEvent.click(link);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("a query with special characters (e.g. an accented name) is correctly URL-encoded, not passed through raw", async () => {
    searchAction.mockResolvedValue([]);
    await openAndType("Boğaziçi & Sons");

    const link = await screen.findByRole("link", { name: /View all results/ }, { timeout: AFTER_DEBOUNCE });
    expect(link).toHaveAttribute("href", `/search?q=${encodeURIComponent("Boğaziçi & Sons")}`);
  });
});
