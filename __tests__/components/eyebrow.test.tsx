// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Eyebrow } from "@/components/proxola/eyebrow";

/**
 * First direct coverage of Eyebrow -- added alongside its new `ultra` prop (Ultra visual
 * tier, opportunity-card.tsx's match-tier treatment), which is the first thing this 19+
 * caller-shared primitive has needed to gate rather than just render. Pins the two
 * guarantees the component's own doc comment makes: `ultra` only ever touches the rule bar
 * (never the label, per "tone colors the rule, never the label's neighbours"), and every
 * existing caller's output is byte-identical since `ultra` defaults to `false`.
 */

afterEach(() => cleanup());

describe("Eyebrow — ultra prop", () => {
  test("defaults to false -- the rule bar carries only its tone class, same as before this prop existed", () => {
    const { container } = render(<Eyebrow tone="brand">Strong match</Eyebrow>);
    const rule = container.querySelector("span[aria-hidden]");

    expect(rule).toHaveClass("bg-brand-primary");
    expect(rule).not.toHaveClass("tier-grad-fill");
    expect(rule).not.toHaveClass("tier-glow-sm");
  });

  test("ultra=true adds the gradient-fill and glow classes to the rule bar, keeping the tone class too", () => {
    const { container } = render(
      <Eyebrow tone="brand" ultra>
        Strong match
      </Eyebrow>,
    );
    const rule = container.querySelector("span[aria-hidden]");

    expect(rule).toHaveClass("bg-brand-primary");
    expect(rule).toHaveClass("tier-grad-fill");
    expect(rule).toHaveClass("tier-glow-sm");
  });

  test("ultra=true never touches the label -- gradient text on this label would violate the component's own 'never color the label' rule", () => {
    const { getByText } = render(
      <Eyebrow tone="brand" ultra>
        Strong match
      </Eyebrow>,
    );
    const label = getByText("Strong match");

    expect(label).not.toHaveClass("tier-grad-text");
    expect(label).not.toHaveClass("tier-grad-fill");
    expect(label).toHaveClass("text-ink-3");
  });

  test("ultra=true with rule=false renders no rule bar at all -- nothing for the ultra classes to attach to", () => {
    const { container } = render(
      <Eyebrow tone="brand" ultra rule={false}>
        Strong match
      </Eyebrow>,
    );

    expect(container.querySelector("span[aria-hidden]")).not.toBeInTheDocument();
  });
});
