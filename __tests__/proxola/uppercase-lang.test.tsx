// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => cleanup());

/**
 * Regression coverage for the dotted-İ bug: CSS `text-transform: uppercase` case-folds per
 * the *element's own effective `lang`*, not per some notion of "the text's real language"
 * — under an ancestor `lang="tr"`, an uppercased "i" in English text becomes "İ" (dotted),
 * not "I". Reproduced live on /dashboard, /advisor and 17 other files (CFO's count) before
 * this fix: "Why this" rendered "WHY THİS", "This month" rendered "THİS MONTH".
 *
 * These tests assert the actual DOM `lang` attribute each component renders — the thing
 * the browser's case-folding algorithm actually reads — not just "it doesn't crash".
 * Snapshotting the uppercased text itself would not catch this class of bug: jsdom doesn't
 * implement CSS text-transform, so the corruption only ever appears in a real browser (see
 * this branch's own manual verification against a live dev server). The `lang` attribute
 * is the testable proxy for "will this render correctly."
 */

import { Eyebrow } from "@/components/proxola/eyebrow";
import { EvidenceSignal } from "@/components/proxola/evidence-signal";
import { AdvisorMessage, AdvisorMessageThinking } from "@/components/proxola/advisor-message";
import { NextMove } from "@/components/proxola/next-move";

describe("Eyebrow", () => {
  test("defaults to lang=en (today's un-migrated callers are all English)", () => {
    const { container } = render(<Eyebrow>Why this</Eyebrow>);
    expect(container.querySelector("span[lang]")).toHaveAttribute("lang", "en");
  });

  test("a caller that has translated its label passes locale=tr and gets it", () => {
    const { container } = render(<Eyebrow locale="tr">Neden bu</Eyebrow>);
    expect(container.querySelector("span[lang]")).toHaveAttribute("lang", "tr");
  });
});

describe("EvidenceSignal", () => {
  test("figcaption defaults to lang=en", () => {
    const { container } = render(<EvidenceSignal label="Areas assessed" value={3} />);
    expect(container.querySelector("figcaption")).toHaveAttribute("lang", "en");
  });

  test("figcaption honors an explicit Turkish locale", () => {
    const { container } = render(<EvidenceSignal label="Değerlendirilen alan" value={3} locale="tr" />);
    expect(container.querySelector("figcaption")).toHaveAttribute("lang", "tr");
  });
});

describe("AdvisorMessage", () => {
  test("proxola variant's default attribution mark defaults to lang=en, text 'Proxola'", () => {
    const { container, getByText } = render(<AdvisorMessage>Some counsel.</AdvisorMessage>);
    expect(getByText("Proxola")).toHaveAttribute("lang", "en");
    expect(container.querySelector('[lang="en"]')).toBeInTheDocument();
  });

  test("proxola variant under locale=tr still renders 'Proxola' (brand name, not translated) with lang=tr", () => {
    const { getByText } = render(<AdvisorMessage locale="tr">Bazı tavsiyeler.</AdvisorMessage>);
    expect(getByText("Proxola")).toHaveAttribute("lang", "tr");
  });

  test("student variant's default mark is 'You' in English, 'Sen' in Turkish", () => {
    const en = render(<AdvisorMessage variant="student">A question.</AdvisorMessage>);
    expect(en.getByText("You")).toHaveAttribute("lang", "en");
    cleanup();

    const tr = render(<AdvisorMessage variant="student" locale="tr">Bir soru.</AdvisorMessage>);
    expect(tr.getByText("Sen")).toHaveAttribute("lang", "tr");
  });

  test("an explicitly-passed attribution is rendered as-is, tagged with the given locale", () => {
    const { getByText } = render(
      <AdvisorMessage attribution="Danışman" locale="tr">
        Metin.
      </AdvisorMessage>,
    );
    expect(getByText("Danışman")).toHaveAttribute("lang", "tr");
  });

  test("AdvisorMessageThinking's mark follows the same default/override rule", () => {
    const en = render(<AdvisorMessageThinking />);
    expect(en.getByText("Proxola")).toHaveAttribute("lang", "en");
    cleanup();
    const tr = render(<AdvisorMessageThinking locale="tr" />);
    expect(tr.getByText("Proxola")).toHaveAttribute("lang", "tr");
  });
});

describe("NextMove", () => {
  test("main eyebrow, evidence labels and facts terms all default to lang=en", () => {
    const { container, getByText } = render(
      <NextMove
        headline="Headline"
        evidence={[{ label: "Areas assessed", value: 3 }]}
        facts={[{ term: "Impact", value: "High" }]}
      />,
    );
    expect(getByText("Next move")).toHaveAttribute("lang", "en");
    expect(getByText("Areas assessed")).toHaveAttribute("lang", "en");
    expect(getByText("Impact")).toHaveAttribute("lang", "en");
    // The component's own internal evidence-row label, not caller-supplied.
    expect(container.querySelector('[lang="en"]')).toBeInTheDocument();
  });

  test("the internal 'What Proxola is reading' evidence-row label translates under locale=tr", () => {
    const { getByText, queryByText } = render(
      <NextMove headline="Başlık" locale="tr" evidence={[{ label: "Değerlendirilen alan", value: 3 }]} />,
    );
    expect(getByText("Proxola'nın okuduğu veriler")).toHaveAttribute("lang", "tr");
    expect(queryByText("What Proxola is reading")).not.toBeInTheDocument();
  });

  test("a caller that has translated eyebrow/facts passes locale=tr and gets it throughout", () => {
    const { getByText } = render(
      <NextMove
        headline="Başlık"
        locale="tr"
        eyebrow="Sıradaki adımın"
        facts={[{ term: "Etki", value: "Yüksek" }]}
      />,
    );
    expect(getByText("Sıradaki adımın")).toHaveAttribute("lang", "tr");
    expect(getByText("Etki")).toHaveAttribute("lang", "tr");
  });

  test("omitting locale is identical in shape to passing 'en' explicitly (default-locale backward compatibility)", () => {
    const props = { headline: "Headline", evidence: [{ label: "Areas assessed", value: 3 }] };
    const withDefault = render(<NextMove {...props} />);
    const withExplicitEn = render(<NextMove {...props} locale="en" />);
    expect(withDefault.container.innerHTML).toBe(withExplicitEn.container.innerHTML);
  });
});
