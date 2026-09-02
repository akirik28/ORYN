// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RatioRing } from "@/components/oryn/charts/ratio-ring";

/**
 * Pins RatioRing's own "honest about missing data" case specifically, since it's the one
 * chart in the kit where "no data" isn't just an absent point in a series — it's the
 * entire chart's only value. `value: null` must never render as a 0% ring (a measured
 * zero and an unmeasured figure are different facts, docs/admin-panel-architecture's own
 * D4 applied to a chart instead of a number). Also pins the status-color rule: an
 * over-capacity ring uses --destructive, never the admin theme accent.
 */

afterEach(() => cleanup());

describe("RatioRing — null value renders as unknown, not zero", () => {
  test("value: null shows the placeholder text, not a percentage", () => {
    const { getByText, queryByText } = render(<RatioRing value={null} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    expect(getByText("—")).toBeInTheDocument();
    expect(queryByText("0%")).not.toBeInTheDocument();
  });

  test("value: null renders a dashed ring (strokeDasharray set), signalling unmeasured rather than empty", () => {
    const { container } = render(<RatioRing value={null} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    const circles = container.querySelectorAll("circle");
    // Only the track circle renders when unknown — no filled arc circle at all.
    expect(circles).toHaveLength(1);
    expect(circles[0].getAttribute("stroke-dasharray")).toBeTruthy();
  });

  test("a real 0 value is distinguishable from null — renders 0%, not the placeholder", () => {
    const { getByText, queryByText } = render(<RatioRing value={0} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    expect(getByText("0%")).toBeInTheDocument();
    expect(queryByText("—")).not.toBeInTheDocument();
  });
});

describe("RatioRing — status color never comes from the admin theme accent", () => {
  test("under capacity uses the admin accent", () => {
    const { container } = render(<RatioRing value={500} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    const arc = container.querySelectorAll("circle")[1];
    expect(arc.getAttribute("stroke")).toBe("var(--admin-accent-bright)");
  });

  test("over capacity uses --destructive, not the admin accent", () => {
    const { container } = render(<RatioRing value={1500} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    const arc = container.querySelectorAll("circle")[1];
    expect(arc.getAttribute("stroke")).toBe("var(--destructive)");
  });
});

describe("RatioRing — accessible text alternative", () => {
  test("renders role=img with the given title as the accessible name", () => {
    const { getByRole } = render(<RatioRing value={500} max={1000} label="Budget" a11y={{ title: "Monthly budget used" }} />);
    expect(getByRole("img", { name: "Monthly budget used" })).toBeInTheDocument();
  });

  test("describes an unknown value in the generated description, not a fabricated percentage", () => {
    const { container } = render(<RatioRing value={null} max={1000} label="Budget" a11y={{ title: "Budget" }} />);
    const desc = container.querySelector("p.sr-only");
    expect(desc?.textContent).toMatch(/not measured/i);
  });
});
