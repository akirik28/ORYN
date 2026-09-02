import { describe, expect, test } from "vitest";
import { BadgeCheck, Paperclip } from "lucide-react";
import { evidenceStatusPresentation } from "@/lib/profile/evidence-status-presentation";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * This is the one function every evidence-status display in the product shares
 * (features/profile/journey-timeline.tsx and features/profile/achievement-section.tsx
 * both call it) — component-level tests exist on the AchievementSection side
 * (__tests__/profile/achievement-section.test.tsx), but the mapping itself is tested
 * directly here so a future change to it doesn't need two component harnesses to catch
 * a regression.
 */

describe("evidenceStatusPresentation — self_reported and absent both render nothing", () => {
  test.each(["self_reported", null, undefined] as const)("%s returns null", (status) => {
    expect(evidenceStatusPresentation(status)).toBeNull();
  });
});

describe("evidenceStatusPresentation — evidence_added", () => {
  const presentation = evidenceStatusPresentation("evidence_added");

  test("is not null", () => {
    expect(presentation).not.toBeNull();
  });

  test("uses a neutral tone, never success — a file existing is not verification (Phase 21)", () => {
    expect(presentation?.tone).toBe("neutral");
  });

  test("uses the paperclip icon, not a check/badge icon that would imply verification", () => {
    expect(presentation?.icon).toBe(Paperclip);
  });

  test("labelKey resolves under the evidenceStatus i18n namespace", () => {
    expect(presentation?.labelKey).toBe("evidenceAdded");
  });
});

describe("evidenceStatusPresentation — verified", () => {
  const presentation = evidenceStatusPresentation("verified");

  test("is the one state that gets the success tone", () => {
    expect(presentation?.tone).toBe("success");
  });

  test("uses a distinct icon from evidence_added", () => {
    expect(presentation?.icon).toBe(BadgeCheck);
    expect(presentation?.icon).not.toBe(evidenceStatusPresentation("evidence_added")?.icon);
  });

  test("is tone- and icon-distinct from evidence_added — the two must never look the same", () => {
    const added = evidenceStatusPresentation("evidence_added");
    expect(presentation?.tone).not.toBe(added?.tone);
    expect(presentation?.labelKey).not.toBe(added?.labelKey);
  });
});

describe("evidenceStatusPresentation — verification_rejected", () => {
  const presentation = evidenceStatusPresentation("verification_rejected");

  test("stays neutral rather than an error/destructive tone — factual, not punitive", () => {
    expect(presentation?.tone).toBe("neutral");
    expect(presentation?.tone).not.toBe("error");
  });

  test("has its own label, distinct from both evidence_added and verified", () => {
    expect(presentation?.labelKey).toBe("notConfirmed");
  });
});

describe("evidenceStatusPresentation — i18n coverage", () => {
  test("every non-null labelKey has an entry in both message catalogs", () => {
    const enKeys: Record<string, string> = en.evidenceStatus;
    const trKeys: Record<string, string> = tr.evidenceStatus;
    const statuses = ["evidence_added", "verified", "verification_rejected"] as const;
    for (const status of statuses) {
      const key = evidenceStatusPresentation(status)?.labelKey;
      expect(key, `${status} should map to a labelKey`).toBeTruthy();
      expect(enKeys[key!], `messages/en.json evidenceStatus.${key} should exist`).toBeTruthy();
      expect(trKeys[key!], `messages/tr.json evidenceStatus.${key} should exist`).toBeTruthy();
    }
  });
});
