import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * getDescriptionQualityLiveSignal (lib/admin/queries.ts) -- the live counterpart to the
 * 35-row CONTAMINATION_CLEANUP_2026_09_02 batch's own count, built so the "Karar bekleyen"
 * overview card stops reading a closed fix-batch's size as the total defective-description
 * population (docs/description-quality-instrument-2026-09-03.md). Covers: the ok path's
 * three-number split, a row that is ready-to-fix but doesn't currently trip any live
 * signature (real, named in the function's own comment -- the 35-batch and the four
 * inspectDescription signatures were found by different, only partially-overlapping
 * characterization passes), honest degradation on a read error (never a silent zero), and
 * that guardWouldPass:false/null rows are excluded from "ready", matching the existing apply
 * flow's own definition of ready exactly.
 */

const { selectMock, eqMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  eqMock: vi.fn(),
}));

function makeAdmin() {
  return {
    from: (table: string) => {
      if (table === "opportunities") {
        return { select: (cols: string) => (cols === "id, title, description" ? { eq: eqMock } : (() => { throw new Error(`unexpected select "${cols}"`); })()) };
      }
      throw new Error(`description-quality-live-signal.test.ts: unexpected table "${table}"`);
    },
  } as never;
}

function previewRow(id: string, guardWouldPass: boolean | null) {
  return { id, title: "t", currentDescription: "d", newDescription: "n", guardWouldPass };
}

beforeEach(() => {
  selectMock.mockReset();
  eqMock.mockReset();
});

describe("getDescriptionQualityLiveSignal", () => {
  test("ok path: splits live-flagged rows into ready-to-fix (guard still passing) and no-fix-yet", async () => {
    const { getDescriptionQualityLiveSignal } = await import("@/lib/admin/queries");
    eqMock.mockResolvedValue({
      data: [
        { id: "defective-and-ready", title: "Short Program Title", description: "Short Program Title describes itself here, plus more text" },
        { id: "defective-no-fix", title: "Whatever Programme Name", description: "Whatever Programme Name is a great opportunity for you" },
        { id: "clean-row", title: "Fine", description: "A perfectly ordinary description with no defect at all." },
      ],
      error: null,
    });
    // Only "defective-and-ready" is in the cleanup batch, and its guard still passes.
    const preview = [previewRow("defective-and-ready", true)];

    const result = await getDescriptionQualityLiveSignal(makeAdmin(), preview);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.totalDefectiveActive).toBe(2); // defective-and-ready, defective-no-fix
    expect(result.readyToFixActive).toBe(1);
    expect(result.noFixYetActive).toBe(1); // total (2) minus the one that's both flagged and ready
    expect(result.defectKinds).toEqual(["multi_program_concatenation", "restates_title", "embedded_url", "truncated"]);
  });

  test("a ready-to-fix row that does not currently trip any live signature is not double-subtracted", async () => {
    const { getDescriptionQualityLiveSignal } = await import("@/lib/admin/queries");
    // No row in the live read matches any inspectDescription signature at all.
    eqMock.mockResolvedValue({
      data: [{ id: "ready-but-not-flagged", title: "Fine Title", description: "Totally ordinary prose describing a real programme in full." }],
      error: null,
    });
    // But it IS in the cleanup batch with a passing guard -- found by a different, earlier pass.
    const preview = [previewRow("ready-but-not-flagged", true)];

    const result = await getDescriptionQualityLiveSignal(makeAdmin(), preview);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.totalDefectiveActive).toBe(0);
    expect(result.readyToFixActive).toBe(1); // still counted -- it's genuinely one click away
    expect(result.noFixYetActive).toBe(0); // not negative: 0 live-flagged minus 0 (the ready row isn't among them)
  });

  test("guardWouldPass: false or null is excluded from ready-to-fix, matching the apply flow's own definition", async () => {
    const { getDescriptionQualityLiveSignal } = await import("@/lib/admin/queries");
    eqMock.mockResolvedValue({ data: [], error: null });
    const preview = [previewRow("guard-failed", false), previewRow("row-gone", null)];

    const result = await getDescriptionQualityLiveSignal(makeAdmin(), preview);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("unreachable");
    expect(result.readyToFixActive).toBe(0);
  });

  test("a read error degrades to unknown, never a silent zero", async () => {
    const { getDescriptionQualityLiveSignal } = await import("@/lib/admin/queries");
    eqMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getDescriptionQualityLiveSignal(makeAdmin(), []);

    expect(result).toEqual({ status: "unknown", reason: "JWT expired" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  test("null data with no error also degrades to unknown rather than treating it as zero rows", async () => {
    const { getDescriptionQualityLiveSignal } = await import("@/lib/admin/queries");
    eqMock.mockResolvedValue({ data: null, error: null });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getDescriptionQualityLiveSignal(makeAdmin(), []);

    expect(result.status).toBe("unknown");
    errorSpy.mockRestore();
  });
});
