import { describe, expect, test } from "vitest";
import { fetchOpenGraphImage, type TextFetch } from "@/lib/acquisition/opengraph";

function htmlFetch(html: string, ok = true): TextFetch {
  return async () => ({ ok, status: ok ? 200 : 404, text: async () => html });
}

describe("fetchOpenGraphImage", () => {
  test("extracts og:image and resolves it to an absolute URL", async () => {
    const html = `<html><head><meta property="og:image" content="/assets/campus-hero.jpg"></head></html>`;
    const url = await fetchOpenGraphImage("https://www.example.edu/about", htmlFetch(html));
    expect(url).toBe("https://www.example.edu/assets/campus-hero.jpg");
  });

  test("prefers og:image:secure_url over plain og:image when both are present", async () => {
    const html = `<meta property="og:image" content="http://insecure.example.edu/a.jpg"><meta property="og:image:secure_url" content="https://secure.example.edu/b.jpg">`;
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch(html));
    expect(url).toBe("https://secure.example.edu/b.jpg");
  });

  test("falls back to twitter:image when no og:image tag exists", async () => {
    const html = `<meta name="twitter:image" content="https://example.edu/twitter-card.jpg">`;
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch(html));
    expect(url).toBe("https://example.edu/twitter-card.jpg");
  });

  test("handles content= appearing before the property attribute", async () => {
    const html = `<meta content="https://example.edu/first.jpg" property="og:image">`;
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch(html));
    expect(url).toBe("https://example.edu/first.jpg");
  });

  test("only scans <head>, ignoring an itemprop=image tag injected in the body", async () => {
    const html = `<head></head><body><meta itemprop="image" content="https://example.edu/widget.jpg"></body>`;
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch(html));
    expect(url).toBeNull();
  });

  test("returns null when no recognised meta tag is present", async () => {
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch("<html><head><title>Hi</title></head></html>"));
    expect(url).toBeNull();
  });

  test("returns null on a non-OK response rather than throwing", async () => {
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch("", false));
    expect(url).toBeNull();
  });

  test("returns null when the network call rejects", async () => {
    const url = await fetchOpenGraphImage("https://example.edu", async () => {
      throw new Error("ECONNRESET");
    });
    expect(url).toBeNull();
  });

  test("treats a whitespace-only content attribute as absent", async () => {
    const html = `<meta property="og:image" content="   ">`;
    const url = await fetchOpenGraphImage("https://example.edu", htmlFetch(html));
    expect(url).toBeNull();
  });
});
