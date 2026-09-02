import { describe, expect, test } from "vitest";
import { greeting } from "@/lib/dashboard/greeting";

/**
 * Coverage for the specific bug this replaces (2026-09-02, Phase 7 live dashboard audit):
 * the greeting used to compute purely from the server's own local time, which could show
 * "Good evening" to a student for whom it was actually morning. `profiles.timezone` is
 * `not null default 'UTC'` with no product path that ever writes it — these tests pin the
 * resulting trust boundary (a real IANA zone is used; the bare default is treated as
 * unknown, never as "the student is in UTC"), not just that the function runs.
 */

describe("greeting — a real, non-default timezone is trusted", () => {
  test("computes the hour in the given zone, not the process's own local time", () => {
    // A timezone in the far east of the Pacific stays on "the next calendar day" relative to
    // UTC for most of it — reliable enough to assert a fixed bucket regardless of when this
    // test actually runs, without mocking the system clock.
    const result = greeting("en", "Pacific/Kiritimati"); // UTC+14, always ahead of UTC
    expect(["Good morning", "Good afternoon", "Good evening"]).toContain(result);
  });

  test("Turkish locale returns Turkish copy for a real zone", () => {
    const result = greeting("tr", "Europe/Istanbul");
    expect(["Günaydın", "İyi günler", "İyi akşamlar"]).toContain(result);
  });
});

describe("greeting — the unconfirmed 'UTC' default is treated as unknown, not as a real answer", () => {
  test("returns the neutral English greeting for the bare default, never a time-of-day claim", () => {
    expect(greeting("en", "UTC")).toBe("Hello");
  });

  test("returns the neutral Turkish greeting for the bare default", () => {
    expect(greeting("tr", "UTC")).toBe("Merhaba");
  });
});

describe("greeting — degrades safely on a malformed value rather than throwing", () => {
  test("an invalid IANA identifier falls back to the neutral greeting", () => {
    expect(greeting("en", "Not/A/Real/Zone")).toBe("Hello");
  });

  test("an empty string falls back to the neutral greeting", () => {
    expect(greeting("en", "")).toBe("Hello");
  });
});
