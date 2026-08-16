import { describe, expect, test } from "vitest";
import { normalizeEntitySearchText, tokenizeNormalized } from "@/lib/entities/normalize";

describe("normalizeEntitySearchText — Üsküdar/Uskudar normalization", () => {
  test("Turkish-accented and plain-ASCII spellings normalize identically", () => {
    expect(normalizeEntitySearchText("Üsküdar American Academy")).toBe(normalizeEntitySearchText("uskudar american academy"));
    expect(normalizeEntitySearchText("Üsküdar American Academy")).toBe("uskudar american academy");
  });

  test("dotless Turkish ı folds to plain i (no generic case-fold does this on its own)", () => {
    expect(normalizeEntitySearchText("Kadıköy")).toBe("kadikoy");
  });

  test("dotted Turkish İ folds to plain i via NFKD decomposition", () => {
    expect(normalizeEntitySearchText("İstanbul")).toBe("istanbul");
    expect(normalizeEntitySearchText("İstanbul")).toBe(normalizeEntitySearchText("istanbul"));
  });

  test("other Turkish diacritics (ç, ş, ğ, ö) fold to their base letters", () => {
    expect(normalizeEntitySearchText("Çamlıca")).toBe("camlica");
    expect(normalizeEntitySearchText("Üsküdar")).toBe("uskudar");
  });

  test("case is fully normalized", () => {
    expect(normalizeEntitySearchText("UAA")).toBe(normalizeEntitySearchText("uaa"));
    expect(normalizeEntitySearchText("UAA")).toBe("uaa");
  });

  test("punctuation and extra whitespace normalize away", () => {
    expect(normalizeEntitySearchText("Saint-Joseph")).toBe("saint joseph");
    expect(normalizeEntitySearchText("  Robert   College  ")).toBe("robert college");
  });

  test("empty string normalizes to empty string", () => {
    expect(normalizeEntitySearchText("")).toBe("");
    expect(normalizeEntitySearchText("   ")).toBe("");
  });
});

describe("tokenizeNormalized", () => {
  test("splits on whitespace", () => {
    expect(tokenizeNormalized("uskudar american academy")).toEqual(["uskudar", "american", "academy"]);
  });

  test("empty input produces an empty array, not [''] ", () => {
    expect(tokenizeNormalized("")).toEqual([]);
  });
});
