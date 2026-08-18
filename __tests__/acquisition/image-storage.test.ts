import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { sha256Hex, optimizeImage, verifyPublicUrlServes } from "@/lib/acquisition/image-storage";

async function syntheticJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 100, g: 140, b: 200 } } })
    .jpeg()
    .toBuffer();
}

describe("sha256Hex", () => {
  test("is deterministic for identical bytes", () => {
    const buffer = Buffer.from("same bytes");
    expect(sha256Hex(buffer)).toBe(sha256Hex(Buffer.from("same bytes")));
  });

  test("differs for different bytes", () => {
    expect(sha256Hex(Buffer.from("a"))).not.toBe(sha256Hex(Buffer.from("b")));
  });

  test("returns a 64-character lowercase hex string", () => {
    expect(sha256Hex(Buffer.from("x"))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("optimizeImage", () => {
  test("downscales a source wider than the max width and re-encodes to webp", async () => {
    const source = await syntheticJpeg(2400, 1200);
    const result = await optimizeImage(source, 1920);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(960);
    const outMeta = await sharp(result.buffer).metadata();
    expect(outMeta.format).toBe("webp");
  });

  test("never upscales a source already smaller than the max width", async () => {
    const source = await syntheticJpeg(500, 300);
    const result = await optimizeImage(source, 1920);
    expect(result.width).toBe(500);
    expect(result.height).toBe(300);
  });

  test("checksum reflects the ORIGINAL bytes, stable across different maxWidth settings", async () => {
    const source = await syntheticJpeg(2000, 1000);
    const a = await optimizeImage(source, 1920);
    const b = await optimizeImage(source, 800);
    expect(a.checksum).toBe(b.checksum);
    expect(a.checksum).toBe(sha256Hex(source));
  });
});

describe("verifyPublicUrlServes", () => {
  test("true when the HEAD request is ok", async () => {
    const ok = await verifyPublicUrlServes("https://example.test/x.webp", async () => ({ ok: true }));
    expect(ok).toBe(true);
  });

  test("false when the HEAD request is not ok", async () => {
    const ok = await verifyPublicUrlServes("https://example.test/missing.webp", async () => ({ ok: false }));
    expect(ok).toBe(false);
  });

  test("false when the network call throws, never propagates", async () => {
    const ok = await verifyPublicUrlServes("https://example.test/x.webp", async () => {
      throw new Error("ECONNRESET");
    });
    expect(ok).toBe(false);
  });
});
