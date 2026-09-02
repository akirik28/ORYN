// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EvidenceSignal } from "@/components/oryn/evidence-signal";

/**
 * Regression coverage for the semantic-loss bug oryn-3f's fleet-wide survey found: an
 * earlier version put `.tier-grad-text` on both `neutral` and `positive`, which made them
 * render as the identical flame gradient under Ultra -- the one thing this component's tone
 * exists to do (tell "9 assessed" apart from "5 already strong" at a glance) stopped
 * working. Pins the fix's two guarantees: no tone's value ever carries a gradient class
 * (mirroring eyebrow.test.tsx's own "never touches the label" pattern for the thing a
 * reader actually has to read), and each tone still resolves to its own distinct semantic
 * color -- the fix removes the miscolored signal, it doesn't also remove the real one.
 */

afterEach(() => cleanup());

describe("EvidenceSignal — no tier-grad-text on the value, any tone", () => {
  test("neutral: plain ink, no gradient class", () => {
    const { getByText } = render(<EvidenceSignal label="Areas assessed" value="9" />);
    const value = getByText("9");

    expect(value).toHaveClass("text-ink-1");
    expect(value).not.toHaveClass("tier-grad-text");
  });

  test("positive: semantic success color, no gradient class", () => {
    const { getByText } = render(<EvidenceSignal label="Already strong" value="5" tone="positive" />);
    const value = getByText("5");

    expect(value).toHaveClass("text-success");
    expect(value).not.toHaveClass("tier-grad-text");
  });

  test("missing: unchanged, was never affected by the bug", () => {
    const { getByText } = render(<EvidenceSignal label="Verified research" value="0" tone="missing" />);
    const value = getByText("0");

    expect(value).toHaveClass("text-ink-3");
    expect(value).not.toHaveClass("tier-grad-text");
  });

  test("neutral and positive resolve to visibly different classes -- the actual regression this guards against", () => {
    const { getByText: getNeutral } = render(<EvidenceSignal label="Areas assessed" value="9" tone="neutral" />);
    const { getByText: getPositive } = render(<EvidenceSignal label="Already strong" value="5" tone="positive" />);

    expect(getNeutral("9").className).not.toBe(getPositive("5").className);
  });
});
