// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SourceBadge } from "@/components/proxola/source-badge";

/**
 * First direct coverage of SourceBadge -- added alongside its new `asOf` prop (B5,
 * 2026-09-04): `university_profile_metrics.stats_as_of` exists in the schema and is
 * populated on every tuition row (296/296, live-verified) but no caller ever selected or
 * rendered it, so a tuition figure's period was indistinguishable from an unlabelled one on
 * screen. Pins the two guarantees that matter here: `asOf` renders verbatim as free text
 * (never reformatted, never treated as a parseable date) when present, and renders nothing
 * at all -- not a placeholder -- when it's null, undefined, or blank. Also pins that every
 * existing prop keeps its exact current output when `asOf` isn't passed, since five other
 * call sites (opportunities detail, universities compare, both dev-preview mirrors) never
 * pass it and must not change.
 */

afterEach(() => cleanup());

describe("SourceBadge — asOf", () => {
  test("renders the as-of label and value verbatim when stats_as_of is populated", () => {
    const { getByText } = render(
      <SourceBadge
        sourceName="Official university website"
        asOf="2026/27 (no state tuition law outside Baden-Württemberg)"
        asOfLabel="As of:"
      />,
    );

    expect(getByText("2026/27 (no state tuition law outside Baden-Württemberg)")).toBeInTheDocument();
    expect(getByText("As of:")).toBeInTheDocument();
  });

  test("renders nothing extra when asOf is absent -- no placeholder, no empty label", () => {
    const { queryByText, container } = render(<SourceBadge sourceName="Official university website" asOfLabel="As of:" />);

    expect(queryByText("As of:")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("As of");
  });

  test("renders nothing extra when asOf is null (the Supabase row shape for an unset column)", () => {
    const { queryByText } = render(<SourceBadge sourceName="Official university website" asOf={null} asOfLabel="As of:" />);

    expect(queryByText("As of:")).not.toBeInTheDocument();
  });

  test("renders nothing extra when asOf is whitespace-only", () => {
    const { queryByText } = render(<SourceBadge sourceName="Official university website" asOf="   " asOfLabel="As of:" />);

    expect(queryByText("As of:")).not.toBeInTheDocument();
  });

  test("never parses or reformats asOf -- a full caveat sentence renders exactly as stored", () => {
    const sentence = "2024/25 academic year (page's own most recent posted table; 2025/26 figures will be announced separately by mid-August)";
    const { getByText } = render(<SourceBadge sourceName="Official university website" asOf={sentence} asOfLabel="As of:" />);

    expect(getByText(sentence)).toBeInTheDocument();
  });

  test("existing props keep their exact current output when asOf is not passed", () => {
    const { getByText, queryByText } = render(
      <SourceBadge sourceName="College Scorecard" checkedAt={new Date()} url="https://example.com" sourceLabel="Source:" viewSourceLabel="View source" />,
    );

    expect(getByText("College Scorecard")).toBeInTheDocument();
    expect(getByText("View source")).toBeInTheDocument();
    expect(queryByText("As of:")).not.toBeInTheDocument();
  });
});
