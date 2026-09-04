// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdvisorMessageThinking } from "@/components/proxola/advisor-message";

afterEach(() => cleanup());

/**
 * docs/advisor-latency-options-2026-09-04.md's cheap, no-quality-risk option, built:
 * AdvisorMessageThinking's placeholder used to be pulsing bars with no visible text and a
 * hardcoded English aria-label ("Composing a response") regardless of the page's real
 * locale. It now takes a `statusLabel` and uses the same string for both the visible line
 * and the accessible name — a screen reader and a sighted user hear/read the same claim,
 * and neither implies progress the client can't actually measure (features/advisor/
 * advisor-chat.tsx computes isThoroughReply and passes a different, still-true label for a
 * thorough-mode Ultra reply; nothing here is a timed sequence).
 */
describe("AdvisorMessageThinking statusLabel", () => {
  test("defaults to the general English label when no statusLabel is passed", () => {
    const { getByRole } = render(<AdvisorMessageThinking />);
    const status = getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Thinking about your profile");
    expect(status).toHaveTextContent("Thinking about your profile");
  });

  test("renders a caller-supplied statusLabel as both the visible text and the accessible name", () => {
    const { getByRole } = render(<AdvisorMessageThinking statusLabel="Writing a detailed answer" />);
    const status = getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Writing a detailed answer");
    expect(status).toHaveTextContent("Writing a detailed answer");
  });

  test("a Turkish statusLabel isn't silently dropped in favor of the English default", () => {
    const { getByRole } = render(<AdvisorMessageThinking locale="tr" statusLabel="Profilini inceliyor" />);
    const status = getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Profilini inceliyor");
    expect(status).toHaveTextContent("Profilini inceliyor");
  });
});
