import { describe, expect, test } from "vitest";
import { fetchWikidataImageClaim, fetchCommonsFileInfo, type JsonFetch } from "@/lib/acquisition/wikimedia";

describe("fetchWikidataImageClaim", () => {
  const claimsFetch: JsonFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      claims: {
        P18: [{ mainsnak: { snaktype: "value", datavalue: { value: "MIT Dome night1 Edit.jpg", type: "string" } }, rank: "normal" }],
      },
    }),
  });

  test("returns the plain Commons filename from a normal-rank claim", async () => {
    const filename = await fetchWikidataImageClaim("Q49108", "P18", claimsFetch);
    expect(filename).toBe("MIT Dome night1 Edit.jpg");
  });

  test("returns null when the property has no claims at all", async () => {
    const filename = await fetchWikidataImageClaim("Q1", "P154", async () => ({ ok: true, status: 200, json: async () => ({ claims: {} }) }));
    expect(filename).toBeNull();
  });

  test("skips a deprecated-rank claim in favour of a normal one", async () => {
    const fetchImpl: JsonFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        claims: {
          P18: [
            { mainsnak: { snaktype: "value", datavalue: { value: "Old wrong photo.jpg" } }, rank: "deprecated" },
            { mainsnak: { snaktype: "value", datavalue: { value: "Current photo.jpg" } }, rank: "normal" },
          ],
        },
      }),
    });
    expect(await fetchWikidataImageClaim("Q1", "P18", fetchImpl)).toBe("Current photo.jpg");
  });

  test("skips a novalue snak rather than returning garbage", async () => {
    const fetchImpl: JsonFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ claims: { P18: [{ mainsnak: { snaktype: "novalue" }, rank: "normal" }] } }),
    });
    expect(await fetchWikidataImageClaim("Q1", "P18", fetchImpl)).toBeNull();
  });

  test("returns null on a non-OK response rather than throwing", async () => {
    expect(await fetchWikidataImageClaim("Q1", "P18", async () => ({ ok: false, status: 500, json: async () => ({}) }))).toBeNull();
  });

  test("returns null when the network call rejects", async () => {
    const result = await fetchWikidataImageClaim("Q1", "P18", async () => {
      throw new Error("ECONNRESET");
    });
    expect(result).toBeNull();
  });
});

describe("fetchCommonsFileInfo", () => {
  const fileInfoFetch: JsonFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      query: {
        pages: {
          "12345": {
            title: "File:MIT Dome night1 Edit.jpg",
            imageinfo: [
              {
                url: "https://upload.wikimedia.org/wikipedia/commons/x/MIT_Dome_night1_Edit.jpg",
                width: 3872,
                height: 2592,
                mime: "image/jpeg",
                extmetadata: {
                  LicenseShortName: { value: "CC BY-SA 3.0" },
                  Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Fcb981" title="User:Fcb981">Fcb981</a>' },
                },
              },
            ],
          },
        },
      },
    }),
  });

  test("normalizes url, dimensions, mime, license and a plain-text attribution", async () => {
    const info = await fetchCommonsFileInfo("MIT Dome night1 Edit.jpg", fileInfoFetch);
    expect(info?.url).toBe("https://upload.wikimedia.org/wikipedia/commons/x/MIT_Dome_night1_Edit.jpg");
    expect(info?.width).toBe(3872);
    expect(info?.height).toBe(2592);
    expect(info?.mime).toBe("image/jpeg");
    expect(info?.license).toBe("CC BY-SA 3.0");
    expect(info?.attribution).toBe("Fcb981");
    expect(info?.descriptionUrl).toContain("commons.wikimedia.org/wiki/File");
  });

  test("returns null for a missing/deleted file", async () => {
    const info = await fetchCommonsFileInfo(
      "Does Not Exist.jpg",
      async () => ({ ok: true, status: 200, json: async () => ({ query: { pages: { "-1": { title: "File:Does Not Exist.jpg", missing: "" } } } }) })
    );
    expect(info).toBeNull();
  });

  test("falls back to Credit when Artist is absent, still stripped of HTML", async () => {
    const info = await fetchCommonsFileInfo("X.jpg", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: {
          pages: { "1": { imageinfo: [{ url: "https://upload.wikimedia.org/x.jpg", width: 1200, height: 800, mime: "image/jpeg", extmetadata: { Credit: { value: "Official university press office" } } }] } },
        },
      }),
    }));
    expect(info?.attribution).toBe("Official university press office");
    expect(info?.license).toBeNull();
  });

  test("returns null when imageinfo is missing required dimensions", async () => {
    const info = await fetchCommonsFileInfo("X.jpg", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ query: { pages: { "1": { imageinfo: [{ url: "https://upload.wikimedia.org/x.jpg", mime: "image/jpeg" }] } } } }),
    }));
    expect(info).toBeNull();
  });

  test("returns null on a non-OK response", async () => {
    expect(await fetchCommonsFileInfo("X.jpg", async () => ({ ok: false, status: 503, json: async () => ({}) }))).toBeNull();
  });

  test("prefers the requested thumbnail over the full original when Commons returns one", async () => {
    const info = await fetchCommonsFileInfo("Giant Panorama.jpg", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/wikipedia/commons/x/giant-original.jpg",
                  width: 15050,
                  height: 5051,
                  mime: "image/jpeg",
                  thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/x/giant-original.jpg/2000px-giant-original.jpg",
                  thumbwidth: 2000,
                  thumbheight: 671,
                },
              ],
            },
          },
        },
      }),
    }));
    expect(info?.url).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/x/giant-original.jpg/2000px-giant-original.jpg");
    expect(info?.width).toBe(2000);
    expect(info?.height).toBe(671);
  });

  test("falls back to the full original when Commons returns no thumbnail (source already small)", async () => {
    const info = await fetchCommonsFileInfo("Small.jpg", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: { pages: { "1": { imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/x/small.jpg", width: 900, height: 600, mime: "image/jpeg" }] } } },
      }),
    }));
    expect(info?.url).toBe("https://upload.wikimedia.org/wikipedia/commons/x/small.jpg");
    expect(info?.width).toBe(900);
  });
});
