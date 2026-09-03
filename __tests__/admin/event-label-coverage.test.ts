import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWN_PRODUCT_EVENT_NAMES } from "@/lib/admin/queries";

/**
 * Found during 2026-09-03's Turkish pass: `ultra_interest_registered` was added to
 * KNOWN_PRODUCT_EVENT_NAMES (so getFeatureCensus/getProductActivity count and surface it)
 * but never added to activity-section.tsx's own EVENT_LABELS/EVENT_LABELS_TR display maps,
 * so it rendered as the raw event name -- in every locale, not just Turkish -- on both the
 * "by event type" and "recent events" lists. Adding the one label fixed the one instance;
 * this guards the general case the same way known-product-event-names.test.ts guards
 * KNOWN_PRODUCT_EVENT_NAMES itself, so a future new event name can't drift the same way
 * silently again. Static source check, not a runtime import of activity-section.tsx --
 * that file transitively imports "server-only" (via lib/admin/queries.ts /
 * lib/supabase/admin.ts), and known-product-event-names.test.ts already established the
 * src()+toContain technique as this suite's way of checking file content without needing to
 * import (and mock the server-only-ness of) the module itself.
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("activity-section's EVENT_LABELS / EVENT_LABELS_TR cover every known product event", () => {
  const file = "features/admin/sections/activity-section.tsx";
  const contents = src(file);

  test.each(KNOWN_PRODUCT_EVENT_NAMES)("%s has both an English and a Turkish label", (eventName) => {
    // Each map has exactly one `eventName:` key -- two occurrences total across the file
    // means both maps carry it, matching the fallback-to-raw-name behavior this test exists
    // to prevent (eventLabel() falls back to the bare eventName when a key is missing, so
    // the file itself can't tell you it's missing -- only counting the source can).
    const keyPattern = new RegExp(`\\b${eventName}:`, "g");
    const occurrences = contents.match(keyPattern)?.length ?? 0;
    expect(occurrences).toBe(2);
  });
});
